import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, nowIsoTimestamp } from "@/db/client";
import {
  associateUpdates,
  incidents,
  koiteccAssociates,
  organizationStaffAssignments,
  organizations,
  reviewerTasks,
  submissions,
  user,
  type OrganizationRow,
} from "@/db/schema";
import { computeProgressFromStatuses, type ProgressSummary } from "@/lib/progress";
import { getPracticesForLevel, getPractice } from "@/lib/practices";
import type { DerivedPracticeStatus } from "@/lib/practice-types";
import { requireOrganization } from "@/lib/org";
import { getSessionUser } from "@/lib/session";

export type KoiTeccAssociate = typeof koiteccAssociates.$inferSelect;

export type KoiTeccOrganization = OrganizationRow & {
  ownerName: string | null;
  ownerEmail: string | null;
  associates: KoiTeccAssociate[];
};

export type AssociateWorkspaceNote = {
  practiceId: string;
  practiceTitle: string;
  note: string;
  status: DerivedPracticeStatus;
  updatedAt: string;
};

export type AssociateWorkspaceConcern = {
  id: string;
  kind: "reviewer_task" | "incident";
  title: string;
  detail: string;
  status: string;
  createdAt: string;
};

export type AssociateWorkspaceUpdate = typeof associateUpdates.$inferSelect;

export type AssociateWorkspaceOrganization = KoiTeccOrganization & {
  progress: ProgressSummary;
  notes: AssociateWorkspaceNote[];
  concerns: AssociateWorkspaceConcern[];
  updates: AssociateWorkspaceUpdate[];
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

export async function removeKoiTeccAssociate(
  organizationId: string,
  associateId: string,
): Promise<void> {
  await requireKoiTeccAdmin();
  const db = await getDb();
  await db
    .delete(organizationStaffAssignments)
    .where(
      and(
        eq(organizationStaffAssignments.organizationId, organizationId),
        eq(organizationStaffAssignments.associateId, associateId),
      ),
    );
}

export async function getKoiTeccAssociate(
  associateId: string,
): Promise<KoiTeccAssociate | null> {
  await requireKoiTeccAdmin();
  const db = await getDb();
  const [associate] = await db
    .select()
    .from(koiteccAssociates)
    .where(and(eq(koiteccAssociates.id, associateId), eq(koiteccAssociates.active, true)))
    .limit(1);
  return associate ?? null;
}

export async function listAssociateWorkspaceOrganizations(
  associateId: string,
): Promise<AssociateWorkspaceOrganization[]> {
  await requireKoiTeccAdmin();
  const associate = await getKoiTeccAssociate(associateId);
  if (!associate) throw new Error("Associate not found.");

  const organizations = (await listKoiTeccOrganizations()).filter((organization) =>
    organization.associates.some((assignedAssociate) => assignedAssociate.id === associateId),
  );
  const db = await getDb();

  return Promise.all(
    organizations.map(async (organization) => {
      const [submissionRows, taskRows, incidentRows, updateRows] = await Promise.all([
        db
          .select()
          .from(submissions)
          .where(eq(submissions.orgId, organization.id))
          .orderBy(desc(submissions.updatedAt)),
        db
          .select()
          .from(reviewerTasks)
          .where(and(eq(reviewerTasks.orgId, organization.id), inArray(reviewerTasks.status, ["open", "in_progress"])))
          .orderBy(desc(reviewerTasks.createdAt)),
        db
          .select()
          .from(incidents)
          .where(and(eq(incidents.orgId, organization.id), inArray(incidents.status, ["open", "contained"])))
          .orderBy(desc(incidents.createdAt)),
        db
          .select()
          .from(associateUpdates)
          .where(
            and(
              eq(associateUpdates.organizationId, organization.id),
              eq(associateUpdates.associateId, associateId),
            ),
          )
          .orderBy(desc(associateUpdates.createdAt)),
      ]);

      const practices = getPracticesForLevel(organization.targetLevel);
      const statuses: Record<string, DerivedPracticeStatus> = {};
      for (const practice of practices) {
        const submission = submissionRows.find((row) => row.practiceId === practice.id);
        statuses[practice.id] = submission
          ? submission.status === "draft"
            ? "in_progress"
            : submission.status === "submitted" || submission.status === "reviewing"
              ? "under_review"
              : submission.status
          : "not_started";
      }

      const notes = submissionRows
        .filter((submission) => submission.note)
        .map((submission) => {
          const practice = getPractice(submission.practiceId);
          return {
            practiceId: submission.practiceId,
            practiceTitle: practice?.title ?? submission.practiceId,
            note: submission.note ?? "",
            status: statuses[submission.practiceId],
            updatedAt: submission.updatedAt,
          };
        });
      const concerns: AssociateWorkspaceConcern[] = [
        ...taskRows.map((task) => ({
          id: task.id,
          kind: "reviewer_task" as const,
          title: task.summary,
          detail: "Client help request requires follow-up.",
          status: task.status,
          createdAt: task.createdAt,
        })),
        ...incidentRows.map((incident) => ({
          id: incident.id,
          kind: "incident" as const,
          title: `${incident.kind.replaceAll("_", " ")} incident`,
          detail: incident.notes ?? "No additional incident notes were provided.",
          status: incident.status,
          createdAt: incident.createdAt,
        })),
      ].sort((first, second) => second.createdAt.localeCompare(first.createdAt));

      return {
        ...organization,
        progress: computeProgressFromStatuses(organization.targetLevel, statuses),
        notes,
        concerns,
        updates: updateRows,
      };
    }),
  );
}

export async function createAssociateUpdate(
  associateId: string,
  organizationId: string,
  message: string,
): Promise<void> {
  await requireKoiTeccAdmin();
  const associate = await getKoiTeccAssociate(associateId);
  if (!associate) throw new Error("Associate not found.");

  const db = await getDb();
  const [assignment] = await db
    .select({ id: organizationStaffAssignments.id })
    .from(organizationStaffAssignments)
    .where(
      and(
        eq(organizationStaffAssignments.organizationId, organizationId),
        eq(organizationStaffAssignments.associateId, associateId),
      ),
    )
    .limit(1);
  if (!assignment) throw new Error("This associate is not assigned to that organization.");

  await db.insert(associateUpdates).values({
    id: nanoid(),
    organizationId,
    associateId,
    message,
    createdAt: nowIsoTimestamp(),
  });
}

export async function listAssociateUpdatesForCurrentOrganization(): Promise<
  Array<AssociateWorkspaceUpdate & { associateName: string }>
> {
  const organization = await requireOrganization();
  const db = await getDb();
  const rows = await db
    .select({
      update: associateUpdates,
      associateName: koiteccAssociates.name,
    })
    .from(associateUpdates)
    .innerJoin(koiteccAssociates, eq(associateUpdates.associateId, koiteccAssociates.id))
    .where(eq(associateUpdates.organizationId, organization.id))
    .orderBy(desc(associateUpdates.createdAt));
  return rows.map((row) => ({ ...row.update, associateName: row.associateName }));
}
