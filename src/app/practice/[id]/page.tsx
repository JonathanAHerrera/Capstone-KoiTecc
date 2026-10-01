import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PracticeWorkspace, type PracticeWorkspaceEvidenceFile } from "@/components/practice/practice-workspace";
import { getOrganization } from "@/lib/org";
import { getPractice, getPracticesForLevel } from "@/lib/practices";
import type { DerivedPracticeStatus, Practice } from "@/lib/practice-types";
import { deriveStatusFromSubmission, getSubmissionWithEvidence, listPracticeStatuses } from "@/lib/submissions";

type PracticePageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PracticePageProps): Promise<Metadata> {
  const { id } = await params;
  const practice = getPractice(id);
  return { title: practice ? `${practice.id} · ${practice.title} · CMMC Ready` : "Requirement not found · CMMC Ready" };
}

function findNextPracticeNeedingWork(
  orderedPractices: Practice[],
  currentPracticeId: string,
  statuses: Record<string, DerivedPracticeStatus>,
): Practice | null {
  const currentIndex = orderedPractices.findIndex((practice) => practice.id === currentPracticeId);
  const practicesAfterCurrent = orderedPractices.slice(currentIndex + 1);
  const practicesBeforeCurrent = orderedPractices.slice(0, Math.max(currentIndex, 0));
  return [...practicesAfterCurrent, ...practicesBeforeCurrent].find((practice) => statuses[practice.id] !== "accepted") ?? null;
}

export default async function PracticePage({ params }: PracticePageProps) {
  const { id } = await params;
  const practice = getPractice(id);
  if (!practice) notFound();

  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const [submissionWithEvidence, practiceStatuses] = await Promise.all([
    getSubmissionWithEvidence(practice.id),
    listPracticeStatuses(),
  ]);

  const practicesInLevel = getPracticesForLevel(organization.targetLevel);
  const otherPracticesInLevel = practicesInLevel.filter((candidate) => candidate.id !== practice.id);
  const otherPracticesInFamily = otherPracticesInLevel.filter((candidate) => candidate.family === practice.family);
  const allOtherPracticesAccepted = otherPracticesInLevel.every((candidate) => practiceStatuses[candidate.id] === "accepted");
  const allOtherFamilyPracticesAccepted = otherPracticesInFamily.every((candidate) => practiceStatuses[candidate.id] === "accepted");
  const nextPractice = findNextPracticeNeedingWork(practicesInLevel, practice.id, practiceStatuses);

  const initialEvidenceFiles: PracticeWorkspaceEvidenceFile[] = (submissionWithEvidence?.evidenceFiles ?? []).map((file) => ({
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    kind: file.kind,
    createdAt: file.createdAt,
  }));

  return (
    <PracticeWorkspace
      practice={practice}
      initialStatus={deriveStatusFromSubmission(submissionWithEvidence?.submission)}
      initialSubmissionId={submissionWithEvidence?.submission.id ?? null}
      initialNote={submissionWithEvidence?.submission.note ?? ""}
      initialEvidenceFiles={initialEvidenceFiles}
      initialReview={submissionWithEvidence?.latestReview ?? null}
      allOtherFamilyPracticesAccepted={allOtherFamilyPracticesAccepted}
      allOtherPracticesAccepted={allOtherPracticesAccepted}
      nextPracticeId={nextPractice?.id ?? null}
      nextPracticeTitle={nextPractice?.title ?? null}
    />
  );
}
