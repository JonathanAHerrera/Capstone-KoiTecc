import type { ReactNode } from "react";

export type BottomActionBarProps = {
  children: ReactNode;
  className?: string;
};

export function BottomActionBar({ children, className = "" }: BottomActionBarProps) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-surface/95 backdrop-blur-sm ${className}`}
      style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4 pt-3">{children}</div>
    </div>
  );
}
