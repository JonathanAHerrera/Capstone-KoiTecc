import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import {
  assignKoiTeccAssociateAction,
  removeKoiTeccAssociateAction,
} from "@/app/koitecc/actions";
import { requireKoiTeccAdmin, listKoiTeccAssociates, listKoiTeccOrganizations } from "@/lib/koitecc";

export const metadata: Metadata = { title: "KoiTecc administrator workspace — CMMC Ready" };
export const dynamic = "force-dynamic";

function formatDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(timestamp));
}

type KoiTeccAdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KoiTeccAdminPage({ searchParams }: KoiTeccAdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const administrator = await requireKoiTeccAdmin();
  const [organizations, associates] = await Promise.all([
    listKoiTeccOrganizations(),
    listKoiTeccAssociates(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-5">
        <p className="caption text-muted">KOITECC ADMINISTRATOR WORKSPACE</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-ink">Partner organizations</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Signed in as {administrator.name}. Monitor client accounts and assign KoiTecc associates.
        </p>
      </header>

      {resolvedSearchParams.assignment === "success" ? (
        <p className="rounded-card border border-success/40 bg-success/10 px-4 py-3 text-sm text-success-ink">
          Associate assignment saved. Refreshing this page will keep the assignment.
        </p>
      ) : null}
      {resolvedSearchParams.assignment === "removed" ? (
        <p className="rounded-card border border-border bg-surface-alt px-4 py-3 text-sm text-text-secondary">
          Associate assignment removed.
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="caption text-muted">Organizations</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{organizations.length}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="caption text-muted">Active associates</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{associates.length}</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="caption text-muted">Unassigned organizations</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {organizations.filter((organization) => organization.associates.length === 0).length}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Registered organizations</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Each client account owns one organization. Progress details will be added to this view next.
          </p>
        </div>
        {organizations.length === 0 ? (
          <div className="rounded-card border border-border bg-surface px-5 py-8 text-center text-sm text-text-secondary">
            No organizations have completed onboarding yet.
          </div>
        ) : (
          <ul className="grid gap-4">
            {organizations.map((organization) => (
              <li key={organization.id} className="rounded-card border border-border bg-surface p-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold text-ink">{organization.name}</h3>
                  <p className="text-sm text-text-secondary">
                    Account owner: {organization.ownerName ?? "Legacy account"}{" "}
                    {organization.ownerEmail ? `(${organization.ownerEmail})` : ""}
                  </p>
                  <p className="caption text-muted">Registered {formatDate(organization.createdAt)}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <span className="status-chip border border-border bg-surface-alt text-text-secondary">
                    CMMC Level {organization.targetLevel}
                  </span>
                  <span className="status-chip border border-border bg-surface-alt text-text-secondary">
                    {organization.employeeCount} employees
                  </span>
                  <span className="status-chip border border-border bg-surface-alt text-text-secondary">
                    {organization.handlesCui ? "Handles CUI" : "FCI only"}
                  </span>
                </div>
                <div className="mt-5 border-t border-border-subtle pt-4">
                  <p className="text-sm font-semibold text-ink">Assigned associates</p>
                  {organization.associates.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {organization.associates.map((associate) => (
                        <li
                          key={associate.id}
                          className="flex items-center gap-1 rounded-full border-2 border-accent bg-accent/10 pl-3 text-sm font-medium text-primary-text"
                        >
                          <span>{associate.name} · {associate.title}</span>
                          <Link
                            href={`/koitecc/associates/${associate.id}`}
                            className="focus-outline rounded-full px-2 py-1 text-xs underline-offset-4 hover:underline"
                          >
                            View workspace
                          </Link>
                          <form action={removeKoiTeccAssociateAction}>
                            <input type="hidden" name="organizationId" value={organization.id} />
                            <input type="hidden" name="associateId" value={associate.id} />
                            <button
                              type="submit"
                              aria-label={`Remove ${associate.name} from ${organization.name}`}
                              title={`Remove ${associate.name}`}
                              className="focus-outline flex size-8 items-center justify-center rounded-full text-primary-text transition-colors hover:bg-accent hover:text-white"
                            >
                              <X className="size-4" aria-hidden />
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-text-secondary">No associate assigned yet.</p>
                  )}
                  <form action={assignKoiTeccAssociateAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input type="hidden" name="organizationId" value={organization.id} />
                    <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-ink">
                      Assign an associate
                      <select name="associateId" required className="min-h-11 rounded-button border border-border bg-surface px-3 text-sm text-ink">
                        <option value="">Choose an associate</option>
                        {associates.map((associate) => (
                          <option key={associate.id} value={associate.id}>
                            {associate.name} — {associate.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className="focus-outline min-h-11 rounded-button border-2 border-accent bg-surface px-4 text-sm font-semibold text-accent transition-[background-color,box-shadow,color] hover:bg-success/10"
                    >
                      Assign
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
