import { ArrowUpRight, CircleAlert, FileClock, Gavel, RadioTower } from "lucide-react";
import { saveRadarDecisionAction } from "@/app/radar/actions";
import type { RadarDecisionRow } from "@/db/schema";
import type { RadarItem, RadarUpdateType } from "@/lib/radar/types";

const TYPE_PRESENTATION: Record<RadarUpdateType, { label: string; icon: typeof Gavel; classes: string }> = {
  binding_requirement: { label: "Binding requirement", icon: Gavel, classes: "border-danger-edge bg-danger-pale text-danger-ink" },
  proposed_requirement: { label: "Proposed requirement", icon: FileClock, classes: "border-warning-edge bg-warning-pale text-warning-ink" },
  framework_update: { label: "Framework update", icon: RadioTower, classes: "border-info-edge bg-info-pale text-info-ink" },
  active_threat: { label: "Active threat", icon: CircleAlert, classes: "border-danger-edge bg-danger-pale text-danger-ink" },
};

const DECISION_LABELS: Record<RadarDecisionRow["decision"], string> = {
  applies: "Applies",
  does_not_apply: "Does not apply",
  expert_review: "Needs expert review",
  track: "Track for later",
  accepted_risk: "Accepted risk",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function RadarItemCard({ item, decision }: { item: RadarItem; decision?: RadarDecisionRow }) {
  const presentation = TYPE_PRESENTATION[item.updateType];
  const TypeIcon = presentation.icon;
  const relevanceLabel = item.relevanceScore >= 65 ? "Strong match" : item.relevanceScore >= 35 ? "Review" : "Watch";

  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-float">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${presentation.classes}`}><TypeIcon className="size-3.5" aria-hidden />{presentation.label}</span>
        <span className="rounded-full border border-border bg-canvas px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary">{relevanceLabel} · {item.relevanceScore}</span>
        {decision ? <span className="rounded-full border border-success-edge bg-success-pale px-2.5 py-1 text-[11px] font-semibold text-success-ink">Recorded: {DECISION_LABELS[decision.decision]}</span> : null}
      </div>

      <h2 className="mt-3 text-[18px] font-semibold leading-snug text-ink">{item.title}</h2>
      <p className="mt-1 text-xs text-muted">{item.source}{item.agency ? ` · ${item.agency}` : ""} · {formatDate(item.publishedAt)}</p>
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-text-secondary">{item.summary}</p>

      <details className="mt-4 rounded-lg border border-border bg-canvas">
        <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-ink">Draft impact analysis</summary>
        <div className="grid gap-4 border-t border-border-subtle p-3 text-sm">
          <div><p className="font-semibold text-ink">What it means</p><p className="mt-1 leading-relaxed text-text-secondary">{item.impact.plainEnglish}</p></div>
          <div><p className="font-semibold text-ink">Who it may apply to</p><p className="mt-1 leading-relaxed text-text-secondary">{item.impact.mayApplyTo}</p></div>
          <div><p className="font-semibold text-ink">Change to compare</p><p className="mt-1 leading-relaxed text-text-secondary">{item.impact.changeSummary}</p></div>
          <div><p className="font-semibold text-ink">Affected areas</p><p className="mt-1 text-text-secondary">{item.impact.affectedAreas.join(" · ")}</p></div>
          <div className="flex items-center justify-between gap-3"><p className="font-semibold text-ink">Estimated review effort</p><span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text">{item.impact.effort}</span></div>
          <div><p className="font-semibold text-ink">Recommended tasks</p><ul className="mt-1.5 flex flex-col gap-1 text-text-secondary">{item.impact.recommendedTasks.map((task) => <li key={task}>• {task}</li>)}</ul></div>
          {item.effectiveAt ? <div><p className="font-semibold text-ink">Effective or remediation date</p><p className="mt-1 text-text-secondary">{formatDate(item.effectiveAt)}</p></div> : null}
        </div>
      </details>

      <div className="mt-4 border-l-2 border-primary-edge pl-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Why this surfaced</p>
        <ul className="mt-1.5 flex flex-col gap-1 text-sm text-text-secondary">
          {item.relevanceReasons.map((reason) => <li key={reason}>• {reason}</li>)}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <a href={item.url} target="_blank" rel="noreferrer" className="focus-outline inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary-text hover:underline">Official source <ArrowUpRight className="size-4" aria-hidden /></a>
        <span className="text-xs text-muted">Verify before relying on this record</span>
      </div>

      <details className="mt-3 rounded-lg border border-border bg-canvas">
        <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-ink">Review applicability</summary>
        <form action={saveRadarDecisionAction} className="flex flex-col gap-3 border-t border-border-subtle p-3">
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="sourceTitle" value={item.title} />
          <input type="hidden" name="sourceUrl" value={item.url} />
          <select name="decision" defaultValue={decision?.decision ?? "expert_review"} className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base text-ink">
            {Object.entries(DECISION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <textarea required name="rationale" defaultValue={decision?.rationale} placeholder="Why does this decision make sense for the company?" rows={3} className="rounded-lg border border-border bg-surface px-3 py-2 text-base text-ink" />
          <input required name="reviewer" defaultValue={decision?.reviewer} placeholder="Reviewer name or role" className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base text-ink" />
          <button type="submit" className="focus-outline min-h-11 rounded-lg bg-primary px-4 font-semibold text-primary-contrast hover:bg-primary-hover">Save decision record</button>
        </form>
      </details>
    </article>
  );
}
