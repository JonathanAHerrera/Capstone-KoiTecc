import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";

// Env must be set before any module resolves the SQLite path via getDb().
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "binder-test-"));
process.env.CMMC_DB_PATH = path.join(temporaryDirectory, "binder-test.db");
process.env.CMMC_UPLOADS_DIR = path.join(temporaryDirectory, "uploads");

const SESSION_USER = { id: "binder-user", email: "binder@example.test", name: "Binder User" };

let binderMarkdown = "";

beforeAll(async () => {
  const { runWithSessionUser } = await import("@/lib/request-context");
  const { appendLedgerEntry } = await import("@/lib/ledger");
  const { buildEvidenceBinder } = await import("@/lib/binder");
  const { getDb } = await import("@/db/client");
  const { user } = await import("@/db/auth-schema");
  const { createOrganization } = await import("@/lib/org");

  const database = await getDb();
  await database.insert(user).values(SESSION_USER).onConflictDoNothing();

  await runWithSessionUser(SESSION_USER, async () => {
    // Healthcare + card payments triggers the HIPAA and PCI overlays so the binder's overlay
    // sections are populated on the fixture org.
    const organization = await createOrganization({
      name: "Binder Clinic",
      targetLevel: 1,
      handlesCui: false,
      employeeCount: "11-50",
      itSetup: "cloud",
      hasItProvider: true,
      industry: "healthcare",
      takesCardPayments: true,
    });
    const orgId = organization.id;

    await appendLedgerEntry({
      orgId,
      type: "evidence_added",
      controlId: "essential.mfa-on-every-account",
      evidenceSha256: "b".repeat(64),
      actor: SESSION_USER.id,
      metadata: { originalName: "mfa-settings.png" },
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
      metadata: { detail: "Annual security-awareness training completed by all staff." },
    });
    await appendLedgerEntry({
      orgId,
      type: "restore_test_logged",
      actor: SESSION_USER.id,
      metadata: { detail: "Quarterly restore test recovered files successfully." },
    });
    await appendLedgerEntry({
      orgId,
      type: "policy_signed",
      controlId: "essential.password-policy",
      actor: SESSION_USER.id,
      metadata: { detail: "Written password policy acknowledged by all staff." },
    });

    binderMarkdown = await buildEvidenceBinder();
  });
});

afterAll(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

test("the binder renders every required section header", () => {
  const requiredHeadings = [
    "# Evidence Binder — Texas SB 2610 Security Program",
    "## Written security program",
    "## Control status",
    "## Evidence index",
    "## Training records",
    "## Restore tests",
    "## Open items",
    "## Chain verification",
    "## Legal note",
  ];
  for (const heading of requiredHeadings) {
    expect(binderMarkdown).toContain(heading);
  }
});

test("the cover page reports the org, tier, overlays, and reporting period", () => {
  expect(binderMarkdown).toContain("Binder Clinic");
  expect(binderMarkdown).toContain("**Tier:**");
  expect(binderMarkdown).toContain("HIPAA Security Rule");
  expect(binderMarkdown).toContain("PCI DSS");
  expect(binderMarkdown).toContain("**Reporting period:**");
});

test("the evidence index lists the dated ledger hash for uploaded evidence", () => {
  expect(binderMarkdown).toContain("mfa-settings.png");
  expect(binderMarkdown).toContain("b".repeat(64));
});

test("the training and restore-test sections show their recorded detail", () => {
  expect(binderMarkdown).toContain("Annual security-awareness training completed by all staff.");
  expect(binderMarkdown).toContain("Quarterly restore test recovered files successfully.");
});

test("the chain verification section reports an intact ledger", () => {
  expect(binderMarkdown).toContain("verified intact");
});

test("the legal note disclaims certification rather than claiming it", () => {
  expect(binderMarkdown).toContain("it is not a certification");
  expect(binderMarkdown).toContain("aligned with Texas SB 2610");
});
