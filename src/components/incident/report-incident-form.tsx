"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Lock, MailWarning } from "lucide-react";
import { createIncidentAction } from "@/app/incident/actions";
import { BigButton } from "@/components/ui/big-button";
import type { IncidentKind } from "@/db/schema";
import { INCIDENT_KIND_DESCRIPTIONS, INCIDENT_KIND_LABELS, INCIDENT_KINDS } from "@/lib/incident-kinds";

const KIND_ICONS: Readonly<Record<IncidentKind, typeof Banknote>> = {
  wire_fraud: Banknote,
  hacked_email: MailWarning,
  ransomware: Lock,
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReportIncidentForm() {
  const router = useRouter();
  const [selectedKind, setSelectedKind] = useState<IncidentKind>("wire_fraud");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingIncident, startSavingIncident] = useTransition();

  function sendIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("kind", selectedKind);
    setErrorMessage(null);
    startSavingIncident(async () => {
      const result = await createIncidentAction(formData);
      if (result.ok) {
        router.push(`/incident/${result.data.id}`);
      } else {
        setErrorMessage(result.error);
      }
    });
  }

  return (
    <form onSubmit={sendIncident} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-ink">What happened?</legend>
        {INCIDENT_KINDS.map((kind) => {
          const Icon = KIND_ICONS[kind];
          const selected = kind === selectedKind;
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSelectedKind(kind)}
              className={`focus-outline flex min-h-[64px] items-center gap-3 rounded-card border px-4 py-3 text-left transition-colors ${
                selected ? "border-primary-edge bg-primary-pale" : "border-border bg-surface hover:bg-surface-alt"
              }`}
            >
              <Icon className={`size-6 shrink-0 ${selected ? "text-primary-text" : "text-text-secondary"}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">{INCIDENT_KIND_LABELS[kind]}</span>
                <span className="mt-0.5 block text-[13px] text-text-secondary">{INCIDENT_KIND_DESCRIPTIONS[kind]}</span>
              </span>
            </button>
          );
        })}
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">When did you determine it happened?</span>
        <input
          type="date"
          name="discoveredAt"
          required
          defaultValue={todayIsoDate()}
          max={todayIsoDate()}
          className="min-h-[44px] rounded-card border border-border bg-surface px-4 text-base text-ink focus:border-primary focus:outline-none"
        />
        <span className="text-[12px] text-muted">The Texas notification clocks run from this date.</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">How many Texas residents may be affected?</span>
        <input
          type="number"
          name="affectedTexasResidents"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder="Leave blank if you don't know yet"
          className="min-h-[44px] rounded-card border border-border bg-surface px-4 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <span className="text-[12px] text-muted">250 or more adds a 30-day Attorney General report. You can update this later.</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">Notes (optional)</span>
        <textarea
          name="notes"
          rows={3}
          maxLength={4000}
          placeholder="What you know so far: amounts, accounts, who noticed, when."
          className="rounded-card border border-border bg-surface px-4 py-3 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </label>

      {errorMessage ? (
        <p role="alert" className="rounded-card border border-danger-edge bg-danger-pale px-4 py-3 text-sm text-danger-ink">
          {errorMessage}
        </p>
      ) : null}

      <BigButton type="submit" fullWidth loading={savingIncident}>
        Start the response plan
      </BigButton>
    </form>
  );
}
