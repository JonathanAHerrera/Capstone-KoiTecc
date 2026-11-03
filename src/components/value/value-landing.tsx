import Link from "next/link";
import { ArrowRight, Landmark, ScanSearch, ShieldCheck, Trophy } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { formatUsdRange, VALUE_DISCLAIMER } from "@/lib/value";
import { getBenchmark } from "@/lib/value-benchmarks";

// Public, signed-out acquisition surface. Figures come from the same benchmark table the in-app
// value engine uses, so the pitch and the personalized estimate never drift apart.
export function ValueLanding() {
  const l2 = getBenchmark("cmmc_l2_consultant_engagement");
  const tdpsa = getBenchmark("tdpsa_per_violation");
  const penaltyCap = getBenchmark("tx521_civil_penalty_max");
  const bec = getBenchmark("bec_average_loss");

  return (
    <div className="flex min-h-dvh flex-col gap-10 px-4 pb-[calc(48px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))] sm:px-6">
      <header className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary text-primary-contrast">
          <ShieldCheck className="size-5" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">CMMC Ready</span>
        <Link
          href="/sign-in"
          className="focus-outline ml-auto inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold text-primary-text hover:bg-surface-alt"
        >
          Sign in
        </Link>
      </header>

      <section className="flex flex-col gap-4">
        <h1 className="display text-[clamp(32px,8vw,48px)] leading-[1.05]">
          Get compliance-ready — and see what it&apos;s worth to your business.
        </h1>
        <p className="max-w-[52ch] text-[17px] leading-relaxed text-text-secondary">
          Walk through each cybersecurity requirement on your phone, upload proof, get an instant AI
          review, and watch your readiness fill in. Built for small defense contractors and Texas
          small businesses — the kind that can&apos;t afford a five-figure consultant.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <BigButton href="/sign-up" icon={<ArrowRight className="size-4" aria-hidden />}>
            Get started free
          </BigButton>
          <Link
            href="/scan"
            className="focus-outline inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 text-[15px] font-semibold text-ink hover:bg-surface-alt"
          >
            <ScanSearch className="size-4" aria-hidden />
            Try the free security scan
          </Link>
        </div>
      </section>

      <section aria-label="Who it pays off for" className="grid items-start gap-4 md:grid-cols-2">
        <article className="flex flex-col gap-3 rounded-card border border-primary-edge bg-primary-pale px-5 py-5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary-edge bg-surface px-2.5 py-1 text-xs font-semibold text-primary-text">
            <Trophy className="size-3.5" aria-hidden />
            Defense contractors
          </span>
          <p className="text-[19px] font-bold leading-snug text-ink">Win contracts you can&apos;t bid on today.</p>
          <p className="text-sm leading-relaxed text-text-secondary">
            Covered DoD contracts require a recorded CMMC status and an acceptable SPRS score. No
            readiness, no award. Get there without paying{" "}
            <strong className="text-ink">{formatUsdRange(l2.low, l2.high)}</strong> for an outside
            Level&nbsp;2 engagement.
          </p>
        </article>

        <article className="flex flex-col gap-3 rounded-card border border-warning-edge bg-warning-pale px-5 py-5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-warning-edge bg-surface px-2.5 py-1 text-xs font-semibold text-warning-ink">
            <Landmark className="size-3.5" aria-hidden />
            Texas small businesses
          </span>
          <p className="text-[19px] font-bold leading-snug text-ink">Stay out of the penalty column.</p>
          <p className="text-sm leading-relaxed text-text-secondary">
            TDPSA violations can run <strong className="text-ink">{formatUsdRange(tdpsa.low, tdpsa.high)}</strong>{" "}
            each, a late breach notice adds up to{" "}
            <strong className="text-ink">{formatUsdRange(penaltyCap.high, penaltyCap.high)}</strong>, and the
            average wire-fraud loss is <strong className="text-ink">{formatUsdRange(bec.low, bec.high)}</strong>.
            The built-in scam checker and breach tools are made to head those off.
          </p>
        </article>
      </section>

      <p className="max-w-[70ch] text-xs leading-relaxed text-muted">{VALUE_DISCLAIMER}</p>
    </div>
  );
}
