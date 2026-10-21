"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CircleAlert, CircleHelp, CircleX, Send } from "lucide-react";
import { getInterviewSnapshotAction, sendInterviewAnswerAction, startInterviewAction } from "@/app/interview/actions";
import type { InterviewFindingView, InterviewSnapshot } from "@/lib/interview";
import type { InterviewFindingStatus } from "@/db/schema";
import { BigButton } from "@/components/ui/big-button";
import { SpeechBubble } from "@/components/ui/speech-bubble";

export type InterviewChatProps = {
  familyCode: string;
  familyName: string;
  practiceCount: number;
  disclaimer: string;
  initialSnapshot: InterviewSnapshot | null;
};

const FINDING_PRESENTATION: Record<
  InterviewFindingStatus,
  { label: string; className: string; icon: typeof CircleAlert }
> = {
  met: { label: "You said: in place", className: "border-success-edge bg-success-pale text-success-ink", icon: CircleAlert },
  not_met: { label: "Not in place yet", className: "border-warning-edge bg-warning-pale text-warning-ink", icon: CircleX },
  unclear: { label: "Needs a closer look", className: "border-info-edge bg-info-pale text-info-ink", icon: CircleHelp },
};

function FindingRow({ finding }: { finding: InterviewFindingView }) {
  const presentation = FINDING_PRESENTATION[finding.status];
  const Icon = presentation.icon;
  return (
    <li className={`rounded-card border px-3 py-2.5 ${presentation.className}`}>
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="text-sm font-semibold">{presentation.label}</span>
      </div>
      <p className="mt-1 text-sm">
        <span className="font-semibold">{finding.practiceId}</span> — {finding.title}
      </p>
      {finding.rationale ? <p className="mt-1 text-sm opacity-90">{finding.rationale}</p> : null}
    </li>
  );
}

export function InterviewChat({
  familyCode,
  familyName,
  practiceCount,
  disclaimer,
  initialSnapshot,
}: InterviewChatProps) {
  const [snapshot, setSnapshot] = useState<InterviewSnapshot | null>(initialSnapshot);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [snapshot?.turns.length, snapshot?.isComplete]);

  async function handleStart() {
    setBusy(true);
    setErrorMessage(null);
    const result = await startInterviewAction(familyCode);
    setBusy(false);
    if (result.ok) setSnapshot(result.data);
    else setErrorMessage(result.error);
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!snapshot || busy) return;
    const trimmed = answer.trim();
    if (trimmed.length === 0) return;

    setBusy(true);
    setErrorMessage(null);
    const result = await sendInterviewAnswerAction(snapshot.interviewId, trimmed);
    setBusy(false);
    if (result.ok) {
      setSnapshot(result.data);
      setAnswer("");
    } else {
      setErrorMessage(result.error);
      // A rejected answer may have landed if the failure was downstream; re-sync so the UI matches.
      const resync = await getInterviewSnapshotAction(familyCode);
      if (resync.ok && resync.data) setSnapshot(resync.data);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <BigButton href="/path" variant="ghost" size="compact" icon={<ArrowLeft className="size-4" aria-hidden />} className="self-start">
          Back to path
        </BigButton>
        <h1 className="display mt-1 text-[24px] leading-tight">{familyName} check</h1>
        <p className="text-sm text-text-secondary">
          {familyCode} · {practiceCount} {practiceCount === 1 ? "requirement" : "requirements"} · about 5 minutes
        </p>
      </header>

      <p role="note" className="rounded-card border border-border bg-surface-alt px-3 py-2 text-xs text-text-secondary">
        {disclaimer}
      </p>

      {snapshot === null ? (
        <div className="flex flex-1 flex-col justify-between gap-6">
          <SpeechBubble>
            A few quick questions about <strong>{familyName.toLowerCase()}</strong> and I&apos;ll show you where you stand.
            There are no wrong answers — honest ones help most. I can&apos;t certify anything; this just helps you prepare.
          </SpeechBubble>
          {errorMessage ? <ErrorNote message={errorMessage} /> : null}
          <BigButton onClick={handleStart} loading={busy} fullWidth>
            Start the check
          </BigButton>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col gap-3" aria-live="polite">
            {snapshot.turns.map((turn, index) =>
              turn.role === "assistant" ? (
                <SpeechBubble key={index}>{turn.content}</SpeechBubble>
              ) : (
                <div key={index} className="flex justify-end">
                  <p className="max-w-[85%] rounded-card bg-primary px-4 py-2.5 text-[15px] text-primary-contrast">
                    {turn.content}
                  </p>
                </div>
              ),
            )}
            <div ref={transcriptEndRef} />
          </div>

          {snapshot.findings.length > 0 ? (
            <section aria-label="What you've told me so far" className="flex flex-col gap-2">
              <h2 className="agent-label">What you&apos;ve told me so far</h2>
              <ul className="flex flex-col gap-2">
                {snapshot.findings.map((finding) => (
                  <FindingRow key={finding.practiceId} finding={finding} />
                ))}
              </ul>
            </section>
          ) : null}

          {errorMessage ? <ErrorNote message={errorMessage} /> : null}

          {snapshot.isComplete ? (
            <BigButton href="/path" variant="success" fullWidth>
              Back to path
            </BigButton>
          ) : (
            <form onSubmit={handleSend} className="flex flex-col gap-2">
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type your answer…"
                rows={3}
                maxLength={4000}
                className="min-h-[72px] w-full resize-y rounded-card border border-border bg-surface px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary-edge"
              />
              <BigButton
                type="submit"
                loading={busy}
                disabled={answer.trim().length === 0}
                fullWidth
                icon={<Send className="size-4" aria-hidden />}
              >
                Send
              </BigButton>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-center gap-2 rounded-card border border-danger-edge bg-danger-pale px-3 py-2 text-sm text-danger-ink">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
