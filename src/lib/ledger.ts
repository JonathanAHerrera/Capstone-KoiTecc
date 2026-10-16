import { createHash } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, nowIsoTimestamp } from "@/db/client";
import { ledgerEntries, type LedgerEntryRow, type LedgerEntryType } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export const LEDGER_ENTRY_TYPES: readonly LedgerEntryType[] = [
  "evidence_added",
  "verdict_set",
  "review_signed",
  "integration_check",
  "training_completed",
  "restore_test_logged",
  "policy_signed",
  "framework_version_change",
  "incident_logged",
  "help_requested",
];

// Prepended to the first entry in a chain: there is no previous hash, so the empty string anchors
// seq 1. Keeping it explicit (rather than null) means canonicalization never has to special-case it.
export const GENESIS_PREV_HASH = "";

// The fields that are folded into entry_hash, in this EXACT order. Order and key names are part of
// the on-disk contract: changing either silently invalidates every previously written chain, so
// they must never be reordered or renamed. metadata is deliberately NOT here — it is display-only.
export type LedgerHashedFields = {
  orgId: string;
  seq: number;
  type: LedgerEntryType;
  controlId: string | null;
  evidenceSha256: string | null;
  verdict: string | null;
  actor: string;
  modelId: string | null;
  promptVersion: string | null;
  createdAt: string;
};

// Snake_case keys mirror the spec formula so a hash recomputed from the published formula matches
// ours byte for byte. JSON.stringify over an object literal preserves insertion order in V8, which
// is what makes this canonical for our single-runtime use.
export function canonicalJson(fields: LedgerHashedFields): string {
  return JSON.stringify({
    org_id: fields.orgId,
    seq: fields.seq,
    type: fields.type,
    control_id: fields.controlId,
    evidence_sha256: fields.evidenceSha256,
    verdict: fields.verdict,
    actor: fields.actor,
    model_id: fields.modelId,
    prompt_version: fields.promptVersion,
    created_at: fields.createdAt,
  });
}

export function computeEntryHash(prevHash: string, fields: LedgerHashedFields): string {
  return createHash("sha256")
    .update(prevHash + canonicalJson(fields))
    .digest("hex");
}

function hashedFieldsFromRow(row: LedgerEntryRow): LedgerHashedFields {
  return {
    orgId: row.orgId,
    seq: row.seq,
    type: row.type,
    controlId: row.controlId,
    evidenceSha256: row.evidenceSha256,
    verdict: row.verdict,
    actor: row.actor,
    modelId: row.modelId,
    promptVersion: row.promptVersion,
    createdAt: row.createdAt,
  };
}

export async function listLedgerEntriesForOrg(orgId: string): Promise<LedgerEntryRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.orgId, orgId))
    .orderBy(asc(ledgerEntries.seq));
}

async function getLastLedgerEntryForOrg(orgId: string): Promise<LedgerEntryRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.orgId, orgId))
    .orderBy(asc(ledgerEntries.seq));
  return rows.length > 0 ? rows[rows.length - 1] : null;
}

export type AppendLedgerEntryInput = {
  orgId: string;
  type: LedgerEntryType;
  controlId?: string | null;
  evidenceSha256?: string | null;
  verdict?: string | null;
  // Defaults to the current session user id, falling back to "system" for background jobs.
  actor?: string | null;
  modelId?: string | null;
  promptVersion?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function appendLedgerEntry(input: AppendLedgerEntryInput): Promise<LedgerEntryRow> {
  const db = await getDb();

  let actor = input.actor ?? null;
  if (!actor) {
    try {
      actor = (await getSessionUser())?.id ?? null;
    } catch {
      actor = null;
    }
  }

  const last = await getLastLedgerEntryForOrg(input.orgId);
  const seq = last ? last.seq + 1 : 1;
  const prevHash = last ? last.entryHash : GENESIS_PREV_HASH;
  const createdAt = nowIsoTimestamp();

  const hashedFields: LedgerHashedFields = {
    orgId: input.orgId,
    seq,
    type: input.type,
    controlId: input.controlId ?? null,
    evidenceSha256: input.evidenceSha256 ?? null,
    verdict: input.verdict ?? null,
    actor: actor ?? "system",
    modelId: input.modelId ?? null,
    promptVersion: input.promptVersion ?? null,
    createdAt,
  };

  const row: LedgerEntryRow = {
    id: nanoid(),
    ...hashedFields,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    prevHash,
    entryHash: computeEntryHash(prevHash, hashedFields),
    externalTimestamp: null,
  };

  await db.insert(ledgerEntries).values(row);
  return row;
}

// Best-effort wrapper for the integration hooks: a ledger write must never take down the action it
// records (storing evidence, saving a verdict). Failures are logged and swallowed, matching the
// audit-log contract.
export async function appendLedgerEntryBestEffort(
  input: AppendLedgerEntryInput,
): Promise<LedgerEntryRow | null> {
  try {
    return await appendLedgerEntry(input);
  } catch (error) {
    console.error("appendLedgerEntry failed", { type: input.type, orgId: input.orgId, error });
    return null;
  }
}

export type LedgerVerificationResult = {
  valid: boolean;
  entryCount: number;
  // Seq of the first entry whose stored hash does not match a recomputation, or whose seq/prevHash
  // does not continue the chain. Null when the whole chain verifies.
  brokenAtSeq: number | null;
  reason: string | null;
};

// Recomputes the chain from the first entry and reports the first link that fails. A link fails if
// its seq is out of order, its prevHash does not match the previous entry's entryHash, or its
// entryHash does not match sha256(prevHash || canonicalJson(hashedFields)) — i.e. any hashed field
// was altered in storage.
export async function verifyLedger(orgId: string): Promise<LedgerVerificationResult> {
  const entries = await listLedgerEntriesForOrg(orgId);

  let expectedPrevHash = GENESIS_PREV_HASH;
  let expectedSeq = 1;

  for (const entry of entries) {
    if (entry.seq !== expectedSeq) {
      return {
        valid: false,
        entryCount: entries.length,
        brokenAtSeq: entry.seq,
        reason: `Expected seq ${expectedSeq} but found ${entry.seq}.`,
      };
    }
    if (entry.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        entryCount: entries.length,
        brokenAtSeq: entry.seq,
        reason: "Previous-hash link does not match the prior entry.",
      };
    }
    const recomputed = computeEntryHash(entry.prevHash, hashedFieldsFromRow(entry));
    if (recomputed !== entry.entryHash) {
      return {
        valid: false,
        entryCount: entries.length,
        brokenAtSeq: entry.seq,
        reason: "Entry hash does not match its contents; the row was altered.",
      };
    }
    expectedPrevHash = entry.entryHash;
    expectedSeq += 1;
  }

  return { valid: true, entryCount: entries.length, brokenAtSeq: null, reason: null };
}
