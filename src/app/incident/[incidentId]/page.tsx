import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, ExternalLink, Info } from "lucide-react";
import { CopyNoticeButton } from "@/components/incident/copy-notice-button";
import { IncidentHelpButton } from "@/components/incident/incident-help-button";
import {
  ATTORNEY_GENERAL_RESIDENT_THRESHOLD,
  buildDraftNotices,
  computeBreachClock,
  daysUntil,
  formatIsoDate,
  getIncidentById,
  getIncidentChecklist,
  INCIDENT_KIND_LABELS,
} from "@/lib/incident";
import { getOrganization } from "@/lib/org";
import { listReviewerTasksForOrg } from "@/lib/reviewer-tasks";

export const metadata: Metadata = { title: "Incident response plan — Texas Safe Harbor" };

export const dynamic = "force-dynamic";

type IncidentDetailPageProps = {
  params: Promise<{ incidentId: string }>;
};

function describeDaysRemaining(days: number): string {
  if (days > 1) return `${days} days left`;
  if (days === 1) return "1 day left";
  if (days === 0) return "Due today";
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
}

function deadlineToneClass(days: number): string {
  if (days < 0) return "border-danger-edge bg-danger-pale text-danger-ink";
  if (days <= 7) return "border-warning-edge bg-warning-pale text-warning-ink";
  return "border-border bg-surface text-ink";
}

export default async function IncidentDetailPage({ params }: IncidentDetailPageProps) {
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const { incidentId } = await params;
  const incident = await getIncidentById(incidentId);
  if (!incident) notFound();

  const residentCount = incident.affectedTexasResidents ?? 0;
  const clock = computeBreachClock(incident.discoveredAt, residentCount);
  const checklist = getIncidentChecklist(incident.kind);
  const notices = buildDraftNotices(organization, incident, clock);
  const reviewerTasks = await listReviewerTasksForOrg(organization.id);
  const helpAlreadyRequested = reviewerTasks.some(
    (task) => task.relatedIncidentId === incident.id && task.status !== "closed",
  );
  const individualDaysLeft = daysUntil(clock.individualNoticeDeadline);
  const attorneyGeneralDaysLeft = clock.attorneyGeneralDeadline ? daysUntil(clock.attorneyGeneralDeadline) : null;

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/incident"
            aria-label="Back to incidents"
            className="focus-outline flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="caption text-muted">Response plan</p>
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">
              {INCIDENT_KIND_LABELS[incident.kind]}
            </h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-text-secondary">
          Determined on {incident.discoveredAt}
          {incident.affectedTexasResidents === null
            ? ". Texas resident count not entered yet."
            : ` · ${incident.affectedTexasResidents} Texas resident${incident.affectedTexasResidents === 1 ? "" : "s"} may be affected.`}
        </p>
      </header>

      <IncidentHelpButton incidentId={incident.id} helpAlreadyRequested={helpAlreadyRequested} />

      <section aria-labelledby="checklist-heading" className="flex flex-col gap-3">
        <h2 id="checklist-heading" className="text-sm font-semibold text-ink">
          Do these now, in order
        </h2>
        <ol className="flex flex-col gap-2">
          {checklist.map((step, stepIndex) => (
            <li key={step.id} className="flex gap-3 rounded-card border border-border bg-surface px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary-edge bg-primary-pale text-[13px] font-semibold text-primary-text">
                {stepIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">{step.title}</p>
                <p className="mt-1 text-sm text-text-secondary">{step.detail}</p>
                {step.externalLink ? (
                  <a
                    href={step.externalLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-outline mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary-text underline-offset-4 hover:underline"
                  >
                    {step.externalLink.label}
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="clock-heading" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-5 text-warning-ink" aria-hidden />
          <h2 id="clock-heading" className="text-sm font-semibold text-ink">
            Texas breach-notification clock
          </h2>
        </div>
        <p className="text-sm text-text-secondary">
          These deadlines apply if Texans&apos; sensitive personal information was, or is reasonably believed to
          have been, taken. Counted in calendar days from the determination date.
        </p>
        <div className={`rounded-card border p-4 ${deadlineToneClass(individualDaysLeft)}`}>
          <p className="caption opacity-80">Notify affected individuals by</p>
          <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{formatIsoDate(clock.individualNoticeDeadline)}</p>
          <p className="mt-0.5 text-sm font-medium">{describeDaysRemaining(individualDaysLeft)}</p>
          <p className="mt-2 text-[12px] opacity-80">{clock.individualNoticeRequirementId} · Tex. Bus. &amp; Com. Code §521.053(b)</p>
        </div>
        {clock.attorneyGeneralDeadline && attorneyGeneralDaysLeft !== null ? (
          <div className={`rounded-card border p-4 ${deadlineToneClass(attorneyGeneralDaysLeft)}`}>
            <p className="caption opacity-80">Report to the Texas Attorney General by</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{formatIsoDate(clock.attorneyGeneralDeadline)}</p>
            <p className="mt-0.5 text-sm font-medium">{describeDaysRemaining(attorneyGeneralDaysLeft)}</p>
            <p className="mt-2 text-[12px] opacity-80">{clock.attorneyGeneralRequirementId} · Tex. Bus. &amp; Com. Code §521.053(i)</p>
          </div>
        ) : (
          <p className="flex items-start gap-1.5 rounded-card border border-border bg-surface px-4 py-3 text-[13px] text-text-secondary">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              The 30-day Attorney General report applies at {ATTORNEY_GENERAL_RESIDENT_THRESHOLD} or more Texas
              residents. {incident.affectedTexasResidents === null ? "Enter a count once you know it." : "Below the threshold for the count entered."}
            </span>
          </p>
        )}
      </section>

      <section aria-labelledby="notices-heading" className="flex flex-col gap-3">
        <h2 id="notices-heading" className="text-sm font-semibold text-ink">
          Draft notices
        </h2>
        <p className="text-sm text-text-secondary">
          Starting points built from the stored §521 requirement text. Fill in the bracketed parts and have an
          attorney review before anything is sent.
        </p>
        <details className="rounded-card border border-border bg-surface">
          <summary className="focus-outline min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-medium text-ink">
            Notice to affected individuals
          </summary>
          <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-3">
            <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-text-secondary">{notices.individualNotice}</pre>
            <CopyNoticeButton noticeText={notices.individualNotice} label="Copy individual notice draft" />
          </div>
        </details>
        {notices.attorneyGeneralNotice ? (
          <details className="rounded-card border border-border bg-surface">
            <summary className="focus-outline min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-medium text-ink">
              Attorney General report worksheet
            </summary>
            <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-3">
              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-text-secondary">{notices.attorneyGeneralNotice}</pre>
              <CopyNoticeButton noticeText={notices.attorneyGeneralNotice} label="Copy AG worksheet draft" />
            </div>
          </details>
        ) : null}
      </section>

      {incident.notes ? (
        <section aria-labelledby="notes-heading" className="flex flex-col gap-2">
          <h2 id="notes-heading" className="text-sm font-semibold text-ink">
            Your notes
          </h2>
          <p className="whitespace-pre-wrap rounded-card border border-border bg-surface px-4 py-3 text-sm text-text-secondary">{incident.notes}</p>
        </section>
      ) : null}

      <p className="text-[12px] leading-snug text-muted">
        Educational summary of Tex. Bus. &amp; Com. Code Ch. 521, not legal advice. Confirm thresholds, timing,
        and content with qualified counsel.
      </p>
    </div>
  );
}
