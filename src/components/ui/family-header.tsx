import { BookOpen } from "lucide-react";

export type FamilyHeaderProps = {
  familyCode: string;
  familyName: string;
  description?: string;
  completedCount: number;
  totalCount: number;
  accentIndex: number;
  locked?: boolean;
  onGuideClick?: () => void;
  sticky?: boolean;
  className?: string;
};

const FAMILY_ACCENT_COUNT = 6;

export function familyAccentColor(accentIndex: number) {
  return `var(--color-family-${(((accentIndex % FAMILY_ACCENT_COUNT) + FAMILY_ACCENT_COUNT) % FAMILY_ACCENT_COUNT) + 1})`;
}

export function FamilyHeader({
  familyCode,
  familyName,
  description,
  completedCount,
  totalCount,
  accentIndex,
  locked = false,
  onGuideClick,
  sticky = true,
  className = "",
}: FamilyHeaderProps) {
  const accentColor = familyAccentColor(accentIndex);
  const allDone = totalCount > 0 && completedCount >= totalCount;

  return (
    <header
      className={`${sticky ? "sticky top-0 z-20" : ""} rounded-card px-4 py-3 text-white shadow-md ${locked ? "opacity-70 saturate-50" : ""} ${className}`}
      style={{ background: accentColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="caption text-white/80">
            {familyCode} · {familyName}
          </p>
          <p className="mt-0.5 text-lg font-extrabold leading-tight">
            {allDone ? "All done" : `${completedCount} of ${totalCount} done`}
          </p>
          {description ? <p className="mt-1 line-clamp-2 text-sm font-medium text-white/85">{description}</p> : null}
        </div>
        {onGuideClick ? (
          <button
            type="button"
            onClick={onGuideClick}
            className="caption flex h-11 shrink-0 items-center gap-1.5 rounded-chip border-2 border-white/40 px-3 text-white hover:bg-white/15"
          >
            <BookOpen className="size-4" aria-hidden />
            Guide
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1" aria-hidden>
        {Array.from({ length: totalCount }, (_, dotIndex) => (
          <span
            key={dotIndex}
            className={`size-2 rounded-full transition-colors duration-200 ${dotIndex < completedCount ? "bg-white" : "bg-white/35"}`}
            style={{ transitionDelay: `${dotIndex * 40}ms` }}
          />
        ))}
      </div>
    </header>
  );
}
