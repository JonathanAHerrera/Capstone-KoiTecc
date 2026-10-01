import { familyAccentColor } from "@/components/ui/family-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { DerivedPracticeStatus, PracticeFamily } from "@/lib/practice-types";

export type FamilyProgressListProps = {
  families: PracticeFamily[];
  statuses: Record<string, DerivedPracticeStatus>;
};

export function acceptedCountForFamily(family: PracticeFamily, statuses: Record<string, DerivedPracticeStatus>): number {
  return family.practices.filter((practice) => statuses[practice.id] === "accepted").length;
}

export function FamilyProgressList({ families, statuses }: FamilyProgressListProps) {
  return (
    <section aria-labelledby="family-progress-heading" className="flex flex-col gap-3">
      <h2 id="family-progress-heading" className="text-lg">
        By family
      </h2>
      <ul className="flex flex-col gap-2">
        {families.map((family, familyIndex) => {
          const acceptedCount = acceptedCountForFamily(family, statuses);
          return (
            <li key={family.code} className="flex items-center gap-3 rounded-card border-2 border-border bg-surface px-4 py-3">
              <span
                className="caption flex h-8 w-11 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ background: familyAccentColor(familyIndex) }}
              >
                {family.code}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate text-[15px] font-bold text-ink">{family.name}</span>
                <ProgressBar
                  completed={acceptedCount}
                  total={family.practices.length}
                  label={`${family.name} progress`}
                  heightPx={8}
                  fillColor={familyAccentColor(familyIndex)}
                />
              </div>
              <span className="tabular-nums shrink-0 text-[13px] font-extrabold text-muted">
                {acceptedCount}/{family.practices.length}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
