"use server";

import { redirect } from "next/navigation";
import { getKoiTeccAdminForCurrentUser } from "@/lib/koitecc";

export async function checkKoiTeccSetupAction(): Promise<void> {
  if (await getKoiTeccAdminForCurrentUser()) {
    redirect("/koitecc");
  }

  redirect("/koitecc/setup?status=not-ready");
}
