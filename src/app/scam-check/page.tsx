import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ScanSearch } from "lucide-react";
import { ScamCheckForm } from "@/components/scam-check/scam-check-form";
import { getOrganization } from "@/lib/org";

export const metadata: Metadata = { title: "Check a suspicious message — Texas Safe Harbor" };

export const dynamic = "force-dynamic";

export default async function ScamCheckPage() {
  const organization = await getOrganization();
  if (!organization) redirect("/onboarding");

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <header className="border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/path"
            aria-label="Back to home"
            className="focus-outline flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="caption text-muted">Safety tools</p>
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">Check a suspicious message</h1>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-primary-text">
            <ScanSearch className="size-5" aria-hidden />
          </span>
        </div>
        <p className="mt-3 text-sm text-text-secondary">
          Paste a text, forward an email, or snap a photo. You get a plain-English risk level, why, and
          what to do next. Messages are not saved in this app. With an AI provider configured,
          redacted text and photos are sent for analysis. Hide sensitive information in photos first;
          text inside images is not automatically redacted.
        </p>
      </header>

      <ScamCheckForm />
    </div>
  );
}
