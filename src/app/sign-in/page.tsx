import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in — Texas Safe Harbor" };

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function safeRedirectTarget(rawRedirect: string | string[] | undefined): string {
  const value = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;
  // Only allow same-origin absolute paths so a crafted ?redirect= cannot bounce users off-site.
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = await searchParams;
  return <SignInForm redirectTo={safeRedirectTarget(resolvedSearchParams.redirect)} />;
}
