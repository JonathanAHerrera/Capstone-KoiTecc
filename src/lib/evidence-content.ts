// Content-level defenses applied before an evidence file is stored: confirm the bytes actually
// match the MIME type the browser claimed (so a renamed executable can't masquerade as a photo),
// and strip location/metadata from images so uploaded photos don't leak a business's address.

export class EvidenceContentError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 415) {
    super(message);
    this.name = "EvidenceContentError";
    this.statusCode = statusCode;
  }
}

function hasPrefix(bytes: Buffer, signature: readonly number[], offset = 0): boolean {
  if (bytes.byteLength < offset + signature.length) return false;
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[offset + index] !== signature[index]) return false;
  }
  return true;
}

function isJpeg(bytes: Buffer): boolean {
  return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
}

function isPng(bytes: Buffer): boolean {
  return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function isGif(bytes: Buffer): boolean {
  return hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38]);
}

function isWebp(bytes: Buffer): boolean {
  return hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) && hasPrefix(bytes, [0x57, 0x45, 0x42, 0x50], 8);
}

function isHeic(bytes: Buffer): boolean {
  // ISO-BMFF: "ftyp" at offset 4, brand (heic/heix/mif1/...) follows.
  if (!hasPrefix(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return false;
  const brand = bytes.subarray(8, 12).toString("ascii");
  return ["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(brand);
}

function isIsoBmffVideo(bytes: Buffer): boolean {
  return hasPrefix(bytes, [0x66, 0x74, 0x79, 0x70], 4);
}

function isWebmOrMatroska(bytes: Buffer): boolean {
  return hasPrefix(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
}

function isPdf(bytes: Buffer): boolean {
  return hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46]);
}

// Confirms the file's leading bytes are consistent with the claimed MIME type. Text types are
// not sniffable, so they pass through; unknown image/video subtypes we can't fingerprint also
// pass rather than block a legitimate upload.
export function assertContentMatchesClaimedType(bytes: Buffer, mimeType: string): void {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  const mismatch = (): never => {
    throw new EvidenceContentError(
      `File contents do not match the declared type "${normalized}".`,
    );
  };

  switch (normalized) {
    case "image/jpeg":
      if (!isJpeg(bytes)) mismatch();
      return;
    case "image/png":
      if (!isPng(bytes)) mismatch();
      return;
    case "image/gif":
      if (!isGif(bytes)) mismatch();
      return;
    case "image/webp":
      if (!isWebp(bytes)) mismatch();
      return;
    case "image/heic":
    case "image/heif":
      if (!isHeic(bytes)) mismatch();
      return;
    case "application/pdf":
      if (!isPdf(bytes)) mismatch();
      return;
    case "video/mp4":
    case "video/quicktime":
      if (!isIsoBmffVideo(bytes)) mismatch();
      return;
    case "video/webm":
      if (!isWebmOrMatroska(bytes)) mismatch();
      return;
    default:
      // text/* and any subtype we don't fingerprint are accepted as-is.
      return;
  }
}

// Rewrites a JPEG, dropping APP1 (Exif/XMP) segments where GPS and camera metadata live. Other
// segments, including the entropy-coded image data after Start-of-Scan, are copied verbatim.
function stripJpegMetadata(bytes: Buffer): Buffer {
  if (!isJpeg(bytes)) return bytes;
  const output: Buffer[] = [Buffer.from([0xff, 0xd8])];
  let offset = 2;
  while (offset + 1 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    // Start of Scan: the rest is compressed image data; copy everything that remains.
    if (marker === 0xda) {
      output.push(bytes.subarray(offset));
      offset = bytes.byteLength;
      break;
    }
    // Standalone markers (RSTn, EOI) carry no length field.
    if (marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      output.push(bytes.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }
    const segmentLength = bytes.readUInt16BE(offset + 2);
    const segmentEnd = offset + 2 + segmentLength;
    if (segmentEnd > bytes.byteLength) break;
    const isApp1Metadata = marker === 0xe1;
    if (!isApp1Metadata) {
      output.push(bytes.subarray(offset, segmentEnd));
    }
    offset = segmentEnd;
  }
  return Buffer.concat(output);
}

const PNG_METADATA_CHUNK_TYPES: ReadonlySet<string> = new Set(["eXIf", "tEXt", "iTXt", "zTXt"]);

// Rewrites a PNG, dropping metadata chunks (eXIf and textual chunks) while preserving the
// signature, header, palette, image data, and end marker with their original CRCs.
function stripPngMetadata(bytes: Buffer): Buffer {
  if (!isPng(bytes)) return bytes;
  const output: Buffer[] = [bytes.subarray(0, 8)];
  let offset = 8;
  while (offset + 8 <= bytes.byteLength) {
    const dataLength = bytes.readUInt32BE(offset);
    const chunkType = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const chunkEnd = offset + 12 + dataLength;
    if (chunkEnd > bytes.byteLength) break;
    if (!PNG_METADATA_CHUNK_TYPES.has(chunkType)) {
      output.push(bytes.subarray(offset, chunkEnd));
    }
    offset = chunkEnd;
    if (chunkType === "IEND") break;
  }
  return Buffer.concat(output);
}

// Best-effort removal of embedded location/metadata. JPEG and PNG are rewritten in place; HEIC
// and WebP are left untouched (no dependency-free stripper), which the caller should surface as
// a known limitation rather than a silent guarantee.
export function stripLocationMetadata(bytes: Buffer, mimeType: string): Buffer {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  if (normalized === "image/jpeg") return stripJpegMetadata(bytes);
  if (normalized === "image/png") return stripPngMetadata(bytes);
  return bytes;
}
