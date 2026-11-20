import { mkdtempSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { closeDb, getDb } from "@/db/client";
import { associateUpdates, incidents, koiteccAssociates, organizationStaffAssignments, reviewerTasks, submissions, user } from "@/db/schema";
import { createOrganization } from "@/lib/org";
import { runWithSessionUser } from "@/lib/request-context";
import { assignKoiTeccAssociate, createAssociateUpdate, getKoiTeccAssociate, listAssociateUpdatesForCurrentOrganization, listAssociateWorkspaceOrganizations, listKoiTeccAssociates, listKoiTeccOrganizations, removeKoiTeccAssociate, requireKoiTeccAdmin } from "@/lib/koitecc";

const directory = mkdtempSync(path.join(process.env.CMMC_TEST_TEMP_ROOT!, "koitecc-"));
process.env.CMMC_DB_PATH = path.join(directory, "test.db");
const admin = { id: "staff-admin", email: "admin@koitecc.example", name: "QA Administrator" };
const associateUser = { id: "staff-associate", email: "associate@koitecc.example", name: "QA Associate" };
const alice = { id: "client-alice", email: "alice@cedar.example", name: "Cedar Machining" };
const bob = { id: "client-bob", email: "bob@harbor.example", name: "Harbor Design" };
const missingUser = { id: "deleted-user", email: "deleted@example.test", name: "Deleted User" };
const asAdmin = <T>(action: () => Promise<T>) => runWithSessionUser(admin, action);
let aliceOrg = "";
let bobOrg = "";
const now = "2026-11-12T15:00:00.000Z";

beforeAll(async () => {
  const db = await getDb();
  await db.insert(user).values([{ ...admin, role: "admin" }, { ...associateUser, role: "associate" }, alice, bob]);
  for (const actor of [alice, bob]) {
    const org = await runWithSessionUser(actor, () => createOrganization({ name: actor.name, targetLevel: 1, handlesCui: false, employeeCount: "11-50", itSetup: "cloud", hasItProvider: true }));
    if (actor.id === alice.id) aliceOrg = org.id;
    else bobOrg = org.id;
  }
  await db.insert(koiteccAssociates).values([
    { id: "jordan", name: "Jordan Lee", email: "jordan@koitecc.example", title: "Advisor", createdAt: now },
    { id: "morgan", name: "Morgan Patel", email: "morgan@koitecc.example", title: "Advisor", createdAt: now },
    { id: "inactive", name: "Inactive Staff", email: "inactive@koitecc.example", title: "Advisor", active: false, createdAt: now },
  ]);
});
afterAll(async () => { await closeDb(); });

test.each([alice, associateUser, missingUser])("$name cannot read or mutate administrator workspaces", async (actor) => {
  await runWithSessionUser(actor, async () => {
    const forbidden = [
      () => requireKoiTeccAdmin(), () => listKoiTeccAssociates(), () => listKoiTeccOrganizations(),
      () => getKoiTeccAssociate("jordan"), () => listAssociateWorkspaceOrganizations("jordan"),
      () => assignKoiTeccAssociate(aliceOrg, "jordan"), () => removeKoiTeccAssociate(aliceOrg, "jordan"),
      () => createAssociateUpdate("jordan", aliceOrg, "Unauthorized update"),
    ];
    for (const action of forbidden) await expect(action()).rejects.toThrow("access is required");
  });
  expect(await (await getDb()).select().from(organizationStaffAssignments)).toHaveLength(0);
  expect(await (await getDb()).select().from(associateUpdates)).toHaveLength(0);
});

test("admin permission is read from the database on every request and revocation takes effect immediately", async () => {
  expect(await asAdmin(requireKoiTeccAdmin)).toEqual(admin);
  const db = await getDb();
  await db.update(user).set({ role: "client" }).where(eq(user.id, admin.id));
  try { await expect(asAdmin(listKoiTeccOrganizations)).rejects.toThrow("administrator access"); }
  finally { await db.update(user).set({ role: "admin" }).where(eq(user.id, admin.id)); }
});

test("only active associates are selectable and invalid assignment targets are rejected", async () => {
  await asAdmin(async () => {
    expect((await listKoiTeccAssociates()).map((person) => person.id)).toEqual(["jordan", "morgan"]);
    expect(await getKoiTeccAssociate("inactive")).toBeNull();
    for (const id of ["inactive", "nonexistent"]) await expect(assignKoiTeccAssociate(aliceOrg, id)).rejects.toThrow("Associate not found");
    await expect(assignKoiTeccAssociate("nonexistent", "jordan")).rejects.toThrow("Organization not found");
    await expect(listAssociateWorkspaceOrganizations("nonexistent")).rejects.toThrow("Associate not found");
  });
});

test("assignments are idempotent and the workspace contains only assigned clients and open concerns", async () => {
  const db = await getDb();
  await asAdmin(async () => {
    await assignKoiTeccAssociate(aliceOrg, "jordan");
    await assignKoiTeccAssociate(aliceOrg, "jordan");
    await assignKoiTeccAssociate(bobOrg, "morgan");
  });
  expect(await db.select().from(organizationStaffAssignments)).toHaveLength(2);
  await db.insert(submissions).values([
    { id: "alice-proof", orgId: aliceOrg, practiceId: "AC.L1-b.1.i", framework: "cmmc", status: "accepted", note: "Named accounts confirmed", createdAt: now, updatedAt: now },
    { id: "alice-privacy", orgId: aliceOrg, practiceId: "TDPSA-NOTICE-1", framework: "tdpsa", status: "draft", note: "Privacy notice draft", createdAt: now, updatedAt: now },
    { id: "bob-private", orgId: bobOrg, practiceId: "AC.L1-b.1.i", framework: "cmmc", status: "draft", note: "Bob private note", createdAt: now, updatedAt: now },
  ]);
  await db.insert(reviewerTasks).values([
    { id: "alice-help", orgId: aliceOrg, kind: "general_help", summary: "Review MFA setup", status: "open", createdAt: now, updatedAt: now },
    { id: "closed-help", orgId: aliceOrg, kind: "general_help", summary: "Already resolved", status: "closed", createdAt: now, updatedAt: now },
    { id: "bob-help", orgId: bobOrg, kind: "general_help", summary: "Bob private help", status: "open", createdAt: now, updatedAt: now },
  ]);
  await db.insert(incidents).values([
    { id: "alice-incident", orgId: aliceOrg, kind: "hacked_email", discoveredAt: "2026-11-12", status: "contained", notes: "Password reset complete", createdAt: now, updatedAt: now },
    { id: "closed-incident", orgId: aliceOrg, kind: "hacked_email", discoveredAt: "2026-11-12", status: "closed", createdAt: now, updatedAt: now },
  ]);
  const workspace = await asAdmin(() => listAssociateWorkspaceOrganizations("jordan"));
  expect(workspace.map((org) => org.id)).toEqual([aliceOrg]);
  expect(workspace[0].ownerEmail).toBe(alice.email);
  expect(workspace[0].progress.accepted).toBe(1);
  expect(workspace[0].notes.map((note) => note.note)).toEqual(["Named accounts confirmed", "Privacy notice draft"]);
  expect(workspace[0].notes.find((note) => note.practiceId === "TDPSA-NOTICE-1")?.status).toBe("in_progress");
  expect(workspace[0].concerns.map((concern) => concern.id).sort()).toEqual(["alice-help", "alice-incident"]);
});

test("updates require an assignment and clients see only updates for their own organization", async () => {
  await asAdmin(async () => {
    await expect(createAssociateUpdate("jordan", bobOrg, "Wrong client")).rejects.toThrow("not assigned");
    await createAssociateUpdate("jordan", aliceOrg, "Your MFA evidence is ready for review.");
    await createAssociateUpdate("morgan", bobOrg, "Please confirm your backup schedule.");
  });
  const aliceUpdates = await runWithSessionUser(alice, listAssociateUpdatesForCurrentOrganization);
  const bobUpdates = await runWithSessionUser(bob, listAssociateUpdatesForCurrentOrganization);
  expect(aliceUpdates).toHaveLength(1);
  expect(aliceUpdates[0]).toMatchObject({ associateName: "Jordan Lee", message: "Your MFA evidence is ready for review." });
  expect(bobUpdates).toHaveLength(1);
  expect(bobUpdates[0].organizationId).toBe(bobOrg);
});

test("removing an assignment removes workspace access and prevents new updates", async () => {
  await asAdmin(async () => {
    await removeKoiTeccAssociate(aliceOrg, "jordan");
    await removeKoiTeccAssociate(aliceOrg, "jordan");
    expect(await listAssociateWorkspaceOrganizations("jordan")).toEqual([]);
    await expect(createAssociateUpdate("jordan", aliceOrg, "Should be rejected")).rejects.toThrow("not assigned");
    expect((await listKoiTeccOrganizations()).find((org) => org.id === bobOrg)?.associates.map((person) => person.id)).toEqual(["morgan"]);
  });
});
