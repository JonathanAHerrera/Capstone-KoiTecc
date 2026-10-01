import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import type { PathNodeViewModel } from "./build-path-view-model";

export type NeedsAttentionListProps = {
  rows: PathNodeViewModel[];
  totalCount: number;
};

export function NeedsAttentionList({ rows, totalCount }: NeedsAttentionListProps) {
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="needs-attention-heading" className="flex flex-col gap-3">
      <h2 id="needs-attention-heading" className="caption text-muted">
        Needs attention ({totalCount})
      </h2>
      <ul className="lip flex flex-col divide-y-2 divide-border overflow-hidden rounded-card border-2 border-border bg-surface [--lip-color:var(--color-border)]">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/practice/${row.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-canvas active:bg-canvas"
            >
              <StatusChip status={row.status} size="small" />
              <span className="min-w-0 flex-1">
                <span className="caption block truncate text-muted">{row.id}</span>
                <span className="block truncate font-extrabold text-ink">{row.title}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
