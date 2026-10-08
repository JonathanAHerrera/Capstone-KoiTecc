export type EvidenceKind = "photo" | "document" | "screenshot" | "video" | "text";

export type CmmcLevel = 1 | 2;

export type AiVerifiability = "full" | "partial" | "none";

// CMMC is the original (federal) program. The Texas frameworks are additive tracks
// that reuse the same requirement/evidence/review engine.
export type FrameworkId = "cmmc" | "tdpsa" | "tx521" | "tac202";

export type FrameworkMeta = {
  id: FrameworkId;
  shortName: string;
  fullName: string;
  jurisdiction: "federal" | "texas";
  tagline: string;
  disclaimer: string;
  hasSprs: boolean;
};

export const FRAMEWORK_ORDER: readonly FrameworkId[] = ["cmmc", "tdpsa", "tx521", "tac202"] as const;

export const FRAMEWORKS: Readonly<Record<FrameworkId, FrameworkMeta>> = {
  cmmc: {
    id: "cmmc",
    shortName: "CMMC",
    fullName: "Cybersecurity Maturity Model Certification",
    jurisdiction: "federal",
    tagline: "Federal defense-contract cybersecurity (NIST SP 800-171).",
    disclaimer:
      "This is a self-assessment aid, not a CMMC assessment or certification. Only a C3PAO/DIBCAC certifies; only your Affirming Official affirms in SPRS.",
    hasSprs: true,
  },
  tdpsa: {
    id: "tdpsa",
    shortName: "TDPSA",
    fullName: "Texas Data Privacy and Security Act",
    jurisdiction: "texas",
    tagline: "Texas consumer-privacy obligations for businesses handling Texans' personal data.",
    disclaimer:
      "This is an educational readiness aid, not legal advice. The Texas Data Privacy and Security Act is enforced by the Texas Attorney General; confirm applicability and obligations with qualified counsel.",
    hasSprs: false,
  },
  tx521: {
    id: "tx521",
    shortName: "Texas §521",
    fullName: "Texas Business & Commerce Code Ch. 521 — Breach Notification",
    jurisdiction: "texas",
    tagline: "Texas breach-notification duties, including Attorney General notice for larger breaches.",
    disclaimer:
      "This is an educational readiness aid, not legal advice. Breach-notification timelines and thresholds are set by Texas Business & Commerce Code Ch. 521; confirm specifics with qualified counsel.",
    hasSprs: false,
  },
  tac202: {
    id: "tac202",
    shortName: "DIR / TAC 202",
    fullName: "Texas Administrative Code §202 — DIR Security Standards",
    jurisdiction: "texas",
    tagline: "State of Texas information-security standards for agencies and their vendors.",
    disclaimer:
      "This is an educational readiness aid, not legal advice. TAC §202 and the Texas DIR control catalog govern state information security; confirm vendor obligations in your contract and with DIR.",
    hasSprs: false,
  },
};

export type Practice = {
  id: string;
  // Absent in the original CMMC catalog; normalized to "cmmc" on load.
  framework?: FrameworkId;
  level: CmmcLevel;
  family: string;
  familyName: string;
  // Generic grouping used by non-CMMC frameworks (CMMC keeps family/familyName).
  groupCode?: string;
  groupName?: string;
  nist171Ref: string;
  // Statute/standard citation for non-CMMC frameworks (shown instead of nist171Ref).
  legalRef?: string;
  title: string;
  officialText: string;
  plainEnglish: string;
  assessmentObjectives: string[];
  whyItMatters: string;
  evidenceTypes: EvidenceKind[];
  evidenceExamples: string[];
  aiVerifiable: AiVerifiability;
  aiReviewGuidance: string;
  commonFailures: string[];
  estimatedEffortMinutes: number;
  pointValue: number;
};

export function frameworkForPractice(practice: Pick<Practice, "framework">): FrameworkId {
  return practice.framework ?? "cmmc";
}

// CMMC groups by NIST family; Texas frameworks group by their own topic code/name.
export function resolveGroup(practice: Practice): { code: string; name: string } {
  return {
    code: practice.groupCode ?? practice.family,
    name: practice.groupName ?? practice.familyName,
  };
}

export type PracticeFamily = {
  code: string;
  name: string;
  practices: Practice[];
};

export type DerivedPracticeStatus =
  | "not_started"
  | "in_progress"
  | "under_review"
  | "accepted"
  | "needs_work";

export const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  "photo",
  "document",
  "screenshot",
  "video",
  "text",
] as const;

export const CANONICAL_FAMILY_ORDER: readonly string[] = [
  "AC",
  "AT",
  "AU",
  "CM",
  "IA",
  "IR",
  "MA",
  "MP",
  "PS",
  "PE",
  "RA",
  "CA",
  "SC",
  "SI",
] as const;

export const FAMILY_NAMES: Readonly<Record<string, string>> = {
  AC: "Access Control",
  AT: "Awareness and Training",
  AU: "Audit and Accountability",
  CM: "Configuration Management",
  IA: "Identification and Authentication",
  IR: "Incident Response",
  MA: "Maintenance",
  MP: "Media Protection",
  PS: "Personnel Security",
  PE: "Physical Protection",
  RA: "Risk Assessment",
  CA: "Security Assessment",
  SC: "System and Communications Protection",
  SI: "System and Information Integrity",
};
