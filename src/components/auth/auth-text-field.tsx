"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

type AuthTextFieldProps = {
  label: string;
  icon?: ReactNode;
  hint?: string;
} & ComponentPropsWithoutRef<"input">;

export function AuthTextField({ label, icon, hint, className = "", ...inputProps }: AuthTextFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="caption text-muted">{label}</span>
      <span className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 focus-within:border-primary-text focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-text">
        {icon ? (
          <span className="shrink-0 text-primary-text [&>svg]:size-6" aria-hidden>
            {icon}
          </span>
        ) : null}
        <input
          className={`min-h-12 w-full bg-transparent text-lg font-medium text-ink outline-none placeholder:font-normal placeholder:text-disabled ${className}`}
          {...inputProps}
        />
      </span>
      {hint ? <span className="text-sm text-text-secondary">{hint}</span> : null}
    </label>
  );
}
