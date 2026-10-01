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
        className="lip flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-white [--lip-color:var(--color-primary-lip)]"
        aria-label={guideName}
        role="img"
      >
        {avatar ?? <ShieldCheck className="size-7" strokeWidth={2.25} aria-hidden />}
      </div>
      <div className="relative min-w-0 flex-1 rounded-card border-2 border-border bg-surface px-4 py-3 text-ink">
        <span
          aria-hidden
          className="absolute -left-[9px] top-4 size-4 rotate-45 border-b-2 border-l-2 border-border bg-surface"
        />
        <div className="relative text-[18px] font-extrabold leading-snug [&_strong]:text-primary">{children}</div>
      </div>
    </div>
  );
}
