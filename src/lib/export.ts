import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { evidenceFiles, reviews, submissions, type EvidenceFileRow } from "@/db/schema";
import { requireOrganization, type Organization } from "@/lib/org";
import { getFamilies } from "@/lib/practices";
import type { DerivedPracticeStatus, Practice } from "@/lib/practice-types";
import { computeProgressFromStatuses, type ProgressSummary } from "@/lib/progress";
import { parseReviewRow, type ReviewRecord } from "@/lib/reviews";
import { deriveStatusFromSubmission, type Submission } from "@/lib/submissions";

const STATUS_LABELS: Readonly<Record<DerivedPracticeStatus, string>> = {
  not_started: "Not started",
  in_progress: "In progress",
  under_review: "Under review",
  accepted: "Accepted",
  needs_work: "Needs work",
};

type PracticeExportState = {
  practice: Practice;
  status: DerivedPracticeStatus;
  submission: Submission | null;
  files: EvidenceFileRow[];
  latestReview: ReviewRecord | null;
};

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return "—";
  return isoTimestamp.slice(0, 10);
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

async function loadPracticeExportStates(organization: Organization): Promise<PracticeExportState[]> {
  const db = await getDb();
  const submissionRows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.orgId, organization.id));
  const submissionIds = submissionRows.map((row) => row.id);

  const [fileRows, reviewRows] =
    submissionIds.length === 0
      ? [[], []]
      : await Promise.all([
          db.select().from(evidenceFiles).where(inArray(evidenceFiles.submissionId, submissionIds)),
          db
            .select()
            .from(reviews)
            .where(inArray(reviews.submissionId, submissionIds))
            .orderBy(desc(reviews.createdAt)),
        ]);

  const submissionByPracticeId = new Map(submissionRows.map((row) => [row.practiceId, row]));
  const filesBySubmissionId = new Map<string, EvidenceFileRow[]>();
  for (const fileRow of fileRows) {
    const existing = filesBySubmissionId.get(fileRow.submissionId) ?? [];
    existing.push(fileRow);
    filesBySubmissionId.set(fileRow.submissionId, existing);
  }
  const latestReviewBySubmissionId = new Map<string, ReviewRecord>();
  for (const reviewRow of reviewRows) {
    if (!latestReviewBySubmissionId.has(reviewRow.submissionId)) {
      latestReviewBySubmissionId.set(reviewRow.submissionId, parseReviewRow(reviewRow));
    }
  }

  const states: PracticeExportState[] = [];
  for (const family of getFamilies(organization.targetLevel)) {
    for (const practice of family.practices) {
      const submission = submissionByPracticeId.get(practice.id) ?? null;
      states.push({
        practice,
        status: deriveStatusFromSubmission(submission),
        submission,
        files: submission ? (filesBySubmissionId.get(submission.id) ?? []) : [],
        latestReview: submission ? (latestReviewBySubmissionId.get(submission.id) ?? null) : null,
      });
    }
  }
  return states;
}

function renderOrganizationSection(organization: Organization): string[] {
  return [
    "## Organization",
    "",
    `- **Name:** ${organization.name}`,
    `- **Target CMMC level:** Level ${organization.targetLevel}`,
    `- **Handles CUI:** ${yesNo(organization.handlesCui)}`,
    `- **Employee count:** ${organization.employeeCount}`,
    `- **IT setup:** ${organization.itSetup}`,
    `- **Uses an external IT provider:** ${yesNo(organization.hasItProvider)}`,
    `- **Onboarded:** ${formatDate(organization.createdAt)}`,
    "",
  ];
}

function renderScoreSection(progress: ProgressSummary): string[] {
  const lines = [
    "## Readiness score",
    "",
    `**${progress.percent}%** of Level ${progress.level} practices accepted (${progress.accepted} of ${progress.total}).`,
    "",
    "| Status | Count |",
    "| --- | ---: |",
    `| Accepted | ${progress.accepted} |`,
    `| Needs work | ${progress.needsWork} |`,
    `| Under review | ${progress.underReview} |`,
    `| In progress | ${progress.inProgress} |`,
    `| Not started | ${progress.notStarted} |`,
    "",
  ];
  if (progress.sprsScore !== undefined) {
    lines.push(
      `**Estimated SPRS score:** ${progress.sprsScore} (110 minus the point value of every practice not yet accepted; floor −203).`,
      "",
    );
  }
  return lines;
}

function renderPracticeTables(states: PracticeExportState[]): string[] {
  const lines = ["## Practices by family", ""];
  let currentFamilyCode: string | null = null;
  for (const state of states) {
    if (state.practice.family !== currentFamilyCode) {
      currentFamilyCode = state.practice.family;
      lines.push(
        `### ${state.practice.family} — ${state.practice.familyName}`,
        "",
        "| Practice | Title | NIST 800-171 | Status | Evidence files | Last review |",
        "| --- | --- | --- | --- | ---: | --- |",
      );
    }
    const lastReview = state.latestReview
      ? `${formatDate(state.latestReview.createdAt)} (${state.latestReview.verdict === "accepted" ? "accepted" : "needs work"}${state.latestReview.isMock ? ", mock" : ""})`
      : "—";
    lines.push(
      `| ${state.practice.id} | ${escapeMarkdownTableCell(state.practice.title)} | ${state.practice.nist171Ref} | ${STATUS_LABELS[state.status]} | ${state.files.length} | ${lastReview} |`,
    );
    const nextState = states[states.indexOf(state) + 1];
    if (!nextState || nextState.practice.family !== currentFamilyCode) lines.push("");
  }
  return lines;
}

function renderPoamSection(states: PracticeExportState[]): string[] {
  const openItems = states.filter(
    (state) => state.status === "needs_work" || state.status === "not_started",
  );
  const lines = ["## Plan of Action & Milestones (POA&M)", ""];
  if (openItems.length === 0) {
    lines.push("No open items. Every practice has been accepted or is in progress.", "");
    return lines;
  }
  lines.push(
    "Level 1 has no POA&M allowance: every Level 1 practice must be met. Under Level 2, only 1-point practices may be left open on a POA&M at assessment time.",
    "",
    "| Practice | Title | Status | POA&M eligible | What is missing | Suggested next step | Est. effort |",
    "| --- | --- | --- | --- | --- | --- | ---: |",
  );
  for (const state of openItems) {
    const poamEligible =
      state.practice.level === 2 && state.practice.pointValue === 1 ? "Yes" : "No";
    const missing =
      state.latestReview && state.latestReview.missingItems.length > 0
        ? state.latestReview.missingItems.join("; ")
        : `No evidence submitted. Examples: ${state.practice.evidenceExamples.slice(0, 2).join("; ")}`;
    const nextStep =
      state.latestReview && state.latestReview.nextSteps.length > 0
        ? state.latestReview.nextSteps[0]
        : "Gather evidence and submit for review";
    lines.push(
      `| ${state.practice.id} | ${escapeMarkdownTableCell(state.practice.title)} | ${STATUS_LABELS[state.status]} | ${poamEligible} | ${escapeMarkdownTableCell(missing)} | ${escapeMarkdownTableCell(nextStep)} | ${state.practice.estimatedEffortMinutes} min |`,
    );
  }
  lines.push("");
  return lines;
}

function renderEvidenceIndex(states: PracticeExportState[]): string[] {
  const lines = ["## Evidence index", ""];
  const statesWithFiles = states.filter((state) => state.files.length > 0);
  if (statesWithFiles.length === 0) {
    lines.push("No evidence files have been uploaded yet.", "");
    return lines;
  }
  lines.push(
    "| Practice | File | Kind | Type | Size | SHA-256 | Uploaded | File id |",
    "| --- | --- | --- | --- | ---: | --- | --- | --- |",
  );
  for (const state of statesWithFiles) {
    for (const file of state.files) {
      lines.push(
        `| ${state.practice.id} | ${escapeMarkdownTableCell(file.originalName)} | ${file.kind} | ${file.mimeType} | ${formatBytes(file.sizeBytes)} | \`${file.sha256 || "n/a"}\` | ${formatDate(file.createdAt)} | ${file.id} |`,
      );
    }
  }
  lines.push("");
  return lines;
}

function renderNotesSection(states: PracticeExportState[]): string[] {
  const statesWithNotes = states.filter(
    (state) => state.submission?.note && state.submission.note.trim().length > 0,
  );
  if (statesWithNotes.length === 0) return [];
  const lines = ["## Submitter notes", ""];
  for (const state of statesWithNotes) {
    lines.push(`**${state.practice.id} — ${state.practice.title}**`, "", `> ${state.submission?.note?.replace(/\r?\n/g, "\n> ")}`, "");
  }
  return lines;
}

export async function buildReadinessPackage(): Promise<string> {
  const organization = await requireOrganization();
  const states = await loadPracticeExportStates(organization);
  const statuses: Record<string, DerivedPracticeStatus> = {};
  for (const state of states) statuses[state.practice.id] = state.status;
  const progress = computeProgressFromStatuses(organization.targetLevel, statuses);

  const lines: string[] = [
    "# CMMC Readiness Package",
    "",
    `Generated ${new Date().toISOString()} by CMMC Ready.`,
    "",
    "This readiness package is a self-assessment aid, not a CMMC assessment or certification. Only a C3PAO/DIBCAC certifies; only your Affirming Official affirms in SPRS.",
    "",
    "> AI review verdicts indicate whether uploaded evidence plausibly supports each practice. They should be confirmed by a qualified person before any assessment.",
    "",
    ...renderOrganizationSection(organization),
    ...renderScoreSection(progress),
    ...renderPracticeTables(states),
    ...renderPoamSection(states),
    ...renderEvidenceIndex(states),
    ...renderNotesSection(states),
  ];
  return lines.join("\n");
}
