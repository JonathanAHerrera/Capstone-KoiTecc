import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "KoiTecc administrator sign up — CMMC Ready",
};

export default async function KoiTeccSignUpPage() {
  if (await getSessionUser()) {
    redirect("/koitecc/setup");
  }

  return <SignUpForm redirectTo="/koitecc/setup" signInHref="/koitecc/sign-in" />;
}
