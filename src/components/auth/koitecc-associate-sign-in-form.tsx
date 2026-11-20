"use client";

import { SignInForm } from "@/components/auth/sign-in-form";

export function KoiTeccAssociateSignInForm() {
  return (
    <SignInForm
      redirectTo="/koitecc/associate"
      audience="your KoiTecc associate workspace"
      forgotPasswordHref="/koitecc/associate/forgot-password"
    />
  );
}
