import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  InterviewInputError,
  runInterviewTurn,
  type Interviewer,
} from "@/ai/interview";
import type {
  InterviewerInput,
  InterviewFindingStatusValue,
  InterviewPracticeContext,
} from "@/ai/interview-schema";
import { getDb, nowIsoTimestamp } from "@/db/client";
import {
  interviewFindings,
  interviews,
  interviewTurns,
  type InterviewFindingSource,
  type InterviewFindingStatus,
  type InterviewRow,
  type InterviewStatus,
} from "@/db/schema";
import { appendLedgerEntryBestEffort } from "@/lib/ledger";
import { requireOrganization } from "@/lib/org";
import { getFamilies } from "@/lib/practices";
import type { CmmcLevel, Practice, PracticeFamily } from "@/lib/practice-types";

export { InterviewInputError } from "@/ai/interview";

export type InterviewTranscriptTurn = { role: "assistant" | "user"; content: string };

export type InterviewFindingView = {
  practiceId: string;
  title: string;
  status: InterviewFindingStatus;
  source: InterviewFindingSource;
  rationale: string;
};

// Everything the UI needs to render the chat for one interview; rebuilt from the database each call.
export type InterviewSnapshot = {
  interviewId: string;
  familyCode: string;
  familyName: string;
  level: CmmcLevel;
  status: InterviewStatus;
  isComplete: boolean;
  practiceCount: number;
  turns: InterviewTranscriptTurn[];
  findings: InterviewFindingView[];
};

export type RunInterviewTurnServerOptions = { interviewer?: Interviewer };

function toPracticeContext(practice: Practice): InterviewPracticeContext {
  return {
    id: practice.id,
    title: practice.title,
    plainEnglish: practice.plainEnglish,
    whyItMatters: practice.whyItMatters,
    assessmentObjectives: practice.assessmentObjectives,
    officialText: practice.officialText,
  };
}

// CMMC-only and level-scoped to the org, matching the rest of the app. A familyCode that is not a
// CMMC family at this level is rejected rather than silently starting an empty interview.
function getCmmcFamily(level: CmmcLevel, familyCode: string): PracticeFamily {
  const family = getFamilies(level).find((candidate) => candidate.code === familyCode);
  if (!family || family.practices.length === 0) {
    throw new InterviewInputError(`No CMMC Level ${level} family with code "${familyCode}".`);
  }
  return family;
}

async function getActiveInterview(
  orgId: string,
  familyCode: string,
  includeCompleted = false,
): Promise<InterviewRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(interviews)
    .where(
      and(
        eq(interviews.orgId, orgId),
        eq(interviews.framework, "cmmc"),
        eq(interviews.familyCode, familyCode),
        includeCompleted ? inArray(interviews.status, ["active", "completed"]) : eq(interviews.status, "active"),
      ),
    )
    .orderBy(desc(interviews.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

// Org-scoped: a cross-tenant interview id resolves to null so no caller can reach another org's chat.
async function getInterviewById(orgId: string, interviewId: string): Promise<InterviewRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(interviews)
    .where(and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

async function listTurns(interviewId: string): Promise<InterviewTranscriptTurn[]> {
  const db = await getDb();
  const rows = await db
    .select({ role: interviewTurns.role, content: interviewTurns.content })
    .from(interviewTurns)
    .where(eq(interviewTurns.interviewId, interviewId))
    .orderBy(asc(interviewTurns.seq));
  return rows.map((row) => ({ role: row.role, content: row.content }));
}

// Latest finding per practice for one interview, in the family's practice order. Append-only rows
// mean the newest createdAt wins; the mock writes one per practice, but a resumed/edited chain stays
// correct because later rows overwrite earlier ones in the map.
async function listFindingsForInterview(
  interviewId: string,
  family: PracticeFamily,
): Promise<InterviewFindingView[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(interviewFindings)
    .where(eq(interviewFindings.interviewId, interviewId))
    .orderBy(asc(interviewFindings.createdAt));

  const latestByPractice = new Map<string, (typeof rows)[number]>();
  for (const row of rows) latestByPractice.set(row.practiceId, row);

  const titleByPractice = new Map(family.practices.map((practice) => [practice.id, practice.title]));
  return family.practices
    .filter((practice) => latestByPractice.has(practice.id))
    .map((practice) => {
      const row = latestByPractice.get(practice.id)!;
      return {
        practiceId: row.practiceId,
        title: titleByPractice.get(row.practiceId) ?? row.practiceId,
        status: row.status,
        source: row.source,
        rationale: row.rationale,
      };
    });
}

async function buildSnapshot(interview: InterviewRow, family: PracticeFamily): Promise<InterviewSnapshot> {
  const [turns, findings] = await Promise.all([
    listTurns(interview.id),
    listFindingsForInterview(interview.id, family),
  ]);
  return {
    interviewId: interview.id,
    familyCode: interview.familyCode,
    familyName: family.name,
    level: interview.level,
    status: interview.status,
    isComplete: interview.status === "completed",
    practiceCount: family.practices.length,
    turns,
    findings,
  };
}

// Runs one interviewer turn and persists its result: the owner's (redacted) answer, the assistant's
// reply, and any findings. When the family is complete the interview is closed and an audit-ledger
// entry is appended. This is the only writer of turns and findings.
async function advanceInterview(
  interview: InterviewRow,
  family: PracticeFamily,
  answer: string | null,
  options: RunInterviewTurnServerOptions,
): Promise<void> {
  const db = await getDb();
  const transcript = await listTurns(interview.id);

  const existingFindings = await listFindingsForInterview(interview.id, family);
  const input: InterviewerInput = {
    familyCode: family.code,
    familyName: family.name,
    level: interview.level,
    practices: family.practices.map(toPracticeContext),
    transcript,
    findingsSoFar: existingFindings.map((finding) => ({
      practiceId: finding.practiceId,
      status: finding.status,
    })),
    latestUserAnswer: answer,
  };

  const outcome = await runInterviewTurn(input, { interviewer: options.interviewer });

  let seq = transcript.length;
  const timestamp = nowIsoTimestamp();

  if (answer !== null && outcome.processedAnswer !== null) {
    seq += 1;
    await db.insert(interviewTurns).values({
      id: nanoid(),
      interviewId: interview.id,
      seq,
      role: "user",
      content: outcome.processedAnswer,
      proposedFindings: null,
      createdAt: timestamp,
    });
  }

  seq += 1;
  await db.insert(interviewTurns).values({
    id: nanoid(),
    interviewId: interview.id,
    seq,
    role: "assistant",
    content: outcome.turn.assistantMessage,
    proposedFindings:
      outcome.turn.proposedFindings.length > 0
        ? JSON.stringify(outcome.turn.proposedFindings)
        : null,
    createdAt: nowIsoTimestamp(),
  });

  for (const finding of outcome.turn.proposedFindings) {
    await db.insert(interviewFindings).values({
      id: nanoid(),
      interviewId: interview.id,
      orgId: interview.orgId,
      practiceId: finding.practiceId,
      status: finding.status as InterviewFindingStatus,
      source: finding.source as InterviewFindingSource,
      rationale: finding.rationale,
      createdAt: nowIsoTimestamp(),
    });
  }

  const nextStatus: InterviewStatus = outcome.turn.isFamilyComplete ? "completed" : interview.status;
  await db
    .update(interviews)
    .set({ status: nextStatus, updatedAt: nowIsoTimestamp() })
    .where(eq(interviews.id, interview.id));
  interview.status = nextStatus;

  if (outcome.turn.isFamilyComplete) {
    const recorded = await listFindingsForInterview(interview.id, family);
    await appendLedgerEntryBestEffort({
      orgId: interview.orgId,
      type: "interview_completed",
      modelId: outcome.model,
      promptVersion: outcome.promptVersion,
      metadata: {
        framework: "cmmc",
        familyCode: family.code,
        level: interview.level,
        findingCount: recorded.length,
      },
    });
  }
}

export async function startInterview(
  familyCode: string,
  options: RunInterviewTurnServerOptions = {},
): Promise<InterviewSnapshot> {
  const organization = await requireOrganization();
  const level = organization.targetLevel as CmmcLevel;
  const family = getCmmcFamily(level, familyCode);

  const existing = await getActiveInterview(organization.id, familyCode);
  if (existing) return buildSnapshot(existing, family);

  const db = await getDb();
  const timestamp = nowIsoTimestamp();
  const interview: InterviewRow = {
    id: nanoid(),
    orgId: organization.id,
    framework: "cmmc",
    familyCode,
    level,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.insert(interviews).values(interview);

  // Generate the opening question (no owner answer yet) so the chat starts with something to read.
  await advanceInterview(interview, family, null, options);
  return buildSnapshot(interview, family);
}

export async function getActiveInterviewSnapshot(
  familyCode: string,
): Promise<InterviewSnapshot | null> {
  const organization = await requireOrganization();
  const level = organization.targetLevel as CmmcLevel;
  const family = getCmmcFamily(level, familyCode);
  const existing = await getActiveInterview(organization.id, familyCode);
  return existing ? buildSnapshot(existing, family) : null;
}

// Returning to a finished check should show its saved results, not an empty start screen.
export async function getLatestInterviewSnapshot(familyCode: string): Promise<InterviewSnapshot | null> {
  const organization = await requireOrganization();
  const existing = await getActiveInterview(organization.id, familyCode, true);
  if (!existing) return null;
  return buildSnapshot(existing, getCmmcFamily(existing.level, familyCode));
}

export async function submitInterviewAnswer(
  interviewId: string,
  answer: string,
  options: RunInterviewTurnServerOptions = {},
): Promise<InterviewSnapshot> {
  const organization = await requireOrganization();
  const interview = await getInterviewById(organization.id, interviewId);
  if (!interview) {
    throw new InterviewInputError("This check could not be found.");
  }
  if (interview.status !== "active") {
    throw new InterviewInputError("This check is already complete.");
  }
  const family = getCmmcFamily(interview.level, interview.familyCode);
  await advanceInterview(interview, family, answer, options);
  return buildSnapshot(interview, family);
}

// For the adaptive path: the latest interview finding per practice across all of the org's
// interviews, so the path can surface controls the owner said are not in place or is unsure about.
export async function getInterviewFindingStatuses(): Promise<
  Record<string, InterviewFindingStatusValue>
> {
  const organization = await requireOrganization();
  const db = await getDb();
  const rows = await db
    .select({
      practiceId: interviewFindings.practiceId,
      status: interviewFindings.status,
    })
    .from(interviewFindings)
    .where(eq(interviewFindings.orgId, organization.id))
    .orderBy(asc(interviewFindings.createdAt));

  const latest: Record<string, InterviewFindingStatusValue> = {};
  for (const row of rows) latest[row.practiceId] = row.status;
  return latest;
}
