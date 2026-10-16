import { weightForThreats } from "@/config/threat-weights";
import type { ControlDefinition, ThreatTag } from "@/frameworks/types";

// Phase 5 scoring: priority = threatWeight * (1 - currentStatus).
// currentStatus is the control's completion fraction in [0, 1]: 0 = nothing done, 1 = fully done.
// A finished control drops to priority 0 so the plan surfaces the biggest open gaps first.
export function computePriority(threats: readonly ThreatTag[], currentStatus = 0): number {
  const clampedStatus = Math.min(1, Math.max(0, currentStatus));
  return weightForThreats(threats) * (1 - clampedStatus);
}

// Highest priority first; ties broken by stable id so plans and snapshots stay deterministic.
export function sortControlsByPriority(controls: readonly ControlDefinition[]): ControlDefinition[] {
  return [...controls].sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority;
    return left.id.localeCompare(right.id);
  });
}
