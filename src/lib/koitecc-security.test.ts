import { mkdtempSync } from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { closeDb, getDb } from "@/db/client";
import { auditLog, koiteccAssociates, organizationStaffAssignments, user } from "@/db/schema";
import { createOrganization } from "@/lib/org";
import { runWithSessionUser } from "@/lib/request-context";
import { approveKoiTeccAssociateAccount, assignKoiTeccAssociate, createAssociateUpdate, getAssociateWorkspaceForCurrentUser, getKoiTeccAssociate, linkKoiTeccAssociateForCurrentUser, listAssociateWorkspaceOrganizations, listKoiTeccAssociateAccounts, revokeKoiTeccAssociateAccount } from "@/lib/koitecc";

const directory = mkdtempSync(path.join(process.env.CMMC_TEST_TEMP_ROOT!, "staff-security-"));
process.env.CMMC_DB_PATH = path.join(directory, "test.db");
const owner = { id: "private-owner", name: "Private Client", email: "owner@security.example" };
const associate = { id: "real-associate", name: "Associate", email: "associate@security.example" };
const unverified = { id: "unverified-claimant", name: "Claimant", email: "invited@security.example" };
const admin = { id: "approval-admin", name: "Administrator", email: "admin@security.example" };
const legacy = { id: "legacy-staff", name: "Legacy Staff", email: "legacy@security.example" };
const asAdmin = <T>(action: () => Promise<T>) => runWithSessionUser(admin, action);
let privateOrgId = "";

beforeAll(async () => {
  const db = await getDb();
  await db.insert(user).values([owner, { ...admin, role: "admin" }, { ...associate, role: "associate", emailVerified: true }, { ...unverified, emailVerified: false }, { ...legacy, role: "associate", emailVerified: true }]);
  privateOrgId = (await runWithSessionUser(owner, () => createOrganization({ name: "Unassigned Client", targetLevel: 1, handlesCui: false, employeeCount: "1-10", itSetup: "cloud", hasItProvider: false }))).id;
  await db.insert(koiteccAssociates).values([
    { id: "linked-profile", userId: associate.id, approvedAt: new Date().toISOString(), approvedByUserId: admin.id, name: "Associate", email: associate.email, title: "Advisor", createdAt: new Date().toISOString() },
    { id: "invited-profile", name: "Invited Employee", email: unverified.email, title: "Advisor", createdAt: new Date().toISOString() },
    { id: "legacy-profile", userId: legacy.id, name: "Legacy Staff", email: legacy.email, title: "Advisor", createdAt: new Date().toISOString() },
  ]);
});
afterAll(async () => { await closeDb(); });

test("an associate cannot grant themselves access to an unassigned client", async () => {
  await expect(runWithSessionUser(associate, () => assignKoiTeccAssociate(privateOrgId, "linked-profile"))).rejects.toThrow("administrator");
  expect(await (await getDb()).select().from(organizationStaffAssignments)).toHaveLength(0);
});

test("an unverified signup cannot claim an invited employee profile", async () => {
  await expect(runWithSessionUser(unverified, linkKoiTeccAssociateForCurrentUser)).rejects.toThrow(/verif|approv/i);
  const db = await getDb();
  expect((await db.select().from(user).where(eq(user.id, unverified.id)))[0].role).toBe("client");
  expect((await db.select().from(koiteccAssociates).where(eq(koiteccAssociates.id, "invited-profile")))[0].userId).toBeNull();
});

test("legacy automatic links are denied until an administrator reviews them", async () => {
  await expect(runWithSessionUser(legacy, getAssociateWorkspaceForCurrentUser)).rejects.toThrow(/approval/i);
  await expect(runWithSessionUser(legacy, () => getKoiTeccAssociate("legacy-profile"))).rejects.toThrow(/approval/i);
  await asAdmin(() => approveKoiTeccAssociateAccount("legacy-profile", legacy.id));
  expect((await runWithSessionUser(legacy, getAssociateWorkspaceForCurrentUser)).id).toBe("legacy-profile");
});

test.each([owner, associate, unverified])("$name cannot approve, revoke, or enumerate employee accounts", async (actor) => {
  await runWithSessionUser(actor, async () => {
    await expect(approveKoiTeccAssociateAccount("invited-profile", unverified.id)).rejects.toThrow("administrator access");
    await expect(revokeKoiTeccAssociateAccount("linked-profile")).rejects.toThrow("administrator access");
    await expect(listKoiTeccAssociateAccounts()).rejects.toThrow("administrator access");
  });
});

test("approval validates both account identity and active employee record without partial grants", async () => {
  await asAdmin(async () => {
    await expect(approveKoiTeccAssociateAccount("missing-profile", unverified.id)).rejects.toThrow("Associate not found");
    await expect(approveKoiTeccAssociateAccount("invited-profile", owner.id)).rejects.toThrow("does not match");
    const db = await getDb();
    await db.update(koiteccAssociates).set({ active: false }).where(eq(koiteccAssociates.id, "invited-profile"));
    try { await expect(approveKoiTeccAssociateAccount("invited-profile", unverified.id)).rejects.toThrow("Associate not found"); }
    finally { await db.update(koiteccAssociates).set({ active: true }).where(eq(koiteccAssociates.id, "invited-profile")); }
    expect((await db.select().from(user).where(eq(user.id, unverified.id)))[0].role).toBe("client");
  });
});

test("explicit approval is audited and idempotent, grants only assigned clients, and revocation blocks the existing session", async () => {
  await asAdmin(async () => {
    expect((await listKoiTeccAssociateAccounts()).find((account) => account.associateId === "invited-profile")?.userId).toBe(unverified.id);
    await approveKoiTeccAssociateAccount("invited-profile", unverified.id);
    await approveKoiTeccAssociateAccount("invited-profile", unverified.id);
  });
  await runWithSessionUser(unverified, async () => {
    expect((await getAssociateWorkspaceForCurrentUser()).id).toBe("invited-profile");
    expect(await listAssociateWorkspaceOrganizations("invited-profile")).toEqual([]);
    await expect(getKoiTeccAssociate("linked-profile")).rejects.toThrow("access is required");
    await expect(createAssociateUpdate("invited-profile", privateOrgId, "Not assigned")).rejects.toThrow("not assigned");
    await expect(assignKoiTeccAssociate(privateOrgId, "invited-profile")).rejects.toThrow("administrator access");
  });
  await asAdmin(() => assignKoiTeccAssociate(privateOrgId, "invited-profile"));
  const visible = await runWithSessionUser(unverified, () => listAssociateWorkspaceOrganizations("invited-profile"));
  expect(visible.map((org) => org.id)).toEqual([privateOrgId]);
  await asAdmin(() => revokeKoiTeccAssociateAccount("invited-profile"));
  await expect(runWithSessionUser(unverified, getAssociateWorkspaceForCurrentUser)).rejects.toThrow(/approval/i);
  await expect(runWithSessionUser(unverified, linkKoiTeccAssociateForCurrentUser)).rejects.toThrow(/approval/i);
  const db = await getDb();
  expect((await db.select().from(user).where(eq(user.id, unverified.id)))[0].role).toBe("client");
  const events = await db.select().from(auditLog).where(eq(auditLog.targetId, "invited-profile"));
  expect(events.map((event) => event.action)).toEqual(["associate_access_approved", "associate_access_revoked"]);
  expect(events.every((event) => event.actorUserId === admin.id)).toBe(true);
});

test("approval rolls back the role and profile if recording the audit fails", async () => {
  const db = await getDb();
  await db.run(sql`CREATE TRIGGER fail_approval_audit BEFORE INSERT ON audit_log WHEN NEW.action = 'associate_access_approved' BEGIN SELECT RAISE(ABORT, 'fixture audit failure'); END`);
  try { await expect(asAdmin(() => approveKoiTeccAssociateAccount("invited-profile", unverified.id))).rejects.toThrow(); }
  finally { await db.run(sql`DROP TRIGGER fail_approval_audit`); }
  expect((await db.select().from(user).where(eq(user.id, unverified.id)))[0].role).toBe("client");
  const profile = (await db.select().from(koiteccAssociates).where(eq(koiteccAssociates.id, "invited-profile")))[0];
  expect(profile.userId).toBeNull();
  expect(profile.approvedAt).toBeNull();
});
