"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";

export type CollapsibleSectionProps = {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export function CollapsibleSection({ title, icon, defaultOpen = false, children, className = "" }: CollapsibleSectionProps) {
  const [sectionOpen, setSectionOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();
  const contentId = useId();

  return (
    <section className={`overflow-hidden rounded-card border border-border bg-surface ${className}`}>
      <button
        type="button"
        aria-expanded={sectionOpen}
        aria-controls={contentId}
        onClick={() => setSectionOpen((currentlyOpen) => !currentlyOpen)}
        className="focus-outline flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
      >
        {icon ? (
          <span className="flex shrink-0 items-center text-primary-text [&>svg]:size-5" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 text-base font-semibold text-ink">{title}</span>
        <ChevronDown
          className={`size-5 shrink-0 text-muted transition-transform duration-200 ${sectionOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {sectionOpen ? (
          <motion.div
            id={contentId}
            key="content"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-subtle px-4 py-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
