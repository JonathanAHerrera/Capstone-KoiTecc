import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";

const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "reviewer-tasks-test-"));
process.env.CMMC_DB_PATH = path.join(temporaryDirectory, "reviewer-tasks-test.db");
process.env.CMMC_UPLOADS_DIR = path.join(temporaryDirectory, "uploads");

const alice = { id: "reviewer-alice", email: "alice@example.test", name: "Alice" };
const bob = { id: "reviewer-bob", email: "bob@example.test", name: "Bob" };
let runWithSessionUser: typeof import("@/lib/request-context").runWithSessionUser;
let aliceTaskId = "";

beforeAll(async () => {
  ({ runWithSessionUser } = await import("@/lib/request-context"));
  const { getDb } = await import("@/db/client");
  const { user } = await import("@/db/auth-schema");
  const { createOrganization } = await import("@/lib/org");
  const { createReviewerTask } = await import("@/lib/reviewer-tasks");

  const database = await getDb();
  await database.insert(user).values([alice, bob]).onConflictDoNothing();

  await runWithSessionUser(alice, async () => {
    await createOrganization({
      name: "Alice Co",
      targetLevel: 1,
      handlesCui: false,
      employeeCount: "1-10",
      itSetup: "cloud",
      hasItProvider: false,
    }, 30_000);
    const task = await createReviewerTask({
      kind: "scam_escalation",
      summary: "Review suspicious vendor message",
      detail: { language: "en", riskLevel: "high" },
    });
    aliceTaskId = task.id;
  });

  await runWithSessionUser(bob, async () => {
    await createOrganization({
      name: "Bob Co",
      targetLevel: 1,
      handlesCui: false,
      employeeCount: "1-10",
      itSetup: "cloud",
      hasItProvider: false,
    });
  });
});

afterAll(async () => {
  const { closeDb } = await import("@/db/client");
  closeDb();
  try {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EBUSY") throw error;
  }
});

test("new reviewer tasks are open and visible to their organization", async () => {
  const { listOpenReviewerTasks } = await import("@/lib/reviewer-tasks");

  const tasks = await runWithSessionUser(alice, () => listOpenReviewerTasks());

  expect(tasks).toHaveLength(1);
  expect(tasks[0].id).toBe(aliceTaskId);
  expect(tasks[0].status).toBe("open");
  expect(tasks[0].detail).toContain('"riskLevel":"high"');
});

test("reviewer tasks transition from open to in progress to closed", async () => {
  const { updateReviewerTaskStatus } = await import("@/lib/reviewer-tasks");

  const inProgress = await runWithSessionUser(alice, () =>
    updateReviewerTaskStatus(aliceTaskId, "in_progress"),
  );
  expect(inProgress?.status).toBe("in_progress");

  const closed = await runWithSessionUser(alice, () =>
    updateReviewerTaskStatus(aliceTaskId, "closed"),
  );
  expect(closed?.status).toBe("closed");
});

test("closed reviewer tasks are excluded from the open inbox", async () => {
  const { listOpenReviewerTasks } = await import("@/lib/reviewer-tasks");

  const tasks = await runWithSessionUser(alice, () => listOpenReviewerTasks());

  expect(tasks).toHaveLength(0);
});

test("a different organization cannot update another organization's task", async () => {
  const { updateReviewerTaskStatus } = await import("@/lib/reviewer-tasks");

  const result = await runWithSessionUser(bob, () =>
    updateReviewerTaskStatus(aliceTaskId, "in_progress"),
  );

  expect(result).toBeNull();
});
