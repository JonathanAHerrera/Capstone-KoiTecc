import Link from "next/link";
import { ChevronRight, ScanSearch, Siren } from "lucide-react";

// Entry points for the two "right now" tools: triage a suspicious message, or start an incident
// response plan. Kept separate from the tracks list because neither is a framework.
export function SafetyToolsLinks() {
  return (
    <section aria-labelledby="safety-tools-heading" className="flex flex-col gap-2">
      <h2 id="safety-tools-heading" className="caption text-muted">
        Right now
      </h2>
      <Link
        href="/scam-check"
        className="focus-outline flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-alt"
      >
        <span className="flex items-center gap-2.5">
          <ScanSearch className="size-5 text-primary-text" aria-hidden />
          <span className="text-sm font-medium text-ink">Check a suspicious message</span>
        </span>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </Link>
      <Link
        href="/incident"
        className="focus-outline flex items-center justify-between gap-3 rounded-card border border-danger-edge bg-surface px-4 py-3 text-left transition-colors hover:bg-danger-pale"
      >
        <span className="flex items-center gap-2.5">
          <Siren className="size-5 text-danger-ink" aria-hidden />
          <span className="text-sm font-medium text-ink">Something happened</span>
        </span>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </Link>
    </section>
  );
}
