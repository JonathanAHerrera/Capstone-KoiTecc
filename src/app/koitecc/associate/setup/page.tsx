import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { linkKoiTeccAssociateForCurrentUser } from "@/lib/koitecc";

export const metadata: Metadata = {
  title: "Finish associate setup — CMMC Ready",
};

export default async function AssociateSetupPage() {
  try {
    await linkKoiTeccAssociateForCurrentUser();
  } catch (error) {
    return (
      <main className="flex min-h-dvh flex-col gap-6 px-5 pb-8 pt-[calc(32px+env(safe-area-inset-top))]">
        <header>
          <p className="caption text-muted">KOITECC ASSOCIATE SETUP</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">We could not link this account</h1>
        </header>
        <p className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error instanceof Error ? error.message : "Associate account setup failed."}
        </p>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary">
            Create or sign in with the email shown in the employee record. You must be signed out of another account first.
          </p>
          <Link href="/koitecc/associate/sign-in" className="focus-outline min-h-11 rounded-button border border-border px-4 py-3 text-center text-sm font-semibold text-ink hover:bg-surface-alt">
            Go to associate sign in
          </Link>
        </div>
      </main>
    );
  }

  redirect("/koitecc/associate");
}
