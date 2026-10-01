import { Sparkles } from "lucide-react";
import { BigButton } from "@/components/ui/big-button";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { SpeechBubble } from "@/components/ui/speech-bubble";

export type HalfwayScreenProps = {
  onContinue: () => void;
};

export function HalfwayScreen({ onContinue }: HalfwayScreenProps) {
  return (
    <>
      <SpeechBubble avatar={<Sparkles className="size-7" strokeWidth={2.25} aria-hidden />}>
        You&apos;re halfway. <strong>Most shops finish Level 1 in a few afternoons.</strong>
      </SpeechBubble>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
        <span
          className="flex size-20 items-center justify-center rounded-full bg-success-pale text-success-ink"
          aria-hidden
        >
          <Sparkles className="size-10" strokeWidth={2.25} />
        </span>
        <p className="max-w-xs text-base font-medium text-muted">
          Two more questions about your IT setup, then we&apos;ll show you exactly what&apos;s coming up.
        </p>
      </div>
      <BottomActionBar>
        <BigButton fullWidth variant="success" onClick={onContinue}>
          Keep going
        </BigButton>
      </BottomActionBar>
    </>
  );
}
