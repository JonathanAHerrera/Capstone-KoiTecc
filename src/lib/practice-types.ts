export type EvidenceKind = "photo" | "document" | "screenshot" | "video" | "text";

export type CmmcLevel = 1 | 2;

export type AiVerifiability = "full" | "partial" | "none";

export type Practice = {
  id: string;
  level: CmmcLevel;
  family: string;
  familyName: string;
  nist171Ref: string;
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
