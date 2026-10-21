import { mkdtempSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { interviewWithMock } from "@/ai/interview-mock";
import { closeDb, getDb } from "@/db/client";
import { user } from "@/db/auth-schema";
import { createOrganization } from "@/lib/org";
import { runWithSessionUser } from "@/lib/request-context";
import { getActiveInterviewSnapshot, getLatestInterviewSnapshot, startInterview, submitInterviewAnswer } from "@/lib/interview";
import { computeCoordinatorPlan } from "@/lib/coordinator";
import { listPracticeStatuses } from "@/lib/submissions";
import type { Interviewer } from "@/ai/interview";

const directory = mkdtempSync(path.join(process.env.CMMC_TEST_TEMP_ROOT!, "interview-"));
process.env.CMMC_DB_PATH = path.join(directory, "test.db");
process.env.ANTHROPIC_API_KEY = "";
const owner = { id: "interview-owner", name: "Test Owner", email: "owner@example.test" };
const other = { id: "interview-other", name: "Other Owner", email: "other@example.test" };
const scenarioOwner = { id: "scenario-owner", name: "Cedar Machining", email: "cedar@example.test" };
const options = { interviewer: interviewWithMock };

beforeAll(async () => {
  await (await getDb()).insert(user).values([owner, other, scenarioOwner]);
  for (const actor of [owner, other, scenarioOwner]) {
    await runWithSessionUser(actor, () => createOrganization({
      name: actor.name, targetLevel: 1, handlesCui: false,
      employeeCount: "1-10", itSetup: "cloud", hasItProvider: false,
    }));
  }
});

test("a realistic access-control assessment prioritizes actual gaps without accepting self-reports as evidence", async () => {
  // Scripted model outputs test orchestration, not the accuracy of a live language model.
  const scenarios = [
    { answer: "Two departed contractors still have active Microsoft 365 accounts.", status: "not_met" as const, rationale: "Departed contractors still have access." },
    { answer: "The bookkeeper has standard access and only the IT provider is an administrator.", status: "met" as const, rationale: "You explicitly described role-limited access." },
    { answer: "I don't know whether personal laptops are restricted.", status: "unclear" as const, rationale: "Personal device restrictions need confirmation." },
    { answer: "Our sales manager checks all public posts for contract information.", status: "met" as const, rationale: "You described a publication review process." },
  ];
  const scripted: Interviewer = (input) => {
    const index = input.findingsSoFar.length;
    if (input.latestUserAnswer === null) return interviewWithMock(input);
    expect(input.latestUserAnswer).toBe(scenarios[index].answer);
    return {
      model: "scripted-qa", promptVersion: "qa.v1", isMock: true, rawResponse: null,
      turn: {
        assistantMessage: index === 3 ? "Your findings are ready." : "Thanks. Let's look at the next area.",
        proposedFindings: [{ practiceId: input.practices[index].id, source: "attested", status: scenarios[index].status, rationale: scenarios[index].rationale }],
        isFamilyComplete: index === 3,
      },
    };
  };
  await runWithSessionUser(scenarioOwner, async () => {
    let snapshot = await startInterview("AC", { interviewer: scripted });
    for (const scenario of scenarios) snapshot = await submitInterviewAnswer(snapshot.interviewId, scenario.answer, { interviewer: scripted });
    expect(snapshot.findings.map((finding) => finding.status)).toEqual(scenarios.map((scenario) => scenario.status));
    const plan = await computeCoordinatorPlan();
    expect(plan.tasks.slice(0, 4).map((task) => task.id)).toEqual(["AC.L1-b.1.i", "AC.L1-b.1.iii", "AC.L1-b.1.ii", "AC.L1-b.1.iv"]);
    expect(plan.tasks[0].action).toContain("Set this up");
    expect(plan.tasks[0].evidenceHint).toBeTruthy();
    expect(plan.tasks[2].action).toContain("Add proof");
    expect(plan.doneCount).toBe(0);
    const statuses = await listPracticeStatuses();
    for (const finding of snapshot.findings) expect(statuses[finding.practiceId]).toBe("not_started");
  });
});
afterAll(async () => { await closeDb(); });

test("active and completed conversations persist, reject further answers, and stay tenant scoped", async () => {
  await runWithSessionUser(owner, async () => {
    let snapshot = await startInterview("AC", options);
    expect((await startInterview("AC", options)).interviewId).toBe(snapshot.interviewId);
    snapshot = await submitInterviewAnswer(snapshot.interviewId, "We use individual logins.", options);
    expect(await getActiveInterviewSnapshot("AC")).toEqual(snapshot);
    expect(await getLatestInterviewSnapshot("AC")).toEqual(snapshot);
    await runWithSessionUser(other, async () => {
      expect(await getLatestInterviewSnapshot("AC")).toBeNull();
      await expect(submitInterviewAnswer(snapshot.interviewId, "Not yet", options)).rejects.toThrow("could not be found");
    });
    for (let i = 1; i < snapshot.practiceCount; i++) {
      snapshot = await submitInterviewAnswer(snapshot.interviewId, "I'm not sure", options);
    }
    expect(snapshot.isComplete).toBe(true);
    expect(snapshot.findings).toHaveLength(snapshot.practiceCount);
    expect(snapshot.turns).toHaveLength(snapshot.practiceCount * 2 + 1);
    expect(await getActiveInterviewSnapshot("AC")).toBeNull();
    expect(await getLatestInterviewSnapshot("AC")).toEqual(snapshot);
    await expect(submitInterviewAnswer(snapshot.interviewId, "Another answer", options)).rejects.toThrow("already complete");
  });
});
