import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb, nowIsoTimestamp } from "@/db/client";
import {
  frameworkEnrollments,
  type FrameworkEnrollmentRow,
  organizations,
  type OrganizationRow,
} from "@/db/schema";
import { buildSb2610Plan, sb2610Definition } from "@/frameworks/sb2610";
import type { Industry, OrgProfile } from "@/frameworks/types";
import { FRAMEWORK_ORDER, type FrameworkId } from "@/lib/practice-types";
import { requireSessionUserId } from "@/lib/session";

export type Organization = OrganizationRow;

const INDUSTRY_VALUES = [
  "healthcare",
  "tax_prep",
  "accounting",
  "lending",
  "retail",
  "professional_services",
  "other",
] as const satisfies readonly Industry[];

export const CreateOrganizationInputSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(200),
  targetLevel: z.union([z.literal(1), z.literal(2)]),
  handlesCui: z.boolean(),
  employeeCount: z.enum(["1-10", "11-50", "51-250", "250+"]),
  itSetup: z.enum(["cloud", "onprem", "mixed", "unsure"]),
  hasItProvider: z.boolean(),
  // SB 2610 overlay inputs; optional so the CMMC-only onboarding payload stays valid.
  industry: z.enum(INDUSTRY_VALUES).default("other"),
  takesCardPayments: z.boolean().default(false),
});

// Input type (not infer): the SB 2610 fields have schema defaults, so callers may omit them and
// the CMMC-only onboarding payload stays valid.
export type CreateOrganizationInput = z.input<typeof CreateOrganizationInputSchema>;

export const TexasProfileInputSchema = z.object({
  handlesTexasResidentData: z.boolean(),
  sellsToStateOfTexas: z.boolean(),
  texasPhysicalPresence: z.boolean(),
  processesPersonalDataAtScale: z.boolean(),
});

export type TexasProfileInput = z.infer<typeof TexasProfileInputSchema>;

// User-scoped core. Every tenant boundary resolves to one of these by owner id; the session
// wrappers below are the only things that read the current request. Keeping the userId explicit
// here is what makes cross-tenant isolation unit-testable without a live session.
export async function getOrganizationForUser(userId: string): Promise<Organization | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

// One org per user, so a second create call updates that user's existing row in place rather
// than orphaning its submissions behind a new org id.
export async function createOrganizationForUser(
  userId: string,
  input: CreateOrganizationInput,
): Promise<Organization> {
  const validatedInput = CreateOrganizationInputSchema.parse(input);
  const db = await getDb();
  const existingOrganization = await getOrganizationForUser(userId);

  if (existingOrganization) {
    await db
      .update(organizations)
      .set(validatedInput)
      .where(eq(organizations.id, existingOrganization.id));
    await enrollSb2610ForUser(userId);
    return { ...existingOrganization, ...validatedInput };
  }

  const newOrganization: Organization = {
    id: nanoid(),
    userId,
    ...validatedInput,
    handlesTexasResidentData: false,
    sellsToStateOfTexas: false,
    texasPhysicalPresence: false,
    processesPersonalDataAtScale: false,
    enabledFrameworks: JSON.stringify(["cmmc"]),
    createdAt: nowIsoTimestamp(),
  };
  await db.insert(organizations).values(newOrganization);
  await enrollSb2610ForUser(userId);
  return newOrganization;
}

export async function getOrganization(): Promise<Organization | null> {
  return getOrganizationForUser(await requireSessionUserId());
}

export async function requireOrganization(): Promise<Organization> {
  const organization = await getOrganization();
  if (!organization) {
    throw new Error("No organization exists yet. Complete onboarding first.");
  }
  return organization;
}

export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  return createOrganizationForUser(await requireSessionUserId(), input);
}

export async function updateOrganizationTexasProfile(
  input: TexasProfileInput,
): Promise<Organization> {
  const validatedInput = TexasProfileInputSchema.parse(input);
  const organization = await requireOrganization();
  const db = await getDb();
  await db
    .update(organizations)
    .set(validatedInput)
    .where(eq(organizations.id, organization.id));
  return { ...organization, ...validatedInput };
}

// CMMC is always present; ids are de-duplicated and ordered by FRAMEWORK_ORDER for stable storage.
export function parseEnabledFrameworks(organization: Organization): FrameworkId[] {
  const enabled = new Set<FrameworkId>(["cmmc"]);
  try {
    const parsed = JSON.parse(organization.enabledFrameworks) as unknown;
    if (Array.isArray(parsed)) {
      for (const value of parsed) {
        if (FRAMEWORK_ORDER.includes(value as FrameworkId)) {
          enabled.add(value as FrameworkId);
        }
      }
    }
  } catch {
    // Fall back to the CMMC-only default when the stored value is unreadable.
  }
  return FRAMEWORK_ORDER.filter((framework) => enabled.has(framework));
}

export async function setEnabledFrameworks(frameworks: FrameworkId[]): Promise<Organization> {
  const organization = await requireOrganization();
  const deduped = new Set<FrameworkId>(["cmmc"]);
  for (const framework of frameworks) {
    if (FRAMEWORK_ORDER.includes(framework)) deduped.add(framework);
  }
  const ordered = FRAMEWORK_ORDER.filter((framework) => deduped.has(framework));
  const serialized = JSON.stringify(ordered);
  const db = await getDb();
  await db
    .update(organizations)
    .set({ enabledFrameworks: serialized })
    .where(eq(organizations.id, organization.id));
  return { ...organization, enabledFrameworks: serialized };
}

// The stored employee_count is a coarse bucket (CMMC never needed an exact headcount). SB 2610
// tiers split at 20 and 100, and the 11-50 bucket straddles the 20 line, so we map each bucket to a
// representative headcount and round 11-50 up to the moderate tier (more coverage, safer default).
// TODO: capture exact headcount in onboarding to remove this approximation.
const REPRESENTATIVE_EMPLOYEE_COUNT: Readonly<Record<Organization["employeeCount"], number>> = {
  "1-10": 10,
  "11-50": 45,
  "51-250": 150,
  "250+": 300,
};

// Translate a stored org row into the engine's OrgProfile (src/frameworks).
export function deriveOrgProfile(organization: Organization): OrgProfile {
  return {
    employees: REPRESENTATIVE_EMPLOYEE_COUNT[organization.employeeCount],
    industry: organization.industry,
    takesCardPayments: organization.takesCardPayments,
    handlesCui: organization.handlesCui,
    handlesTexasResidentData: organization.handlesTexasResidentData,
    sellsToStateOfTexas: organization.sellsToStateOfTexas,
    texasPhysicalPresence: organization.texasPhysicalPresence,
    processesPersonalDataAtScale: organization.processesPersonalDataAtScale,
  };
}

export type FrameworkEnrollment = FrameworkEnrollmentRow;

export async function getFrameworkEnrollment(
  orgId: string,
  framework: string,
): Promise<FrameworkEnrollment | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(frameworkEnrollments)
    .where(
      and(eq(frameworkEnrollments.orgId, orgId), eq(frameworkEnrollments.framework, framework)),
    )
    .limit(1);
  return rows[0] ?? null;
}

// Record (or refresh) the org's SB 2610 tier and overlay selection, recomputed from its profile.
// One row per (org, framework): a second call updates the existing row in place.
export async function enrollSb2610ForUser(userId: string): Promise<FrameworkEnrollment> {
  const organization = await getOrganizationForUser(userId);
  if (!organization) {
    throw new Error("No organization exists yet. Complete onboarding first.");
  }
  const plan = buildSb2610Plan(deriveOrgProfile(organization));
  const db = await getDb();
  const existing = await getFrameworkEnrollment(organization.id, sb2610Definition.id);
  const values = {
    tier: plan.eligible ? (plan.tier ?? null) : null,
    overlays: JSON.stringify(plan.overlays),
    version: sb2610Definition.version ?? null,
  };

  if (existing) {
    await db
      .update(frameworkEnrollments)
      .set(values)
      .where(eq(frameworkEnrollments.id, existing.id));
    return { ...existing, ...values };
  }

  const row: FrameworkEnrollment = {
    id: nanoid(),
    orgId: organization.id,
    framework: sb2610Definition.id,
    enrolledAt: nowIsoTimestamp(),
    ...values,
  };
  await db.insert(frameworkEnrollments).values(row);
  return row;
}
