"use client";

import { SignInForm } from "@/components/auth/sign-in-form";

export function KoiTeccSignInForm() {
  return <SignInForm redirectTo="/koitecc" audience="KoiTecc administrators" />;
}
