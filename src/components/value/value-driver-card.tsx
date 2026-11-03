import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CircleCheckBig,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { formatUsdRange, type ValueDriver, type ValueDriverKind, type ValueDriverStatus } from "@/lib/value";

const KIND_PRESENTATION: Record<ValueDriverKind, { icon: LucideIcon; tone: string }> = {
  contract_eligibility: { icon: Trophy, tone: "border-primary-edge bg-primary-pale text-primary-text" },
  consultant_savings: { icon: Banknote, tone: "border-success-edge bg-success-pale text-success-ink" },
  fine_exposure: { icon: Landmark, tone: "border-warning-edge bg-warning-pale text-warning-ink" },
  breach_exposure: { icon: ShieldAlert, tone: "border-warning-edge bg-warning-pale text-warning-ink" },
  insurance_posture: { icon: ShieldCheck, tone: "border-info-edge bg-info-pale text-info-ink" },
};

const AUDIENCE_LABEL: Record<ValueDriver["audience"], string> = {
  dod: "Defense contractors",
  texas: "Texas businesses",
  both: "Every business",
};

const STATUS_PRESENTATION: Record<ValueDriverStatus, { label: string; className: string }> = {
  locked: { label: "Not started", className: "border-border bg-surface-alt text-muted" },
  in_progress: { label: "In progress", className: "border-primary-edge bg-primary-pale text-primary-text" },
  realized: { label: "Earned", className: "border-success-edge bg-success-pale text-success-ink" },
};

export function ValueDriverCard({ driver }: { driver: ValueDriver }) {
  const presentation = KIND_PRESENTATION[driver.kind];
  const Icon = presentation.icon;
  const status = STATUS_PRESENTATION[driver.status];

  return (
    <Link
      href={driver.href}
      className="focus-outline group flex flex-col gap-3 rounded-card border border-border bg-surface px-5 py-5 transition-colors hover:border-primary-edge"
    >
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${presentation.tone}`}>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {AUDIENCE_LABEL[driver.audience]}
        </span>
        <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>
          {driver.status === "realized" ? <CircleCheckBig className="size-3.5 shrink-0" aria-hidden /> : null}
          {status.label}
        </span>
      </div>

      <p className="text-[19px] font-bold leading-snug text-ink">{driver.headline}</p>

      {driver.amount ? (
        <div>
          <p className="text-[26px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
            {formatUsdRange(driver.amount.low, driver.amount.high)}
          </p>
          <p className="mt-1 text-xs text-muted">{driver.amount.basis}</p>
        </div>
      ) : null}

      <p className="text-sm leading-relaxed text-text-secondary">{driver.plainEnglish}</p>

      <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-text">
        Work on this
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
