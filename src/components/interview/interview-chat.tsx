"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, CircleAlert, CircleHelp, CircleX, LockKeyhole, Send, Sparkles } from "lucide-react";
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
  const answeredCount = snapshot?.findings.length ?? 0;
  const progressPercent = Math.min(100, Math.round((answeredCount / practiceCount) * 100));
  const latestTurn = snapshot?.turns.at(-1);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [snapshot?.turns.length, snapshot?.isComplete]);

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const result = await startInterviewAction(familyCode);
      if (result.ok) setSnapshot(result.data);
      else setErrorMessage(result.error);
    } catch {
      setErrorMessage("Connection interrupted. Please try starting the check again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!snapshot || busy) return;
    const trimmed = answer.trim();
    if (trimmed.length === 0) return;

    setBusy(true);
    setErrorMessage(null);
    try {
      const result = await sendInterviewAnswerAction(snapshot.interviewId, trimmed);
      if (result.ok) {
        setSnapshot(result.data);
        setAnswer("");
      } else {
        setErrorMessage(result.error);
        const resync = await getInterviewSnapshotAction(familyCode);
        if (resync.ok && resync.data) setSnapshot(resync.data);
      }
    } catch {
      setErrorMessage("Connection interrupted. Your draft is still here. Reload to check whether your answer was saved before retrying.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1 border-b border-border-subtle pb-4">
        <BigButton href="/path" variant="ghost" size="compact" icon={<ArrowLeft className="size-4" aria-hidden />} className="self-start">
          Back to path
        </BigButton>
        <div className="mt-1 flex items-end justify-between gap-4">
          <div>
            <p className="agent-label mb-1">Guided readiness check</p>
            <h1 className="display text-[26px] leading-tight sm:text-[30px]">{familyName}</h1>
          </div>
          {snapshot ? <span className="shrink-0 text-sm font-semibold text-primary-text">{progressPercent}% explored</span> : null}
        </div>
        {snapshot ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-alt" aria-label={`${progressPercent}% of controls explored`}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{familyCode} · {practiceCount} {practiceCount === 1 ? "requirement" : "requirements"} · about 5 minutes</p>
        )}
      </header>

      {snapshot === null ? (
        <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,.8fr)]">
          <section className="flex flex-col justify-between gap-8 rounded-[22px] border border-primary-edge bg-surface p-5 shadow-float sm:p-7">
            <SpeechBubble guideName="Koi, your readiness guide">
              Let&apos;s look at <strong>{familyName.toLowerCase()}</strong> together. Talk to me like you would a teammate—I&apos;ll translate your answers into a practical plan.
            </SpeechBubble>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                [CircleHelp, "Plain-English questions", "No compliance jargon required."],
                [Sparkles, "Tailored follow-ups", "I adapt to how your business works."],
                [LockKeyhole, "Readiness, not a verdict", "Evidence review stays separate."],
              ].map(([Icon, title, body]) => (
                <div key={String(title)} className="rounded-card bg-surface-alt p-3.5">
                  <Icon className="mb-2 size-5 text-primary-text" aria-hidden />
                  <p className="text-sm font-semibold text-ink">{String(title)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{String(body)}</p>
                </div>
              ))}
            </div>
            {errorMessage ? <ErrorNote message={errorMessage} /> : null}
            <BigButton onClick={handleStart} loading={busy} fullWidth icon={<Sparkles className="size-4" aria-hidden />}>
              Start my assessment
            </BigButton>
          </section>
          <aside className="flex flex-col justify-between gap-5 rounded-[22px] border border-border bg-surface-alt p-5">
            <div>
              <p className="agent-label">What you&apos;ll get</p>
              <ul className="mt-4 space-y-4">
                {["A status for each relevant control", "Why the agent reached each finding", "A prioritized next step on your path"].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-ink"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-pale text-primary-text"><Check className="size-3.5" aria-hidden /></span><span className="pt-0.5">{item}</span></li>
                ))}
              </ul>
            </div>
            <p role="note" className="text-xs leading-relaxed text-text-secondary">{disclaimer}</p>
          </aside>
        </div>
      ) : (
        <div className="grid min-w-0 flex-1 grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1.5fr)_minmax(260px,.8fr)]">
          <section className="flex h-[max(420px,calc(100dvh-220px))] min-w-0 flex-col rounded-[22px] border border-border bg-surface shadow-float">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain break-words p-4 sm:p-5" aria-live="polite">
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
          <div className="shrink-0 rounded-b-[22px] border-t border-border-subtle bg-surface p-3 sm:p-4">
            {errorMessage ? <div className="mb-3"><ErrorNote message={errorMessage} /></div> : null}
          {snapshot.isComplete ? (
            <BigButton href="/path" variant="success" fullWidth>
              See my tailored plan
            </BigButton>
          ) : (
            <form onSubmit={handleSend} className="flex flex-col gap-2">
              {latestTurn?.role === "assistant" ? (
                <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Suggested answers">
                  {["Yes, that's in place", "Not yet", "I'm not sure"].map((suggestion) => (
                    <button key={suggestion} type="button" disabled={busy} onClick={() => setAnswer(suggestion)} className="focus-outline min-h-11 shrink-0 rounded-full border border-border bg-surface-alt px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-primary-edge hover:text-primary-text disabled:opacity-50">{suggestion}</button>
                  ))}
                </div>
              ) : null}
              <div className="flex items-end gap-2">
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type your answer…"
                rows={2}
                maxLength={4000}
                aria-label="Your answer"
                disabled={busy}
                className="min-h-[52px] min-w-0 flex-1 resize-none rounded-card border border-border bg-surface-alt px-3 py-3 text-[16px] text-ink outline-none focus:border-primary-edge"
              />
              <BigButton
                type="submit"
                loading={busy}
                disabled={answer.trim().length === 0}
                icon={<Send className="size-4" aria-hidden />}
                className="shrink-0"
              >
                Send
              </BigButton>
              </div>
            </form>
          )}
          </div>
          </section>
          <aside className="flex flex-col gap-4 lg:sticky lg:top-7">
            <div className="rounded-[22px] border border-border bg-surface p-4 sm:p-5">
              <h2 className="text-base font-semibold text-ink">Your live assessment</h2>
              <p className="mt-1 text-sm text-text-secondary">I update this as we talk. You can add proof afterward.</p>
              {snapshot.findings.length > 0 ? (
                <ul className="mt-4 flex flex-col gap-2">{snapshot.findings.map((finding) => <FindingRow key={finding.practiceId} finding={finding} />)}</ul>
              ) : <p className="mt-5 rounded-card bg-surface-alt p-4 text-sm text-text-secondary">Your first finding will appear here after you answer a question.</p>}
            </div>
            <p role="note" className="px-1 text-xs leading-relaxed text-text-secondary">{disclaimer}</p>
          </aside>
        </div>
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
