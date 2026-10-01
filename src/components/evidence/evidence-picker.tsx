"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, CircleCheck, FolderOpen, LoaderCircle, TriangleAlert, Video } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { useToast } from "@/components/ui/use-toast";
import { compressImageForUpload } from "@/lib/client/compress-image";
import { detectHeicFile } from "@/lib/client/detect-heic";
import { formatBytes } from "@/lib/client/format";
import type { EvidenceKind } from "./evidence-kind";

export type EvidencePickerReadyFile = { file: File; kind: EvidenceKind };

export type EvidencePickerProps = {
  onFilesReady: (files: EvidencePickerReadyFile[]) => void | Promise<void>;
  allowedKinds?: EvidenceKind[];
  disabled?: boolean;
  className?: string;
};

type PendingFileStatus = "compressing" | "ready" | "rejected";

type PendingFile = {
  id: string;
  name: string;
  sizeBytes: number;
  status: PendingFileStatus;
  percent: number;
  rejectionReason?: string;
};

const ALL_EVIDENCE_KINDS: EvidenceKind[] = ["photo", "document", "screenshot", "video", "text"];
const DOCUMENT_ACCEPT = "application/pdf,.pdf,.txt,.md,.csv,text/plain,text/markdown,text/csv";
const SCREENSHOT_FILENAME_PATTERN = /screen|shot|capture|snip/i;
const PENDING_STATE_CLEAR_DELAY_MS = 1500;

function inferKindForChosenFile(file: File, allowedKinds: EvidenceKind[]): EvidenceKind | null {
  if (file.type.startsWith("video/")) return allowedKinds.includes("video") ? "video" : null;
  if (file.type.startsWith("image/")) {
    const photoAllowed = allowedKinds.includes("photo");
    const screenshotAllowed = allowedKinds.includes("screenshot");
    if (screenshotAllowed && (!photoAllowed || SCREENSHOT_FILENAME_PATTERN.test(file.name))) return "screenshot";
    return photoAllowed ? "photo" : screenshotAllowed ? "screenshot" : null;
  }
  return allowedKinds.includes("document") ? "document" : null;
}

export function EvidencePicker({ onFilesReady, allowedKinds = ALL_EVIDENCE_KINDS, disabled = false, className = "" }: EvidencePickerProps) {
  const { showToast } = useToast();
  const takePhotoInputRef = useRef<HTMLInputElement>(null);
  const chooseFilesInputRef = useRef<HTMLInputElement>(null);
  const recordVideoInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [processingSelection, setProcessingSelection] = useState(false);

  const showTakePhoto = allowedKinds.includes("photo");
  const showRecordVideo = allowedKinds.includes("video");
  const imagesAllowedInPicker = allowedKinds.includes("photo") || allowedKinds.includes("screenshot");
  const documentsAllowedInPicker = allowedKinds.includes("document");
  const showChooseFiles = imagesAllowedInPicker || documentsAllowedInPicker;
  const chooseFilesAccept = [imagesAllowedInPicker ? "image/*" : "", documentsAllowedInPicker ? DOCUMENT_ACCEPT : ""]
    .filter(Boolean)
    .join(",");

  const updatePendingFile = (pendingId: string, patch: Partial<PendingFile>) => {
    setPendingFiles((currentFiles) =>
      currentFiles.map((pendingFile) => (pendingFile.id === pendingId ? { ...pendingFile, ...patch } : pendingFile)),
    );
  };

  const processSelectedFiles = async (selectedFiles: File[], forcedKind?: EvidenceKind) => {
    setProcessingSelection(true);
    const pendingEntries: PendingFile[] = selectedFiles.map((file, fileIndex) => ({
      id: `${Date.now()}-${fileIndex}-${file.name}`,
      name: file.name,
      sizeBytes: file.size,
      status: "compressing",
      percent: 0,
    }));
    setPendingFiles(pendingEntries);

    const readyFiles: EvidencePickerReadyFile[] = [];
    let heicRejectedCount = 0;

    // Images are compressed one at a time: iOS Safari caps canvas memory per tab and
    // decoding several 48MP photos at once crashes the page.
    for (const [fileIndex, file] of selectedFiles.entries()) {
      const pendingId = pendingEntries[fileIndex].id;
      const kind = forcedKind ?? inferKindForChosenFile(file, allowedKinds);
      if (!kind) {
        updatePendingFile(pendingId, { status: "rejected", rejectionReason: "This file type is not accepted here" });
        continue;
      }
      if (kind === "video" || kind === "document" || kind === "text") {
        readyFiles.push({ file, kind });
        updatePendingFile(pendingId, { status: "ready", percent: 100 });
        continue;
      }
      try {
        if (await detectHeicFile(file)) {
          heicRejectedCount += 1;
          updatePendingFile(pendingId, { status: "rejected", rejectionReason: "HEIC photo, pick it from Photos instead" });
          continue;
        }
        const compressedFile = await compressImageForUpload(file, (percent) => updatePendingFile(pendingId, { percent }));
        readyFiles.push({ file: compressedFile, kind });
        updatePendingFile(pendingId, { status: "ready", percent: 100, sizeBytes: compressedFile.size });
      } catch {
        updatePendingFile(pendingId, { status: "rejected", rejectionReason: "Could not read this image" });
      }
    }

    if (heicRejectedCount > 0) {
      showToast({
        tone: "warning",
        durationMs: 6000,
        message:
          heicRejectedCount === 1
            ? "That photo is HEIC. Choose it again from Photos so Safari converts it to JPEG."
            : `${heicRejectedCount} photos are HEIC. Choose them again from Photos so Safari converts them to JPEG.`,
      });
    }

    if (readyFiles.length > 0) await onFilesReady(readyFiles);
    setProcessingSelection(false);
    window.setTimeout(() => {
      setPendingFiles((currentFiles) => currentFiles.filter((pendingFile) => pendingFile.status === "rejected"));
    }, PENDING_STATE_CLEAR_DELAY_MS);
  };

  const handleInputChange = (forcedKind?: EvidenceKind) => (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;
    void processSelectedFiles(selectedFiles, forcedKind);
  };

  const buttonsDisabled = disabled || processingSelection;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {showTakePhoto ? (
        <>
          <input
            ref={takePhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={handleInputChange("photo")}
          />
          <BigButton
            variant="secondary"
            fullWidth
            icon={<Camera />}
            disabled={buttonsDisabled}
            onClick={() => takePhotoInputRef.current?.click()}
          >
            Take a photo
          </BigButton>
        </>
      ) : null}

      {showChooseFiles ? (
        <>
          <input
            ref={chooseFilesInputRef}
            type="file"
            accept={chooseFilesAccept}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={handleInputChange()}
          />
          <BigButton
            variant="secondary"
            fullWidth
            icon={<FolderOpen />}
            disabled={buttonsDisabled}
            onClick={() => chooseFilesInputRef.current?.click()}
          >
            Choose files
          </BigButton>
        </>
      ) : null}

      {showRecordVideo ? (
        <>
          <input
            ref={recordVideoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={handleInputChange("video")}
          />
          <BigButton
            variant="secondary"
            fullWidth
            icon={<Video />}
            disabled={buttonsDisabled}
            onClick={() => recordVideoInputRef.current?.click()}
          >
            Record a video
          </BigButton>
        </>
      ) : null}

      <AnimatePresence initial={false}>
        {pendingFiles.map((pendingFile) => (
          <motion.div
            key={pendingFile.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: -12 }}
            className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 ${
              pendingFile.status === "rejected"
                ? "border-warning/40 bg-warning-pale"
                : pendingFile.status === "ready"
                  ? "border-success/40 bg-success-pale/60"
                  : "border-border bg-surface"
            }`}
            role="status"
          >
            {pendingFile.status === "compressing" ? (
              <LoaderCircle className="size-5 shrink-0 animate-spin text-primary" aria-hidden />
            ) : pendingFile.status === "ready" ? (
              <CircleCheck className="size-5 shrink-0 text-success-ink" aria-hidden />
            ) : (
              <TriangleAlert className="size-5 shrink-0 text-warning-ink" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{pendingFile.name}</p>
              <p className="text-[13px] font-medium text-muted">
                {pendingFile.status === "compressing"
                  ? `Preparing… ${Math.round(pendingFile.percent)}%`
                  : pendingFile.status === "ready"
                    ? `Ready · ${formatBytes(pendingFile.sizeBytes)}`
                    : pendingFile.rejectionReason}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
