import type { EvidenceKind, FrameworkId } from "@/lib/practice-types";

// The one dimension the whole engine varies along. Adding a framework means adding a
// FrameworkDefinition, not sprinkling `framework === "..."` branches through the codebase.

// Threats a control defends against; used for priority scoring (see src/config/threat-weights).
export type ThreatTag = "bec" | "ransomware" | "scam" | "credential" | "physical";

// How a control's status can be established.
export type VerificationMethod =
  | `integration:${string}` // e.g. "integration:m365.mfa" — set by a read-only connector, never AI
  | `scan:${string}` // e.g. "scan:dmarc" — set by the passive outside scan
  | `evidence:${EvidenceKind}` // a human uploads proof the AI scanner reviews
  | "attestation"; // the owner attests in writing

export type Applicability = {
  applies: boolean;
  reason: string;
  tier?: string;
};

// Industry drives which overlays attach (see src/frameworks/overlays.ts). Kept coarse on purpose:
// onboarding asks a plain-language "what kind of business" question, not an NAICS code.
export type Industry =
  | "healthcare" // clinics, dental, therapy — HIPAA overlay
  | "tax_prep" // tax preparers — GLBA Safeguards overlay
  | "accounting" // bookkeeping, CPA firms — GLBA Safeguards overlay
  | "lending" // lenders, mortgage, finance — GLBA Safeguards overlay
  | "retail" // storefronts, e-commerce
  | "professional_services" // law, consulting, agencies
  | "other";

// Minimal profile the registry needs to decide applicability, tier, and which controls apply.
// A superset of the stored org profile; later phases widen it further (data types, IT setup, ...).
export type OrgProfile = {
  // Exact headcount drives the SB 2610 tier thresholds (<20, 20-99, 100-249, 250+).
  employees: number;
  industry: Industry;
  takesCardPayments: boolean;
  handlesCui: boolean;
  handlesTexasResidentData: boolean;
  sellsToStateOfTexas: boolean;
  texasPhysicalPresence: boolean;
  processesPersonalDataAtScale: boolean;
};

// SB 2610 requires every tier to carry administrative, technical, and physical safeguards.
// We classify each control by kind so that requirement is checkable (and testable), separate from
// the display `family` (e.g. "Access Control", "Email Security").
export type SafeguardKind = "administrative" | "technical" | "physical";

export type ControlDefinition = {
  id: string;
  sourceRef: string; // "CIS v8.1 Safeguard 5.2" or "TODO_SOURCE"
  family: string;
  safeguardKind: SafeguardKind;
  title: string; // plain English
  explainer: string; // plain English, ~8th-grade reading level
  threat: ThreatTag[];
  verification: VerificationMethod[];
  evidenceHints: string[];
  priority: number; // computed from threat weights × gap; see Phase 5
};

// SPRS (CMMC L2) vs the default percent-ready. The engine reads `kind` instead of branching on id.
export type ScoringStrategy = { kind: "sprs"; max: number; min: number } | { kind: "percent" };

export type ExportKind = "markdown" | "poam" | "binder";

// Markdown export shape. CMMC renders the historical package (SPRS line + POA&M); every other
// framework renders the generic readiness summary. Captured as data so the branch lives here.
export type ExportStyle = "cmmc" | "generic";

// How a framework groups its controls for display and ordering.
export type GroupingStrategy =
  | "nist-family" // CMMC: the 14 canonical NIST families, canonical order
  | "catalog"; // everything else: the order the JSON catalog lists groups in

export interface FrameworkDefinition {
  id: FrameworkId;
  name: string; // short name for chips/headers
  fullName: string;
  jurisdiction: "federal" | "texas";
  tagline: string;
  disclaimer: string;

  // Behavior that used to be `framework === "cmmc"` guards, now declarative:
  grouping: GroupingStrategy;
  // CMMC scopes its path/summary to the org's target level; Texas tracks show every control.
  isLevelScoped: boolean;
  // CMMC owns bespoke /path and /summary routes; others use /track/[id] and /summary/[id].
  hasDedicatedRoutes: boolean;
  homeRoute: string;
  summaryRoute: string;
  // CMMC is the baseline and can never be turned off.
  canDisable: boolean;

  scoring: ScoringStrategy;
  exports: ExportKind[];
  exportStyle: ExportStyle;
  exportFileName: string;
  overlays?: string[];

  // Framework watch (Phase 3): when a newer catalog version is recorded, the Radar shows a
  // catch-up deadline computed from these. Optional because statute-based tracks don't version.
  version?: string;
  publishedAt?: string; // ISO date the stored version was published

  // Richer members filled in by later phases (Phase 3 controls, Phase 3 applicability).
  // Optional for now so existing Practice-backed frameworks need not duplicate the engine yet.
  appliesTo?(profile: OrgProfile): Applicability;
  controls?(profile: OrgProfile): ControlDefinition[];
}
