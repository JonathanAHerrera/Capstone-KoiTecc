import Link from "next/link";
import { ClipboardList, Settings, ShieldCheck } from "lucide-react";
import type { CmmcLevel } from "@/lib/practice-types";

export type PathTopBarProps = {
  organizationName: string;
  targetLevel: CmmcLevel;
};

export function PathTopBar({ organizationName, targetLevel }: PathTopBarProps) {
  return (
    <header className="border-b border-border-subtle pb-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-primary-edge bg-primary-pale text-primary-text">
          <ShieldCheck className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-semibold tracking-[-0.015em] text-ink">{organizationName}</h1>
          <p className="mt-0.5 text-[13px] text-text-secondary">CMMC Ready workspace</p>
        </div>
        <nav aria-label="Workspace tools" className="flex shrink-0 items-center gap-1.5">
          <Link href="/summary" aria-label="Open readiness summary" className="focus-outline flex size-10 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-ink">
            <ClipboardList className="size-5" strokeWidth={2} aria-hidden />
          </Link>
          <Link href="/settings" aria-label="Open settings" className="focus-outline flex size-10 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-ink">
            <Settings className="size-5" strokeWidth={2} aria-hidden />
          </Link>
        </nav>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 border-t border-border-subtle pt-3">
        <div>
          <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Program</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">CMMC Level {targetLevel}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Review mode</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">Self-assessment</dd>
        </div>
      </dl>
    </header>
  );
}
