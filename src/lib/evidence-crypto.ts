import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM at rest for evidence files. One master key (EVIDENCE_ENCRYPTION_KEY, base64 of 32
// bytes) decided for the whole deployment; every file gets a fresh random IV. On-disk layout is
// [12-byte IV][16-byte GCM auth tag][ciphertext].
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 32;

let cachedMasterKey: Buffer | null = null;
let warnedAboutDerivedKey = false;

function deriveMasterKey(): Buffer {
  const configuredKey = process.env.EVIDENCE_ENCRYPTION_KEY;
  if (configuredKey && configuredKey.trim().length > 0) {
    const decoded = Buffer.from(configuredKey.trim(), "base64");
    if (decoded.byteLength !== KEY_LENGTH_BYTES) {
      throw new Error(
        `EVIDENCE_ENCRYPTION_KEY must decode to ${KEY_LENGTH_BYTES} bytes (base64). Generate one with: openssl rand -base64 32`,
      );
    }
    return decoded;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "EVIDENCE_ENCRYPTION_KEY is required in production. Generate one with: openssl rand -base64 32",
    );
  }
  if (!warnedAboutDerivedKey) {
    warnedAboutDerivedKey = true;
    console.warn(
      "EVIDENCE_ENCRYPTION_KEY is not set; using a derived development key. Do not use this for real evidence.",
    );
  }
  return createHash("sha256").update("texas-safe-harbor-dev-evidence-key").digest();
}

function getMasterKey(): Buffer {
  if (!cachedMasterKey) {
    cachedMasterKey = deriveMasterKey();
  }
  return cachedMasterKey;
}

export function encryptEvidenceBytes(plaintext: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getMasterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptEvidenceBytes(blob: Buffer): Buffer {
  if (blob.byteLength < IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES) {
    throw new Error("Encrypted evidence blob is too short to be valid.");
  }
  const iv = blob.subarray(0, IV_LENGTH_BYTES);
  const authTag = blob.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
  const ciphertext = blob.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", getMasterKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
