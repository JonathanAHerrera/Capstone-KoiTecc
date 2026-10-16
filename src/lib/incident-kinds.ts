import type { IncidentKind } from "@/db/schema";

// Client-safe (no DB imports): shared by the report form and the server-side incident module.
export const INCIDENT_KINDS = ["wire_fraud", "hacked_email", "ransomware"] as const satisfies readonly IncidentKind[];

export const INCIDENT_KIND_LABELS: Readonly<Record<IncidentKind, string>> = {
  wire_fraud: "Wire or payment fraud",
  hacked_email: "Hacked email account",
  ransomware: "Ransomware",
};

export const INCIDENT_KIND_DESCRIPTIONS: Readonly<Record<IncidentKind, string>> = {
  wire_fraud: "Money was sent to the wrong place, or someone asked you to change where payments go.",
  hacked_email: "Someone else got into a company mailbox, or mail is being sent that you did not write.",
  ransomware: "Files are locked or encrypted and someone is demanding payment.",
};
