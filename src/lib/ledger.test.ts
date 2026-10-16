import { mkdtempSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";

// Env must be set before any module resolves the SQLite path via getDb().
const temporaryDirectory = mkdtempSync(path.join(process.env.CMMC_TEST_TEMP_ROOT!, "ledger-test-"));
process.env.CMMC_DB_PATH = path.join(temporaryDirectory, "ledger-test.db");
process.env.CMMC_UPLOADS_DIR = path.join(temporaryDirectory, "uploads");

const SESSION_USER = { id: "ledger-user", email: "ledger@example.test", name: "Ledger User" };

let orgId = "";
let runWithSessionUser: typeof import("@/lib/request-context").runWithSessionUser;
let appendLedgerEntry: typeof import("@/lib/ledger").appendLedgerEntry;
let verifyLedger: typeof import("@/lib/ledger").verifyLedger;
let listLedgerEntriesForOrg: typeof import("@/lib/ledger").listLedgerEntriesForOrg;

beforeAll(async () => {
  ({ runWithSessionUser } = await import("@/lib/request-context"));
  ({ appendLedgerEntry, verifyLedger, listLedgerEntriesForOrg } = await import("@/lib/ledger"));

  const { getDb } = await import("@/db/client");
  const { user } = await import("@/db/auth-schema");
  const { createOrganization } = await import("@/lib/org");

  const database = await getDb();
  await database.insert(user).values(SESSION_USER).onConflictDoNothing();

  await runWithSessionUser(SESSION_USER, async () => {
    const organization = await createOrganization({
      name: "Ledger Co",
      targetLevel: 1,
      handlesCui: false,
      employeeCount: "1-10",
      itSetup: "cloud",
      hasItProvider: false,
    });
    orgId = organization.id;

    await appendLedgerEntry({
      orgId,
      type: "evidence_added",
      controlId: "essential.mfa-on-every-account",
      evidenceSha256: "a".repeat(64),
      actor: SESSION_USER.id,
    });
    await appendLedgerEntry({
      orgId,
      type: "verdict_set",
      controlId: "essential.mfa-on-every-account",
      verdict: "looks_sufficient",
      modelId: "mock-evidence-scanner",
      actor: SESSION_USER.id,
    });
    await appendLedgerEntry({
      orgId,
      type: "training_completed",
      actor: SESSION_USER.id,
      metadata: { detail: "All staff finished annual training." },
    });
  });
});

afterAll(async () => {
  const { closeDb } = await import("@/db/client");
  await closeDb();
});

test("an untampered chain verifies as valid", async () => {
  const result = await verifyLedger(orgId);
  expect(result.valid).toBe(true);
  expect(result.entryCount).toBe(3);
  expect(result.brokenAtSeq).toBeNull();
});

test("appended entries form a seq-ordered, prev-hash linked chain", async () => {
  const entries = await listLedgerEntriesForOrg(orgId);
  expect(entries.map((entry) => entry.seq)).toEqual([1, 2, 3]);
  expect(entries[0].prevHash).toBe("");
  expect(entries[1].prevHash).toBe(entries[0].entryHash);
  expect(entries[2].prevHash).toBe(entries[1].entryHash);
});

test("tampering with a stored hashed field makes verify fail at that seq", async () => {
  const { getDb } = await import("@/db/client");
  const { ledgerEntries } = await import("@/db/schema");
  const { and, eq } = await import("drizzle-orm");
  const db = await getDb();

  // Alter a hashed field (verdict) on seq 2 without recomputing its stored entry_hash, exactly as
  // a database tamper would. The recomputed hash will no longer match what is stored.
  await db
    .update(ledgerEntries)
    .set({ verdict: "needs_work" })
    .where(and(eq(ledgerEntries.orgId, orgId), eq(ledgerEntries.seq, 2)));

  const result = await verifyLedger(orgId);
  expect(result.valid).toBe(false);
  expect(result.brokenAtSeq).toBe(2);
  expect(result.reason).toBeTruthy();
});
