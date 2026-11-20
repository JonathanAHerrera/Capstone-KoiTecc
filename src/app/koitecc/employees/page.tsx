import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { createKoiTeccAssociateAction } from "@/app/koitecc/actions";
import { EmployeeDeleteButton } from "@/components/koitecc/employee-delete-button";
import { DismissibleSuccessBanner } from "@/components/koitecc/dismissible-success-banner";
import {
  listKoiTeccAssociates,
  listKoiTeccOrganizations,
} from "@/lib/koitecc";

export const metadata: Metadata = { title: "Employee management — KoiTecc" };
export const dynamic = "force-dynamic";

type EmployeePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmployeeManagementPage({ searchParams }: EmployeePageProps) {
  const resolvedSearchParams = await searchParams;
  const [associates, organizations] = await Promise.all([
    listKoiTeccAssociates(),
    listKoiTeccOrganizations(),
  ]);
  const organizationNamesByAssociate = new Map<string, string[]>();
  for (const organization of organizations) {
    for (const associate of organization.associates) {
      const names = organizationNamesByAssociate.get(associate.id) ?? [];
      names.push(organization.name);
      organizationNamesByAssociate.set(associate.id, names);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-5">
        <Link
          href="/koitecc"
          className="focus-outline inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to organizations
        </Link>
        <p className="mt-5 caption text-muted">KOITECC ADMINISTRATOR WORKSPACE</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-ink">Employee Management</h1>
      </header>

      <DismissibleSuccessBanner
        visible={resolvedSearchParams.employee === "added"}
        message="Employee added."
      />
      <DismissibleSuccessBanner
        visible={resolvedSearchParams.employee === "deleted"}
        message="Employee deleted."
      />

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Add employee</h2>
        <form action={createKoiTeccAssociateAction} className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Name
            <input name="name" required maxLength={120} className="min-h-11 w-full min-w-0 rounded-button border border-border bg-surface px-3 text-sm text-ink" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Email
            <input name="email" type="email" required maxLength={254} className="min-h-11 w-full min-w-0 rounded-button border border-border bg-surface px-3 text-sm text-ink" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Title
            <input name="title" required maxLength={120} className="min-h-11 w-full min-w-0 rounded-button border border-border bg-surface px-3 text-sm text-ink" />
          </label>
          <button type="submit" className="focus-outline flex min-h-11 items-center justify-center gap-2 rounded-button border-2 border-accent bg-accent/10 px-4 text-sm font-semibold text-primary-text hover:bg-accent/20">
            <Plus className="size-4" aria-hidden />
            Add employee
          </button>
        </form>
      </section>

      <section className="rounded-card border border-border bg-surface">
        <div className="border-b border-border-subtle p-5">
          <h2 className="text-lg font-semibold text-ink">Active employees</h2>
          <p className="mt-1 text-sm text-text-secondary">{associates.length} active associates</p>
        </div>
        {associates.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-secondary">No active employees.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Organizations</th>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {associates.map((associate) => {
                  const assignedOrganizations = organizationNamesByAssociate.get(associate.id) ?? [];
                  return (
                    <tr key={associate.id} className="border-b border-border-subtle last:border-b-0">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink">{associate.name}</p>
                        <p className="mt-0.5 text-text-secondary">{associate.email}</p>
                      </td>
                      <td className="px-5 py-4 text-text-secondary">
                        {assignedOrganizations.length > 0 ? assignedOrganizations.join(", ") : "Unassigned"}
                      </td>
                      <td className="px-5 py-4 text-text-secondary">{associate.title}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/koitecc/associate/sign-up?email=${encodeURIComponent(associate.email)}`}
                              className="focus-outline inline-flex min-h-10 items-center rounded-button border border-border px-3 text-sm font-semibold text-primary-text hover:bg-surface-alt"
                            >
                              Signup link
                            </Link>
                            <EmployeeDeleteButton associateId={associate.id} associateName={associate.name} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
