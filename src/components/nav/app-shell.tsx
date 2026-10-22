"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AskKoiTeccButton } from "./ask-koitecc-button";
import { AppSidebar } from "./app-sidebar";

const HIDDEN_ROUTE_PREFIXES = ["/sign-in", "/sign-up", "/onboarding", "/scan"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAgentWorkspace = pathname === "/coordinator" || pathname.startsWith("/interview/");

  const showSidebar =
    pathname !== "/" &&
    !HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return (
    <div className="app-shell flex w-full flex-1" data-sidebar={showSidebar}>
      {showSidebar ? <AppSidebar /> : null}
      <main
        className={`mx-auto flex min-h-dvh min-w-0 w-full flex-1 flex-col lg:px-2 ${
          isAgentWorkspace ? "max-w-[1120px]" : "max-w-[640px] lg:max-w-[760px]"
        }`}
      >
        {children}
      </main>
      {showSidebar ? <AskKoiTeccButton /> : null}
    </div>
  );
}
