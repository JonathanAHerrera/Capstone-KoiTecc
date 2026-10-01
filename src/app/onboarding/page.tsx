import type { Metadata } from "next";
import { connection } from "next/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import {
  answersFromExistingOrganization,
  type LevelEstimate,
  type LevelEstimates,
} from "@/components/onboarding/onboarding-steps";
import { getOrganization } from "@/lib/org";
import type { CmmcLevel } from "@/lib/practice-types";
import { getPracticeCountForLevel, getPracticesForLevel } from "@/lib/practices";

export const metadata: Metadata = {
  title: "Get started — CMMC Ready",
};

function levelEstimateFor(level: CmmcLevel): LevelEstimate {
  return {
    count: getPracticeCountForLevel(level),
    minutes: getPracticesForLevel(level).reduce((totalMinutes, practice) => totalMinutes + practice.estimatedEffortMinutes, 0),
  };
}

export default async function OnboardingPage() {
  await connection();
  const existingOrganization = await getOrganization();
  const levelEstimates: LevelEstimates = {
    level1: levelEstimateFor(1),
    level2: levelEstimateFor(2),
  };

  return (
    <OnboardingFlow
      levelEstimates={levelEstimates}
      hasExistingPath={existingOrganization !== null}
      initialAnswers={existingOrganization ? answersFromExistingOrganization(existingOrganization) : undefined}
    />
  );
}
