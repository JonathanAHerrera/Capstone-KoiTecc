import { Info, ShieldAlert } from "lucide-react";
import { TEXAS_BREACH_PLAYBOOK } from "@/lib/radar/texas-playbook";

// Shown on /radar for Texas-oriented profiles. A read-only timeline of the §521 breach
// duties so owners can rehearse the notification clock before an incident.
export function BreachPlaybook() {
  const { title, summary, disclaimer, steps } = TEXAS_BREACH_PLAYBOOK;
  return (
    <section aria-labelledby="breach-playbook-heading" className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-warning-edge bg-warning-pale text-warning-ink">
          <ShieldAlert className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="breach-playbook-heading" className="text-base font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">{summary}</p>
        </div>
      </div>

      <ol className="mt-4 flex flex-col">
        {steps.map((step, stepIndex) => {
          const isLast = stepIndex === steps.length - 1;
          return (
            <li key={step.code} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary-edge bg-primary-pale text-[13px] font-semibold text-primary-text">
                  {stepIndex + 1}
                </span>
                {isLast ? null : <span aria-hidden className="w-px flex-1 bg-border" />}
              </div>
              <div className={isLast ? "min-w-0 flex-1" : "min-w-0 flex-1 pb-5"}>
                <p className="text-[15px] font-semibold text-ink">{step.title}</p>
                <p className="mt-0.5 text-[13px] font-medium text-warning-ink">{step.timing}</p>
                <p className="mt-1 text-sm text-text-secondary">{step.detail}</p>
                <p className="mt-1 text-[12px] text-muted">{step.legalRef}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>{disclaimer}</span>
      </p>
    </section>
  );
}
