"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/actions";
import {
  createIncident,
  CreateIncidentInputSchema,
  requestIncidentHelp,
  updateIncident,
  UpdateIncidentInputSchema,
  type Incident,
} from "@/lib/incident";
import type { ReviewerTask } from "@/lib/reviewer-tasks";

function incidentInputFromFormData(formData: FormData): unknown {
  const residentsRaw = formData.get("affectedTexasResidents");
  const residentsText = typeof residentsRaw === "string" ? residentsRaw.trim() : "";
  const notesRaw = formData.get("notes");
  return {
    kind: formData.get("kind"),
    discoveredAt: formData.get("discoveredAt"),
    affectedTexasResidents: residentsText.length === 0 ? null : Number(residentsText),
    notes: typeof notesRaw === "string" && notesRaw.trim().length > 0 ? notesRaw : null,
  };
}

export async function updateIncidentAction(incidentId: string, formData: FormData): Promise<ActionResult<Incident>> {
  const parsed = UpdateIncidentInputSchema.safeParse({
    ...(incidentInputFromFormData(formData) as Record<string, unknown>),
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  try {
    const incident = await updateIncident(incidentId, parsed.data);
    revalidatePath("/incident");
    revalidatePath(`/incident/${incident.id}`);
    return { ok: true, data: incident };
  } catch (error) {
    console.error("updateIncidentAction failed", error);
    return { ok: false, error: "Could not update the incident. Please try again." };
  }
}

export async function createIncidentAction(formData: FormData): Promise<ActionResult<Incident>> {
  const parsed = CreateIncidentInputSchema.safeParse(incidentInputFromFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; "),
    };
  }
  try {
    const incident = await createIncident(parsed.data);
    revalidatePath("/incident");
    return { ok: true, data: incident };
  } catch (error) {
    console.error("createIncidentAction failed", error);
    return { ok: false, error: "Could not save the incident. Please try again." };
  }
}

export async function requestIncidentHelpAction(incidentId: string): Promise<ActionResult<ReviewerTask>> {
  if (typeof incidentId !== "string" || incidentId.length === 0) {
    return { ok: false, error: "Incident not found." };
  }
  try {
    const task = await requestIncidentHelp(incidentId);
    revalidatePath(`/incident/${incidentId}`);
    return { ok: true, data: task };
  } catch (error) {
    console.error(`requestIncidentHelpAction failed for ${incidentId}`, error);
    return { ok: false, error: "Could not send the help request. Please try again." };
  }
}
