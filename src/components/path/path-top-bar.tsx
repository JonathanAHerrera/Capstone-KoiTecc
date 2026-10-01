import Link from "next/link";
import { ClipboardList } from "lucide-react";
import type { CmmcLevel } from "@/lib/practice-types";

export type PathTopBarProps = {
  organizationName: string;
  targetLevel: CmmcLevel;
};

export function PathTopBar({ organizationName, targetLevel }: PathTopBarProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="caption text-primary-text">CMMC Ready</p>
        <h1 className="display mt-1 truncate text-[34px]">{organizationName}</h1>
        <span className="caption mt-2 inline-flex h-7 items-center rounded-chip border border-primary-edge bg-primary-pale px-3 text-primary-text">
          Level {targetLevel} · Self-assessment
        </span>
      </div>
      <Link
        href="/summary"
        aria-label="Open summary"
        className="ring-gradient focus-outline flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-primary-text transition-colors hover:bg-surface-alt active:bg-surface-alt"
      >
        <ClipboardList className="size-6" strokeWidth={2} aria-hidden />
      </Link>
    </header>
  );
}
