import { mkdtempSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { closeDb, getDb } from "@/db/client";
import { koiteccAssociates, organizationStaffAssignments, user } from "@/db/schema";
import { createOrganization } from "@/lib/org";
import { runWithSessionUser } from "@/lib/request-context";
import { assignKoiTeccAssociate, linkKoiTeccAssociateForCurrentUser } from "@/lib/koitecc";

const directory = mkdtempSync(path.join(process.env.CMMC_TEST_TEMP_ROOT!, "staff-security-"));
process.env.CMMC_DB_PATH = path.join(directory, "test.db");
const owner = { id: "private-owner", name: "Private Client", email: "owner@security.example" };
const associate = { id: "real-associate", name: "Associate", email: "associate@security.example" };
const unverified = { id: "unverified-claimant", name: "Claimant", email: "invited@security.example" };
let privateOrgId = "";

beforeAll(async () => {
  const db = await getDb();
  await db.insert(user).values([owner, { ...associate, role: "associate", emailVerified: true }, { ...unverified, emailVerified: false }]);
  privateOrgId = (await runWithSessionUser(owner, () => createOrganization({ name: "Unassigned Client", targetLevel: 1, handlesCui: false, employeeCount: "1-10", itSetup: "cloud", hasItProvider: false }))).id;
  await db.insert(koiteccAssociates).values([
    { id: "linked-profile", userId: associate.id, name: "Associate", email: associate.email, title: "Advisor", createdAt: new Date().toISOString() },
    { id: "invited-profile", name: "Invited Employee", email: unverified.email, title: "Advisor", createdAt: new Date().toISOString() },
  ]);
});
afterAll(async () => { await closeDb(); });

test("an associate cannot grant themselves access to an unassigned client", async () => {
  await expect(runWithSessionUser(associate, () => assignKoiTeccAssociate(privateOrgId, "linked-profile"))).rejects.toThrow("administrator");
  expect(await (await getDb()).select().from(organizationStaffAssignments)).toHaveLength(0);
});

test("an unverified signup cannot claim an invited employee profile", async () => {
  await expect(runWithSessionUser(unverified, linkKoiTeccAssociateForCurrentUser)).rejects.toThrow(/verif|approv/i);
});
