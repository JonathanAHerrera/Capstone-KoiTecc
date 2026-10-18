"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";

const HIDDEN_ROUTE_PREFIXES = ["/sign-in", "/sign-up", "/onboarding", "/scan"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const showSidebar =
    pathname !== "/" &&
    !HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return (
    <div className="app-shell flex w-full flex-1" data-sidebar={showSidebar}>
      {showSidebar ? <AppSidebar /> : null}
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col min-h-dvh lg:max-w-[760px] lg:px-2">
        {children}
      </main>
    </div>
  );
}
