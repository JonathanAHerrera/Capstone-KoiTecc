import { createHash } from "node:crypto";

// Near-duplicate detection for image evidence. Exact duplicates are already caught by the file's
// sha256; this catches the "same photo uploaded against two different controls" case where a byte
// or two differs (re-save, EXIF strip) but the picture is the same.
//
// APPROXIMATION: a true perceptual hash decodes the image to a grayscale thumbnail and average-
// hashes the pixels. We do not pull in an image-decoding dependency, so we average-hash the raw
// file bytes instead: downsample the byte stream into 64 buckets and set a bit per bucket that is
// above the mean. This is robust to tiny byte edits but — unlike a real pHash — not to re-encoding
// or resizing. Replacing this with pixel-based pHash is tracked as a TODO.

const FINGERPRINT_BITS = 64;

export function computeImageFingerprint(bytes: Buffer): string {
  if (bytes.byteLength === 0) return "0".repeat(FINGERPRINT_BITS);

  const buckets = new Array<number>(FINGERPRINT_BITS).fill(0);
  const counts = new Array<number>(FINGERPRINT_BITS).fill(0);
  for (let index = 0; index < bytes.byteLength; index += 1) {
    const bucket = Math.floor((index / bytes.byteLength) * FINGERPRINT_BITS);
    const safeBucket = bucket >= FINGERPRINT_BITS ? FINGERPRINT_BITS - 1 : bucket;
    buckets[safeBucket] += bytes[index];
    counts[safeBucket] += 1;
  }

  const averages = buckets.map((sum, index) => (counts[index] > 0 ? sum / counts[index] : 0));
  const mean = averages.reduce((total, value) => total + value, 0) / FINGERPRINT_BITS;

  let bits = "";
  for (const average of averages) {
    bits += average >= mean ? "1" : "0";
  }
  return bits;
}

export function hammingDistance(left: string, right: string): number {
  if (left.length !== right.length) return Math.max(left.length, right.length);
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance;
}

// Two fingerprints within this many differing bits are treated as the same underlying image.
// Chosen conservatively: exact-match (0) plus a small margin for metadata-only edits.
export const REUSE_DISTANCE_THRESHOLD = 4;

export function looksLikeReuse(left: string, right: string): boolean {
  return hammingDistance(left, right) <= REUSE_DISTANCE_THRESHOLD;
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
