import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb, nowIsoTimestamp } from "@/db/client";
import { incidents, type IncidentKind, type IncidentRow } from "@/db/schema";
import { appendLedgerEntryBestEffort } from "@/lib/ledger";
import { requireOrganization, type Organization } from "@/lib/org";
import { getPractice } from "@/lib/practices";
import { INCIDENT_KIND_DESCRIPTIONS, INCIDENT_KIND_LABELS, INCIDENT_KINDS } from "@/lib/incident-kinds";
import { createReviewerTask, type ReviewerTask } from "@/lib/reviewer-tasks";

export type Incident = IncidentRow;

export { INCIDENT_KIND_DESCRIPTIONS, INCIDENT_KIND_LABELS, INCIDENT_KINDS };

// ---------------------------------------------------------------------------------------------
// Texas §521 breach clock
//
// The deadlines come from the stored TX521 requirement content, not from this file:
//   TX521-NOTIFY-1 (§521.053(b)) — individual notice not later than the 60th day after determination
//   TX521-AG-1     (§521.053(i)) — Attorney General notice not later than the 30th day after
//                                  determination when at least 250 Texas residents must be notified
// ---------------------------------------------------------------------------------------------

export const INDIVIDUAL_NOTICE_REQUIREMENT_ID = "TX521-NOTIFY-1";
export const NOTICE_CONTENT_REQUIREMENT_ID = "TX521-NOTIFY-2";
export const ATTORNEY_GENERAL_REQUIREMENT_ID = "TX521-AG-1";
export const BREACH_RECORDS_REQUIREMENT_ID = "TX521-RECORDS-1";

export const INDIVIDUAL_NOTICE_DEADLINE_DAYS = 60;
export const ATTORNEY_GENERAL_DEADLINE_DAYS = 30;
export const ATTORNEY_GENERAL_RESIDENT_THRESHOLD = 250;

export type BreachClock = {
  // YYYY-MM-DD of the determination date the clocks run from.
  determinationDate: string;
  affectedTexasResidents: number;
  individualNoticeDeadline: Date;
  individualNoticeRequirementId: string;
  attorneyGeneralNoticeRequired: boolean;
  // Present only when the resident count meets the statutory threshold.
  attorneyGeneralDeadline: Date | null;
  attorneyGeneralRequirementId: string | null;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Clocks count calendar days, so the discovery date is reduced to its YYYY-MM-DD and deadlines are
// computed at UTC midnight; time-of-day and DST never shift a deadline by a day.
function toUtcCalendarDate(value: Date | string): Date {
  if (typeof value === "string" && ISO_DATE_PATTERN.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error("Discovery date is not a valid date.");
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addCalendarDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeBreachClock(
  discoveryDate: Date | string,
  affectedTexasResidents: number,
): BreachClock {
  const determination = toUtcCalendarDate(discoveryDate);
  const residents = Number.isFinite(affectedTexasResidents) ? Math.max(0, Math.floor(affectedTexasResidents)) : 0;
  const attorneyGeneralNoticeRequired = residents >= ATTORNEY_GENERAL_RESIDENT_THRESHOLD;

  return {
    determinationDate: formatIsoDate(determination),
    affectedTexasResidents: residents,
    individualNoticeDeadline: addCalendarDays(determination, INDIVIDUAL_NOTICE_DEADLINE_DAYS),
    individualNoticeRequirementId: INDIVIDUAL_NOTICE_REQUIREMENT_ID,
    attorneyGeneralNoticeRequired,
    attorneyGeneralDeadline: attorneyGeneralNoticeRequired
      ? addCalendarDays(determination, ATTORNEY_GENERAL_DEADLINE_DAYS)
      : null,
    attorneyGeneralRequirementId: attorneyGeneralNoticeRequired ? ATTORNEY_GENERAL_REQUIREMENT_ID : null,
  };
}

export function daysUntil(deadline: Date, now: Date = new Date()): number {
  const today = toUtcCalendarDate(now);
  return Math.round((deadline.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

// ---------------------------------------------------------------------------------------------
// Guided checklists
// ---------------------------------------------------------------------------------------------

export type IncidentChecklistStep = {
  id: string;
  title: string;
  detail: string;
  // SB 2610 control this step exercises, when one exists, so the binder can cross-reference it.
  relatedControlId: string | null;
  externalLink: { label: string; href: string } | null;
};

const IC3_LINK = { label: "Report at ic3.gov", href: "https://www.ic3.gov/" };

const INCIDENT_CHECKLISTS: Readonly<Record<IncidentKind, readonly IncidentChecklistStep[]>> = {
  wire_fraud: [
    {
      id: "wire_fraud.call-bank",
      title: "Call your bank right now",
      detail:
        "Use the number on the back of your card or your statement. Ask for a recall or hold on the transfer. The first hours matter most.",
      relatedControlId: null,
      externalLink: null,
    },
    {
      id: "wire_fraud.file-ic3",
      title: "File a report with the FBI's IC3",
      detail:
        "A prompt IC3 report lets the FBI's recovery team ask the receiving bank to freeze the funds. Have the date, amount, and account details ready.",
      relatedControlId: null,
      externalLink: IC3_LINK,
    },
    {
      id: "wire_fraud.callback-verify",
      title: "Call the real vendor on a number you already had",
      detail:
        "Confirm whether they actually changed their bank details. Never use a number or email from the suspicious message.",
      relatedControlId: "essential.payment-change-callback",
      externalLink: null,
    },
    {
      id: "wire_fraud.preserve",
      title: "Keep every email and record as is",
      detail:
        "Do not delete the messages, invoices, or bank confirmations. Your bank, insurer, and law enforcement will ask for them.",
      relatedControlId: null,
      externalLink: null,
    },
    {
      id: "wire_fraud.check-email",
      title: "Check whether your own email was hacked",
      detail:
        "Payment fraud often starts with a criminal reading your mail. Look for forwarding rules you did not create and reset the password.",
      relatedControlId: "essential.mfa-on-every-account",
      externalLink: null,
    },
  ],
  hacked_email: [
    {
      id: "hacked_email.reset-and-mfa",
      title: "Reset the password and turn on multi-factor authentication",
      detail:
        "Do this from a device you trust. Sign out every other session for that account so the intruder is kicked out.",
      relatedControlId: "essential.mfa-on-every-account",
      externalLink: null,
    },
    {
      id: "hacked_email.forwarding-rules",
      title: "Remove forwarding and inbox rules you did not create",
      detail:
        "Attackers hide by auto-forwarding mail to themselves or moving replies to a folder you never open. Check rules and forwarding in the mailbox settings.",
      relatedControlId: "essential.mfa-on-every-account",
      externalLink: null,
    },
    {
      id: "hacked_email.review-sent",
      title: "Review sent and deleted mail for messages you did not write",
      detail:
        "Look for invoices, bank-change requests, or links sent to customers and vendors. Those recipients need a warning.",
      relatedControlId: null,
      externalLink: null,
    },
    {
      id: "hacked_email.notify-contacts",
      title: "Warn the people who may have received fake mail",
      detail:
        "Tell them by phone or from a different account not to act on recent requests until they confirm with you directly.",
      relatedControlId: "essential.payment-change-callback",
      externalLink: null,
    },
    {
      id: "hacked_email.assess-data",
      title: "Decide whether personal data was exposed",
      detail:
        "If the mailbox held Texans' Social Security, driver's license, or account numbers, the Texas breach clock below applies.",
      relatedControlId: null,
      externalLink: null,
    },
  ],
  ransomware: [
    {
      id: "ransomware.isolate",
      title: "Disconnect affected devices from the network",
      detail:
        "Unplug the network cable or turn off Wi-Fi on each affected machine. Leave them powered on so evidence is not lost.",
      relatedControlId: null,
      externalLink: null,
    },
    {
      id: "ransomware.preserve",
      title: "Do not wipe, reinstall, or pay yet",
      detail:
        "Photograph the ransom note and keep the machines as they are. Paying does not guarantee recovery and may be restricted.",
      relatedControlId: null,
      externalLink: null,
    },
    {
      id: "ransomware.restore",
      title: "Restore from your offline backup",
      detail:
        "Use the backup copy that was not connected to the network. Restore onto clean machines, and record the date and what came back.",
      relatedControlId: "essential.backups-and-restore-test",
      externalLink: null,
    },
    {
      id: "ransomware.get-help",
      title: "Bring in incident response help",
      detail:
        "Tap “Get help from KOITECC” below. A responder will help you scope what was taken before anything is rebuilt.",
      relatedControlId: null,
      externalLink: null,
    },
    {
      id: "ransomware.report",
      title: "Report to the FBI's IC3",
      detail: "Reporting helps recovery and may be required by your insurer.",
      relatedControlId: null,
      externalLink: IC3_LINK,
    },
    {
      id: "ransomware.assess-data",
      title: "Decide whether personal data was taken",
      detail:
        "Most ransomware groups copy files before locking them. If Texans' sensitive personal information was on those machines, the Texas breach clock below applies.",
      relatedControlId: null,
      externalLink: null,
    },
  ],
};

export function getIncidentChecklist(kind: IncidentKind): readonly IncidentChecklistStep[] {
  return INCIDENT_CHECKLISTS[kind];
}

// ---------------------------------------------------------------------------------------------
// Draft notices
//
// Built from the stored TX521 requirement text so the app never invents statutory wording. Every
// fact the business must supply is a bracketed placeholder; anything the stored catalog does not
// spell out is marked TODO_SOURCE for counsel to complete.
// ---------------------------------------------------------------------------------------------

export type DraftNotices = {
  individualNotice: string;
  attorneyGeneralNotice: string | null;
};

const NOTICE_DISCLAIMER =
  "DRAFT prepared from the Texas Safe Harbor requirement catalog. Not legal advice. Have a qualified attorney review before sending.";

function requirementLines(requirementId: string): string[] {
  const requirement = getPractice(requirementId);
  if (!requirement) {
    return [`TODO_SOURCE: requirement ${requirementId} is not in the catalog.`];
  }
  return [
    `Source: ${requirementId} — ${requirement.legalRef ?? "TODO_SOURCE"}`,
    `Stored requirement text: "${requirement.officialText}"`,
    ...requirement.assessmentObjectives.map((objective) => `  - ${objective}`),
  ];
}

export function buildDraftNotices(
  organization: Pick<Organization, "name">,
  incident: Pick<Incident, "kind" | "discoveredAt">,
  clock: BreachClock,
): DraftNotices {
  const individualNotice = [
    `# Draft notice to affected individuals — ${organization.name}`,
    "",
    NOTICE_DISCLAIMER,
    "",
    `Send by: ${formatIsoDate(clock.individualNoticeDeadline)} (${INDIVIDUAL_NOTICE_DEADLINE_DAYS} days after the ${clock.determinationDate} determination date).`,
    "",
    "## Letter",
    "",
    "Dear [RECIPIENT NAME],",
    "",
    `We are writing to tell you about a security incident at ${organization.name} that may have involved your personal information.`,
    "",
    "What happened: [DESCRIBE THE INCIDENT IN PLAIN WORDS: what occurred, when it was discovered, and how it was contained]",
    "",
    "What information was involved: [LIST THE TYPES OF PERSONAL INFORMATION INVOLVED]",
    "",
    "What we are doing: [DESCRIBE THE STEPS TAKEN AND PLANNED]",
    "",
    "What you can do: [TODO_SOURCE: recommended protective steps for recipients]",
    "",
    "For more information: [CONTACT NAME, PHONE, EMAIL]",
    "",
    "Sincerely,",
    `[NAME, TITLE], ${organization.name}`,
    "",
    "## Content and delivery checklist (from the stored requirement text)",
    "",
    ...requirementLines(INDIVIDUAL_NOTICE_REQUIREMENT_ID),
    "",
    ...requirementLines(NOTICE_CONTENT_REQUIREMENT_ID),
    "",
    `Incident kind: ${INCIDENT_KIND_LABELS[incident.kind]}. Determination date on record: ${clock.determinationDate}.`,
  ].join("\n");

  if (!clock.attorneyGeneralNoticeRequired || !clock.attorneyGeneralDeadline) {
    return { individualNotice, attorneyGeneralNotice: null };
  }

  const attorneyGeneralNotice = [
    `# Draft Texas Attorney General breach report worksheet — ${organization.name}`,
    "",
    NOTICE_DISCLAIMER,
    "",
    `Submit by: ${formatIsoDate(clock.attorneyGeneralDeadline)} (${ATTORNEY_GENERAL_DEADLINE_DAYS} days after the ${clock.determinationDate} determination date). Required because ${clock.affectedTexasResidents} Texas residents are affected (threshold: ${ATTORNEY_GENERAL_RESIDENT_THRESHOLD}).`,
    "",
    "Submission channel: TODO_SOURCE — the Texas Attorney General's online data-breach reporting form.",
    "",
    "## Fields to prepare",
    "",
    "- Detailed description of the breach: [DESCRIBE WHAT HAPPENED, HOW, AND WHEN]",
    `- Number of Texas residents affected: ${clock.affectedTexasResidents}`,
    "- Measures taken regarding the breach: [DESCRIBE]",
    "- Measures to be taken after the notification: [DESCRIBE]",
    "- Whether law enforcement is engaged in investigating the breach: [YES/NO, AGENCY]",
    "",
    "## From the stored requirement text",
    "",
    ...requirementLines(ATTORNEY_GENERAL_REQUIREMENT_ID),
  ].join("\n");

  return { individualNotice, attorneyGeneralNotice };
}

// ---------------------------------------------------------------------------------------------
// Persistence (org-scoped)
// ---------------------------------------------------------------------------------------------

export const CreateIncidentInputSchema = z.object({
  kind: z.enum(INCIDENT_KINDS),
  discoveredAt: z
    .string()
    .regex(ISO_DATE_PATTERN, "Enter the date as YYYY-MM-DD")
    .refine((value) => !Number.isNaN(toUtcCalendarDate(value).getTime()), "Enter a real date"),
  affectedTexasResidents: z.number().int().min(0).max(100_000_000).nullable(),
  notes: z.string().trim().max(4000).nullable().default(null),
});

export type CreateIncidentInput = z.input<typeof CreateIncidentInputSchema>;

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const validated = CreateIncidentInputSchema.parse(input);
  const organization = await requireOrganization();
  const db = await getDb();
  const timestamp = nowIsoTimestamp();

  const incident: Incident = {
    id: nanoid(),
    orgId: organization.id,
    kind: validated.kind,
    discoveredAt: validated.discoveredAt,
    affectedTexasResidents: validated.affectedTexasResidents,
    status: "open",
    notes: validated.notes && validated.notes.length > 0 ? validated.notes : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.insert(incidents).values(incident);

  const clock = computeBreachClock(incident.discoveredAt, incident.affectedTexasResidents ?? 0);
  await appendLedgerEntryBestEffort({
    orgId: organization.id,
    type: "incident_logged",
    controlId: BREACH_RECORDS_REQUIREMENT_ID,
    metadata: {
      incidentId: incident.id,
      kind: incident.kind,
      discoveredAt: incident.discoveredAt,
      affectedTexasResidents: incident.affectedTexasResidents,
      individualNoticeDeadline: formatIsoDate(clock.individualNoticeDeadline),
      attorneyGeneralDeadline: clock.attorneyGeneralDeadline
        ? formatIsoDate(clock.attorneyGeneralDeadline)
        : null,
    },
  });

  return incident;
}

export async function listIncidents(): Promise<Incident[]> {
  const organization = await requireOrganization();
  const db = await getDb();
  return db
    .select()
    .from(incidents)
    .where(eq(incidents.orgId, organization.id))
    .orderBy(desc(incidents.createdAt));
}

export async function getIncidentById(incidentId: string): Promise<Incident | null> {
  const organization = await requireOrganization();
  const db = await getDb();
  const rows = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.orgId, organization.id)))
    .limit(1);
  return rows[0] ?? null;
}

// One-tap KOITECC help: opens a reviewer task tied to the incident so a person follows up.
export async function requestIncidentHelp(incidentId: string): Promise<ReviewerTask> {
  const incident = await getIncidentById(incidentId);
  if (!incident) {
    throw new Error("Incident not found.");
  }
  const clock = computeBreachClock(incident.discoveredAt, incident.affectedTexasResidents ?? 0);
  return createReviewerTask({
    kind: "incident_help",
    relatedIncidentId: incident.id,
    summary: `${INCIDENT_KIND_LABELS[incident.kind]} reported; discovered ${incident.discoveredAt}.`,
    detail: {
      incidentKind: incident.kind,
      discoveredAt: incident.discoveredAt,
      affectedTexasResidents: incident.affectedTexasResidents,
      individualNoticeDeadline: formatIsoDate(clock.individualNoticeDeadline),
      attorneyGeneralDeadline: clock.attorneyGeneralDeadline
        ? formatIsoDate(clock.attorneyGeneralDeadline)
        : null,
    },
  });
}
