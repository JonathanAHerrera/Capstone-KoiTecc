import type { EvidenceKind } from "@/lib/practice-types";

export type UploadedEvidenceFileResponse = {
  id: string;
  submissionId: string;
  kind: EvidenceKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export class EvidenceUploadError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "EvidenceUploadError";
    this.statusCode = statusCode;
  }
}

const FALLBACK_MESSAGE_BY_STATUS: Readonly<Record<number, string>> = {
  0: "Lost the connection while uploading. Check your signal and try again.",
  413: "That file is over the 25 MB limit. Try a smaller photo or a shorter clip.",
  415: "That file type is not supported. Upload an image, video, PDF, or plain text file.",
};

type UploadEvidenceFileInput = {
  submissionId: string;
  kind: EvidenceKind;
  file: File;
  onProgress?: (percent: number) => void;
};

// fetch() cannot report upload progress, so this uses XMLHttpRequest for the progress bar on the card.
export function uploadEvidenceFile({ submissionId, kind, file, onProgress }: UploadEvidenceFileInput): Promise<UploadedEvidenceFileResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/evidence");
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    request.onload = () => {
      const body = request.response as { file?: UploadedEvidenceFileResponse; error?: string } | null;
      if (request.status === 201 && body?.file) {
        onProgress?.(100);
        resolve(body.file);
        return;
      }
      reject(
        new EvidenceUploadError(
          body?.error ?? FALLBACK_MESSAGE_BY_STATUS[request.status] ?? `Upload failed (${request.status})`,
          request.status,
        ),
      );
    };
    request.onerror = () => reject(new EvidenceUploadError(FALLBACK_MESSAGE_BY_STATUS[0], 0));
    request.onabort = () => reject(new EvidenceUploadError("Upload cancelled", 0));

    const formData = new FormData();
    formData.append("submissionId", submissionId);
    formData.append("kind", kind);
    formData.append("file", file, file.name);
    request.send(formData);
  });
}
