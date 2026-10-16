import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, MonitorCog } from "lucide-react";
import { ResetDataSetting } from "@/components/settings/reset-data-setting";
import { SignOutSetting } from "@/components/settings/sign-out-setting";
import { ThemeSetting } from "@/components/settings/theme-setting";
import { TwoFactorSetting } from "@/components/settings/two-factor-setting";

export const metadata: Metadata = { title: "Settings — CMMC Ready" };

export default function SettingsPage() {
  return (
    <div className="flex min-h-dvh flex-col px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(8px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-5">
        <Link href="/path" className="focus-outline -ml-2 inline-flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-text-secondary hover:bg-surface-alt hover:text-ink">
          <ChevronLeft className="size-5" aria-hidden />
          Path
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[10px] border border-border bg-surface text-primary-text"><MonitorCog className="size-5" aria-hidden /></span>
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink">Settings</h1>
            <p className="mt-0.5 text-sm text-text-secondary">Preferences for this device</p>
          </div>
        </div>
      </header>
      <section aria-labelledby="account-heading" className="py-6">
        <p id="account-heading" className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Account</p>
        <div className="mt-3 flex flex-col gap-3">
          <div className="rounded-card border border-border bg-surface p-4 shadow-float"><TwoFactorSetting /></div>
          <div className="rounded-card border border-border bg-surface p-4 shadow-float"><SignOutSetting /></div>
        </div>
      </section>
      <section aria-labelledby="appearance-heading" className="pb-6">
        <p id="appearance-heading" className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Appearance</p>
        <div className="mt-3 rounded-card border border-border bg-surface p-4 shadow-float"><ThemeSetting /></div>
      </section>
      <section aria-labelledby="data-heading" className="pb-6">
        <p id="data-heading" className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Data</p>
        <div className="mt-3 rounded-card border border-border bg-surface p-4 shadow-float"><ResetDataSetting /></div>
      </section>
    </div>
  );
}
