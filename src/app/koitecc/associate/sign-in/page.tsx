import type { Metadata } from "next";
import { KoiTeccAssociateSignInForm } from "@/components/auth/koitecc-associate-sign-in-form";

export const metadata: Metadata = { title: "KoiTecc associate sign in — CMMC Ready" };

export default function KoiTeccAssociateSignInPage() {
  return <KoiTeccAssociateSignInForm />;
}
