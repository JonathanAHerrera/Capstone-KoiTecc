"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { seedKoiTeccDemoDataAction } from "@/app/koitecc/actions";

export function DemoDataPopover() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed right-4 top-[calc(16px+env(safe-area-inset-top))] z-40 flex flex-col items-end gap-3 sm:right-6">
      {isOpen ? (
        <section
          role="dialog"
          aria-label="First time using KoiTecc"
          className="w-[min(calc(100vw-32px),340px)] rounded-card border-2 border-accent bg-surface p-4 shadow-float"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="caption text-primary-text">FIRST TIME USING KOITECC?</p>
              <h2 className="mt-1 font-semibold text-ink">Explore with example data</h2>
            </div>
            <button
              type="button"
              aria-label="Close first-time KoiTecc dialog"
              onClick={() => setIsOpen(false)}
              className="focus-outline flex size-11 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-surface-alt hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Load 2 example organizations and 2 example associates to explore the workspace.
          </p>
          <form action={seedKoiTeccDemoDataAction} className="mt-4">
            <button
              type="submit"
              className="focus-outline flex min-h-11 w-full items-center justify-center gap-2 rounded-button border-2 border-accent bg-accent/10 px-4 text-sm font-semibold text-primary-text transition-colors hover:bg-accent/20"
            >
              <Sparkles className="size-4" aria-hidden />
              Load example data
            </button>
          </form>
        </section>
      ) : (
        <button
          type="button"
          aria-expanded={false}
          aria-label="First time using KoiTecc?"
          onClick={() => setIsOpen(true)}
          className="focus-outline flex min-h-12 items-center gap-2 rounded-full border-2 border-accent bg-surface px-4 text-sm font-semibold text-primary-text shadow-float transition-transform hover:-translate-y-px"
        >
          <Sparkles className="size-5" aria-hidden />
          <span>First time using KoiTecc?</span>
        </button>
      )}
    </div>
  );
}
