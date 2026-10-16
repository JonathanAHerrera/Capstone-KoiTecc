import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, Siren } from "lucide-react";
import { ReportIncidentForm } from "@/components/incident/report-incident-form";
import { INCIDENT_KIND_LABELS, listIncidents } from "@/lib/incident";
import { getOrganization } from "@/lib/org";

export const metadata: Metadata = { title: "Something happened — Texas Safe Harbor" };

export const dynamic = "force-dynamic";

const STATUS_LABELS = { open: "Open", contained: "Contained", closed: "Closed" } as const;

export default async function IncidentPage() {
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const incidents = await listIncidents();

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/path"
            aria-label="Back to home"
            className="focus-outline flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="caption text-muted">Safety tools</p>
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">Something happened</h1>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-danger-edge bg-danger-pale text-danger-ink">
            <Siren className="size-5" aria-hidden />
          </span>
        </div>
        <p className="mt-3 text-sm text-text-secondary">
          Pick what happened and you get a step-by-step checklist, the Texas notification deadlines, draft
          notices, and one tap to bring in KOITECC. The incident is recorded in your evidence ledger.
        </p>
      </header>

      <ReportIncidentForm />

      {incidents.length > 0 ? (
        <section aria-labelledby="past-incidents-heading" className="flex flex-col gap-3 border-t border-border-subtle pt-6">
          <h2 id="past-incidents-heading" className="caption text-muted">
            Recorded incidents
          </h2>
          <ul className="flex flex-col gap-2">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <Link
                  href={`/incident/${incident.id}`}
                  className="focus-outline flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-alt"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{INCIDENT_KIND_LABELS[incident.kind]}</span>
                    <span className="caption mt-0.5 block text-muted">
                      Determined {incident.discoveredAt} · {STATUS_LABELS[incident.status]}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
