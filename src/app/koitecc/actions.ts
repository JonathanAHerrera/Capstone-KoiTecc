"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  assignKoiTeccAssociate,
  createAssociateUpdate,
  removeKoiTeccAssociate,
} from "@/lib/koitecc";

const AssignmentInputSchema = z.object({
  organizationId: z.string().trim().min(1),
  associateId: z.string().trim().min(1),
});

export async function assignKoiTeccAssociateAction(formData: FormData): Promise<void> {
  const parsed = AssignmentInputSchema.safeParse({
    organizationId: formData.get("organizationId"),
    associateId: formData.get("associateId"),
  });
  if (!parsed.success) throw new Error("Choose an organization and associate.");

  await assignKoiTeccAssociate(parsed.data.organizationId, parsed.data.associateId);
  revalidatePath("/koitecc");
  redirect("/koitecc?assignment=success");
}

export async function removeKoiTeccAssociateAction(formData: FormData): Promise<void> {
  const parsed = AssignmentInputSchema.safeParse({
    organizationId: formData.get("organizationId"),
    associateId: formData.get("associateId"),
  });
  if (!parsed.success) throw new Error("Choose an organization and associate.");

  await removeKoiTeccAssociate(parsed.data.organizationId, parsed.data.associateId);
  revalidatePath("/koitecc");
  redirect("/koitecc?assignment=removed");
}

const AssociateUpdateInputSchema = z.object({
  associateId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  message: z.string().trim().min(1, "Enter an announcement or update.").max(2000),
});

export async function createAssociateUpdateAction(formData: FormData): Promise<void> {
  const parsed = AssociateUpdateInputSchema.safeParse({
    associateId: formData.get("associateId"),
    organizationId: formData.get("organizationId"),
    message: formData.get("message"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Enter an announcement or update.");

  await createAssociateUpdate(
    parsed.data.associateId,
    parsed.data.organizationId,
    parsed.data.message,
  );
  revalidatePath(`/koitecc/associates/${parsed.data.associateId}`);
  redirect(`/koitecc/associates/${parsed.data.associateId}?update=success`);
}
