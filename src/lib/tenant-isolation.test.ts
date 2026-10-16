import { mkdtempSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";

// Proves multi-tenant isolation: two users each own an org + submission, and neither can read
// or mutate the other's data through the session-scoped DAL. Env must be set before any module
// resolves the SQLite path via getDb().
const temporaryDirectory = mkdtempSync(path.join(process.env.CMMC_TEST_TEMP_ROOT!, "tenant-isolation-test-"));
process.env.CMMC_DB_PATH = path.join(temporaryDirectory, "isolation-test.db");
process.env.CMMC_UPLOADS_DIR = path.join(temporaryDirectory, "uploads");

type Tenant = {
  userId: string;
  orgId: string;
  practiceId: string;
  submissionId: string;
};

const tenants: Record<"alice" | "bob", Tenant> = {
  alice: { userId: "", orgId: "", practiceId: "", submissionId: "" },
  bob: { userId: "", orgId: "", practiceId: "", submissionId: "" },
};

let runWithSessionUser: typeof import("@/lib/request-context").runWithSessionUser;
let getOrganization: typeof import("@/lib/org").getOrganization;
let getSubmissionById: typeof import("@/lib/submissions").getSubmissionById;
let markSubmissionStatus: typeof import("@/lib/submissions").markSubmissionStatus;

async function seedTenant(
  slot: "alice" | "bob",
  seed: { id: string; email: string; name: string },
): Promise<void> {
  const { getDb } = await import("@/db/client");
  const { user } = await import("@/db/auth-schema");
  const { createOrganization } = await import("@/lib/org");
  const { getAllPractices } = await import("@/lib/practices");
  const { getOrCreateDraftSubmission } = await import("@/lib/submissions");

  const database = await getDb();
  await database.insert(user).values(seed).onConflictDoNothing();

  await runWithSessionUser(seed, async () => {
    const organization = await createOrganization({
      name: `${seed.name} Co`,
      targetLevel: 1,
      handlesCui: false,
      employeeCount: "1-10",
      itSetup: "cloud",
      hasItProvider: false,
    });
    const practiceId = getAllPractices()[0].id;
    const submission = await getOrCreateDraftSubmission(practiceId);
    tenants[slot] = {
      userId: seed.id,
      orgId: organization.id,
      practiceId,
      submissionId: submission.id,
    };
  });
}

beforeAll(async () => {
  ({ runWithSessionUser } = await import("@/lib/request-context"));
  ({ getOrganization } = await import("@/lib/org"));
  ({ getSubmissionById, markSubmissionStatus } = await import("@/lib/submissions"));

  await seedTenant("alice", { id: "alice", email: "alice@example.test", name: "Alice" });
  await seedTenant("bob", { id: "bob", email: "bob@example.test", name: "Bob" });
});

afterAll(async () => {
  const { closeDb } = await import("@/db/client");
  await closeDb();
});

test("each user resolves only their own organization", async () => {
  const aliceOrg = await runWithSessionUser(
    { id: "alice", email: "alice@example.test", name: "Alice" },
    () => getOrganization(),
  );
  const bobOrg = await runWithSessionUser(
    { id: "bob", email: "bob@example.test", name: "Bob" },
    () => getOrganization(),
  );
  expect(aliceOrg?.id).toBe(tenants.alice.orgId);
  expect(bobOrg?.id).toBe(tenants.bob.orgId);
  expect(aliceOrg?.id).not.toBe(bobOrg?.id);
});

test("a user cannot read another tenant's submission by id", async () => {
  const bobReadingAlice = await runWithSessionUser(
    { id: "bob", email: "bob@example.test", name: "Bob" },
    () => getSubmissionById(tenants.alice.submissionId),
  );
  expect(bobReadingAlice).toBeNull();

  const aliceReadingOwn = await runWithSessionUser(
    { id: "alice", email: "alice@example.test", name: "Alice" },
    () => getSubmissionById(tenants.alice.submissionId),
  );
  expect(aliceReadingOwn?.id).toBe(tenants.alice.submissionId);
});

test("a user cannot mutate another tenant's submission status", async () => {
  await expect(
    runWithSessionUser({ id: "bob", email: "bob@example.test", name: "Bob" }, () =>
      markSubmissionStatus(tenants.alice.submissionId, "submitted"),
    ),
  ).rejects.toThrow();

  // Alice's submission is untouched by Bob's attempt.
  const aliceSubmission = await runWithSessionUser(
    { id: "alice", email: "alice@example.test", name: "Alice" },
    () => getSubmissionById(tenants.alice.submissionId),
  );
  expect(aliceSubmission?.status).toBe("draft");
});
