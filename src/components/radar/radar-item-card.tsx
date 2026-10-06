import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  FileClock,
  Gavel,
  Gauge,
  ListChecks,
  RadioTower,
  Target,
} from "lucide-react";
import { saveRadarDecisionAction } from "@/app/radar/actions";
import type { RadarDecisionRow } from "@/db/schema";
import type { RadarItem, RadarUpdateType } from "@/lib/radar/types";

const TYPE_PRESENTATION: Record<RadarUpdateType, { label: string; icon: typeof Gavel; classes: string; rail: string }> = {
  binding_requirement: { label: "Binding requirement", icon: Gavel, classes: "border-danger-edge bg-danger-pale text-danger-ink", rail: "bg-danger" },
  proposed_requirement: { label: "Proposed requirement", icon: FileClock, classes: "border-warning-edge bg-warning-pale text-warning-ink", rail: "bg-warning" },
  framework_update: { label: "Framework update", icon: RadioTower, classes: "border-info-edge bg-info-pale text-info-ink", rail: "bg-info" },
  active_threat: { label: "Active threat", icon: CircleAlert, classes: "border-danger-edge bg-danger-pale text-danger-ink", rail: "bg-danger" },
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

function splitTitle(title: string): { identifier?: string; headline: string } {
  const match = title.match(/^(CVE-\d{4}-\d+)\s*[·:]\s*(.+)$/i);
  return match ? { identifier: match[1], headline: match[2] } : { headline: title };
}

export function RadarItemCard({ item, decision }: { item: RadarItem; decision?: RadarDecisionRow }) {
  const presentation = TYPE_PRESENTATION[item.updateType];
  const TypeIcon = presentation.icon;
  const relevanceLabel = item.relevanceScore >= 65 ? "Strong match" : item.relevanceScore >= 35 ? "Review" : "Watch";
  const title = splitTitle(item.title);

  return (
    <article className="relative overflow-hidden rounded-card border border-border bg-surface shadow-float">
      <div className={`absolute inset-y-0 left-0 w-1 ${presentation.rail}`} aria-hidden />
      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${presentation.classes}`}><TypeIcon className="size-3.5" aria-hidden />{presentation.label}</span>
          {title.identifier ? <span className="rounded-md border border-border bg-canvas px-2 py-1 font-mono text-[11px] font-semibold text-text">{title.identifier}</span> : null}
          {decision ? <span className="inline-flex items-center gap-1 rounded-full border border-success-edge bg-success-pale px-2.5 py-1 text-[11px] font-semibold text-success-ink"><Check className="size-3" aria-hidden />{DECISION_LABELS[decision.decision]}</span> : null}
        </div>

        <h2 className="mt-3 text-[19px] font-semibold leading-[1.35] tracking-[-0.015em] text-ink sm:text-xl">{title.headline}</h2>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Building2 className="size-3.5" aria-hidden />{item.source}{item.agency ? ` / ${item.agency}` : ""}</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden />Published {formatDate(item.publishedAt)}</span>
          {item.effectiveAt ? <span className="inline-flex items-center gap-1.5 font-medium text-warning-ink"><FileClock className="size-3.5" aria-hidden />Act by {formatDate(item.effectiveAt)}</span> : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px]">
          <div className="rounded-xl border border-border-subtle bg-canvas p-3.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.11em] text-muted">Official summary</p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{item.summary}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-alt p-3.5">
            <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink"><Gauge className="size-3.5 text-primary-text" aria-hidden />Relevance</span><span className="font-mono text-xs font-semibold text-primary-text">{item.relevanceScore}/100</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border" role="meter" aria-label={`Relevance score: ${item.relevanceScore} out of 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.relevanceScore}><div className="h-full rounded-full bg-primary" style={{ width: `${item.relevanceScore}%` }} /></div>
            <p className="mt-2 text-xs font-medium text-text-secondary">{relevanceLabel} for your profile</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-primary-edge bg-primary-pale p-3.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-text"><Target className="size-4" aria-hidden />Why this is on your radar</div>
          <ul className="mt-2 grid gap-1.5 text-sm leading-5 text-text-secondary">{item.relevanceReasons.map((reason) => <li key={reason} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden /><span>{reason}</span></li>)}</ul>
        </div>

        <details className="group mt-3 rounded-xl border border-border bg-canvas">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-sm font-semibold text-ink"><span className="inline-flex items-center gap-2"><ClipboardCheck className="size-4 text-primary-text" aria-hidden />Understand the impact</span><ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden /></summary>
          <div className="grid gap-3 border-t border-border-subtle p-3.5 text-sm sm:grid-cols-2">
            <ImpactBlock title="What it means" body={item.impact.plainEnglish} />
            <ImpactBlock title="Who it may affect" body={item.impact.mayApplyTo} />
            <ImpactBlock title="What to compare" body={item.impact.changeSummary} />
            <div className="rounded-lg bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">Affected areas</p><div className="mt-2 flex flex-wrap gap-1.5">{item.impact.affectedAreas.map((area) => <span key={area} className="rounded-md border border-border bg-canvas px-2 py-1 text-xs font-medium text-text-secondary">{area}</span>)}</div></div>
            <div className="rounded-lg bg-surface p-3 sm:col-span-2">
              <div className="flex items-center justify-between gap-3"><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted"><ListChecks className="size-4" aria-hidden />Recommended next steps</p><span className="rounded-full border border-border bg-canvas px-2.5 py-1 text-xs font-semibold text-text">{item.impact.effort} effort</span></div>
              <ol className="mt-3 grid gap-2 sm:grid-cols-3">{item.impact.recommendedTasks.map((task, index) => <li key={task} className="flex gap-2 text-sm leading-5 text-text-secondary"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-pale font-mono text-[10px] font-bold text-primary-text">{index + 1}</span><span>{task}</span></li>)}</ol>
            </div>
          </div>
        </details>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
          <a href={item.url} target="_blank" rel="noreferrer" className="focus-outline inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-primary-text hover:underline">Open official source <ArrowUpRight className="size-4" aria-hidden /></a>
          <span className="text-xs text-muted">Confirm the source before recording a decision.</span>
        </div>

        <details className="group mt-3 rounded-xl border border-border bg-surface-alt">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-sm font-semibold text-ink"><span>{decision ? "Update the recorded decision" : "Record your company decision"}</span><ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden /></summary>
          <form action={saveRadarDecisionAction} className="grid gap-3 border-t border-border-subtle p-3.5">
            <input type="hidden" name="itemId" value={item.id} /><input type="hidden" name="sourceTitle" value={item.title} /><input type="hidden" name="sourceUrl" value={item.url} />
            <label className="text-xs font-semibold text-text-secondary">Decision<select name="decision" defaultValue={decision?.decision ?? "expert_review"} className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base font-normal text-ink">{Object.entries(DECISION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-semibold text-text-secondary">Reasoning<textarea required name="rationale" defaultValue={decision?.rationale} placeholder="Explain how this affects the company, or why it does not." rows={3} className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-base font-normal text-ink" /></label>
            <label className="text-xs font-semibold text-text-secondary">Reviewed by<input required name="reviewer" defaultValue={decision?.reviewer} placeholder="Name or role" className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base font-normal text-ink" /></label>
            <button type="submit" className="focus-outline min-h-11 rounded-lg bg-primary px-4 font-semibold text-primary-contrast hover:bg-primary-hover">Save decision record</button>
          </form>
        </details>
      </div>
    </article>
  );
}

function ImpactBlock({ title, body }: { title: string; body: string }) {
  return <div className="rounded-lg bg-surface p-3"><p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{title}</p><p className="mt-1.5 leading-6 text-text-secondary">{body}</p></div>;
}
