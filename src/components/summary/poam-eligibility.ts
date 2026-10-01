import type { CmmcLevel, Practice } from "@/lib/practice-types";

// SPEC.md: Level 2 POA&M is allowed only for 1-point practices outside this list; Level 1 never allows one.
const POAM_INELIGIBLE_LEVEL2_PRACTICE_IDS: ReadonlySet<string> = new Set([
  "AC.L2-3.1.20",
  "AC.L2-3.1.22",
  "CA.L2-3.12.4",
  "PE.L2-3.10.3",
  "PE.L2-3.10.4",
  "PE.L2-3.10.5",
]);

export type PoamEligibilityTag = {
  label: string;
  eligible: boolean;
};

export function practiceIsPoamEligible(level: CmmcLevel, practice: Practice): boolean {
  return level === 2 && practice.pointValue === 1 && !POAM_INELIGIBLE_LEVEL2_PRACTICE_IDS.has(practice.id);
}

export function poamEligibilityTagFor(level: CmmcLevel, practice: Practice): PoamEligibilityTag {
  if (level === 1) return { label: "Must fix before self-assessment", eligible: false };
  return practiceIsPoamEligible(level, practice)
    ? { label: "POA&M eligible", eligible: true }
    : { label: "Must fix before affirmation", eligible: false };
}
