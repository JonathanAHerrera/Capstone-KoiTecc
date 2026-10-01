import type { CelebrationConfettiIntensity } from "@/components/ui/confetti";

export function parseCelebrationIntensity(value: string | string[] | undefined): CelebrationConfettiIntensity | null {
  const singleValue = Array.isArray(value) ? value[0] : value;
  return singleValue === "family" || singleValue === "complete" ? singleValue : null;
}
