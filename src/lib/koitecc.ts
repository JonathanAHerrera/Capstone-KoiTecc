import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, nowIsoTimestamp } from "@/db/client";
import {
  koiteccAssociates,
  organizationStaffAssignments,
  organizations,
  user,
  type OrganizationRow,
} from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export type KoiTeccAssociate = typeof koiteccAssociates.$inferSelect;

export type KoiTeccOrganization = OrganizationRow & {
  ownerName: string | null;
  ownerEmail: string | null;
  associates: KoiTeccAssociate[];
};

export async function requireKoiTeccAdmin(): Promise<{ id: string; name: string; email: string }> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw new Error("Not authenticated.");

  const db = await getDb();
  const [staffUser] = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);

  if (!staffUser || staffUser.role !== "admin") {
    throw new Error("KoiTecc administrator access is required.");
  }

  return { id: staffUser.id, name: staffUser.name, email: staffUser.email };
}

export async function listKoiTeccAssociates(): Promise<KoiTeccAssociate[]> {
  await requireKoiTeccAdmin();
  const db = await getDb();
  return db.select().from(koiteccAssociates).where(eq(koiteccAssociates.active, true)).orderBy(koiteccAssociates.name);
}

export async function listKoiTeccOrganizations(): Promise<KoiTeccOrganization[]> {
  await requireKoiTeccAdmin();
  const db = await getDb();
  const organizationRows = await db
    .select({
      organization: organizations,
      ownerName: user.name,
      ownerEmail: user.email,
    })
    .from(organizations)
    .leftJoin(user, eq(organizations.userId, user.id))
    .orderBy(desc(organizations.createdAt));
  const associateRows = await db
    .select({
      organizationId: organizationStaffAssignments.organizationId,
      associate: koiteccAssociates,
    })
    .from(organizationStaffAssignments)
    .innerJoin(
      koiteccAssociates,
      eq(organizationStaffAssignments.associateId, koiteccAssociates.id),
    );
  const associatesByOrganization = new Map<string, KoiTeccAssociate[]>();
  for (const row of associateRows) {
    const current = associatesByOrganization.get(row.organizationId) ?? [];
    current.push(row.associate);
    associatesByOrganization.set(row.organizationId, current);
  }

  return organizationRows.map((row) => ({
    ...row.organization,
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
    associates: associatesByOrganization.get(row.organization.id) ?? [],
  }));
}

export async function assignKoiTeccAssociate(
  organizationId: string,
  associateId: string,
): Promise<void> {
  await requireKoiTeccAdmin();
  const db = await getDb();
  const [associate] = await db
    .select({ id: koiteccAssociates.id })
    .from(koiteccAssociates)
    .where(and(eq(koiteccAssociates.id, associateId), eq(koiteccAssociates.active, true)))
    .limit(1);
  if (!associate) throw new Error("Associate not found.");

  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!organization) throw new Error("Organization not found.");

  await db
    .insert(organizationStaffAssignments)
    .values({
      id: nanoid(),
      organizationId,
      associateId,
      createdAt: nowIsoTimestamp(),
    })
    .onConflictDoNothing();
}
