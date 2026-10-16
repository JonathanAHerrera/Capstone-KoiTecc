import type { LedgerEntryRow } from "@/db/schema";
import { getOverlay, type OverlayId } from "@/frameworks/overlays";
import { buildSb2610Plan, type Sb2610Plan } from "@/frameworks/sb2610";
import type { ControlDefinition } from "@/frameworks/types";
import {
  listLedgerEntriesForOrg,
  verifyLedger,
  type LedgerVerificationResult,
} from "@/lib/ledger";
import {
  deriveOrgProfile,
  getFrameworkEnrollment,
  requireOrganization,
  type Organization,
} from "@/lib/org";

// The evidence binder is the SB 2610 program dossier: everything a lawyer or insurer would want to
// see to judge that a documented program existed. It renders as structured markdown (parity with
// the existing readiness export; print-to-PDF is a follow-up) so every section is testable text.

// Legal note from section 1 of the spec. Deliberately avoids "compliant/protected/guaranteed" and
// never claims the safe harbor is "achieved" — only a court decides that.
const LEGAL_NOTE =
  "This binder documents the security program this organization has put in place and the evidence " +
  "behind it. It is a record of a documented program aligned with Texas SB 2610 (Bus. & Com. Code " +
  "ch. 542); it is not a certification, and it does not make the organization \"compliant,\" " +
  "\"protected,\" or \"safe.\" SB 2610 limits punitive damages only, a court decides whether it " +
  "applies, and a qualified attorney should review this program before it is relied upon.";

const TIER_LABELS: Readonly<Record<NonNullable<Sb2610Plan["tier"]>, string>> = {
  "sb2610-simple": "Simple (fewer than 20 employees)",
  "sb2610-moderate": "Moderate (20 to 99 employees)",
  "sb2610-full": "Full (100 to 249 employees)",
};

const VERDICT_STATUS_LABELS: Readonly<Record<string, string>> = {
  looks_sufficient: "Looks sufficient",
  accepted: "Looks sufficient",
  needs_work: "Needs work",
  needs_human_review: "Needs human review",
};

function formatDate(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return "—";
  return isoTimestamp.slice(0, 10);
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

function parseMetadata(serialized: string | null): Record<string, unknown> {
  if (!serialized) return {};
  try {
    const parsed: unknown = JSON.parse(serialized);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function metadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function overlayNames(overlays: OverlayId[]): string {
  if (overlays.length === 0) return "None";
  return overlays.map((id) => getOverlay(id).name).join(", ");
}

// Earliest and latest ledger timestamps bound the reporting window; fall back to the org's
// onboarding date when the chain is empty so the cover page always shows a range.
function resolveDateRange(
  entries: LedgerEntryRow[],
  organization: Organization,
): { from: string; to: string } {
  if (entries.length === 0) {
    const today = new Date().toISOString();
    return { from: formatDate(organization.createdAt), to: formatDate(today) };
  }
  return {
    from: formatDate(entries[0].createdAt),
    to: formatDate(entries[entries.length - 1].createdAt),
  };
}

// Latest verdict recorded for each control id, so the status table reflects the most recent review.
// Both AI/human reviews (verdict_set) and read-only integration checks (integration_check) carry a
// verdict and set control status; entries are seq-ordered, so the most recent of either type wins.
function latestVerdictByControl(entries: LedgerEntryRow[]): Map<string, LedgerEntryRow> {
  const latest = new Map<string, LedgerEntryRow>();
  for (const entry of entries) {
    const setsVerdict = entry.type === "verdict_set" || entry.type === "integration_check";
    if (!setsVerdict || !entry.controlId || !entry.verdict) continue;
    latest.set(entry.controlId, entry);
  }
  return latest;
}

function renderCoverPage(
  organization: Organization,
  plan: Sb2610Plan,
  overlays: OverlayId[],
  range: { from: string; to: string },
): string[] {
  const tierLabel = plan.eligible && plan.tier ? TIER_LABELS[plan.tier] : "Not eligible for the self-serve tiers";
  return [
    "# Evidence Binder — Texas SB 2610 Security Program",
    "",
    `- **Organization:** ${organization.name}`,
    `- **Tier:** ${tierLabel}`,
    `- **Industry overlays:** ${overlayNames(overlays)}`,
    `- **Reporting period:** ${range.from} to ${range.to}`,
    `- **Generated:** ${new Date().toISOString()}`,
    "",
    `> ${LEGAL_NOTE}`,
    "",
  ];
}

function renderWrittenSecurityProgram(plan: Sb2610Plan, overlays: OverlayId[]): string[] {
  const lines = [
    "## Written security program",
    "",
    "This organization maintains a documented security program scaled to its headcount under Texas " +
      "SB 2610. The program is built from the threat-priority essentials that apply to every tier, " +
      "plus any heavier catalog and industry overlays its profile triggers. Each control below is " +
      "tracked with its own evidence and review history in the sections that follow.",
    "",
    plan.eligible
      ? `The organization's program comprises **${plan.controls.length}** controls across its tier baseline and overlays.`
      : "The organization is outside the self-serve SB 2610 tiers and should be routed to KOITECC for a tailored program.",
    "",
  ];
  if (overlays.length > 0) {
    lines.push("Industry overlays attached:", "");
    for (const id of overlays) {
      const overlay = getOverlay(id);
      lines.push(`- **${overlay.name}** (${overlay.sourceRef}) — ${overlay.reason}`);
    }
    lines.push("");
  }
  return lines;
}

function controlStatus(
  control: ControlDefinition,
  verdicts: Map<string, LedgerEntryRow>,
  evidenceControlIds: Set<string>,
): string {
  const verdictEntry = verdicts.get(control.id);
  if (verdictEntry?.verdict) {
    return VERDICT_STATUS_LABELS[verdictEntry.verdict] ?? verdictEntry.verdict;
  }
  if (evidenceControlIds.has(control.id)) return "Evidence submitted";
  return "Not started";
}

function renderControlStatusTable(
  plan: Sb2610Plan,
  verdicts: Map<string, LedgerEntryRow>,
  evidenceControlIds: Set<string>,
): string[] {
  const lines = [
    "## Control status",
    "",
    "| Control | Title | Safeguard | Source | Status | Last reviewed |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  if (plan.controls.length === 0) {
    lines.push("| — | No controls in scope | — | — | — | — |", "");
    return lines;
  }
  for (const control of plan.controls) {
    const verdictEntry = verdicts.get(control.id);
    lines.push(
      `| ${control.id} | ${escapeMarkdownTableCell(control.title)} | ${control.safeguardKind} | ${escapeMarkdownTableCell(control.sourceRef)} | ${controlStatus(control, verdicts, evidenceControlIds)} | ${formatDate(verdictEntry?.createdAt ?? null)} |`,
    );
  }
  lines.push("");
  return lines;
}

function renderEvidenceIndex(entries: LedgerEntryRow[]): string[] {
  const evidenceEntries = entries.filter((entry) => entry.type === "evidence_added");
  const lines = ["## Evidence index", ""];
  if (evidenceEntries.length === 0) {
    lines.push("No evidence has been recorded in the ledger yet.", "");
    return lines;
  }
  lines.push(
    "| Seq | Control | File | Evidence SHA-256 | Ledger entry hash | Recorded |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const entry of evidenceEntries) {
    const metadata = parseMetadata(entry.metadata);
    const fileName = metadataString(metadata, "originalName") ?? "—";
    lines.push(
      `| ${entry.seq} | ${entry.controlId ?? "—"} | ${escapeMarkdownTableCell(fileName)} | \`${entry.evidenceSha256 ?? "n/a"}\` | \`${entry.entryHash}\` | ${formatDate(entry.createdAt)} |`,
    );
  }
  lines.push("");
  return lines;
}

function renderLedgerTypeSection(
  entries: LedgerEntryRow[],
  type: LedgerEntryRow["type"],
  heading: string,
  emptyMessage: string,
): string[] {
  const matching = entries.filter((entry) => entry.type === type);
  const lines = [`## ${heading}`, ""];
  if (matching.length === 0) {
    lines.push(emptyMessage, "");
    return lines;
  }
  lines.push(
    "| Seq | Control | Detail | Recorded | Ledger entry hash |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const entry of matching) {
    const metadata = parseMetadata(entry.metadata);
    const detail = metadataString(metadata, "detail") ?? metadataString(metadata, "note") ?? "—";
    lines.push(
      `| ${entry.seq} | ${entry.controlId ?? "—"} | ${escapeMarkdownTableCell(detail)} | ${formatDate(entry.createdAt)} | \`${entry.entryHash}\` |`,
    );
  }
  lines.push("");
  return lines;
}

function renderOpenItems(
  plan: Sb2610Plan,
  verdicts: Map<string, LedgerEntryRow>,
  evidenceControlIds: Set<string>,
): string[] {
  const openControls = plan.controls.filter((control) => {
    const status = controlStatus(control, verdicts, evidenceControlIds);
    return status !== "Looks sufficient";
  });
  const lines = ["## Open items", ""];
  if (openControls.length === 0) {
    lines.push("No open items. Every control in scope has evidence that looks sufficient.", "");
    return lines;
  }
  lines.push(
    "| Control | Title | Status | What to do next |",
    "| --- | --- | --- | --- |",
  );
  for (const control of openControls) {
    const nextStep = control.evidenceHints[0] ?? "Gather evidence and submit it for review.";
    lines.push(
      `| ${control.id} | ${escapeMarkdownTableCell(control.title)} | ${controlStatus(control, verdicts, evidenceControlIds)} | ${escapeMarkdownTableCell(nextStep)} |`,
    );
  }
  lines.push("");
  return lines;
}

function renderChainVerification(result: LedgerVerificationResult): string[] {
  const lines = ["## Chain verification", ""];
  if (result.valid) {
    lines.push(
      `The evidence ledger verified intact across all **${result.entryCount}** entries. Every entry's ` +
        "hash matches its contents and links to the entry before it, so the record has not been altered " +
        "since it was written.",
      "",
    );
  } else {
    lines.push(
      `**Verification failed at entry ${result.brokenAtSeq} of ${result.entryCount}.** ${result.reason ?? ""}`.trim(),
      "",
      "A failed verification means a stored row no longer matches its hash. The binder should not be " +
        "relied upon until the ledger is investigated.",
      "",
    );
  }
  return lines;
}

function renderLegalNote(): string[] {
  return ["## Legal note", "", LEGAL_NOTE, ""];
}

export async function buildEvidenceBinder(): Promise<string> {
  const organization = await requireOrganization();
  const plan = buildSb2610Plan(deriveOrgProfile(organization));
  const enrollment = await getFrameworkEnrollment(organization.id, "sb2610");

  // Prefer the persisted enrollment overlays (what the org actually enrolled in); fall back to the
  // freshly recomputed plan when no enrollment row exists yet.
  let overlays: OverlayId[] = plan.overlays;
  if (enrollment) {
    try {
      const parsed: unknown = JSON.parse(enrollment.overlays);
      if (Array.isArray(parsed)) overlays = parsed as OverlayId[];
    } catch {
      overlays = plan.overlays;
    }
  }

  const entries = await listLedgerEntriesForOrg(organization.id);
  const verification = await verifyLedger(organization.id);
  const range = resolveDateRange(entries, organization);
  const verdicts = latestVerdictByControl(entries);
  const evidenceControlIds = new Set(
    entries
      .filter((entry) => entry.type === "evidence_added" && entry.controlId)
      .map((entry) => entry.controlId as string),
  );

  const lines: string[] = [
    ...renderCoverPage(organization, plan, overlays, range),
    ...renderWrittenSecurityProgram(plan, overlays),
    ...renderControlStatusTable(plan, verdicts, evidenceControlIds),
    ...renderEvidenceIndex(entries),
    ...renderLedgerTypeSection(
      entries,
      "training_completed",
      "Training records",
      "No security-awareness training has been recorded in the ledger yet.",
    ),
    ...renderLedgerTypeSection(
      entries,
      "restore_test_logged",
      "Restore tests",
      "No backup restore tests have been recorded in the ledger yet.",
    ),
    ...renderOpenItems(plan, verdicts, evidenceControlIds),
    ...renderChainVerification(verification),
    ...renderLegalNote(),
  ];
  return lines.join("\n");
}

export const BINDER_EXPORT_FILE_NAME = "sb2610-evidence-binder.md";
