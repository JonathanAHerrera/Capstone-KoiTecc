import { CircleAlert, CircleCheck, CircleX, ListChecks, Sparkles } from "lucide-react";

export type ReviewVerdict = "accepted" | "needs_work";

export type ReviewObjectiveFinding = {
  objective: string;
  met: boolean;
  note: string;
};

export type ReviewVerdictCardProps = {
  verdict: ReviewVerdict;
  summary: string;
  objectiveFindings: ReviewObjectiveFinding[];
  missingItems: string[];
  nextSteps: string[];
  isMock?: boolean;
  className?: string;
};

export function ReviewVerdictCard({
  verdict,
  summary,
  objectiveFindings,
  missingItems,
  nextSteps,
  isMock = false,
  className = "",
}: ReviewVerdictCardProps) {
  const accepted = verdict === "accepted";

  return (
    <section
      className={`lip overflow-hidden rounded-card border-2 bg-surface ${
        accepted
          ? "border-success-lip [--lip-color:var(--color-success-lip)]"
          : "border-warning-lip [--lip-color:var(--color-warning-lip)]"
      } ${className}`}
      aria-label={accepted ? "Review result: accepted" : "Review result: needs work"}
    >
      <header className={`flex items-center gap-3 px-4 py-4 text-white ${accepted ? "bg-success" : "bg-warning"}`}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/25" aria-hidden>
          {accepted ? <CircleCheck className="size-8" strokeWidth={2.5} /> : <CircleAlert className="size-8" strokeWidth={2.5} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[22px] font-black leading-tight">{accepted ? "Accepted" : "Almost there"}</p>
          <p className="caption flex flex-wrap items-center gap-x-2 gap-y-1 text-white/85">
            {accepted ? "This requirement is met" : `${missingItems.length || "A few"} things to fix`}
            {isMock ? <span className="rounded-chip bg-ink/30 px-2 py-0.5 text-[11px] text-white">Sample review</span> : null}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">
        <p className="text-base font-medium leading-relaxed text-text">{summary}</p>

        {objectiveFindings.length > 0 ? (
          <div>
            <p className="caption mb-2 flex items-center gap-1.5 text-muted">
              <ListChecks className="size-4" aria-hidden />
              Objectives checked
            </p>
            <ul className="flex flex-col gap-2">
              {objectiveFindings.map((finding, findingIndex) => (
                <li
                  key={findingIndex}
                  className={`flex gap-3 rounded-xl border-2 px-3 py-2.5 ${
                    finding.met ? "border-success/40 bg-success-pale/50" : "border-warning/40 bg-warning-pale/60"
                  }`}
                >
                  {finding.met ? (
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-success-ink" strokeWidth={2.5} aria-label="Met" />
                  ) : (
                    <CircleX className="mt-0.5 size-5 shrink-0 text-warning-ink" strokeWidth={2.5} aria-label="Not met" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold leading-snug text-ink">{finding.objective}</p>
                    {finding.note ? <p className="mt-0.5 text-sm font-medium text-muted">{finding.note}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!accepted && missingItems.length > 0 ? (
          <div>
            <p className="caption mb-2 text-warning-ink">What is missing</p>
            <ol className="flex flex-col gap-2">
              {missingItems.map((missingItem, itemIndex) => (
                <li key={itemIndex} className="flex gap-3">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warning text-sm font-black text-white"
                    aria-hidden
                  >
                    {itemIndex + 1}
                  </span>
                  <p className="pt-0.5 text-[15px] font-bold leading-snug text-ink">{missingItem}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {nextSteps.length > 0 ? (
          <div className="rounded-xl bg-canvas px-3 py-3">
            <p className="caption mb-1.5 flex items-center gap-1.5 text-primary">
              <Sparkles className="size-4" aria-hidden />
              Next steps
            </p>
            <ul className="flex flex-col gap-1.5 pl-4 text-[15px] font-medium leading-snug text-text [list-style:disc]">
              {nextSteps.map((nextStep, stepIndex) => (
                <li key={stepIndex}>{nextStep}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
