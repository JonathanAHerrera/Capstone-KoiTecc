import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Info, ShieldAlert } from "lucide-react";
import { getOverlay, type OverlayId } from "@/frameworks/overlays";
import { buildSb2610Plan, sb2610Definition } from "@/frameworks/sb2610";
import type { SafeguardKind } from "@/frameworks/types";
import { deriveOrgProfile, getOrganization } from "@/lib/org";

export const dynamic = "force-dynamic";

const SAFEGUARD_LABEL: Readonly<Record<SafeguardKind, string>> = {
  administrative: "Administrative",
  technical: "Technical",
  physical: "Physical",
};

export default async function Sb2610Page() {
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  const plan = buildSb2610Plan(deriveOrgProfile(organization));

  return (
    <div className="flex flex-col gap-8 px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to home"
            className="focus-outline flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="caption text-muted">Texas track</p>
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">
              {sb2610Definition.name}
            </h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-text-secondary">{sb2610Definition.fullName}</p>
      </header>

      <div role="note" className="rounded-card bg-dark-surface px-4 py-4 text-white">
        <p className="caption flex items-center gap-1.5 text-dark-eyebrow">
          <Info className="size-4 shrink-0" aria-hidden />
          About SB 2610
        </p>
        <p className="mt-1.5 text-sm text-white/80">{sb2610Definition.disclaimer}</p>
      </div>

      {!plan.eligible ? (
        <div className="rounded-card border border-border bg-surface px-4 py-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldAlert className="size-5 shrink-0 text-amber-600" aria-hidden />
            Outside the self-serve tiers
          </p>
          <p className="mt-2 text-sm text-text-secondary">{plan.reason}</p>
        </div>
      ) : (
        <>
          <section className="rounded-card border border-border bg-surface px-4 py-4">
            <p className="caption text-muted">Your tier</p>
            <p className="mt-1 text-base font-semibold text-ink">{plan.tier}</p>
            <p className="mt-2 text-sm text-text-secondary">{plan.reason}</p>
            {plan.overlays.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {plan.overlays.map((overlayId: OverlayId) => (
                  <span
                    key={overlayId}
                    className="rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-medium text-ink"
                  >
                    {getOverlay(overlayId).name}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-ink">
              Your plan, most important first ({plan.controls.length})
            </h2>
            <ol className="flex flex-col gap-3">
              {plan.controls.map((control) => (
                <li
                  key={control.id}
                  className="rounded-card border border-border bg-surface px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{control.title}</p>
                    <span className="shrink-0 rounded-full bg-surface-alt px-2 py-0.5 text-xs text-text-secondary">
                      {SAFEGUARD_LABEL[control.safeguardKind]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-text-secondary">{control.explainer}</p>
                  <p className="caption mt-2 text-muted">{control.sourceRef}</p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
