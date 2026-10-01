import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb, nowIsoTimestamp } from "@/db/client";
import { organizations, type OrganizationRow } from "@/db/schema";

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
    createdAt: nowIsoTimestamp(),
  };
  await db.insert(organizations).values(newOrganization);
  return newOrganization;
}
