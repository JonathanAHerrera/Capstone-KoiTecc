"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Briefcase,
  Building2,
  Cloud,
  CreditCard,
  FileLock,
  FileText,
  Handshake,
  HeartPulse,
  HelpCircle,
  Landmark,
  Laptop,
  Receipt,
  Server,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { createOrganizationAction } from "@/app/actions";
import { useToast } from "@/components/ui/use-toast";
import { ComingUpScreen } from "./coming-up-screen";
import { CompanyNameScreen } from "./company-name-screen";
import { HalfwayScreen } from "./halfway-screen";
import { OnboardingScreenFrame } from "./onboarding-screen-frame";
import {
  EMPTY_ONBOARDING_ANSWERS,
  ONBOARDING_STEP_ORDER,
  organizationInputFromAnswers,
  stepIsAnswered,
  targetLevelForCuiHandling,
  type CuiHandlingAnswer,
  type EmployeeCountBucket,
  type IndustryAnswer,
  type ItSetupAnswer,
  type LevelEstimates,
  type OnboardingAnswers,
} from "./onboarding-steps";
import { SingleChoiceScreen, type SingleChoiceOption } from "./single-choice-screen";
import { WelcomeScreen } from "./welcome-screen";

export type OnboardingFlowProps = {
  levelEstimates: LevelEstimates;
  hasExistingPath: boolean;
  initialAnswers?: OnboardingAnswers;
};

type NavigationDirection = "forward" | "back";

type OnboardingFlowState = {
  currentStepIndex: number;
  navigationDirection: NavigationDirection;
  answers: OnboardingAnswers;
};

type OnboardingFlowAction =
  | { type: "answer"; patch: Partial<OnboardingAnswers> }
  | { type: "goForward" }
  | { type: "goBack" };

const LAST_STEP_INDEX = ONBOARDING_STEP_ORDER.length - 1;
const AUTO_ADVANCE_DELAY_MS = 250;

function onboardingFlowReducer(state: OnboardingFlowState, action: OnboardingFlowAction): OnboardingFlowState {
  switch (action.type) {
    case "answer":
      return { ...state, answers: { ...state.answers, ...action.patch } };
    case "goForward": {
      const currentStepId = ONBOARDING_STEP_ORDER[state.currentStepIndex];
      if (!stepIsAnswered(currentStepId, state.answers) || state.currentStepIndex >= LAST_STEP_INDEX) return state;
      return { ...state, currentStepIndex: state.currentStepIndex + 1, navigationDirection: "forward" };
    }
    case "goBack":
      if (state.currentStepIndex === 0) return state;
      return { ...state, currentStepIndex: state.currentStepIndex - 1, navigationDirection: "back" };
  }
}

const CUI_HANDLING_OPTIONS: SingleChoiceOption<CuiHandlingAnswer>[] = [
  { value: "fci", label: "Only basic contract info (FCI)", description: "Purchase orders, drawings marked for public release", icon: <FileText /> },
  { value: "cui", label: "Controlled Unclassified Information (CUI)", description: "Drawings or specs marked CUI / Distribution D", icon: <FileLock /> },
  { value: "unsure", label: "Not sure", icon: <HelpCircle /> },
];

const EMPLOYEE_COUNT_OPTIONS: SingleChoiceOption<EmployeeCountBucket>[] = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-250", label: "51–250" },
  { value: "250+", label: "250+" },
];

const INDUSTRY_OPTIONS: SingleChoiceOption<IndustryAnswer>[] = [
  { value: "healthcare", label: "Healthcare", description: "Clinic, dental, therapy, home health", icon: <HeartPulse /> },
  { value: "accounting", label: "Tax or accounting", description: "CPA, bookkeeping, tax prep", icon: <Receipt /> },
  { value: "lending", label: "Lending or finance", description: "Lender, mortgage, financial services", icon: <Landmark /> },
  { value: "retail", label: "Retail or restaurant", description: "Storefront, e-commerce, food service", icon: <ShoppingBag /> },
  { value: "professional_services", label: "Professional services", description: "Law, consulting, agency", icon: <Briefcase /> },
  { value: "other", label: "Something else", icon: <Building2 /> },
];

const CARD_PAYMENTS_OPTIONS: SingleChoiceOption<"yes" | "no">[] = [
  { value: "yes", label: "Yes, we take card payments", description: "In person or online", icon: <CreditCard /> },
  { value: "no", label: "No card payments", description: "Cash, check, or invoice only", icon: <Wrench /> },
];

const IT_SETUP_OPTIONS: SingleChoiceOption<ItSetupAnswer>[] = [
  { value: "cloud", label: "Everything is in the cloud", description: "Microsoft 365, Google Workspace, no servers on site", icon: <Cloud /> },
  { value: "onprem", label: "We run our own servers", description: "A server room or closet on site", icon: <Server /> },
  { value: "mixed", label: "A mix of both", description: "Some cloud apps plus on-site hardware", icon: <Laptop /> },
  { value: "unsure", label: "Not sure", description: "Someone else handles it", icon: <HelpCircle /> },
];

const IT_PROVIDER_OPTIONS: SingleChoiceOption<"yes" | "no">[] = [
  { value: "yes", label: "Yes, an outside company helps", description: "An MSP or IT contractor", icon: <Handshake /> },
  { value: "no", label: "No, we handle it ourselves", description: "Someone on staff, or the owner", icon: <Wrench /> },
];

export function OnboardingFlow({ levelEstimates, hasExistingPath, initialAnswers }: OnboardingFlowProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const [flowState, dispatch] = useReducer(onboardingFlowReducer, {
    currentStepIndex: 0,
    navigationDirection: "forward",
    answers: initialAnswers ?? EMPTY_ONBOARDING_ANSWERS,
  });
  const [savingOrganization, setSavingOrganization] = useState(false);
  const autoAdvanceTimerRef = useRef<number | null>(null);

  const cancelPendingAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => cancelPendingAutoAdvance, [cancelPendingAutoAdvance]);

  const goForward = useCallback(() => {
    cancelPendingAutoAdvance();
    dispatch({ type: "goForward" });
  }, [cancelPendingAutoAdvance]);

  const goBack = useCallback(() => {
    cancelPendingAutoAdvance();
    dispatch({ type: "goBack" });
  }, [cancelPendingAutoAdvance]);

  const answerThenAutoAdvance = useCallback(
    (patch: Partial<OnboardingAnswers>) => {
      cancelPendingAutoAdvance();
      dispatch({ type: "answer", patch });
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        dispatch({ type: "goForward" });
      }, AUTO_ADVANCE_DELAY_MS);
    },
    [cancelPendingAutoAdvance],
  );

  const sendCreateOrganization = useCallback(async () => {
    const organizationInput = organizationInputFromAnswers(flowState.answers);
    if (!organizationInput) {
      showToast({ tone: "warning", message: "Please answer every question first." });
      return;
    }
    setSavingOrganization(true);
    const result = await createOrganizationAction(organizationInput);
    if (!result.ok) {
      setSavingOrganization(false);
      showToast({ tone: "danger", message: result.error });
      return;
    }
    // Hand a brand-new org straight to the coordinator so the agent's "here's where to start" plan
    // is the first thing they see, rather than an empty path.
    router.push("/coordinator");
  }, [flowState.answers, router, showToast]);

  const currentStepId = ONBOARDING_STEP_ORDER[flowState.currentStepIndex];
  const { answers } = flowState;
  const targetLevel = targetLevelForCuiHandling(answers.cuiHandling);

  if (currentStepId === "welcome") {
    return <WelcomeScreen hasExistingPath={hasExistingPath} onStart={goForward} />;
  }

  const slideOffsetPx = reduceMotion ? 0 : flowState.navigationDirection === "forward" ? 24 : -24;

  return (
    <OnboardingScreenFrame
      completedSteps={flowState.currentStepIndex}
      totalSteps={LAST_STEP_INDEX}
      onBack={goBack}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentStepId}
          className="flex flex-1 flex-col gap-6"
          initial={{ opacity: 0, x: slideOffsetPx }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -slideOffsetPx }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        >
          {currentStepId === "companyName" ? (
            <CompanyNameScreen
              companyName={answers.companyName}
              onCompanyNameChange={(companyName) => dispatch({ type: "answer", patch: { companyName } })}
              onContinue={goForward}
            />
          ) : currentStepId === "cuiHandling" ? (
            <SingleChoiceScreen
              question="What kind of government information do you handle?"
              questionLabel="Kind of government information handled"
              options={CUI_HANDLING_OPTIONS}
              selectedValue={answers.cuiHandling}
              onSelect={(cuiHandling) => answerThenAutoAdvance({ cuiHandling })}
              onContinue={goForward}
              note={
                answers.cuiHandling === "unsure"
                  ? "No problem. Most small suppliers without CUI markings on their drawings are Level 1, so we'll start you there. You can change this later."
                  : undefined
              }
            />
          ) : currentStepId === "employeeCount" ? (
            <SingleChoiceScreen
              question="How many people work at your company?"
              questionLabel="Company size"
              options={EMPLOYEE_COUNT_OPTIONS}
              selectedValue={answers.employeeCount}
              onSelect={(employeeCount) => answerThenAutoAdvance({ employeeCount })}
              onContinue={goForward}
              columns={2}
            />
          ) : currentStepId === "industry" ? (
            <SingleChoiceScreen
              question="What kind of business are you?"
              questionLabel="Industry"
              options={INDUSTRY_OPTIONS}
              selectedValue={answers.industry}
              onSelect={(industry) => answerThenAutoAdvance({ industry })}
              onContinue={goForward}
              note="This tells us which extra rules apply to you — like HIPAA for healthcare or GLBA for financial services."
            />
          ) : currentStepId === "cardPayments" ? (
            <SingleChoiceScreen
              question="Do you accept credit or debit card payments?"
              questionLabel="Card payments"
              options={CARD_PAYMENTS_OPTIONS}
              selectedValue={answers.takesCardPayments === null ? null : answers.takesCardPayments ? "yes" : "no"}
              onSelect={(value) => answerThenAutoAdvance({ takesCardPayments: value === "yes" })}
              onContinue={goForward}
            />
          ) : currentStepId === "halfway" ? (
            <HalfwayScreen onContinue={goForward} />
          ) : currentStepId === "itSetup" ? (
            <SingleChoiceScreen
              question="How is your IT set up?"
              questionLabel="IT setup"
              options={IT_SETUP_OPTIONS}
              selectedValue={answers.itSetup}
              onSelect={(itSetup) => answerThenAutoAdvance({ itSetup })}
              onContinue={goForward}
            />
          ) : currentStepId === "itProvider" ? (
            <SingleChoiceScreen
              question={
                <>
                  Does an <strong>outside IT provider</strong> help run your systems?
                </>
              }
              questionLabel="Outside IT provider"
              options={IT_PROVIDER_OPTIONS}
              selectedValue={answers.hasItProvider === null ? null : answers.hasItProvider ? "yes" : "no"}
              onSelect={(hasItProvider) => answerThenAutoAdvance({ hasItProvider: hasItProvider === "yes" })}
              onContinue={goForward}
            />
          ) : (
            <ComingUpScreen
              companyName={answers.companyName}
              targetLevel={targetLevel}
              levelEstimate={targetLevel === 2 ? levelEstimates.level2 : levelEstimates.level1}
              savingOrganization={savingOrganization}
              onStartPath={sendCreateOrganization}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </OnboardingScreenFrame>
  );
}
