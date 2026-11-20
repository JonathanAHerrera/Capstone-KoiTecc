import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkKoiTeccSetupAction } from "@/app/koitecc/setup/actions";
import { getKoiTeccAdminForCurrentUser } from "@/lib/koitecc";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Finish KoiTecc administrator setup — CMMC Ready",
};

type KoiTeccSetupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KoiTeccSetupPage({ searchParams }: KoiTeccSetupPageProps) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/koitecc/sign-up");
  }
  if (await getKoiTeccAdminForCurrentUser()) {
    redirect("/koitecc");
  }

  const resolvedSearchParams = await searchParams;
  const status = Array.isArray(resolvedSearchParams.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams.status;
  const setupCommand = `pnpm koitecc:setup -- ${sessionUser.email}`;

  return (
    <main className="flex min-h-dvh flex-col gap-8 px-5 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(32px+env(safe-area-inset-top))]">
      <header className="flex flex-col gap-2">
        <p className="caption text-muted">KOITECC ADMINISTRATOR SETUP</p>
        <h1 className="text-2xl font-semibold text-ink">Finish setting up your workspace</h1>
        <p className="text-base text-text-secondary">
          Your account is ready. Run one command in the remote project terminal to grant it KoiTecc administrator access.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
        <div>
          <p className="caption text-muted">REMOTE TERMINAL COMMAND</p>
          <code className="mt-2 block overflow-x-auto rounded-button bg-dark-surface px-4 py-3 text-sm text-white">
            {setupCommand}
          </code>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-text-secondary">
          <li>Open a terminal for the deployed project.</li>
          <li>Run the command above from the project directory.</li>
          <li>Return here and select “Check administrator access.”</li>
        </ol>
      </section>

      {status === "not-ready" ? (
        <p className="rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-ink">
          Administrator access is not enabled yet. Run the command in the remote terminal, then try again.
        </p>
      ) : null}

      <form action={checkKoiTeccSetupAction}>
        <button
          type="submit"
          className="focus-outline flex min-h-14 w-full items-center justify-center rounded-card border-2 border-accent bg-accent/10 px-5 py-3 text-base font-semibold text-primary-text shadow-float transition-colors hover:bg-accent/20"
        >
          Check administrator access
        </button>
      </form>

      <p className="text-center text-sm text-text-secondary">
        Need to use a different account?{" "}
        <Link href="/koitecc/sign-in" className="font-medium text-primary-text underline-offset-4 hover:underline">
          Sign in instead
        </Link>
      </p>
    </main>
  );
}
