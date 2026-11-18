import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, nowIsoTimestamp } from "@/db/client";
import {
  associateUpdates,
  evidenceFiles,
  reviews,
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
import { getFamilies, getPracticesForLevel, getPractice } from "@/lib/practices";
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
  organizationId: string;
};

export type AssociateWorkspaceUpdate = typeof associateUpdates.$inferSelect;

export type AssociateWorkspacePractice = {
  id: string;
  title: string;
  familyCode: string;
  familyName: string;
  status: DerivedPracticeStatus;
};

export type AssociateWorkspaceFamily = {
  code: string;
  name: string;
  completedCount: number;
  totalCount: number;
  completedPractices: AssociateWorkspacePractice[];
  remainingPractices: AssociateWorkspacePractice[];
};

export type AssociateWorkspaceOrganization = KoiTeccOrganization & {
  progress: ProgressSummary;
  currentFamily: { code: string; name: string } | null;
  currentPractice: AssociateWorkspacePractice | null;
  families: AssociateWorkspaceFamily[];
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

export async function getKoiTeccAdminForCurrentUser(): Promise<{
  id: string;
  name: string;
  email: string;
} | null> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const db = await getDb();
  const [staffUser] = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);

  return staffUser?.role === "admin"
    ? { id: staffUser.id, name: staffUser.name, email: staffUser.email }
    : null;
}

export async function linkKoiTeccAssociateForCurrentUser(): Promise<KoiTeccAssociate> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw new Error("Not authenticated.");

  const db = await getDb();
  const [associate] = await db
    .select()
    .from(koiteccAssociates)
    .where(
      and(
        eq(koiteccAssociates.active, true),
        eq(koiteccAssociates.email, sessionUser.email.toLowerCase()),
      ),
    )
    .limit(1);
  if (!associate) {
    throw new Error("No active KoiTecc associate record matches this account.");
  }
  if (associate.userId && associate.userId !== sessionUser.id) {
    throw new Error("This associate record is already linked to another account.");
  }

  await db
    .update(koiteccAssociates)
    .set({ userId: sessionUser.id })
    .where(eq(koiteccAssociates.id, associate.id));
  await db
    .update(user)
    .set({ role: "associate" })
    .where(eq(user.id, sessionUser.id));

  return { ...associate, userId: sessionUser.id };
}

async function requireKoiTeccWorkspaceAccess(
  associateId: string,
): Promise<KoiTeccAssociate> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw new Error("Not authenticated.");

  const db = await getDb();
  const [staffUser] = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);
  const [associate] = await db
    .select()
    .from(koiteccAssociates)
    .where(and(eq(koiteccAssociates.id, associateId), eq(koiteccAssociates.active, true)))
    .limit(1);

  if (!associate) throw new Error("Associate not found.");
  if (staffUser?.role === "admin") return associate;
  if (
    staffUser?.role !== "associate" ||
    (associate.userId !== staffUser.id && associate.email.toLowerCase() !== staffUser.email.toLowerCase())
  ) {
    throw new Error("Associate workspace access is required.");
  }
  return associate;
}

export async function getAssociateWorkspaceForCurrentUser(): Promise<KoiTeccAssociate> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw new Error("Not authenticated.");
  const db = await getDb();
  const [associate] = await db
    .select()
    .from(koiteccAssociates)
    .where(
      and(
        eq(koiteccAssociates.active, true),
        eq(koiteccAssociates.email, sessionUser.email),
      ),
    )
    .limit(1);
  if (!associate) throw new Error("No active associate profile is linked to this account.");
  return requireKoiTeccWorkspaceAccess(associate.id);
}

export async function listKoiTeccAssociates(): Promise<KoiTeccAssociate[]> {
  await requireKoiTeccAdmin();
  const db = await getDb();
  const legacyTaylor = await db
    .select({ id: koiteccAssociates.id })
    .from(koiteccAssociates)
    .where(eq(koiteccAssociates.email, "taylor.brooks@koitecc.example"));
  if (legacyTaylor.length > 0) {
    await db
      .delete(organizationStaffAssignments)
      .where(inArray(
        organizationStaffAssignments.associateId,
        legacyTaylor.map((associate) => associate.id),
      ));
    await db
      .delete(koiteccAssociates)
      .where(inArray(
        koiteccAssociates.id,
        legacyTaylor.map((associate) => associate.id),
      ));
  }

  await db
    .update(koiteccAssociates)
    .set({ name: "Jordan Lee (Example)", title: "Cybersecurity Associate", active: true })
    .where(eq(koiteccAssociates.email, "jordan.lee@koitecc.example"));
  await db
    .update(koiteccAssociates)
    .set({ name: "Morgan Patel (Example)", title: "Readiness Advisor", active: true })
    .where(eq(koiteccAssociates.email, "morgan.patel@koitecc.example"));

  return db.select().from(koiteccAssociates).where(eq(koiteccAssociates.active, true)).orderBy(koiteccAssociates.name);
}

export async function listKoiTeccOrganizations(): Promise<KoiTeccOrganization[]> {
  await requireKoiTeccAdmin();
  return listKoiTeccOrganizationsFromDatabase();
}

const DEMO_ORGANIZATION_IDS = [
  "koitecc-demo-organization-cedar",
  "koitecc-demo-organization-harbor",
] as const;

export async function hasKoiTeccDemoData(): Promise<boolean> {
  await requireKoiTeccAdmin();
  const db = await getDb();
  const demoOrganizations = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(inArray(organizations.id, [...DEMO_ORGANIZATION_IDS]));
  return demoOrganizations.length > 0;
}

export async function seedKoiTeccDemoData(): Promise<void> {
  await requireKoiTeccAdmin();
  const db = await getDb();
  const timestamp = nowIsoTimestamp();

  await db.insert(user).values([
    {
      id: "koitecc-demo-owner-cedar",
      name: "Cedar Manufacturing (Example)",
      email: "cedar-owner@koitecc.example",
      role: "client",
      emailVerified: false,
    },
    {
      id: "koitecc-demo-owner-harbor",
      name: "Harbor Consulting (Example)",
      email: "harbor-owner@koitecc.example",
      role: "client",
      emailVerified: false,
    },
  ]).onConflictDoNothing();

  await db.insert(organizations).values([
    {
      id: DEMO_ORGANIZATION_IDS[0],
      userId: "koitecc-demo-owner-cedar",
      name: "Cedar Manufacturing (Example)",
      targetLevel: 1,
      handlesCui: false,
      employeeCount: "11-50",
      itSetup: "mixed",
      hasItProvider: true,
      industry: "other",
      takesCardPayments: false,
      enabledFrameworks: '["cmmc"]',
      createdAt: timestamp,
    },
    {
      id: DEMO_ORGANIZATION_IDS[1],
      userId: "koitecc-demo-owner-harbor",
      name: "Harbor Consulting (Example)",
      targetLevel: 2,
      handlesCui: true,
      employeeCount: "1-10",
      itSetup: "cloud",
      hasItProvider: true,
      industry: "professional_services",
      takesCardPayments: true,
      enabledFrameworks: '["cmmc"]',
      createdAt: timestamp,
    },
  ]).onConflictDoNothing();

  await db.insert(koiteccAssociates).values([
    {
      id: "koitecc-demo-associate-jordan",
      name: "Jordan Lee (Example)",
      email: "jordan.lee@koitecc.example",
      title: "Cybersecurity Associate",
      active: true,
      createdAt: timestamp,
    },
    {
      id: "koitecc-demo-associate-morgan",
      name: "Morgan Patel (Example)",
      email: "morgan.patel@koitecc.example",
      title: "Readiness Advisor",
      active: true,
      createdAt: timestamp,
    },
  ]).onConflictDoNothing();

  await db.insert(submissions).values([
    {
      id: "koitecc-demo-cedar-accepted",
      orgId: DEMO_ORGANIZATION_IDS[0],
      practiceId: "AC.L1-b.1.i",
      framework: "cmmc",
      status: "accepted",
      note: "Example evidence: the user list matches the company account directory.",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "koitecc-demo-cedar-needs-work",
      orgId: DEMO_ORGANIZATION_IDS[0],
      practiceId: "AC.L1-b.1.ii",
      framework: "cmmc",
      status: "needs_work",
      note: "Example note: missing a dated list of former employee account removals.",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "koitecc-demo-harbor-under-review",
      orgId: DEMO_ORGANIZATION_IDS[1],
      practiceId: "AC.L1-b.1.i",
      framework: "cmmc",
      status: "submitted",
      note: "Example submission for an associate workspace review.",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]).onConflictDoNothing();
}

async function listKoiTeccOrganizationsFromDatabase(): Promise<KoiTeccOrganization[]> {
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
  await requireKoiTeccWorkspaceAccess(associateId);
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

export async function deleteKoiTeccOrganization(organizationId: string): Promise<void> {
  await requireKoiTeccAdmin();
  const db = await getDb();
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!organization) throw new Error("Organization not found.");

  await db.delete(organizationStaffAssignments)
    .where(eq(organizationStaffAssignments.organizationId, organizationId));
  const submissionRows = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.orgId, organizationId));
  const submissionIds = submissionRows.map((submission) => submission.id);
  if (submissionIds.length > 0) {
    await db.delete(reviews).where(inArray(reviews.submissionId, submissionIds));
    await db.delete(evidenceFiles).where(inArray(evidenceFiles.submissionId, submissionIds));
  }
  await db.delete(submissions).where(eq(submissions.orgId, organizationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
}

export async function createKoiTeccAssociate(
  name: string,
  email: string,
  title: string,
): Promise<void> {
  await requireKoiTeccAdmin();
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedTitle = title.trim();
  if (normalizedName.length === 0 || normalizedEmail.length === 0 || normalizedTitle.length === 0) {
    throw new Error("Enter the employee name, email, and title.");
  }
  const db = await getDb();
  await db.insert(koiteccAssociates).values({
    id: nanoid(),
    name: normalizedName,
    email: normalizedEmail,
    title: normalizedTitle,
    active: true,
    createdAt: nowIsoTimestamp(),
  });
}

export async function deleteKoiTeccAssociate(associateId: string): Promise<void> {
  await requireKoiTeccAdmin();
  const db = await getDb();
  await db
    .delete(organizationStaffAssignments)
    .where(eq(organizationStaffAssignments.associateId, associateId));
  await db
    .delete(koiteccAssociates)
    .where(eq(koiteccAssociates.id, associateId));
}

export async function getKoiTeccAssociate(
  associateId: string,
): Promise<KoiTeccAssociate | null> {
  try {
    return await requireKoiTeccWorkspaceAccess(associateId);
  } catch (error) {
    if (error instanceof Error && error.message === "Associate not found.") return null;
    throw error;
  }
}

export async function listAssociateWorkspaceOrganizations(
  associateId: string,
): Promise<AssociateWorkspaceOrganization[]> {
  await requireKoiTeccWorkspaceAccess(associateId);

  const organizations = (await listKoiTeccOrganizationsFromDatabase()).filter((organization) =>
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
      const families = getFamilies(organization.targetLevel).map((family) => {
        const familyPractices = family.practices.map((practice) => ({
          id: practice.id,
          title: practice.title,
          familyCode: family.code,
          familyName: family.name,
          status: statuses[practice.id],
        }));
        return {
          code: family.code,
          name: family.name,
          completedCount: familyPractices.filter((practice) => practice.status === "accepted").length,
          totalCount: familyPractices.length,
          completedPractices: familyPractices.filter((practice) => practice.status === "accepted"),
          remainingPractices: familyPractices.filter((practice) => practice.status !== "accepted"),
        };
      });
      const currentPractice = families
        .flatMap((family) => family.remainingPractices)
        .find((practice) => practice.status !== "accepted") ?? null;
      const currentFamily = currentPractice
        ? { code: currentPractice.familyCode, name: currentPractice.familyName }
        : null;
      const concerns: AssociateWorkspaceConcern[] = [
        ...taskRows.map((task) => ({
          id: task.id,
          kind: "reviewer_task" as const,
          title: task.summary,
          detail: "Client help request requires follow-up.",
          status: task.status,
          createdAt: task.createdAt,
          organizationId: organization.id,
        })),
        ...incidentRows.map((incident) => ({
          id: incident.id,
          kind: "incident" as const,
          title: `${incident.kind.replaceAll("_", " ")} incident`,
          detail: incident.notes ?? "No additional incident notes were provided.",
          status: incident.status,
          createdAt: incident.createdAt,
          organizationId: organization.id,
        })),
      ].sort((first, second) => second.createdAt.localeCompare(first.createdAt));

      return {
        ...organization,
        progress: computeProgressFromStatuses(organization.targetLevel, statuses),
        currentFamily,
        currentPractice,
        families,
        notes,
        concerns,
        updates: updateRows,
      };
    }),
  );
}

export async function resolveAssociateConcern(
  associateId: string,
  organizationId: string,
  concernId: string,
  concernKind: AssociateWorkspaceConcern["kind"],
): Promise<void> {
  await requireKoiTeccAdmin();
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

  if (concernKind === "reviewer_task") {
    const [task] = await db
      .update(reviewerTasks)
      .set({ status: "closed", updatedAt: nowIsoTimestamp() })
      .where(
        and(
          eq(reviewerTasks.id, concernId),
          eq(reviewerTasks.orgId, organizationId),
        ),
      )
      .returning({ id: reviewerTasks.id });
    if (!task) throw new Error("Reviewer concern not found.");
    return;
  }

  const [incident] = await db
    .update(incidents)
    .set({ status: "closed", updatedAt: nowIsoTimestamp() })
    .where(and(eq(incidents.id, concernId), eq(incidents.orgId, organizationId)))
    .returning({ id: incidents.id });
  if (!incident) throw new Error("Incident concern not found.");
}

export async function createAssociateUpdate(
  associateId: string,
  organizationId: string,
  message: string,
): Promise<void> {
  await requireKoiTeccWorkspaceAccess(associateId);

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
