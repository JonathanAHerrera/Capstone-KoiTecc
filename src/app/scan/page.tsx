import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleHelp, ShieldAlert, TriangleAlert } from "lucide-react";
import {
  normalizeScanDomain,
  runOutsideScan,
  type OutsideScanResult,
  type ScanCheckStatus,
} from "@/lib/outside-scan";

export const metadata: Metadata = {
  title: "Free website & email check — Texas Safe Harbor",
  description:
    "A free, no-login look at what the public internet can see about your email and website basics.",
};

type ScanPageProps = {
  searchParams: Promise<{ domain?: string | string[] }>;
};

const STATUS_STYLES: Record<ScanCheckStatus, { label: string; className: string }> = {
  pass: { label: "Good", className: "text-success" },
  warn: { label: "Needs attention", className: "text-warning" },
  fail: { label: "Action needed", className: "text-danger" },
  unknown: { label: "Couldn't check", className: "text-text-secondary" },
};

function StatusIcon({ status }: { status: ScanCheckStatus }) {
  const className = STATUS_STYLES[status].className;
  if (status === "pass") return <CheckCircle2 aria-hidden className={`h-5 w-5 ${className}`} />;
  if (status === "warn") return <TriangleAlert aria-hidden className={`h-5 w-5 ${className}`} />;
  if (status === "fail") return <ShieldAlert aria-hidden className={`h-5 w-5 ${className}`} />;
  return <CircleHelp aria-hidden className={`h-5 w-5 ${className}`} />;
}

function ScanForm({ domain }: { domain: string }) {
  return (
    <form method="GET" action="/scan" className="flex flex-col gap-3">
      <label htmlFor="domain" className="text-sm font-medium text-ink">
        Your website address
      </label>
      <input
        id="domain"
        name="domain"
        type="text"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        defaultValue={domain}
        placeholder="example.com"
        className="min-h-[44px] rounded-card border border-border bg-surface px-4 text-base text-ink placeholder:text-text-secondary focus:border-primary focus:outline-none"
      />
      <button
        type="submit"
        className="min-h-[44px] rounded-card bg-primary px-5 text-base font-semibold text-primary-contrast active:opacity-90"
      >
        Run the free check
      </button>
    </form>
  );
}

function ScanResults({ result }: { result: OutsideScanResult }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{result.domain}</h2>
          <span className="text-3xl font-bold text-ink">
            {result.score}
            <span className="text-base font-medium text-text-secondary">/100</span>
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-text-secondary">Grade {result.grade}</p>
        <p className="mt-3 text-sm text-text-secondary">{result.summary}</p>
      </div>

      {result.topFixes.length > 0 ? (
        <div className="rounded-card border border-warning/40 bg-warning/10 p-5">
          <h3 className="text-base font-semibold text-ink">Top fixes</h3>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink">
            {result.topFixes.map((fix) => (
              <li key={fix}>{fix}</li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-ink">What we checked</h3>
        {result.checks.map((check) => (
          <div
            key={check.id}
            className="flex gap-3 rounded-card border border-border bg-surface p-4"
          >
            <StatusIcon status={check.status} />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{check.label}</span>
                <span className={`text-xs font-medium ${STATUS_STYLES[check.status].className}`}>
                  {STATUS_STYLES[check.status].label}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{check.finding}</p>
              {check.fix ? <p className="text-sm text-ink">Fix: {check.fix}</p> : null}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-primary/40 bg-primary/10 p-5">
        <h3 className="text-base font-semibold text-ink">Want help fixing these?</h3>
        <p className="mt-2 text-sm text-text-secondary">
          Texas Safe Harbor walks you through each fix and keeps a dated record of the work, so you
          can show you ran a documented security program aligned with Texas SB 2610.
        </p>
        <Link
          href="/sign-up"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-card bg-primary px-5 text-base font-semibold text-primary-contrast active:opacity-90"
        >
          Create a free account
        </Link>
      </div>
    </section>
  );
}

export default async function ScanPage({ searchParams }: ScanPageProps) {
  const resolved = await searchParams;
  const rawDomain = Array.isArray(resolved.domain) ? resolved.domain[0] : resolved.domain;
  const normalizedDomain = rawDomain ? normalizeScanDomain(rawDomain) : null;
  const result = normalizedDomain ? await runOutsideScan(normalizedDomain) : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-2 pt-6">
        <h1 className="text-2xl font-semibold text-ink">Free website &amp; email check</h1>
        <p className="text-base text-text-secondary">
          See what the public internet can tell about your email and website basics. No account
          needed. This is a quick, passive look — not a full security assessment or a legal opinion.
        </p>
      </header>

      <ScanForm domain={normalizedDomain ?? (typeof rawDomain === "string" ? rawDomain : "")} />

      {rawDomain && !normalizedDomain ? (
        <p className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          That doesn&apos;t look like a website address. Try something like example.com.
        </p>
      ) : null}

      {result ? <ScanResults result={result} /> : null}

      <p className="mt-auto text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary-text underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
