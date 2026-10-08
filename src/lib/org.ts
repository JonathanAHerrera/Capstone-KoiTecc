import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb, nowIsoTimestamp } from "@/db/client";
import { organizations, type OrganizationRow } from "@/db/schema";
import { FRAMEWORK_ORDER, type FrameworkId } from "@/lib/practice-types";

export type Organization = OrganizationRow;

export const CreateOrganizationInputSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(200),
  targetLevel: z.union([z.literal(1), z.literal(2)]),
  handlesCui: z.boolean(),
  employeeCount: z.enum(["1-10", "11-50", "51-250", "250+"]),
  itSetup: z.enum(["cloud", "onprem", "mixed", "unsure"]),
  hasItProvider: z.boolean(),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInputSchema>;

export const TexasProfileInputSchema = z.object({
  handlesTexasResidentData: z.boolean(),
  sellsToStateOfTexas: z.boolean(),
  texasPhysicalPresence: z.boolean(),
  processesPersonalDataAtScale: z.boolean(),
});

export type TexasProfileInput = z.infer<typeof TexasProfileInputSchema>;

export async function getOrganization(): Promise<Organization | null> {
  const db = await getDb();
  const rows = await db.select().from(organizations).limit(1);
  return rows[0] ?? null;
}

export async function requireOrganization(): Promise<Organization> {
  const organization = await getOrganization();
  if (!organization) {
    throw new Error("No organization exists yet. Complete onboarding first.");
  }
  return organization;
}

// The app is single-organization per database, so a second create call updates the
// existing row in place rather than orphaning its submissions behind a new org id.
export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  const validatedInput = CreateOrganizationInputSchema.parse(input);
  const db = await getDb();
  const existingOrganization = await getOrganization();

  if (existingOrganization) {
    await db
      .update(organizations)
      .set(validatedInput)
      .where(eq(organizations.id, existingOrganization.id));
    return { ...existingOrganization, ...validatedInput };
  }

  const newOrganization: Organization = {
    id: nanoid(),
    ...validatedInput,
    handlesTexasResidentData: false,
    sellsToStateOfTexas: false,
    texasPhysicalPresence: false,
    processesPersonalDataAtScale: false,
    enabledFrameworks: JSON.stringify(["cmmc"]),
    createdAt: nowIsoTimestamp(),
  };
  await db.insert(organizations).values(newOrganization);
  return newOrganization;
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
