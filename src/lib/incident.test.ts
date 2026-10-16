import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import {
  ATTORNEY_GENERAL_REQUIREMENT_ID,
  buildDraftNotices,
  computeBreachClock,
  daysUntil,
  formatIsoDate,
  getIncidentChecklist,
  INDIVIDUAL_NOTICE_REQUIREMENT_ID,
} from "@/lib/incident";

// Env must be set before any module resolves the SQLite path via getDb().
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "incident-test-"));
process.env.CMMC_DB_PATH = path.join(temporaryDirectory, "incident-test.db");
process.env.CMMC_UPLOADS_DIR = path.join(temporaryDirectory, "uploads");

describe("computeBreachClock", () => {
  test("individual notice is due 60 days after the determination date", () => {
    const clock = computeBreachClock("2026-01-15", 10);
    expect(clock.determinationDate).toBe("2026-01-15");
    expect(formatIsoDate(clock.individualNoticeDeadline)).toBe("2026-03-16");
    expect(clock.individualNoticeRequirementId).toBe(INDIVIDUAL_NOTICE_REQUIREMENT_ID);
  });

  test("fewer than 250 Texas residents does not start the Attorney General clock", () => {
    const clock = computeBreachClock("2026-01-15", 249);
    expect(clock.attorneyGeneralNoticeRequired).toBe(false);
    expect(clock.attorneyGeneralDeadline).toBeNull();
    expect(clock.attorneyGeneralRequirementId).toBeNull();
  });

  test("exactly 250 Texas residents starts the 30-day Attorney General clock", () => {
    const clock = computeBreachClock("2026-01-15", 250);
    expect(clock.attorneyGeneralNoticeRequired).toBe(true);
    expect(formatIsoDate(clock.attorneyGeneralDeadline as Date)).toBe("2026-02-14");
    expect(clock.attorneyGeneralRequirementId).toBe(ATTORNEY_GENERAL_REQUIREMENT_ID);
  });

  test("more than 250 residents keeps both clocks and crosses month and leap boundaries by calendar day", () => {
    const clock = computeBreachClock(new Date("2028-01-31T23:30:00-06:00"), 1000);
    // The Central-time timestamp is already Feb 1 in UTC; the clock runs from the UTC calendar day.
    expect(clock.determinationDate).toBe("2028-02-01");
    expect(formatIsoDate(clock.attorneyGeneralDeadline as Date)).toBe("2028-03-02");
    expect(formatIsoDate(clock.individualNoticeDeadline)).toBe("2028-04-01");
  });

  test("negative or fractional counts are treated as zero residents", () => {
    expect(computeBreachClock("2026-01-15", -5).affectedTexasResidents).toBe(0);
    expect(computeBreachClock("2026-01-15", 250.7).affectedTexasResidents).toBe(250);
  });

  test("daysUntil counts whole calendar days from today", () => {
    const clock = computeBreachClock("2026-01-15", 0);
    expect(daysUntil(clock.individualNoticeDeadline, new Date("2026-01-15T12:00:00Z"))).toBe(60);
    expect(daysUntil(clock.individualNoticeDeadline, new Date("2026-03-20T00:00:00Z"))).toBe(-4);
  });
});

describe("checklists and draft notices", () => {
  test("every incident kind has a checklist and wire fraud starts with the bank call and IC3", () => {
    const wireFraud = getIncidentChecklist("wire_fraud");
    expect(wireFraud[0].title.toLowerCase()).toContain("bank");
    expect(wireFraud.some((step) => step.externalLink?.href.includes("ic3.gov"))).toBe(true);
    expect(wireFraud.some((step) => step.relatedControlId === "essential.payment-change-callback")).toBe(true);
    expect(getIncidentChecklist("hacked_email").some((step) => step.id.includes("forwarding"))).toBe(true);
    expect(
      getIncidentChecklist("ransomware").some((step) => step.relatedControlId === "essential.backups-and-restore-test"),
    ).toBe(true);
  });

  test("draft notices quote the stored requirement text and only include the AG worksheet at the threshold", () => {
    const organization = { name: "Lone Star Dental" };
    const incident = { kind: "ransomware" as const, discoveredAt: "2026-01-15" };

    const below = buildDraftNotices(organization, incident, computeBreachClock("2026-01-15", 12));
    expect(below.individualNotice).toContain("Send by: 2026-03-16");
    expect(below.individualNotice).toContain("Tex. Bus. & Com. Code §521.053(b)");
    expect(below.individualNotice).toContain("Not legal advice");
    expect(below.attorneyGeneralNotice).toBeNull();

    const atThreshold = buildDraftNotices(organization, incident, computeBreachClock("2026-01-15", 250));
    expect(atThreshold.attorneyGeneralNotice).toContain("Submit by: 2026-02-14");
    expect(atThreshold.attorneyGeneralNotice).toContain("Tex. Bus. & Com. Code §521.053(i)");
    expect(atThreshold.attorneyGeneralNotice).toContain("TODO_SOURCE");
  });
});

describe("incident persistence", () => {
  test("createIncident persists the row, writes an incident_logged ledger entry, and help creates a reviewer task", async () => {
    const { getDb } = await import("@/db/client");
    const { user } = await import("@/db/auth-schema");
    const { runWithSessionUser } = await import("@/lib/request-context");
    const { createOrganization } = await import("@/lib/org");
    const { listLedgerEntriesForOrg, verifyLedger } = await import("@/lib/ledger");
    const { createIncident, getIncidentById, listIncidents, requestIncidentHelp } = await import("@/lib/incident");
    const { listReviewerTasksForOrg } = await import("@/lib/reviewer-tasks");

    const sessionUser = { id: "incident-user", email: "incident@example.test", name: "Incident User" };
    const database = await getDb();
    await database.insert(user).values(sessionUser).onConflictDoNothing();

    await runWithSessionUser(sessionUser, async () => {
      const organization = await createOrganization({
        name: "Incident Co",
        targetLevel: 1,
        handlesCui: false,
        employeeCount: "1-10",
        itSetup: "cloud",
        hasItProvider: false,
      });

      const created = await createIncident({
        kind: "wire_fraud",
        discoveredAt: "2026-02-01",
        affectedTexasResidents: 300,
        notes: "Vendor bank change email; $18,400 wired.",
      });

      const persisted = await getIncidentById(created.id);
      expect(persisted).not.toBeNull();
      expect(persisted?.kind).toBe("wire_fraud");
      expect(persisted?.affectedTexasResidents).toBe(300);
      expect(persisted?.status).toBe("open");
      expect((await listIncidents()).map((incident) => incident.id)).toContain(created.id);

      const task = await requestIncidentHelp(created.id);
      expect(task.kind).toBe("incident_help");
      expect(task.relatedIncidentId).toBe(created.id);
      expect(task.requestedByUserId).toBe(sessionUser.id);
      const tasks = await listReviewerTasksForOrg(organization.id);
      expect(tasks.map((row) => row.id)).toContain(task.id);

      const entries = await listLedgerEntriesForOrg(organization.id);
      const incidentEntry = entries.find((entry) => entry.type === "incident_logged");
      expect(incidentEntry?.controlId).toBe("TX521-RECORDS-1");
      expect(JSON.parse(incidentEntry?.metadata ?? "{}")).toMatchObject({
        incidentId: created.id,
        attorneyGeneralDeadline: "2026-03-03",
        individualNoticeDeadline: "2026-04-02",
      });
      expect(entries.some((entry) => entry.type === "help_requested")).toBe(true);
      expect((await verifyLedger(organization.id)).valid).toBe(true);
    });
  });

  test("an incident is not visible to another tenant", async () => {
    const { getDb } = await import("@/db/client");
    const { user } = await import("@/db/auth-schema");
    const { runWithSessionUser } = await import("@/lib/request-context");
    const { createOrganization } = await import("@/lib/org");
    const { createIncident, getIncidentById } = await import("@/lib/incident");

    const owner = { id: "incident-owner", email: "owner@example.test", name: "Owner" };
    const outsider = { id: "incident-outsider", email: "outsider@example.test", name: "Outsider" };
    const database = await getDb();
    await database.insert(user).values([owner, outsider]).onConflictDoNothing();

    const base = { targetLevel: 1 as const, handlesCui: false, employeeCount: "1-10" as const, itSetup: "cloud" as const, hasItProvider: false };
    const incidentId = await runWithSessionUser(owner, async () => {
      await createOrganization({ name: "Owner Co", ...base });
      return (await createIncident({ kind: "hacked_email", discoveredAt: "2026-03-01", affectedTexasResidents: null })).id;
    });
    await runWithSessionUser(outsider, async () => {
      await createOrganization({ name: "Outsider Co", ...base });
      expect(await getIncidentById(incidentId)).toBeNull();
    });
  });
});

afterAll(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});
