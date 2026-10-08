"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { saveTexasProfileAction } from "@/app/applicability/actions";
import { BigButton } from "@/components/ui/big-button";
import { QuestionCard } from "@/components/ui/question-card";
import type { TexasProfileInput } from "@/lib/org";

type TexasProfileField = keyof TexasProfileInput;

type TexasProfileQuestion = {
  field: TexasProfileField;
  question: string;
  help: string;
};

const TEXAS_PROFILE_QUESTIONS: TexasProfileQuestion[] = [
  {
    field: "handlesTexasResidentData",
    question: "Do you collect or store personal data about Texas residents?",
    help: "Names, emails, phone numbers, or account details of customers who live in Texas count.",
  },
  {
    field: "processesPersonalDataAtScale",
    question: "Do you process personal data at a meaningful scale?",
    help: "Larger volumes of consumer data, or selling data, can remove the TDPSA small-business exemption.",
  },
  {
    field: "texasPhysicalPresence",
    question: "Does your business have a physical presence or operations in Texas?",
    help: "An office, storefront, warehouse, or staff located in Texas.",
  },
  {
    field: "sellsToStateOfTexas",
    question: "Do you sell to or contract with the State of Texas?",
    help: "Any Texas state agency, university, or DIR-governed entity as a customer.",
  },
];

// Reuses the onboarding QuestionCard primitive (not the full onboarding flow) so the Texas
// questions feel familiar without touching ONBOARDING_STEP_ORDER.
export function TexasProfileForm({ initialProfile }: { initialProfile: TexasProfileInput }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<TexasProfileInput>(initialProfile);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function setAnswer(field: TexasProfileField, value: boolean) {
    setAnswers((previous) => ({ ...previous, [field]: value }));
  }

  function handleSave() {
    setErrorMessage(null);
    startSaving(async () => {
      const result = await saveTexasProfileAction(answers);
      if (result.ok) {
        router.refresh();
      } else {
        setErrorMessage(result.error);
      }
    });
  }

  return (
    <section aria-labelledby="texas-profile-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="texas-profile-heading" className="text-lg font-semibold text-ink">
          Tell us about your Texas footprint
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Four quick questions. Your answers drive the guidance below — nothing is shared.
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {TEXAS_PROFILE_QUESTIONS.map((item) => (
          <li key={item.field} className="flex flex-col gap-2">
            <p className="text-[15px] font-medium leading-snug text-ink">{item.question}</p>
            <p className="text-sm text-text-secondary">{item.help}</p>
            <div role="radiogroup" aria-label={item.question} className="grid grid-cols-2 gap-3">
              <QuestionCard
                label="Yes"
                icon={<Check />}
                selected={answers[item.field] === true}
                onSelect={() => setAnswer(item.field, true)}
              />
              <QuestionCard
                label="No"
                icon={<X />}
                selected={answers[item.field] === false}
                onSelect={() => setAnswer(item.field, false)}
              />
            </div>
          </li>
        ))}
      </ul>

      {errorMessage ? (
        <p role="alert" className="rounded-card border border-danger-edge bg-danger-pale px-4 py-3 text-sm text-danger-ink">
          {errorMessage}
        </p>
      ) : null}

      <BigButton fullWidth onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving…" : "Update my guidance"}
      </BigButton>
    </section>
  );
}
