import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, expect, test } from "vitest";
import { getDb, closeDb } from "@/db/client";
import { associateUpdates, evidenceFiles, frameworkEnrollments, koiteccAssociates, organizationStaffAssignments, organizations, submissions, user } from "@/db/schema";
import { createOrganization } from "@/lib/org";
import { resetAllData } from "@/lib/reset";
import { runWithSessionUser } from "@/lib/request-context";

const directory = mkdtempSync(path.join(process.env.CMMC_TEST_TEMP_ROOT!, "reset-"));
const uploads = path.join(directory, "uploads");
process.env.CMMC_DB_PATH = path.join(directory, "test.db");
process.env.CMMC_UPLOADS_DIR = uploads;
const now = "2026-11-12T15:00:00Z";
afterAll(async () => { await closeDb(); });

test("reset removes only the current organization, its children, and its uploaded files", async () => {
  const db = await getDb();
  const owners = [{ id: "reset-alice", name: "Alice", email: "alice@reset.example" }, { id: "reset-bob", name: "Bob", email: "bob@reset.example" }];
  await db.insert(user).values(owners);
  await db.insert(koiteccAssociates).values({ id: "shared-advisor", name: "Advisor", email: "advisor@reset.example", title: "Advisor", createdAt: now });
  mkdirSync(uploads, { recursive: true });
  const orgIds: string[] = [];
  for (const owner of owners) {
    const org = await runWithSessionUser(owner, () => createOrganization({ name: owner.name, targetLevel: 1, handlesCui: false, employeeCount: "1-10", itSetup: "cloud", hasItProvider: false }));
    orgIds.push(org.id);
    await db.insert(submissions).values({ id: `${owner.id}-draft`, orgId: org.id, practiceId: "AC.L1-b.1.i", status: "draft", createdAt: now, updatedAt: now });
    await db.insert(evidenceFiles).values({ id: `${owner.id}-file`, submissionId: `${owner.id}-draft`, kind: "document", originalName: "proof.txt", mimeType: "text/plain", sizeBytes: 5, storagePath: `${owner.id}.enc`, sha256: "fixture", createdAt: now });
    writeFileSync(path.join(uploads, `${owner.id}.enc`), "proof");
    await db.insert(organizationStaffAssignments).values({ id: `${owner.id}-assignment`, organizationId: org.id, associateId: "shared-advisor", createdAt: now });
    await db.insert(associateUpdates).values({ id: `${owner.id}-update`, organizationId: org.id, associateId: "shared-advisor", message: "Private client update", createdAt: now });
  }
  await runWithSessionUser(owners[0], resetAllData);
  expect((await db.select().from(organizations)).map((org) => org.id)).toEqual([orgIds[1]]);
  expect((await db.select().from(submissions)).map((row) => row.orgId)).toEqual([orgIds[1]]);
  expect((await db.select().from(associateUpdates)).map((row) => row.organizationId)).toEqual([orgIds[1]]);
  expect((await db.select().from(organizationStaffAssignments)).map((row) => row.organizationId)).toEqual([orgIds[1]]);
  expect((await db.select().from(frameworkEnrollments)).map((row) => row.orgId)).toEqual([orgIds[1]]);
  expect(await db.select().from(koiteccAssociates)).toHaveLength(1);
  expect(await db.select().from(user)).toHaveLength(2);
  expect(existsSync(path.join(uploads, "reset-alice.enc"))).toBe(false);
  expect(existsSync(path.join(uploads, "reset-bob.enc"))).toBe(true);
  await expect(runWithSessionUser(owners[0], resetAllData)).rejects.toThrow("Complete onboarding");
});
