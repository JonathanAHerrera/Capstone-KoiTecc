import type { Industry } from "@/frameworks/types";
import type { CreateOrganizationInput } from "@/lib/org";
import type { CmmcLevel } from "@/lib/practice-types";

export type CuiHandlingAnswer = "fci" | "cui" | "unsure";
export type EmployeeCountBucket = CreateOrganizationInput["employeeCount"];
export type ItSetupAnswer = CreateOrganizationInput["itSetup"];
export type IndustryAnswer = Industry;

export type OnboardingAnswers = {
  companyName: string;
  cuiHandling: CuiHandlingAnswer | null;
  employeeCount: EmployeeCountBucket | null;
  industry: IndustryAnswer | null;
  takesCardPayments: boolean | null;
  itSetup: ItSetupAnswer | null;
  hasItProvider: boolean | null;
};

export type OnboardingStepId =
  | "welcome"
  | "companyName"
  | "cuiHandling"
  | "employeeCount"
  | "industry"
  | "cardPayments"
  | "halfway"
  | "itSetup"
  | "itProvider"
  | "comingUp";

export const ONBOARDING_STEP_ORDER: readonly OnboardingStepId[] = [
  "welcome",
  "companyName",
  "cuiHandling",
  "employeeCount",
  "industry",
  "cardPayments",
  "halfway",
  "itSetup",
  "itProvider",
  "comingUp",
] as const;

export const MIN_COMPANY_NAME_LENGTH = 2;

export const EMPTY_ONBOARDING_ANSWERS: OnboardingAnswers = {
  companyName: "",
  cuiHandling: null,
  employeeCount: null,
  industry: null,
  takesCardPayments: null,
  itSetup: null,
  hasItProvider: null,
};

export type LevelEstimate = { count: number; minutes: number };
export type LevelEstimates = { level1: LevelEstimate; level2: LevelEstimate };

export function targetLevelForCuiHandling(cuiHandling: CuiHandlingAnswer | null): CmmcLevel {
  return cuiHandling === "cui" ? 2 : 1;
}

export function companyNameIsValid(companyName: string): boolean {
  return companyName.trim().length >= MIN_COMPANY_NAME_LENGTH;
}

export function stepIsAnswered(stepId: OnboardingStepId, answers: OnboardingAnswers): boolean {
  switch (stepId) {
    case "companyName":
      return companyNameIsValid(answers.companyName);
    case "cuiHandling":
      return answers.cuiHandling !== null;
    case "employeeCount":
      return answers.employeeCount !== null;
    case "industry":
      return answers.industry !== null;
    case "cardPayments":
      return answers.takesCardPayments !== null;
    case "itSetup":
      return answers.itSetup !== null;
    case "itProvider":
      return answers.hasItProvider !== null;
    case "welcome":
    case "halfway":
    case "comingUp":
      return true;
  }
}

export function organizationInputFromAnswers(answers: OnboardingAnswers): CreateOrganizationInput | null {
  if (
    !companyNameIsValid(answers.companyName) ||
    answers.cuiHandling === null ||
    answers.employeeCount === null ||
    answers.industry === null ||
    answers.takesCardPayments === null ||
    answers.itSetup === null ||
    answers.hasItProvider === null
  ) {
    return null;
  }
  return {
    name: answers.companyName.trim(),
    targetLevel: targetLevelForCuiHandling(answers.cuiHandling),
    handlesCui: answers.cuiHandling === "cui",
    employeeCount: answers.employeeCount,
    industry: answers.industry,
    takesCardPayments: answers.takesCardPayments,
    itSetup: answers.itSetup,
    hasItProvider: answers.hasItProvider,
  };
}

export function answersFromExistingOrganization(organization: {
  name: string;
  handlesCui: boolean;
  employeeCount: EmployeeCountBucket;
  industry: IndustryAnswer;
  takesCardPayments: boolean;
  itSetup: ItSetupAnswer;
  hasItProvider: boolean;
}): OnboardingAnswers {
  return {
    companyName: organization.name,
    cuiHandling: organization.handlesCui ? "cui" : "fci",
    employeeCount: organization.employeeCount,
    industry: organization.industry,
    takesCardPayments: organization.takesCardPayments,
    itSetup: organization.itSetup,
    hasItProvider: organization.hasItProvider,
  };
}

export function formatEstimatedHours(minutes: number): string {
  if (minutes < 60) return `about ${minutes} minutes`;
  const hoursRoundedToHalf = Math.round((minutes / 60) * 2) / 2;
  const hoursLabel = Number.isInteger(hoursRoundedToHalf) ? String(hoursRoundedToHalf) : hoursRoundedToHalf.toFixed(1);
  return `about ${hoursLabel} hour${hoursRoundedToHalf === 1 ? "" : "s"}`;
}
