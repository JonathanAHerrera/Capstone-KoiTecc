"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronLeft, Send } from "lucide-react";
import { EvidenceCard, type EvidenceCardFile, type EvidenceCardStatus } from "@/components/evidence/evidence-card";
import { EvidencePicker, type EvidencePickerReadyFile } from "@/components/evidence/evidence-picker";
import { PracticeBrief } from "@/components/practice/practice-brief";
import { ReviewProgressCard } from "@/components/practice/review-progress-card";
import { EvidenceUploadError, uploadEvidenceFile, type UploadedEvidenceFileResponse } from "@/components/practice/upload-evidence-file";
import { BigButton } from "@/components/ui/big-button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { ReviewVerdictCard } from "@/components/ui/review-verdict-card";
import { StatusChip, type PracticeStatus } from "@/components/ui/status-chip";
import { useToast } from "@/components/ui/use-toast";
import { getOrCreateDraftSubmissionAction, saveSubmissionNoteAction } from "@/app/actions";
import type { DerivedPracticeStatus, EvidenceKind, Practice } from "@/lib/practice-types";
import type { ReviewRecord } from "@/lib/reviews";

export type PracticeWorkspaceEvidenceFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: EvidenceKind;
  createdAt: string;
};

export type PracticeWorkspaceProps = {
  practice: Practice;
  initialStatus: DerivedPracticeStatus;
  initialSubmissionId: string | null;
  initialNote: string;
  initialEvidenceFiles: PracticeWorkspaceEvidenceFile[];
  initialReview: ReviewRecord | null;
  allOtherFamilyPracticesAccepted: boolean;
  allOtherPracticesAccepted: boolean;
  nextPracticeId: string | null;
  nextPracticeTitle: string | null;
};

type EvidenceListItem = {
  file: EvidenceCardFile;
  status: EvidenceCardStatus;
  uploadPercent: number;
  errorMessage?: string;
  deleting: boolean;
  storedOnServer: boolean;
};

type NoteSaveState = "idle" | "saving" | "saved" | "error";

const MINIMUM_NOTE_LENGTH_FOR_REVIEW = 20;
const CHIP_POP_BEFORE_NAVIGATE_MS = 900;
const CHIP_POP_EASE: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

function previewUrlForStoredFile(fileId: string, mimeType: string): string | undefined {
  return mimeType.startsWith("image/") ? `/api/files/${fileId}` : undefined;
}

function evidenceListItemFromStoredFile(storedFile: PracticeWorkspaceEvidenceFile | UploadedEvidenceFileResponse): EvidenceListItem {
  return {
    file: {
      id: storedFile.id,
      name: storedFile.originalName,
      sizeBytes: storedFile.sizeBytes,
      kind: storedFile.kind,
      mimeType: storedFile.mimeType,
      previewUrl: previewUrlForStoredFile(storedFile.id, storedFile.mimeType),
    },
    status: "uploaded",
    uploadPercent: 100,
    deleting: false,
    storedOnServer: true,
  };
}

function revokeObjectPreviewUrl(previewUrl: string | undefined) {
  if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
}

export function PracticeWorkspace({
  practice,
  initialStatus,
  initialSubmissionId,
  initialNote,
  initialEvidenceFiles,
  initialReview,
  allOtherFamilyPracticesAccepted,
  allOtherPracticesAccepted,
  nextPracticeId,
  nextPracticeTitle,
}: PracticeWorkspaceProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();

  const [practiceStatus, setPracticeStatus] = useState<PracticeStatus>(initialStatus);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceListItem[]>(() => initialEvidenceFiles.map(evidenceListItemFromStoredFile));
  const [note, setNote] = useState(initialNote);
  const [lastSavedNote, setLastSavedNote] = useState(initialNote.trim());
  const [noteSaveState, setNoteSaveState] = useState<NoteSaveState>("idle");
  const [latestReview, setLatestReview] = useState<ReviewRecord | null>(initialReview);
  const [loadingReviewResult, setLoadingReviewResult] = useState(false);
  const [evidenceChangedSinceAcceptance, setEvidenceChangedSinceAcceptance] = useState(false);
  const [chipPopCount, setChipPopCount] = useState(0);
  const [reviewIdToScrollTo, setReviewIdToScrollTo] = useState<string | null>(null);

  const submissionIdRef = useRef<string | null>(initialSubmissionId);
  const practiceStatusRef = useRef<PracticeStatus>(initialStatus);
  const pendingSubmissionPromiseRef = useRef<Promise<string> | null>(null);
  const nextOptimisticFileIdRef = useRef(1);
  const verdictCardRef = useRef<HTMLDivElement>(null);
  const navigateAfterPopTimeoutRef = useRef<number | null>(null);

  const allowedUploadKinds = practice.evidenceTypes.filter((kind) => kind !== "text");
  const uploadedFileCount = evidenceItems.filter((item) => item.status === "uploaded").length;
  const anyUploadInProgress = evidenceItems.some((item) => item.status === "uploading");
  const noteLongEnoughForReview = note.trim().length >= MINIMUM_NOTE_LENGTH_FOR_REVIEW;
  const canSubmitForReview = (uploadedFileCount >= 1 || noteLongEnoughForReview) && !anyUploadInProgress && !loadingReviewResult;
  const showAcceptedActions = practiceStatus === "accepted" && !evidenceChangedSinceAcceptance && !loadingReviewResult;
  const submitButtonLabel = latestReview?.verdict === "needs_work" || evidenceChangedSinceAcceptance ? "Resubmit for review" : "Submit for review";

  useEffect(() => {
    practiceStatusRef.current = practiceStatus;
  }, [practiceStatus]);

  useEffect(() => {
    return () => {
      if (navigateAfterPopTimeoutRef.current !== null) window.clearTimeout(navigateAfterPopTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!reviewIdToScrollTo || !verdictCardRef.current) return;
    verdictCardRef.current.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setReviewIdToScrollTo(null);
  }, [reviewIdToScrollTo, reduceMotion]);

  const markPracticeInProgressIfNotStarted = useCallback(() => {
    setPracticeStatus((currentStatus) => (currentStatus === "not_started" ? "in_progress" : currentStatus));
  }, []);

  const ensureSubmissionId = useCallback(async (): Promise<string> => {
    if (submissionIdRef.current) return submissionIdRef.current;
    if (!pendingSubmissionPromiseRef.current) {
      pendingSubmissionPromiseRef.current = getOrCreateDraftSubmissionAction(practice.id)
        .then((result) => {
          if (!result.ok) throw new Error(result.error);
          submissionIdRef.current = result.data.id;
          return result.data.id;
        })
        .finally(() => {
          pendingSubmissionPromiseRef.current = null;
        });
    }
    return pendingSubmissionPromiseRef.current;
  }, [practice.id]);

  const updateEvidenceItem = useCallback((fileId: string, patch: Partial<EvidenceListItem>) => {
    setEvidenceItems((currentItems) => currentItems.map((item) => (item.file.id === fileId ? { ...item, ...patch } : item)));
  }, []);

  const replaceEvidenceItem = useCallback((fileId: string, replacement: EvidenceListItem) => {
    setEvidenceItems((currentItems) => currentItems.map((item) => (item.file.id === fileId ? replacement : item)));
  }, []);

  const removeEvidenceItem = useCallback((fileId: string) => {
    setEvidenceItems((currentItems) => {
      const removedItem = currentItems.find((item) => item.file.id === fileId);
      revokeObjectPreviewUrl(removedItem?.file.previewUrl);
      return currentItems.filter((item) => item.file.id !== fileId);
    });
  }, []);

  const uploadReadyFile = async (targetSubmissionId: string, readyFile: EvidencePickerReadyFile, optimisticItem: EvidenceListItem) => {
    const optimisticId = optimisticItem.file.id;
    try {
      const storedFile = await uploadEvidenceFile({
        submissionId: targetSubmissionId,
        kind: readyFile.kind,
        file: readyFile.file,
        onProgress: (percent) => updateEvidenceItem(optimisticId, { uploadPercent: percent }),
      });
      revokeObjectPreviewUrl(optimisticItem.file.previewUrl);
      replaceEvidenceItem(optimisticId, evidenceListItemFromStoredFile(storedFile));
      markPracticeInProgressIfNotStarted();
      if (practiceStatusRef.current === "accepted") setEvidenceChangedSinceAcceptance(true);
    } catch (error) {
      const message = error instanceof EvidenceUploadError ? error.message : "Upload failed. Please try again.";
      updateEvidenceItem(optimisticId, { status: "error", errorMessage: message });
      showToast({ tone: "danger", message, durationMs: 6000 });
    }
  };

  const handleFilesReady = async (readyFiles: EvidencePickerReadyFile[]) => {
    const optimisticItems: EvidenceListItem[] = readyFiles.map(({ file, kind }) => ({
      file: {
        id: `pending-${nextOptimisticFileIdRef.current++}`,
        name: file.name,
        sizeBytes: file.size,
        kind,
        mimeType: file.type,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      },
      status: "uploading",
      uploadPercent: 0,
      deleting: false,
      storedOnServer: false,
    }));
    setEvidenceItems((currentItems) => [...currentItems, ...optimisticItems]);

    let targetSubmissionId: string;
    try {
      targetSubmissionId = await ensureSubmissionId();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open this practice. Please try again.";
      for (const optimisticItem of optimisticItems) updateEvidenceItem(optimisticItem.file.id, { status: "error", errorMessage: message });
      showToast({ tone: "danger", message });
      return;
    }

    await Promise.all(readyFiles.map((readyFile, fileIndex) => uploadReadyFile(targetSubmissionId, readyFile, optimisticItems[fileIndex])));
  };

  const handleDeleteEvidence = async (fileId: string) => {
    const targetItem = evidenceItems.find((item) => item.file.id === fileId);
    if (!targetItem) return;
    if (!targetItem.storedOnServer) {
      removeEvidenceItem(fileId);
      return;
    }
    updateEvidenceItem(fileId, { deleting: true });
    try {
      const response = await fetch(`/api/evidence/${encodeURIComponent(fileId)}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not remove this file.");
      }
      removeEvidenceItem(fileId);
      if (practiceStatusRef.current === "accepted") setEvidenceChangedSinceAcceptance(true);
    } catch (error) {
      updateEvidenceItem(fileId, { deleting: false });
      showToast({ tone: "danger", message: error instanceof Error ? error.message : "Could not remove this file." });
    }
  };

  const saveNoteIfChanged = async (): Promise<boolean> => {
    const trimmedNote = note.trim();
    if (trimmedNote === lastSavedNote) return true;
    setNoteSaveState("saving");
    const result = await saveSubmissionNoteAction(practice.id, trimmedNote);
    if (!result.ok) {
      setNoteSaveState("error");
      showToast({ tone: "danger", message: result.error });
      return false;
    }
    submissionIdRef.current = result.data.id;
    setLastSavedNote(trimmedNote);
    setNoteSaveState("saved");
    markPracticeInProgressIfNotStarted();
    return true;
  };

  const navigateToPathAfterChipPop = (celebration: "family" | "complete") => {
    navigateAfterPopTimeoutRef.current = window.setTimeout(() => {
      router.push(`/path?celebrate=${celebration}`);
    }, CHIP_POP_BEFORE_NAVIGATE_MS);
  };

  const submitForReview = async () => {
    if (!canSubmitForReview) return;
    const noteSaved = await saveNoteIfChanged();
    if (!noteSaved) return;

    const statusBeforeReview = practiceStatus;
    setLoadingReviewResult(true);
    setPracticeStatus("under_review");
    try {
      const targetSubmissionId = await ensureSubmissionId();
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: targetSubmissionId }),
      });
      const body = (await response.json().catch(() => null)) as { review?: ReviewRecord; error?: string } | null;
      if (!response.ok || !body?.review) {
        throw new Error(body?.error ?? "Review failed. Please try again.");
      }
      const review = body.review;
      setLatestReview(review);
      setPracticeStatus(review.verdict);
      setEvidenceChangedSinceAcceptance(false);

      if (review.verdict === "accepted") {
        setChipPopCount((currentCount) => currentCount + 1);
        if (allOtherPracticesAccepted) navigateToPathAfterChipPop("complete");
        else if (allOtherFamilyPracticesAccepted) navigateToPathAfterChipPop("family");
        else setReviewIdToScrollTo(review.id);
      } else {
        setReviewIdToScrollTo(review.id);
      }
    } catch (error) {
      setPracticeStatus(statusBeforeReview);
      showToast({ tone: "danger", message: error instanceof Error ? error.message : "Review failed. Please try again.", durationMs: 6000 });
    } finally {
      setLoadingReviewResult(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col pb-[calc(140px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <header className="sticky top-0 z-20 border-b-2 border-border bg-canvas/95 backdrop-blur-sm">
        <div className="flex min-h-14 items-center gap-2 px-2">
          <Link
            href="/path"
            aria-label="Back to path"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary-pale/60"
          >
            <ChevronLeft className="size-7" strokeWidth={2.5} aria-hidden />
          </Link>
          <p className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink">
            <span className="caption mr-2 text-primary">{practice.family}</span>
            {practice.id}
          </p>
          <motion.span
            key={chipPopCount}
            className="inline-flex origin-center pr-2"
            initial={{ scale: 1 }}
            animate={{ scale: chipPopCount > 0 && !reduceMotion ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.45, ease: CHIP_POP_EASE }}
          >
            <StatusChip status={practiceStatus} />
          </motion.span>
        </div>
      </header>

      <div className="flex flex-col gap-6 px-4 pt-5">
        <div>
          <p className="caption text-muted">
            {practice.familyName} · Level {practice.level}
          </p>
          <h1 className="mt-1 text-[26px] leading-tight break-words">{practice.title}</h1>
        </div>

        <PracticeBrief practice={practice} />

        <section aria-labelledby="your-evidence-heading" className="flex flex-col gap-3">
          <div>
            <h2 id="your-evidence-heading" className="text-lg">
              Your evidence
            </h2>
            <p className="mt-0.5 text-sm font-medium text-muted">
              {uploadedFileCount === 0 ? "Nothing uploaded yet." : `${uploadedFileCount} file${uploadedFileCount === 1 ? "" : "s"} uploaded.`}
            </p>
          </div>

          <EvidencePicker allowedKinds={allowedUploadKinds} onFilesReady={handleFilesReady} disabled={loadingReviewResult} />

          {evidenceItems.length > 0 ? (
            <ul className="flex flex-col gap-3" aria-label="Uploaded files">
              {evidenceItems.map((item) => (
                <li key={item.file.id}>
                  <EvidenceCard
                    file={item.file}
                    status={item.status}
                    uploadPercent={item.uploadPercent}
                    errorMessage={item.errorMessage}
                    deleting={item.deleting}
                    onDelete={loadingReviewResult ? undefined : handleDeleteEvidence}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <label htmlFor="submission-note" className="text-lg font-extrabold text-ink">
            Describe what this shows
          </label>
          <textarea
            id="submission-note"
            name="note"
            rows={4}
            value={note}
            disabled={loadingReviewResult}
            placeholder="Describe what this shows — who, where, when"
            onChange={(event) => {
              setNote(event.target.value);
              if (noteSaveState !== "idle") setNoteSaveState("idle");
            }}
            onBlur={() => void saveNoteIfChanged()}
            className="w-full resize-y rounded-card border-2 border-border bg-surface px-4 py-3 text-base font-medium leading-relaxed text-ink outline-none placeholder:text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
          />
          <p className="flex min-h-5 items-center justify-between text-[13px] font-bold text-muted" aria-live="polite">
            <span>
              {noteLongEnoughForReview
                ? "Thanks — that helps the reviewer."
                : `At least ${MINIMUM_NOTE_LENGTH_FOR_REVIEW} characters if you are not uploading a file.`}
            </span>
            <span className={noteSaveState === "saved" ? "text-success-ink" : noteSaveState === "error" ? "text-danger-ink" : ""}>
              {noteSaveState === "saving" ? "Saving…" : noteSaveState === "saved" ? "Saved" : noteSaveState === "error" ? "Not saved" : ""}
            </span>
          </p>
        </section>

        {loadingReviewResult ? <ReviewProgressCard practiceId={practice.id} /> : null}

        {latestReview && !loadingReviewResult ? (
          <div ref={verdictCardRef} className="scroll-mt-20">
            <p className="caption mb-2 text-muted">Readiness review — not an assessment.</p>
            <ReviewVerdictCard
              verdict={latestReview.verdict}
              summary={latestReview.summary}
              objectiveFindings={latestReview.objectiveFindings}
              missingItems={latestReview.missingItems}
              nextSteps={latestReview.nextSteps}
              isMock={latestReview.isMock}
            />
            <p className="mt-2 text-[13px] font-medium text-muted">
              Reviewed {new Date(latestReview.createdAt).toLocaleString()} · confidence {Math.round(latestReview.confidence * 100)}%
            </p>
          </div>
        ) : null}
      </div>

      <BottomActionBar>
        {showAcceptedActions ? (
          <>
            <BigButton variant="success" fullWidth href="/path" icon={<ChevronLeft />}>
              Back to path
            </BigButton>
            {nextPracticeId ? (
              <Link
                href={`/practice/${encodeURIComponent(nextPracticeId)}`}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-btn text-[15px] font-extrabold text-primary hover:bg-primary-pale/60"
              >
                Next requirement{nextPracticeTitle ? `: ${nextPracticeTitle}` : ""}
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <BigButton
              variant="primary"
              fullWidth
              icon={<Send />}
              loading={loadingReviewResult}
              disabled={!canSubmitForReview}
              onClick={() => void submitForReview()}
            >
              {loadingReviewResult ? "Reviewing…" : submitButtonLabel}
            </BigButton>
            {!canSubmitForReview && !loadingReviewResult && !anyUploadInProgress ? (
              <p className="text-center text-[13px] font-bold text-muted">Upload a file or write a short note to submit.</p>
            ) : null}
          </>
        )}
      </BottomActionBar>
    </div>
  );
}
