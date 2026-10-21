import { rm } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = Buffer.from(type, "ascii");
  const lengthBytes = Buffer.alloc(4);
  lengthBytes.writeUInt32BE(data.byteLength);
  const crcBytes = Buffer.alloc(4);
  crcBytes.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lengthBytes, typeBytes, data, crcBytes]);
}

function buildTinyPng(): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2, 0);
  header.writeUInt32BE(2, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  // Two rows of two RGB pixels; each row starts with filter byte 0.
  const rawPixels = Buffer.from([0, 200, 30, 30, 30, 200, 30, 0, 30, 30, 200, 240, 240, 240]);
  return Buffer.concat([
    signature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(rawPixels)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function printHeading(title: string): void {
  console.log(`\n=== ${title} ===`);
}

async function main(): Promise<void> {
  const databasePathOverride = process.env.CMMC_DB_PATH;
  if (databasePathOverride) {
    const resolvedDatabasePath = path.resolve(databasePathOverride);
    process.env.CMMC_UPLOADS_DIR ??= path.join(
      path.dirname(resolvedDatabasePath),
      `${path.basename(resolvedDatabasePath, path.extname(resolvedDatabasePath))}-uploads`,
    );
    for (const suffix of ["", "-wal", "-shm"]) {
      await rm(`${resolvedDatabasePath}${suffix}`, { force: true });
    }
    await rm(process.env.CMMC_UPLOADS_DIR, { recursive: true, force: true });
  }

  const { getDb } = await import("@/db/client");
  const { user } = await import("@/db/auth-schema");
  const { runWithSessionUser } = await import("@/lib/request-context");

  // Seed one authenticated user and run the whole flow as them so the session-scoped DAL
  // resolves this tenant without a live Better Auth cookie.
  const database = await getDb();
  const smokeUser = { id: "smoke-user", name: "Smoke Tester", email: "smoke@example.test" };
  await database.insert(user).values(smokeUser).onConflictDoNothing();
  await runWithSessionUser(smokeUser, () => runSmokeFlow());
}

async function runSmokeFlow(): Promise<void> {
  const { createOrganization, getOrganization } = await import("@/lib/org");
  const { getAllPractices, getPracticesForFramework } = await import("@/lib/practices");
  const {
    getOrCreateDraftSubmission,
    getSubmissionWithEvidence,
    listPracticeStatuses,
    listPracticeStatusesForFramework,
    saveSubmissionNote,
  } = await import("@/lib/submissions");
  const { storeEvidenceFile, readEvidenceFile } = await import("@/lib/evidence");
  const { reviewSubmission } = await import("@/lib/reviewer");
  const { computeProgress, computeProgressForFramework } = await import("@/lib/progress");
  const { buildReadinessPackage } = await import("@/lib/export");


  printHeading("Database");
  console.log(`CMMC_DB_PATH=${process.env.CMMC_DB_PATH ?? "(default data/app.db)"}`);
  console.log(`CMMC_UPLOADS_DIR=${process.env.CMMC_UPLOADS_DIR ?? "(default data/uploads)"}`);

  printHeading("Organization");
  const organization = await createOrganization({
    name: "Smoke Test Machining LLC",
    targetLevel: 1,
    handlesCui: false,
    employeeCount: "11-50",
    itSetup: "mixed",
    hasItProvider: true,
  });
  const storedOrganization = await getOrganization();
  if (!storedOrganization || storedOrganization.id !== organization.id) {
    throw new Error("Organization was not persisted");
  }
  console.log(`created ${organization.id} (${organization.name})`);

  printHeading("Draft submission");
  const practices = getAllPractices();
  if (practices.length === 0) throw new Error("Practice catalog is empty");
  const firstPractice = practices[0];
  const draftSubmission = await getOrCreateDraftSubmission(firstPractice.id);
  const secondDraftLookup = await getOrCreateDraftSubmission(firstPractice.id);
  if (secondDraftLookup.id !== draftSubmission.id) {
    throw new Error("getOrCreateDraftSubmission created a duplicate submission");
  }
  await saveSubmissionNote(
    firstPractice.id,
    "Screenshot of our Microsoft 365 admin center user list, taken this morning. One account per employee.",
  );
  console.log(`practice ${firstPractice.id} -> submission ${draftSubmission.id} (${draftSubmission.status})`);

  printHeading("Evidence");
  const evidenceKind = firstPractice.evidenceTypes.includes("photo")
    ? "photo"
    : firstPractice.evidenceTypes[0];
  const pngBytes = buildTinyPng();
  const uploadedFile = new File([new Uint8Array(pngBytes)], "smoke-evidence.png", { type: "image/png" });
  const storedEvidence = await storeEvidenceFile(draftSubmission.id, evidenceKind, uploadedFile);
  const readableEvidence = await readEvidenceFile(storedEvidence.id);
  if (!readableEvidence) throw new Error("Stored evidence could not be read back");
  console.log(
    `stored ${storedEvidence.id} kind=${storedEvidence.kind} ${storedEvidence.sizeBytes} bytes sha256=${storedEvidence.sha256} at ${readableEvidence.absolutePath}`,
  );

  printHeading("Review");
  const review = await reviewSubmission(draftSubmission.id);
  console.log(`verdict=${review.verdict} confidence=${review.confidence} mock=${review.isMock}`);
  console.log(`summary: ${review.summary}`);
  const submissionAfterReview = await getSubmissionWithEvidence(firstPractice.id);
  if (!submissionAfterReview || submissionAfterReview.submission.status !== review.verdict) {
    throw new Error("Submission status was not updated after review");
  }
  if (!submissionAfterReview.latestReview || submissionAfterReview.latestReview.id !== review.id) {
    throw new Error("Latest review was not persisted or not returned");
  }

  printHeading("Derived statuses");
  const statuses = await listPracticeStatuses();
  for (const [practiceId, status] of Object.entries(statuses)) {
    console.log(`${practiceId.padEnd(18)} ${status}`);
  }

  printHeading("Progress");
  console.log(JSON.stringify(await computeProgress(organization.targetLevel)));
  console.log(JSON.stringify(await computeProgress(2)));

  printHeading("Readiness package (first 20 lines)");
  const markdown = await buildReadinessPackage();
  console.log(markdown.split("\n").slice(0, 20).join("\n"));

  printHeading("TDPSA track (Texas framework reuse)");
  const tdpsaPractices = getPracticesForFramework("tdpsa");
  if (tdpsaPractices.length === 0) throw new Error("TDPSA catalog is empty");
  const firstTdpsaPractice = tdpsaPractices[0];
  if (firstTdpsaPractice.framework !== "tdpsa") {
    throw new Error(`Expected a TDPSA practice, got framework=${firstTdpsaPractice.framework}`);
  }
  const tdpsaDraft = await getOrCreateDraftSubmission(firstTdpsaPractice.id);
  await saveSubmissionNote(
    firstTdpsaPractice.id,
    "Our published privacy notice PDF describing the categories of Texas consumer data we collect and how to opt out.",
  );
  const tdpsaEvidenceKind = firstTdpsaPractice.evidenceTypes.includes("document")
    ? "document"
    : firstTdpsaPractice.evidenceTypes[0];
  const tdpsaUpload = new File([new Uint8Array(buildTinyPng())], "tdpsa-evidence.png", { type: "image/png" });
  const tdpsaEvidence = await storeEvidenceFile(tdpsaDraft.id, tdpsaEvidenceKind, tdpsaUpload);
  const tdpsaReview = await reviewSubmission(tdpsaDraft.id);
  console.log(`TDPSA ${firstTdpsaPractice.id} -> ${tdpsaReview.verdict} (evidence ${tdpsaEvidence.id})`);
  const tdpsaStatuses = await listPracticeStatusesForFramework("tdpsa");
  if (!(firstTdpsaPractice.id in tdpsaStatuses)) {
    throw new Error("TDPSA status map is missing the reviewed practice");
  }
  if (firstTdpsaPractice.id in (await listPracticeStatuses())) {
    throw new Error("TDPSA practice leaked into the CMMC status map");
  }
  const tdpsaProgress = await computeProgressForFramework("tdpsa");
  if (tdpsaProgress.sprsScore !== undefined) {
    throw new Error("TDPSA progress must not carry an SPRS score");
  }
  console.log(JSON.stringify(tdpsaProgress));

  printHeading("TDPSA readiness summary (first 12 lines)");
  const tdpsaMarkdown = await buildReadinessPackage("tdpsa");
  console.log(tdpsaMarkdown.split("\n").slice(0, 12).join("\n"));
  if (/SPRS/.test(tdpsaMarkdown)) throw new Error("TDPSA readiness summary must not mention SPRS");
  if (/POA&M/.test(tdpsaMarkdown)) throw new Error("TDPSA readiness summary must not mention POA&M");

  printHeading("CMMC export regression");
  if (!markdown.startsWith("# CMMC Readiness Package")) {
    throw new Error("CMMC readiness package header changed");
  }

  printHeading("Gap-assessment interview (mock interviewer)");
  const { getFamilies } = await import("@/lib/practices");
  const { startInterview, submitInterviewAnswer, getInterviewFindingStatuses } = await import(
    "@/lib/interview"
  );
  const interviewFamily = getFamilies(organization.targetLevel as 1 | 2)[0];
  let interview = await startInterview(interviewFamily.code);
  if (interview.turns.length !== 1 || interview.turns[0].role !== "assistant") {
    throw new Error("Interview did not open with a single assistant question");
  }
  let interviewGuard = 0;
  while (!interview.isComplete && interviewGuard < 50) {
    interview = await submitInterviewAnswer(
      interview.interviewId,
      "Each employee has their own login and we use a password manager.",
    );
    interviewGuard += 1;
  }
  if (!interview.isComplete) throw new Error("Interview never completed");
  if (interview.findings.length !== interviewFamily.practices.length) {
    throw new Error(
      `Expected one finding per practice (${interviewFamily.practices.length}), got ${interview.findings.length}`,
    );
  }
  for (const finding of interview.findings) {
    if (finding.status !== "unclear") {
      throw new Error(`Mock interview findings should be "unclear", got "${finding.status}"`);
    }
  }
  const findingStatuses = await getInterviewFindingStatuses();
  if (findingStatuses[interviewFamily.practices[0].id] !== "unclear") {
    throw new Error("Interview finding did not surface for the adaptive path");
  }
  console.log(
    `interview ${interview.interviewId} completed: ${interview.findings.length} findings across family ${interviewFamily.code}`,
  );

  printHeading("Coordinator plan");
  const { computeCoordinatorPlan } = await import("@/lib/coordinator");
  const plan = await computeCoordinatorPlan();
  if (plan.totalCount === 0) throw new Error("Coordinator plan has no requirements");
  if (plan.tasks.length === 0 && plan.awaiting.length === 0 && plan.doneCount !== plan.totalCount) {
    throw new Error("Coordinator produced no next steps despite open requirements");
  }
  // The interviewed family now has findings, so it must not be re-offered as a 5-minute check.
  if (plan.tasks.some((task) => task.kind === "start_check" && task.familyCode === interviewFamily.code)) {
    throw new Error("Coordinator re-offered a check for an already-interviewed family");
  }
  console.log(
    `plan: ${plan.tasks.length} next steps, ${plan.doneCount}/${plan.totalCount} accepted, mockNarration=${plan.isMockNarration}`,
  );
  console.log(`narration: ${plan.narration}`);

  printHeading("Done");
  console.log("smoke test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
