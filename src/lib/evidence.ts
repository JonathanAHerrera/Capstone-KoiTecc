import { createHash } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, nowIsoTimestamp } from "@/db/client";
import { ensureDataDirectoriesExist, resolveUploadsDirectoryPath } from "@/db/migrate";
import { evidenceFiles, type EvidenceFileRow } from "@/db/schema";
import { assertContentMatchesClaimedType, stripLocationMetadata } from "@/lib/evidence-content";
import { decryptEvidenceBytes, encryptEvidenceBytes } from "@/lib/evidence-crypto";
import { appendLedgerEntryBestEffort } from "@/lib/ledger";
import { EVIDENCE_KINDS, type EvidenceKind } from "@/lib/practice-types";
import { getPractice } from "@/lib/practices";
import { getSubmissionById } from "@/lib/submissions";

export type EvidenceFile = EvidenceFileRow;

export const MAX_EVIDENCE_FILE_BYTES = 25 * 1024 * 1024;

const ALLOWED_EXACT_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

const EXTENSION_BY_MIME_TYPE: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
};

export class EvidenceValidationError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "EvidenceValidationError";
    this.statusCode = statusCode;
  }
}

export function isEvidenceKind(value: unknown): value is EvidenceKind {
  return typeof value === "string" && (EVIDENCE_KINDS as readonly string[]).includes(value);
}

export function isAllowedEvidenceMimeType(mimeType: string): boolean {
  const normalizedMimeType = mimeType.toLowerCase().split(";")[0].trim();
  return (
    normalizedMimeType.startsWith("image/") ||
    normalizedMimeType.startsWith("video/") ||
    ALLOWED_EXACT_MIME_TYPES.has(normalizedMimeType)
  );
}

function pickStorageExtension(originalName: string, mimeType: string): string {
  const extensionFromName = path.extname(originalName).replace(".", "").toLowerCase();
  if (/^[a-z0-9]{1,8}$/.test(extensionFromName)) return extensionFromName;
  return EXTENSION_BY_MIME_TYPE[mimeType.toLowerCase()] ?? "bin";
}

export function resolveEvidenceAbsolutePath(storagePath: string): string {
  const uploadsDirectory = resolveUploadsDirectoryPath();
  const absolutePath = path.resolve(uploadsDirectory, storagePath);
  if (!absolutePath.startsWith(uploadsDirectory + path.sep)) {
    throw new EvidenceValidationError("Invalid evidence storage path", 400);
  }
  return absolutePath;
}

export async function storeEvidenceFile(
  submissionId: string,
  kind: EvidenceKind,
  file: File,
): Promise<EvidenceFile> {
  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    throw new EvidenceValidationError("Submission not found", 404);
  }
  const practice = getPractice(submission.practiceId);
  if (!practice) {
    throw new EvidenceValidationError("Submission references an unknown practice", 400);
  }
  if (!practice.evidenceTypes.includes(kind)) {
    throw new EvidenceValidationError(
      `Evidence kind "${kind}" is not accepted for ${practice.id}. Accepted: ${practice.evidenceTypes.join(", ")}`,
    );
  }
  if (file.size <= 0) {
    throw new EvidenceValidationError("Uploaded file is empty");
  }
  if (file.size > MAX_EVIDENCE_FILE_BYTES) {
    throw new EvidenceValidationError("File exceeds the 25 MB limit", 413);
  }
  const mimeType = (file.type || "application/octet-stream").toLowerCase().split(";")[0].trim();
  if (!isAllowedEvidenceMimeType(mimeType)) {
    throw new EvidenceValidationError(
      `Unsupported file type "${mimeType}". Upload an image, video, PDF, or plain text file.`,
      415,
    );
  }

  const uploadedBytes = Buffer.from(await file.arrayBuffer());
  // Reject files whose contents contradict the declared type, then strip image location metadata
  // before anything is persisted so GPS coordinates never touch disk.
  assertContentMatchesClaimedType(uploadedBytes, mimeType);
  const sanitizedBytes = stripLocationMetadata(uploadedBytes, mimeType);

  await ensureDataDirectoriesExist();
  const fileId = nanoid();
  // .enc marks that the on-disk payload is an AES-256-GCM blob, not the raw media.
  const storagePath = `${fileId}.${pickStorageExtension(file.name, mimeType)}.enc`;
  const absolutePath = resolveEvidenceAbsolutePath(storagePath);
  await writeFile(absolutePath, encryptEvidenceBytes(sanitizedBytes));

  const row: EvidenceFile = {
    id: fileId,
    submissionId,
    kind,
    originalName: file.name || storagePath,
    mimeType,
    // Size and hash describe the decrypted evidence the reviewer sees, not the ciphertext.
    sizeBytes: sanitizedBytes.byteLength,
    storagePath,
    sha256: createHash("sha256").update(sanitizedBytes).digest("hex"),
    width: null,
    height: null,
    createdAt: nowIsoTimestamp(),
  };
  const db = await getDb();
  await db.insert(evidenceFiles).values(row);

  await appendLedgerEntryBestEffort({
    orgId: submission.orgId,
    type: "evidence_added",
    controlId: submission.practiceId,
    evidenceSha256: row.sha256,
    metadata: {
      submissionId,
      fileId: row.id,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
    },
  });

  return row;
}

// Org-scoped: resolves the file only if its parent submission belongs to the caller's org, so a
// leaked file id from another tenant returns null instead of the row.
export async function getEvidenceFile(fileId: string): Promise<EvidenceFile | null> {
  const db = await getDb();
  const rows = await db.select().from(evidenceFiles).where(eq(evidenceFiles.id, fileId)).limit(1);
  const file = rows[0];
  if (!file) return null;
  const owningSubmission = await getSubmissionById(file.submissionId);
  if (!owningSubmission) return null;
  return file;
}

export async function listEvidenceFilesForSubmission(submissionId: string): Promise<EvidenceFile[]> {
  const db = await getDb();
  return db
    .select()
    .from(evidenceFiles)
    .where(eq(evidenceFiles.submissionId, submissionId))
    .orderBy(evidenceFiles.createdAt);
}

export type ReadableEvidenceFile = {
  file: EvidenceFile;
  absolutePath: string;
};

export async function readEvidenceFile(fileId: string): Promise<ReadableEvidenceFile | null> {
  const file = await getEvidenceFile(fileId);
  if (!file) return null;
  return { file, absolutePath: resolveEvidenceAbsolutePath(file.storagePath) };
}

export async function readEvidenceFileBytes(file: EvidenceFile): Promise<Buffer> {
  const encryptedBlob = await readFile(resolveEvidenceAbsolutePath(file.storagePath));
  return decryptEvidenceBytes(encryptedBlob);
}

export type DecryptedEvidenceFile = {
  file: EvidenceFile;
  bytes: Buffer;
};

// Loads and decrypts a file by id, enforcing the same org scope as getEvidenceFile. Used by the
// file-serving route, which must hand the browser plaintext rather than the on-disk ciphertext.
export async function readDecryptedEvidenceFile(
  fileId: string,
): Promise<DecryptedEvidenceFile | null> {
  const file = await getEvidenceFile(fileId);
  if (!file) return null;
  return { file, bytes: await readEvidenceFileBytes(file) };
}

export async function deleteEvidenceFile(fileId: string): Promise<boolean> {
  const file = await getEvidenceFile(fileId);
  if (!file) return false;
  const db = await getDb();
  await db.delete(evidenceFiles).where(eq(evidenceFiles.id, fileId));
  try {
    await unlink(resolveEvidenceAbsolutePath(file.storagePath));
  } catch (error) {
    const isAlreadyGone = (error as NodeJS.ErrnoException).code === "ENOENT";
    if (!isAlreadyGone) throw error;
  }
  return true;
}
