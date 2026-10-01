import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import type { CmmcLevel, DerivedPracticeStatus, Practice } from "@/lib/practice-types";
import { poamEligibilityTagFor } from "./poam-eligibility";

export type NeedsAttentionItem = {
  practice: Practice;
  status: Extract<DerivedPracticeStatus, "needs_work" | "not_started">;
};

export type NeedsAttentionListProps = {
  level: CmmcLevel;
  items: NeedsAttentionItem[];
};

export function selectNeedsAttentionItems(
  practices: Practice[],
  statuses: Record<string, DerivedPracticeStatus>,
): NeedsAttentionItem[] {
  const needsWorkItems: NeedsAttentionItem[] = [];
  const notStartedItems: NeedsAttentionItem[] = [];
  for (const practice of practices) {
    const status = statuses[practice.id] ?? "not_started";
    if (status === "needs_work") needsWorkItems.push({ practice, status });
    else if (status === "not_started") notStartedItems.push({ practice, status });
  }
  return [...needsWorkItems, ...notStartedItems];
}

export function NeedsAttentionList({ level, items }: NeedsAttentionListProps) {
  return (
    <section aria-labelledby="needs-attention-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="needs-attention-heading" className="text-lg">
          Needs attention
        </h2>
        <span className="caption text-muted">POA&amp;M · {items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-card border border-success-edge bg-success-pale px-4 py-4 text-[15px] font-medium text-success-ink">
          Nothing open. Every requirement has been submitted or accepted.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ practice, status }) => {
            const eligibilityTag = poamEligibilityTagFor(level, practice);
            return (
              <li key={practice.id}>
                <Link
                  href={`/practice/${practice.id}`}
                  className="card-ring focus-outline flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 transition-colors hover:bg-canvas"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="caption text-muted">{practice.id}</span>
                    <span className="text-[15px] font-medium leading-snug text-ink">{practice.title}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip status={status} size="small" />
                      <span
                        className={`inline-flex h-7 items-center rounded-chip border px-2.5 text-[12px] font-semibold ${
                          eligibilityTag.eligible
                            ? "border-info-edge bg-info-pale text-info-ink"
                            : "border-danger-edge bg-danger-pale text-danger-ink"
                        }`}
                      >
                        {eligibilityTag.label}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
