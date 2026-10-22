"use client";

import { useState, useTransition } from "react";
import { HelpCircle, Send, X } from "lucide-react";
import { askKoiTeccHelpAction } from "@/app/actions";
import { useToast } from "@/components/ui/use-toast";

export function AskKoiTeccButton() {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [sendingHelpRequest, startSendingHelpRequest] = useTransition();

  function submitHelpRequest() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || sendingHelpRequest) return;

    startSendingHelpRequest(async () => {
      const result = await askKoiTeccHelpAction(trimmedQuestion, window.location.pathname);
      if (result.ok) {
        setQuestion("");
        setIsOpen(false);
        showToast({ tone: "success", message: "Your question is in the KoiTecc reviewer inbox." });
      } else {
        showToast({ tone: "danger", message: result.error });
      }
    });
  }

  return (
    <div className="fixed bottom-[calc(20px+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-3 sm:right-6">
      {isOpen ? (
        <section
          aria-label="Ask KoiTecc for help"
          className="w-[min(calc(100vw-32px),360px)] rounded-card border border-border bg-surface p-4 shadow-float"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-ink">Ask KoiTecc</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Tell us what is confusing and a reviewer will follow up.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close Ask KoiTecc"
              onClick={() => setIsOpen(false)}
              className="focus-outline flex size-11 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-surface-alt hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="What do you need help understanding?"
            className="mt-4 w-full rounded-card border border-border bg-surface-alt px-3 py-3 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={submitHelpRequest}
            disabled={!question.trim() || sendingHelpRequest}
            className="focus-outline mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden />
            {sendingHelpRequest ? "Sending..." : "Send question"}
          </button>
        </section>
      ) : null}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close Ask KoiTecc" : "Ask KoiTecc for help"}
        onClick={() => setIsOpen((open) => !open)}
        className="focus-outline flex min-h-12 items-center gap-2 rounded-full border border-primary-edge bg-primary px-4 text-sm font-semibold text-primary-contrast shadow-float transition-transform hover:-translate-y-px"
      >
        {isOpen ? <X className="size-5" aria-hidden /> : <HelpCircle className="size-5" aria-hidden />}
        <span>Ask KoiTecc</span>
      </button>
    </div>
  );
}
