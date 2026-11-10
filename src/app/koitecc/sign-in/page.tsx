import type { Metadata } from "next";
import { KoiTeccSignInForm } from "@/components/auth/koitecc-sign-in-form";

export const metadata: Metadata = { title: "KoiTecc administrator sign in — CMMC Ready" };

export default function KoiTeccSignInPage() {
  return <KoiTeccSignInForm />;
}
