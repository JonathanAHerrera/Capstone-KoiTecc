import { computePriority, sortControlsByPriority } from "@/frameworks/priority";
import { getOverlay, type OverlayId, overlaysForProfile } from "@/frameworks/overlays";
import type {
  Applicability,
  ControlDefinition,
  FrameworkDefinition,
  OrgProfile,
} from "@/frameworks/types";

// SB 2610 (Texas Bus. & Com. Code ch. 542, effective 2025-09-01) ties the expected program to
// headcount. The tier an org lands in decides the baseline catalog; overlays attach on top.
export type Sb2610TierId = "sb2610-simple" | "sb2610-moderate" | "sb2610-full";

// Employee thresholds from the bill analysis (SB02610H). 250+ is not eligible for the safe harbor
// framing and routes to KOITECC instead.
const SIMPLE_MAX_EXCLUSIVE = 20;
const MODERATE_MAX_EXCLUSIVE = 100;
const FULL_MAX_EXCLUSIVE = 250;

export function selectSb2610Tier(employees: number): Applicability {
  if (employees < SIMPLE_MAX_EXCLUSIVE) {
    return {
      applies: true,
      tier: "sb2610-simple",
      reason: `${employees} employees (fewer than 20): password policy, security training, and the threat-priority essentials.`,
    };
  }
  if (employees < MODERATE_MAX_EXCLUSIVE) {
    return {
      applies: true,
      tier: "sb2610-moderate",
      reason: `${employees} employees (20 to 99): CIS Controls v8.1 Implementation Group 1 baseline.`,
    };
  }
  if (employees < FULL_MAX_EXCLUSIVE) {
    return {
      applies: true,
      tier: "sb2610-full",
      reason: `${employees} employees (100 to 249): full framework, default NIST CSF 2.0.`,
    };
  }
  return {
    applies: false,
    reason: `${employees} employees (250 or more): outside the self-serve safe-harbor tiers — route to KOITECC for a tailored program.`,
  };
}

// Build a control with its Phase 5 priority computed from its threat tags (gap defaults to 100%).
function essentialControl(
  input: Omit<ControlDefinition, "priority">,
): ControlDefinition {
  return { ...input, priority: computePriority(input.threat) };
}

// Threat-priority essentials — authored in plain English (not copied from CIS/NIST), so they carry
// a real sourceRef. These are the controls that stop the attacks actually hitting Texas SMBs and
// guarantee one administrative, one technical, and one physical safeguard in every tier.
const ESSENTIALS: ControlDefinition[] = [
  essentialControl({
    id: "essential.mfa-on-every-account",
    sourceRef: "Texas Safe Harbor essential",
    family: "Account Security",
    safeguardKind: "technical",
    title: "Turn on multi-factor authentication for every account",
    explainer:
      "Add a second step (an app code or key) to every email, banking, and admin login so a stolen password alone can't get in.",
    threat: ["bec", "credential"],
    verification: ["integration:m365.mfa", "evidence:screenshot"],
    evidenceHints: ["A settings screen showing MFA is required for all users, not just admins."],
  }),
  essentialControl({
    id: "essential.payment-change-callback",
    sourceRef: "Texas Safe Harbor essential",
    family: "Payment Fraud",
    safeguardKind: "administrative",
    title: "Require a callback before changing any payment details",
    explainer:
      "Before you change where money is sent, call the vendor back on a number you already have on file. Email alone is never enough.",
    threat: ["bec", "scam"],
    verification: ["attestation", "evidence:document"],
    evidenceHints: ["A one-page written rule staff have signed, with the trusted phone numbers."],
  }),
  essentialControl({
    id: "essential.email-authentication",
    sourceRef: "Texas Safe Harbor essential",
    family: "Email Security",
    safeguardKind: "technical",
    title: "Set SPF, DKIM, and DMARC on your email domain",
    explainer:
      "These DNS records stop criminals from sending email that looks like it comes from your business.",
    threat: ["bec"],
    verification: ["scan:dmarc"],
    evidenceHints: ["A DMARC record set to quarantine or reject (the outside scan reads this)."],
  }),
  essentialControl({
    id: "essential.backups-and-restore-test",
    sourceRef: "Texas Safe Harbor essential",
    family: "Backup and Recovery",
    safeguardKind: "technical",
    title: "Keep offline backups and test a restore every quarter",
    explainer:
      "Back up your important files where ransomware can't reach them, and prove each quarter that you can actually get the files back.",
    threat: ["ransomware"],
    verification: ["evidence:document", "attestation"],
    evidenceHints: ["A dated restore-test log showing files were recovered successfully."],
  }),
  essentialControl({
    id: "essential.password-policy",
    sourceRef: "Texas Safe Harbor essential",
    family: "Account Security",
    safeguardKind: "administrative",
    title: "Adopt and share a written password policy",
    explainer:
      "Put in writing that staff use long, unique passwords (a password manager helps) and never reuse them across sites.",
    threat: ["credential"],
    verification: ["attestation", "evidence:document"],
    evidenceHints: ["The written policy and a record that staff received it."],
  }),
  essentialControl({
    id: "essential.security-training",
    sourceRef: "Texas Safe Harbor essential",
    family: "Awareness and Training",
    safeguardKind: "administrative",
    title: "Give staff short security-awareness training",
    explainer:
      "Run a brief scam-spotting lesson for every employee and keep a record of who finished it.",
    threat: ["scam", "bec"],
    verification: ["attestation", "evidence:document"],
    evidenceHints: ["A completion record listing each employee and the date they finished."],
  }),
  essentialControl({
    id: "essential.lock-up-devices-and-records",
    sourceRef: "Texas Safe Harbor essential",
    family: "Physical Protection",
    safeguardKind: "physical",
    title: "Lock up devices and paper records",
    explainer:
      "Keep laptops, servers, and sensitive paperwork in locked spaces so a walk-in theft doesn't become a data breach.",
    threat: ["physical"],
    verification: ["evidence:photo", "attestation"],
    evidenceHints: ["A photo of the locked cabinet, server closet, or badge-controlled door."],
  }),
];

// Placeholder for a catalog whose text we must not reproduce from memory (CIS IG1, NIST CSF 2.0).
// Each still carries a safeguard kind + threat tags so the tier is structurally complete and
// priority-ranked; the title/explainer get filled from the source document.
function catalogPlaceholder(
  input: Omit<ControlDefinition, "priority" | "explainer"> & { explainer?: string },
): ControlDefinition {
  return {
    ...input,
    explainer: input.explainer ?? "TODO_SOURCE — fill from the cited catalog entry.",
    priority: computePriority(input.threat),
  };
}

// CIS Controls v8.1 Implementation Group 1 — baseline for the moderate tier. Placeholders only.
const CIS_IG1_PLACEHOLDERS: ControlDefinition[] = [
  catalogPlaceholder({
    id: "cis-ig1.todo-administrative",
    sourceRef: "TODO_SOURCE", // CIS v8.1 IG1 — administrative safeguard
    family: "CIS Controls v8.1 IG1",
    safeguardKind: "administrative",
    title: "TODO_SOURCE: CIS IG1 administrative safeguard",
    threat: ["credential"],
    verification: ["attestation"],
    evidenceHints: ["TODO_SOURCE"],
  }),
  catalogPlaceholder({
    id: "cis-ig1.todo-technical",
    sourceRef: "TODO_SOURCE", // CIS v8.1 IG1 — technical safeguard
    family: "CIS Controls v8.1 IG1",
    safeguardKind: "technical",
    title: "TODO_SOURCE: CIS IG1 technical safeguard",
    threat: ["credential"],
    verification: ["evidence:screenshot"],
    evidenceHints: ["TODO_SOURCE"],
  }),
  catalogPlaceholder({
    id: "cis-ig1.todo-physical",
    sourceRef: "TODO_SOURCE", // CIS v8.1 IG1 — physical safeguard
    family: "CIS Controls v8.1 IG1",
    safeguardKind: "physical",
    title: "TODO_SOURCE: CIS IG1 physical safeguard",
    threat: ["physical"],
    verification: ["evidence:photo"],
    evidenceHints: ["TODO_SOURCE"],
  }),
];

// NIST CSF 2.0 — default baseline for the full tier. Placeholders only.
const NIST_CSF_PLACEHOLDERS: ControlDefinition[] = [
  catalogPlaceholder({
    id: "nist-csf.todo-administrative",
    sourceRef: "TODO_SOURCE", // NIST CSF 2.0 — Govern/Identify
    family: "NIST CSF 2.0",
    safeguardKind: "administrative",
    title: "TODO_SOURCE: NIST CSF 2.0 administrative safeguard",
    threat: ["credential"],
    verification: ["attestation"],
    evidenceHints: ["TODO_SOURCE"],
  }),
  catalogPlaceholder({
    id: "nist-csf.todo-technical",
    sourceRef: "TODO_SOURCE", // NIST CSF 2.0 — Protect
    family: "NIST CSF 2.0",
    safeguardKind: "technical",
    title: "TODO_SOURCE: NIST CSF 2.0 technical safeguard",
    threat: ["ransomware"],
    verification: ["evidence:screenshot"],
    evidenceHints: ["TODO_SOURCE"],
  }),
  catalogPlaceholder({
    id: "nist-csf.todo-physical",
    sourceRef: "TODO_SOURCE", // NIST CSF 2.0 — Protect (physical)
    family: "NIST CSF 2.0",
    safeguardKind: "physical",
    title: "TODO_SOURCE: NIST CSF 2.0 physical safeguard",
    threat: ["physical"],
    verification: ["evidence:photo"],
    evidenceHints: ["TODO_SOURCE"],
  }),
];

// Baseline catalog for a tier. The essentials ship in every tier (they are the attacks that
// actually hit Texas SMBs); larger orgs layer the heavier catalog on top.
export function controlsForTier(tier: Sb2610TierId): ControlDefinition[] {
  switch (tier) {
    case "sb2610-simple":
      return [...ESSENTIALS];
    case "sb2610-moderate":
      return [...ESSENTIALS, ...CIS_IG1_PLACEHOLDERS];
    case "sb2610-full":
      return [...ESSENTIALS, ...NIST_CSF_PLACEHOLDERS];
  }
}

export type Sb2610Plan = {
  eligible: boolean;
  tier?: Sb2610TierId;
  reason: string;
  overlays: OverlayId[];
  controls: ControlDefinition[]; // baseline + overlay controls, ranked by priority
};

// The full ranked program for an org: pick the tier, attach industry overlays, merge all controls,
// and sort by priority so the owner sees the biggest open gaps first.
export function buildSb2610Plan(profile: OrgProfile): Sb2610Plan {
  const applicability = selectSb2610Tier(profile.employees);
  if (!applicability.applies) {
    return { eligible: false, reason: applicability.reason, overlays: [], controls: [] };
  }

  const tier = applicability.tier as Sb2610TierId;
  const overlays = overlaysForProfile(profile);
  const overlayControls = overlays.flatMap((id) => getOverlay(id).controls);
  const controls = sortControlsByPriority([...controlsForTier(tier), ...overlayControls]);

  return { eligible: true, tier, reason: applicability.reason, overlays, controls };
}

// SB 2610 lives alongside the Practice-backed frameworks but is driven by this engine, not the
// shared FrameworkId catalog, so it carries its own id literal instead of joining that union.
export type Sb2610FrameworkDefinition = Omit<FrameworkDefinition, "id"> & { id: "sb2610" };

export const sb2610Definition: Sb2610FrameworkDefinition = {
  id: "sb2610",
  name: "SB 2610",
  fullName: "Texas SB 2610 — Bus. & Com. Code ch. 542",
  jurisdiction: "texas",
  tagline: "Scale your cybersecurity program to your headcount and prove it aligns with SB 2610.",
  disclaimer:
    "SB 2610 limits punitive damages only; it does not make you 'compliant' or 'safe.' A court decides whether it applies, and a lawyer should review your program.",
  grouping: "catalog",
  isLevelScoped: false,
  // Engine-driven, not Practice-backed, so it owns a dedicated route instead of /track/[framework].
  hasDedicatedRoutes: true,
  homeRoute: "/sb2610",
  summaryRoute: "/sb2610",
  canDisable: true,
  scoring: { kind: "percent" },
  exports: ["binder", "markdown"],
  exportStyle: "generic",
  exportFileName: "sb2610-readiness-summary.md",
  overlays: ["hipaa", "glba", "pci"],
  version: "2025",
  publishedAt: "2025-09-01",
  appliesTo: (profile) => selectSb2610Tier(profile.employees),
  controls: (profile) => buildSb2610Plan(profile).controls,
};
