import Link from "next/link";
import { ChevronRight, Compass } from "lucide-react";
import { FRAMEWORKS, type FrameworkId } from "@/lib/practice-types";

export type TrackSwitcherEntry = {
  framework: FrameworkId;
  accepted: number;
  total: number;
  percent: number;
};

export type TrackSwitcherProps = {
  entries: TrackSwitcherEntry[];
};

// Shown on /path when more than one framework is enabled. CMMC links to the canonical /path,
// every other framework links to its generic /track/[framework] route.
export function TrackSwitcher({ entries }: TrackSwitcherProps) {
  if (entries.length <= 1) {
    return (
      <Link
        href="/applicability"
        className="focus-outline flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-alt"
      >
        <span className="flex items-center gap-2.5">
          <Compass className="size-5 text-primary-text" aria-hidden />
          <span className="text-sm font-medium text-ink">What applies to me?</span>
        </span>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </Link>
    );
  }

  return (
    <section aria-label="Compliance tracks" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="caption text-muted">Your tracks</h2>
        <Link href="/applicability" className="caption text-primary-text underline underline-offset-4">
          What applies to me?
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => {
          const meta = FRAMEWORKS[entry.framework];
          const href = entry.framework === "cmmc" ? "/path" : `/track/${entry.framework}`;
          return (
            <li key={entry.framework}>
              <Link
                href={href}
                className="focus-outline flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-alt"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{meta.shortName}</span>
                    <span className="caption shrink-0 text-muted">
                      {entry.accepted}/{entry.total}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                    <span
                      className="block h-full rounded-full bg-primary-text"
                      style={{ width: `${entry.percent}%` }}
                    />
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
