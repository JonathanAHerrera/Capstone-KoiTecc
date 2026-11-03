"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Compass,
  Inbox,
  Map,
  PiggyBank,
  RadioTower,
  ScanSearch,
  Settings,
  ShieldCheck,
  Siren,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefixes: string[];
};

type SidebarGroup = {
  heading: string;
  items: SidebarItem[];
};

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    heading: "Workspace",
    items: [
      { href: "/coordinator", label: "What's next", icon: Sparkles, matchPrefixes: ["/coordinator"] },
      { href: "/value", label: "What this is worth", icon: PiggyBank, matchPrefixes: ["/value"] },
      { href: "/path", label: "Readiness path", icon: Map, matchPrefixes: ["/path", "/practice", "/track"] },
      { href: "/summary", label: "Summary", icon: ClipboardList, matchPrefixes: ["/summary"] },
      { href: "/radar", label: "Standards radar", icon: RadioTower, matchPrefixes: ["/radar"] },
      { href: "/applicability", label: "What applies to me", icon: Compass, matchPrefixes: ["/applicability"] },
      { href: "/sb2610", label: "SB 2610 plan", icon: ShieldCheck, matchPrefixes: ["/sb2610"] },
    ],
  },
  {
    heading: "Right now",
    items: [
      { href: "/scam-check", label: "Check a message", icon: ScanSearch, matchPrefixes: ["/scam-check"] },
      { href: "/incident", label: "Report an incident", icon: Siren, matchPrefixes: ["/incident"] },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/reviewer-tasks", label: "Reviewer inbox", icon: Inbox, matchPrefixes: ["/reviewer-tasks"] },
      { href: "/settings", label: "Settings", icon: Settings, matchPrefixes: ["/settings"] },
    ],
  },
];

function isItemActive(pathname: string, item: SidebarItem): boolean {
  return item.matchPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border-subtle bg-surface/60 backdrop-blur-sm lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary text-primary-contrast">
          <ShieldCheck className="size-5" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">CMMC Ready</span>
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-6">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.heading} className="flex flex-col gap-1">
            <p className="px-3 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              {group.heading}
            </p>
            {group.items.map((item) => {
              const active = isItemActive(pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`focus-outline flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-selected text-primary-text"
                      : "text-text-secondary hover:bg-surface-alt hover:text-ink"
                  }`}
                >
                  <Icon className={`size-5 shrink-0 ${active ? "text-primary-text" : "text-muted"}`} strokeWidth={2} aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
