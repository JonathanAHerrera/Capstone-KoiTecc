"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createOrganization,
  CreateOrganizationInputSchema,
  type CreateOrganizationInput,
  type Organization,
} from "@/lib/org";
import { resetAllData } from "@/lib/reset";
import {
  getOrCreateDraftSubmission,
  saveSubmissionNote,
  type Submission,
} from "@/lib/submissions";
import { createReviewerTask, type ReviewerTask } from "@/lib/reviewer-tasks";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function askKoiTeccHelpAction(
  question: string,
  pathname: string,
): Promise<ActionResult<ReviewerTask>> {
  const trimmedQuestion = typeof question === "string" ? question.trim() : "";
  const trimmedPathname = typeof pathname === "string" ? pathname.trim() : "";
  if (trimmedQuestion.length === 0 || trimmedQuestion.length > 2000) {
    return { ok: false, error: "Please enter a question between 1 and 2,000 characters." };
  }
  if (!trimmedPathname.startsWith("/") || trimmedPathname.length > 500) {
    return { ok: false, error: "We could not identify the current page. Please try again." };
  }
  try {
    const task = await createReviewerTask({
      kind: "general_help",
      summary: "Client asked KoiTecc for help.",
      detail: { question: trimmedQuestion, page: trimmedPathname },
    });
    revalidatePath("/reviewer-tasks");
    return { ok: true, data: task };
  } catch (error) {
    console.error("askKoiTeccHelpAction failed", error);
    return { ok: false, error: "Could not send your question. Please try again." };
  }
}

function parseFormBoolean(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") return false;
  return ["true", "on", "yes", "1"].includes(value.trim().toLowerCase());
}

function organizationInputFromFormData(formData: FormData): unknown {
  const targetLevelRaw = formData.get("targetLevel");
  return {
    name: formData.get("name"),
    targetLevel: typeof targetLevelRaw === "string" ? Number(targetLevelRaw) : targetLevelRaw,
    handlesCui: parseFormBoolean(formData.get("handlesCui")),
    employeeCount: formData.get("employeeCount"),
    itSetup: formData.get("itSetup"),
    hasItProvider: parseFormBoolean(formData.get("hasItProvider")),
  };
}

function describeZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ");
}

export async function createOrganizationAction(
  input: CreateOrganizationInput | FormData,
): Promise<ActionResult<Organization>> {
  const rawInput = input instanceof FormData ? organizationInputFromFormData(input) : input;
  const parsedInput = CreateOrganizationInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    return { ok: false, error: describeZodError(parsedInput.error) };
  }
  try {
    const organization = await createOrganization(parsedInput.data);
    revalidatePath("/", "layout");
    return { ok: true, data: organization };
  } catch (error) {
    console.error("createOrganizationAction failed", error);
    return { ok: false, error: "Could not save your organization. Please try again." };
  }
}

export async function saveSubmissionNoteAction(
  practiceId: string,
  note: string,
): Promise<ActionResult<Submission>> {
  try {
    const submission = await saveSubmissionNote(practiceId, note);
    revalidatePath(`/practice/${practiceId}`);
    return { ok: true, data: submission };
  } catch (error) {
    console.error(`saveSubmissionNoteAction failed for ${practiceId}`, error);
    return { ok: false, error: "Could not save your note. Please try again." };
  }
}

export async function getOrCreateDraftSubmissionAction(
  practiceId: string,
): Promise<ActionResult<Submission>> {
  try {
    const submission = await getOrCreateDraftSubmission(practiceId);
    return { ok: true, data: submission };
  } catch (error) {
    console.error(`getOrCreateDraftSubmissionAction failed for ${practiceId}`, error);
    return { ok: false, error: "Could not open this practice. Please try again." };
  }
}

// Clears the organization, submissions, evidence, reviews, and radar data so the next
// visit starts at onboarding again. Testing aid for the single-org MVP.
export async function resetAllDataAction(): Promise<ActionResult<null>> {
  try {
    await resetAllData();
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (error) {
    console.error("resetAllDataAction failed", error);
    return { ok: false, error: "Could not reset app data. Please try again." };
  }
}
