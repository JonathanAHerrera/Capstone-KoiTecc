"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveRadarDecision, saveRadarProfile } from "@/lib/radar/profile";
import { RADAR_INDUSTRIES } from "@/lib/radar/types";

function checked(formData: FormData, name: string): boolean {
  return ["true", "on", "yes", "1"].includes(String(formData.get(name) ?? "").toLowerCase());
}

function commaSeparated(formData: FormData, name: string): string[] {
  return String(formData.get(name) ?? "")
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function saveRadarProfileAction(formData: FormData): Promise<void> {
  const industries = formData
    .getAll("industries")
    .map(String)
    .filter((value): value is (typeof RADAR_INDUSTRIES)[number] => (RADAR_INDUSTRIES as readonly string[]).includes(value));
  await saveRadarProfile({
    industries: industries.length > 0 ? industries : ["other"],
    naicsCodes: commaSeparated(formData, "naicsCodes"),
    keywords: commaSeparated(formData, "keywords"),
    technologies: commaSeparated(formData, "technologies"),
    governmentContractor: checked(formData, "governmentContractor"),
    handlesSensitiveData: checked(formData, "handlesSensitiveData"),
    texasOperations: checked(formData, "texasOperations"),
  });
  revalidatePath("/radar");
}

const DecisionSchema = z.object({
  itemId: z.string().min(1).max(300),
  decision: z.enum(["applies", "does_not_apply", "expert_review", "track", "accepted_risk"]),
  rationale: z.string().trim().min(3, "Explain the decision").max(2000),
  reviewer: z.string().trim().min(2, "Name the reviewer or role").max(200),
  sourceTitle: z.string().min(1).max(500),
  sourceUrl: z.string().url().max(2000),
});

export async function saveRadarDecisionAction(formData: FormData): Promise<void> {
  const input = DecisionSchema.parse({
    itemId: formData.get("itemId"),
    decision: formData.get("decision"),
    rationale: formData.get("rationale") ?? "",
    reviewer: formData.get("reviewer") ?? "",
    sourceTitle: formData.get("sourceTitle"),
    sourceUrl: formData.get("sourceUrl"),
  });
  await saveRadarDecision(input);
  revalidatePath("/radar");
}
