import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";

// Characterization test: locks the CMMC readiness package format so the framework-registry
// refactor (and future ones) cannot silently change the historical SPRS + POA&M output.
// Must be set before any module resolves the SQLite path via getDb().
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "cmmc-export-test-"));
process.env.CMMC_DB_PATH = path.join(temporaryDirectory, "export-test.db");
process.env.CMMC_UPLOADS_DIR = path.join(temporaryDirectory, "uploads");

let cmmcReadinessPackage: string;

beforeAll(async () => {
  const { getDb } = await import("@/db/client");
  const { user } = await import("@/db/auth-schema");
  const { runWithSessionUser } = await import("@/lib/request-context");
  const { createOrganization } = await import("@/lib/org");
  const { buildReadinessPackage } = await import("@/lib/export");

  const database = await getDb();
  const fixtureUser = { id: "export-user", name: "Export Fixture", email: "export@example.test" };
  await database.insert(user).values(fixtureUser).onConflictDoNothing();

  cmmcReadinessPackage = await runWithSessionUser(fixtureUser, async () => {
    await createOrganization({
      name: "Fixture Machining LLC",
      targetLevel: 2,
      handlesCui: true,
      employeeCount: "11-50",
      itSetup: "mixed",
      hasItProvider: true,
    });
    return buildReadinessPackage("cmmc");
  });
});

afterAll(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

// The only non-deterministic lines are the generation timestamp and the onboarded date.
function normalizeTimestamps(markdown: string): string {
  return markdown
    .replace(/Generated [^ ]+ by/g, "Generated <TIMESTAMP> by")
    .replace(/(- \*\*Onboarded:\*\* )\d{4}-\d{2}-\d{2}/g, "$1<DATE>");
}

test("CMMC readiness package keeps its historical format", () => {
  expect(normalizeTimestamps(cmmcReadinessPackage)).toMatchSnapshot();
});

test("CMMC readiness package leads with the SPRS package header and sections", () => {
  expect(cmmcReadinessPackage.startsWith("# CMMC Readiness Package")).toBe(true);
  expect(cmmcReadinessPackage).toContain("**Estimated SPRS score:**");
  expect(cmmcReadinessPackage).toContain("## Plan of Action & Milestones (POA&M)");
  expect(cmmcReadinessPackage).toContain("## Practices by family");
});
