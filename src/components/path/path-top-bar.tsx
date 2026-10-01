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
        <p className="caption text-primary">CMMC Ready</p>
        <h1 className="mt-0.5 truncate text-2xl">{organizationName}</h1>
        <span className="caption mt-2 inline-flex h-7 items-center rounded-chip border-2 border-primary/20 bg-primary-pale px-3 text-primary">
          Level {targetLevel} · Self-assessment
        </span>
      </div>
      <Link
        href="/summary"
        aria-label="Open summary"
        className="lip lip-press flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface text-primary [--lip-color:var(--color-border)] hover:bg-canvas"
      >
        <ClipboardList className="size-6" strokeWidth={2.25} aria-hidden />
      </Link>
    </header>
  );
}
