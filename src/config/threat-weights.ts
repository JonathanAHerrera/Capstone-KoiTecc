import type { ThreatTag } from "@/frameworks/types";

// Threat weights drive control priority (Phase 5 formula lives in src/frameworks/priority.ts).
// Higher weight = defend first. Tuned here so product/security can adjust without touching the
// engine. Defaults come from the Texas small-business threat model: wire/BEC fraud is the most
// common money-loss event, ransomware next, then credential theft, generic scams, and physical.
export const THREAT_WEIGHTS: Readonly<Record<ThreatTag, number>> = {
  bec: 5,
  ransomware: 4,
  credential: 4,
  scam: 3,
  physical: 2,
};

// A control inherits the weight of the worst threat it defends against. A control that stops both
// BEC (5) and credential theft (4) is weighted 5, because skipping it leaves the BEC hole open.
export function weightForThreats(threats: readonly ThreatTag[]): number {
  return threats.reduce((worst, threat) => Math.max(worst, THREAT_WEIGHTS[threat]), 0);
}
