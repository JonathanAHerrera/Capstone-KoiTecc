"use client";

import { FileText, Film, LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatBytes } from "@/lib/client/format";
import type { EvidenceKind } from "@/lib/practice-types";

export type EvidenceCardStatus = "uploading" | "uploaded" | "error";

export type EvidenceCardFile = {
  id: string;
  name: string;
  sizeBytes: number;
  kind: EvidenceKind;
  mimeType: string;
  previewUrl?: string;
};

export type EvidenceCardProps = {
  file: EvidenceCardFile;
  status?: EvidenceCardStatus;
  uploadPercent?: number;
  errorMessage?: string;
  onDelete?: (fileId: string) => void;
  deleting?: boolean;
  className?: string;
};

const KIND_LABEL: Record<EvidenceKind, string> = {
  photo: "Photo",
  screenshot: "Screenshot",
  document: "Document",
  video: "Video",
  text: "Text",
};

export function EvidenceCard({
  file,
  status = "uploaded",
  uploadPercent = 0,
  errorMessage,
  onDelete,
  deleting = false,
  className = "",
}: EvidenceCardProps) {
  const showImagePreview = Boolean(file.previewUrl) && file.mimeType.startsWith("image/");
  const showVideoIcon = file.kind === "video" || file.mimeType.startsWith("video/");

  return (
    <div
      className={`lip flex items-center gap-3 rounded-card border-2 border-border bg-surface p-3 [--lip-color:var(--color-border)] ${className}`}
    >
      <div className="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-canvas">
        {showImagePreview ? (
          // Blob/object URLs from the picker and API-served files are not static assets, so next/image is not applicable here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.previewUrl} alt="" className="size-full object-cover" />
        ) : showVideoIcon ? (
          <Film className="size-8 text-primary" strokeWidth={2} aria-hidden />
        ) : (
          <FileText className="size-8 text-primary" strokeWidth={2} aria-hidden />
        )}
        {status === "uploading" ? (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <LoaderCircle className="size-6 animate-spin text-primary" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-ink" title={file.name}>
          {file.name}
        </p>
        <p className="caption mt-0.5 text-muted">
          {KIND_LABEL[file.kind]} · {formatBytes(file.sizeBytes)}
        </p>
        {status === "uploading" ? (
          <ProgressBar completed={uploadPercent} total={100} heightPx={8} className="mt-2" label={`Uploading ${file.name}`} />
        ) : null}
        {status === "error" ? (
          <p className="mt-1 flex items-center gap-1 text-sm font-bold text-danger-ink">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {errorMessage ?? "Upload failed"}
          </p>
        ) : null}
      </div>

      {onDelete ? (
        <button
          type="button"
          aria-label={`Remove ${file.name}`}
          disabled={deleting || status === "uploading"}
          onClick={() => onDelete(file.id)}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-danger-pale hover:text-danger-ink disabled:opacity-40"
        >
          {deleting ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Trash2 className="size-5" aria-hidden />}
        </button>
      ) : null}
    </div>
  );
}
