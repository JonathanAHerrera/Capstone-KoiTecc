"use server";

import { revalidatePath } from "next/cache";
import {
  parseEnabledFrameworks,
  requireOrganization,
  setEnabledFrameworks,
  TexasProfileInputSchema,
  updateOrganizationTexasProfile,
  type Organization,
  type TexasProfileInput,
} from "@/lib/org";
import { getFramework, parseFrameworkId } from "@/frameworks";
import type { ActionResult } from "@/app/actions";

function describeZodIssues(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

export async function saveTexasProfileAction(
  input: TexasProfileInput,
): Promise<ActionResult<Organization>> {
  const parsed = TexasProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    return describeZodIssues(
      parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; "),
    );
  }
  try {
    const organization = await updateOrganizationTexasProfile(parsed.data);
    revalidatePath("/applicability");
    revalidatePath("/path");
    return { ok: true, data: organization };
  } catch (error) {
    console.error("saveTexasProfileAction failed", error);
    return { ok: false, error: "Could not save your answers. Please try again." };
  }
}

export async function enableFrameworkAction(framework: string): Promise<ActionResult<Organization>> {
  const frameworkId = parseFrameworkId(framework);
  if (!frameworkId) return { ok: false, error: "Unknown framework." };
  try {
    const organization = await requireOrganization();
    const next = new Set(parseEnabledFrameworks(organization));
    next.add(frameworkId);
    const updated = await setEnabledFrameworks([...next]);
    revalidatePath("/applicability");
    revalidatePath("/path");
    return { ok: true, data: updated };
  } catch (error) {
    console.error("enableFrameworkAction failed", error);
    return { ok: false, error: "Could not enable that track. Please try again." };
  }
}

export async function disableFrameworkAction(framework: string): Promise<ActionResult<Organization>> {
  const frameworkId = parseFrameworkId(framework);
  if (!frameworkId) return { ok: false, error: "Unknown framework." };
  // Baseline tracks (CMMC) cannot be turned off.
  if (!getFramework(frameworkId).canDisable) {
    return { ok: false, error: `${getFramework(frameworkId).name} is always enabled.` };
  }
  try {
    const organization = await requireOrganization();
    const next = parseEnabledFrameworks(organization).filter((id) => id !== frameworkId);
    const updated = await setEnabledFrameworks(next);
    revalidatePath("/applicability");
    revalidatePath("/path");
    return { ok: true, data: updated };
  } catch (error) {
    console.error("disableFrameworkAction failed", error);
    return { ok: false, error: "Could not disable that track. Please try again." };
  }
}
