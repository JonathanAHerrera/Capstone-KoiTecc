import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create account — Texas Safe Harbor" };

type SignUpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function safeRedirectTarget(rawRedirect: string | string[] | undefined): string {
  const value = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedSearchParams = await searchParams;
  return <SignUpForm redirectTo={safeRedirectTarget(resolvedSearchParams.redirect)} />;
}
