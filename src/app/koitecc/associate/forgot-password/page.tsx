import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "KoiTecc associate password reset — CMMC Ready" };

export default function KoiTeccAssociateForgotPasswordPage() {
  return <ForgotPasswordForm backHref="/koitecc/associate/sign-in" />;
}
