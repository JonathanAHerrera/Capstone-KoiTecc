"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assignKoiTeccAssociate } from "@/lib/koitecc";

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
}
