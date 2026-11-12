import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bell, CircleAlert, FileText, Users } from "lucide-react";
import { createAssociateUpdateAction } from "@/app/koitecc/actions";
import { ConcernDialog } from "@/components/koitecc/concern-dialog";
import {
  getKoiTeccAssociate,
  listAssociateWorkspaceOrganizations,
} from "@/lib/koitecc";

export const metadata: Metadata = { title: "Associate workspace — CMMC Ready" };
export const dynamic = "force-dynamic";

type AssociateWorkspacePageProps = {
  params: Promise<{ associateId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestamp),
  );
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export default async function AssociateWorkspacePage({
  params,
  searchParams,
}: AssociateWorkspacePageProps) {
  const { associateId } = await params;
  const resolvedSearchParams = await searchParams;
  const [associate, organizations] = await Promise.all([
    getKoiTeccAssociate(associateId),
    listAssociateWorkspaceOrganizations(associateId),
  ]);
  if (!associate) throw new Error("Associate not found.");

  const totalAccepted = organizations.reduce((total, organization) => total + organization.progress.accepted, 0);
  const totalRequirements = organizations.reduce((total, organization) => total + organization.progress.total, 0);
  const totalConcerns = organizations.reduce((total, organization) => total + organization.concerns.length, 0);

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-5">
        <Link
          href="/koitecc"
          className="focus-outline inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to organizations
        </Link>
        <div className="mt-5 flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Users className="size-6" aria-hidden />
          </div>
          <div>
            <p className="caption text-muted">KOITECC ASSOCIATE WORKSPACE</p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-ink">{associate.name}</h1>
            <p className="mt-1 text-sm text-text-secondary">{associate.title} · {associate.email}</p>
          </div>
        </div>
      </header>

      {resolvedSearchParams.update === "success" ? (
        <p className="rounded-card border border-success/40 bg-success/10 px-4 py-3 text-sm text-success-ink">
          Your company update was published to the associate workspace record.
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="caption text-muted">Assigned organizations</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{organizations.length}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="caption text-muted">Accepted requirements</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{totalAccepted} / {totalRequirements}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="caption text-muted">Open concerns</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{totalConcerns}</p>
        </div>
      </section>

      {organizations.length === 0 ? (
        <section className="rounded-card border border-border bg-surface px-5 py-10 text-center">
          <Users className="mx-auto size-9 text-muted" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold text-ink">No assigned organizations</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Assign a company to this associate from the administrator organization view.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-semibold text-ink">Assigned company portfolio</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Review readiness progress, client notes, concerns, and updates for each assigned organization.
            </p>
          </div>
          {organizations.map((organization) => {
            const progressPercent = organization.progress.percent;
            const statusSegments = [
              { label: "Accepted", value: organization.progress.accepted, color: "bg-success" },
              { label: "Needs work", value: organization.progress.needsWork, color: "bg-warning" },
              { label: "Reviewing", value: organization.progress.underReview, color: "bg-accent" },
              { label: "In progress", value: organization.progress.inProgress, color: "bg-info" },
              { label: "Not started", value: organization.progress.notStarted, color: "bg-border" },
            ];
            return (
              <article key={organization.id} className="rounded-card border border-border bg-surface p-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-semibold text-ink">{organization.name}</h3>
                  <p className="text-sm text-text-secondary">
                    {organization.ownerName ?? "Legacy account"}{organization.ownerEmail ? ` · ${organization.ownerEmail}` : ""}
                  </p>
                  <p className="caption text-muted">
                    CMMC Level {organization.targetLevel} · Registered {formatDate(organization.createdAt)}
                  </p>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-[180px_1fr] md:items-center">
                  <div
                    className="mx-auto flex size-40 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(var(--color-accent) ${progressPercent * 3.6}deg, var(--color-border-subtle) 0deg)`,
                    }}
                    aria-label={`${progressPercent}% of requirements accepted`}
                    role="img"
                  >
                    <div className="flex size-32 flex-col items-center justify-center rounded-full bg-surface">
                      <span className="text-3xl font-semibold text-ink">{progressPercent}%</span>
                      <span className="caption text-muted">accepted</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex h-4 overflow-hidden rounded-full bg-surface-alt" aria-label="Requirement status distribution">
                      {statusSegments.map((segment) => (
                        segment.value > 0 ? (
                          <div
                            key={segment.label}
                            className={segment.color}
                            style={{ width: `${(segment.value / organization.progress.total) * 100}%` }}
                            title={`${segment.label}: ${segment.value}`}
                          />
                        ) : null
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                      {statusSegments.map((segment) => (
                        <div key={segment.label} className="flex items-center gap-2 text-text-secondary">
                          <span className={`size-2.5 rounded-full ${segment.color}`} aria-hidden />
                          <span>{segment.label}: {segment.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <section className="mt-6 grid gap-4 border-t border-border-subtle pt-5 lg:grid-cols-2">
                  <div className="rounded-card border border-accent/30 bg-accent/5 p-4">
                    <p className="caption text-accent">Current position</p>
                    {organization.currentPractice && organization.currentFamily ? (
                      <>
                        <h4 className="mt-2 text-base font-semibold text-ink">
                          {organization.currentFamily.code} · {organization.currentFamily.name}
                        </h4>
                        <p className="mt-1 text-sm font-medium text-primary-text">
                          Next requirement: {organization.currentPractice.title}
                        </p>
                        <p className="mt-2 text-sm text-text-secondary">
                          This is the first requirement in the organization&apos;s ordered path that is not
                          accepted. The client is currently working in this section or needs follow-up here.
                        </p>
                        <span className="mt-3 inline-flex rounded-full border border-accent/40 bg-surface px-3 py-1 text-xs font-semibold capitalize text-accent">
                          {statusLabel(organization.currentPractice.status)}
                        </span>
                      </>
                    ) : (
                      <>
                        <h4 className="mt-2 text-base font-semibold text-ink">All requirements accepted</h4>
                        <p className="mt-1 text-sm text-text-secondary">
                          This organization has reached the end of its currently selected CMMC path.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="rounded-card border border-border bg-surface-alt p-4">
                    <p className="caption text-muted">Progress interpretation</p>
                    <p className="mt-2 text-sm text-text-secondary">
                      {organization.progress.accepted} of {organization.progress.total} requirements are accepted.
                      There are {organization.progress.needsWork} needing work, {organization.progress.underReview} under
                      review, {organization.progress.inProgress} in progress, and {organization.progress.notStarted} not started.
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      The current section is determined by the first non-accepted requirement in the catalog order,
                      not simply by the most recently edited submission.
                    </p>
                  </div>
                </section>

                <section className="mt-6 border-t border-border-subtle pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-ink">Requirement-by-requirement progress</h4>
                      <p className="mt-1 text-sm text-text-secondary">
                        Completed practices are listed individually, followed by the requirements still requiring client action.
                      </p>
                    </div>
                    <span className="status-chip shrink-0 border border-border bg-surface-alt text-text-secondary">
                      {organization.families.length} sections
                    </span>
                  </div>
                  <div className="mt-4 flex flex-col gap-3">
                    {organization.families.map((family) => (
                      <details key={family.code} className="rounded-card border border-border-subtle bg-surface-alt" open={family.code === organization.currentFamily?.code}>
                        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3">
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-ink">{family.code} · {family.name}</span>
                            <span className="caption mt-0.5 block text-muted">
                              {family.completedCount} of {family.totalCount} accepted
                            </span>
                          </span>
                          <span className="h-2 w-24 overflow-hidden rounded-full bg-border sm:w-36">
                            <span
                              className="block h-full rounded-full bg-success"
                              style={{ width: `${family.totalCount === 0 ? 0 : (family.completedCount / family.totalCount) * 100}%` }}
                            />
                          </span>
                        </summary>
                        <div className="border-t border-border-subtle px-4 py-3">
                          {family.completedPractices.length > 0 ? (
                            <div>
                              <p className="caption font-semibold text-success-ink">Completed practices</p>
                              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                                {family.completedPractices.map((practice) => (
                                  <li key={practice.id} className="rounded-card border border-success/30 bg-success/10 px-3 py-2">
                                    <p className="text-sm font-medium text-ink">{practice.title}</p>
                                    <p className="caption mt-0.5 text-success-ink">{practice.id} · Accepted</p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {family.remainingPractices.length > 0 ? (
                            <div className={family.completedPractices.length > 0 ? "mt-4" : ""}>
                              <p className="caption font-semibold text-warning-ink">Remaining or awaiting follow-up</p>
                              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                                {family.remainingPractices.map((practice) => (
                                  <li key={practice.id} className="rounded-card border border-warning/30 bg-warning/10 px-3 py-2">
                                    <p className="text-sm font-medium text-ink">{practice.title}</p>
                                    <p className="caption mt-0.5 capitalize text-warning-ink">
                                      {practice.id} · {statusLabel(practice.status)}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-sm text-success-ink">Every practice in this section is accepted.</p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>

                <div className="mt-6 grid gap-5 border-t border-border-subtle pt-5 lg:grid-cols-2">
                  <section>
                    <div className="flex items-center gap-2">
                      <FileText className="size-5 text-accent" aria-hidden />
                      <h4 className="font-semibold text-ink">Client notes</h4>
                    </div>
                    {organization.notes.length > 0 ? (
                      <ul className="mt-3 flex flex-col gap-2">
                        {organization.notes.slice(0, 5).map((note) => (
                          <li key={note.practiceId} className="rounded-card border border-border-subtle bg-surface-alt p-3">
                            <p className="text-sm font-medium text-ink">{note.practiceTitle}</p>
                            <p className="mt-1 text-sm text-text-secondary">{note.note}</p>
                            <p className="caption mt-2 text-muted">{statusLabel(note.status)} · {formatDate(note.updatedAt)}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-text-secondary">No client notes have been added.</p>
                    )}
                  </section>

                  <section>
                    <div className="flex items-center gap-2">
                      <CircleAlert className="size-5 text-warning-ink" aria-hidden />
                      <h4 className="font-semibold text-ink">Concerns and follow-up</h4>
                    </div>
                    {organization.concerns.length > 0 ? (
                      <ul className="mt-3 flex flex-col gap-2">
                        {organization.concerns.slice(0, 5).map((concern) => (
                          <li key={`${concern.kind}-${concern.id}`} className="rounded-card border border-warning/40 bg-warning/10 p-3">
                            <div className="flex items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium capitalize text-ink">{concern.title}</p>
                                <p className="mt-1 text-sm text-text-secondary">{concern.detail}</p>
                                <p className="caption mt-2 text-muted">{statusLabel(concern.status)} · {formatDate(concern.createdAt)}</p>
                              </div>
                              <ConcernDialog
                                associateId={associate.id}
                                concern={concern}
                                organizationName={organization.name}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-text-secondary">No open concerns or incidents.</p>
                    )}
                  </section>
                </div>

                <section className="mt-6 border-t border-border-subtle pt-5">
                  <div className="flex items-center gap-2">
                    <Bell className="size-5 text-accent" aria-hidden />
                    <h4 className="font-semibold text-ink">Announcements and updates</h4>
                  </div>
                  <form action={createAssociateUpdateAction} className="mt-3 flex flex-col gap-3">
                    <input type="hidden" name="associateId" value={associate.id} />
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <label className="text-sm text-text-secondary" htmlFor={`message-${organization.id}`}>
                      Share a status update, reminder, or announcement for this company.
                    </label>
                    <textarea
                      id={`message-${organization.id}`}
                      name="message"
                      required
                      maxLength={2000}
                      rows={3}
                      placeholder="Example: We are ready to review your updated access-control evidence this week."
                      className="w-full rounded-card border border-border bg-surface-alt px-3 py-3 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                    <button
                      type="submit"
                      className="focus-outline min-h-11 self-start rounded-button border-2 border-accent bg-surface px-4 text-sm font-semibold text-accent transition-[background-color,box-shadow,color] hover:bg-accent hover:text-white hover:shadow-[0_4px_14px_rgba(20,184,166,0.28)]"
                    >
                      Publish update
                    </button>
                  </form>
                  {organization.updates.length > 0 ? (
                    <ul className="mt-4 flex flex-col gap-2">
                      {organization.updates.slice(0, 5).map((update) => (
                        <li key={update.id} className="rounded-card border border-accent/30 bg-accent/5 p-3">
                          <p className="text-sm text-ink">{update.message}</p>
                          <p className="caption mt-2 text-muted">{formatDate(update.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
