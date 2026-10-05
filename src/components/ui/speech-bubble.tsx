import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export type SpeechBubbleProps = {
  children: ReactNode;
  guideName?: string;
  avatar?: ReactNode;
  className?: string;
};

export function SpeechBubble({ children, guideName = "Your guide", avatar, className = "" }: SpeechBubbleProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-canvas"
        aria-label={guideName}
        role="img"
      >
        {avatar ?? <ShieldCheck className="size-6" strokeWidth={2} aria-hidden />}
      </div>
      <div className="relative min-w-0 flex-1 rounded-card border border-border bg-surface px-4 py-3 text-ink">
        <span
          aria-hidden
          className="absolute -left-[7px] top-4 size-3 rotate-45 border-b border-l border-border bg-surface"
        />
        <div className="relative text-[17px] font-medium leading-snug [&_strong]:font-semibold [&_strong]:text-primary-text">{children}</div>
      </div>
    </div>
  );
}
