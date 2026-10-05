import { Camera, ClipboardCheck, ListChecks, ShieldCheck, Timer } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";

export type WelcomeScreenProps = {
  hasExistingPath: boolean;
  onStart: () => void;
};

const VALUE_PROPS = [
  { icon: <ListChecks />, text: "See exactly which requirements apply to your shop" },
  { icon: <Camera />, text: "Upload proof straight from your phone" },
  { icon: <ClipboardCheck />, text: "Get a plain-English readiness review on each one" },
];

export function WelcomeScreen({ hasExistingPath, onStart }: WelcomeScreenProps) {
  return (
    <div
      className="flex min-h-dvh flex-col px-4 pt-[calc(24px+env(safe-area-inset-top))]"
      style={{ paddingBottom: `calc(${hasExistingPath ? 176 : 112}px + env(safe-area-inset-bottom))` }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <span
          className="flex size-20 items-center justify-center rounded-full bg-primary text-canvas shadow-[var(--shadow-primary-glow)]"
          role="img"
          aria-label="CMMC Ready shield"
        >
          <ShieldCheck className="size-11" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex flex-col gap-3">
          <p className="caption text-primary-text">CMMC Ready</p>
          <h1 className="display text-[40px] sm:text-[48px]">
            Let&apos;s get your shop <span className="whitespace-nowrap">CMMC-ready</span>
          </h1>
          <p className="text-base text-text-secondary">
            Answer a few quick questions and we&apos;ll build your requirement-by-requirement path.
          </p>
        </div>
        <ul className="flex w-full flex-col gap-3 text-left">
          {VALUE_PROPS.map((valueProp) => (
            <li
              key={valueProp.text}
              className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-pale text-primary-text [&>svg]:size-6"
                aria-hidden
              >
                {valueProp.icon}
              </span>
              <span className="text-base font-medium text-ink">{valueProp.text}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-2 text-sm font-medium text-muted">
          <Timer className="size-4" aria-hidden />
          Takes about 2 minutes
        </p>
      </div>
      <BottomActionBar>
        <BigButton fullWidth onClick={onStart}>
          Start
        </BigButton>
        {hasExistingPath ? (
          <BigButton variant="ghost" size="compact" fullWidth href="/path">
            You already have a path — go to it
          </BigButton>
        ) : null}
      </BottomActionBar>
    </div>
  );
}
