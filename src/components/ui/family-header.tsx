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

function normalizedAccentNumber(accentIndex: number) {
  return (((accentIndex % FAMILY_ACCENT_COUNT) + FAMILY_ACCENT_COUNT) % FAMILY_ACCENT_COUNT) + 1;
}

export function familyAccentColor(accentIndex: number) {
  return `var(--color-family-${normalizedAccentNumber(accentIndex)})`;
}

export function familyAccentPaleColor(accentIndex: number) {
  return `var(--color-family-${normalizedAccentNumber(accentIndex)}-pale)`;
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
  const accentPaleColor = familyAccentPaleColor(accentIndex);
  const allDone = totalCount > 0 && completedCount >= totalCount;

  if (allDone) {
    return (
      <header
        className={`${sticky ? "sticky top-0 z-20" : ""} rounded-card bg-dark-surface px-4 py-3 text-white ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="caption text-dark-eyebrow">
              {familyCode} · {familyName}
            </p>
            <p className="display mt-1 text-[24px] leading-none">All done</p>
            {description ? <p className="mt-1.5 line-clamp-2 text-sm text-white/80">{description}</p> : null}
          </div>
          {onGuideClick ? (
            <button
              type="button"
              onClick={onGuideClick}
              className="focus-outline flex h-10 shrink-0 items-center gap-1.5 rounded-chip border border-white/30 px-3 text-sm font-medium text-white hover:bg-white/10"
            >
              <BookOpen className="size-4" aria-hidden />
              Guide
            </button>
          ) : null}
        </div>
        <CompletionDots completedCount={completedCount} totalCount={totalCount} doneColor="var(--color-dark-eyebrow)" todoColor="rgba(255,255,255,0.25)" />
      </header>
    );
  }

  return (
    <header
      className={`${sticky ? "sticky top-0 z-20" : ""} relative overflow-hidden rounded-card border border-border bg-surface py-3 pl-5 pr-4 ${
        locked ? "opacity-70" : ""
      } ${className}`}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: accentColor }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="caption flex items-center gap-2">
            <span className="rounded-md px-1.5 py-0.5" style={{ background: accentPaleColor, color: accentColor }}>
              {familyCode}
            </span>
            <span className="truncate text-muted">{familyName}</span>
          </p>
          <p className="mt-1 text-lg font-semibold leading-tight text-ink">
            <span className="tabular-nums">{completedCount}</span> of <span className="tabular-nums">{totalCount}</span> done
          </p>
          {description ? <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{description}</p> : null}
        </div>
        {onGuideClick ? (
          <button
            type="button"
            onClick={onGuideClick}
            className="focus-outline flex h-10 shrink-0 items-center gap-1.5 rounded-chip border border-border px-3 text-sm font-medium text-primary-text hover:bg-surface-alt"
          >
            <BookOpen className="size-4" aria-hidden />
            Guide
          </button>
        ) : null}
      </div>
      <CompletionDots completedCount={completedCount} totalCount={totalCount} doneColor={accentColor} todoColor="var(--color-border-subtle)" />
    </header>
  );
}

function CompletionDots({
  completedCount,
  totalCount,
  doneColor,
  todoColor,
}: {
  completedCount: number;
  totalCount: number;
  doneColor: string;
  todoColor: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1" aria-hidden>
      {Array.from({ length: totalCount }, (_, dotIndex) => (
        <span
          key={dotIndex}
          className="size-2 rounded-full transition-colors duration-200"
          style={{ background: dotIndex < completedCount ? doneColor : todoColor, transitionDelay: `${dotIndex * 40}ms` }}
        />
      ))}
    </div>
  );
}
