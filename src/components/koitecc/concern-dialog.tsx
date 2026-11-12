"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { resolveAssociateConcernAction } from "@/app/koitecc/actions";
import type { AssociateWorkspaceConcern } from "@/lib/koitecc";

type ConcernDialogProps = {
  associateId: string;
  concern: AssociateWorkspaceConcern;
  organizationName: string;
};

function formatConcernKind(kind: AssociateWorkspaceConcern["kind"]): string {
  return kind === "incident" ? "Incident" : "Reviewer task";
}

export function ConcernDialog({
  associateId,
  concern,
  organizationName,
}: ConcernDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="focus-outline min-h-10 translate-y-1 rounded-button border border-warning-ink px-3 text-sm font-semibold text-warning-ink transition-colors hover:bg-warning/15"
      >
        Open
      </button>
      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`concern-title-${concern.id}`}
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-surface p-5 shadow-2xl"
          >
            <header className="flex items-start gap-3 border-b border-border-subtle pb-4">
              <div className="min-w-0 flex-1">
                <p className="caption text-muted">{formatConcernKind(concern.kind)} · {organizationName}</p>
                <h3 id={`concern-title-${concern.id}`} className="mt-1 text-lg font-semibold capitalize text-ink">
                  {concern.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close concern details"
                className="focus-outline flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary hover:bg-surface-alt hover:text-ink"
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="font-semibold text-ink">Current status</dt>
                <dd className="mt-1 capitalize text-text-secondary">{concern.status.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Reported</dt>
                <dd className="mt-1 text-text-secondary">
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(concern.createdAt))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Concern details</dt>
                <dd className="mt-1 whitespace-pre-wrap text-text-secondary">{concern.detail}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="focus-outline min-h-11 rounded-button border border-border px-4 text-sm font-semibold text-text-secondary hover:bg-surface-alt"
              >
                Cancel
              </button>
              <form action={resolveAssociateConcernAction}>
                <input type="hidden" name="associateId" value={associateId} />
                <input type="hidden" name="organizationId" value={concern.organizationId} />
                <input type="hidden" name="concernId" value={concern.id} />
                <input type="hidden" name="concernKind" value={concern.kind} />
                <button
                  type="submit"
                  className="focus-outline min-h-11 w-full rounded-button border-2 border-success-ink bg-success-pale px-4 text-sm font-semibold text-success-ink hover:bg-success/20 sm:w-auto"
                >
                  Resolve
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
