import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "@/db/auth-schema";
import type { Industry } from "@/frameworks/types";

export * from "@/db/auth-schema";

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    // One organization per authenticated user. Every tenant-scoped query resolves the org from
    // the session user, so this is the root of multi-tenant isolation.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetLevel: integer("target_level").notNull().$type<1 | 2>(),
    handlesCui: integer("handles_cui", { mode: "boolean" }).notNull(),
    employeeCount: text("employee_count")
      .notNull()
      .$type<"1-10" | "11-50" | "51-250" | "250+">(),
    itSetup: text("it_setup").notNull().$type<"cloud" | "onprem" | "mixed" | "unsure">(),
    hasItProvider: integer("has_it_provider", { mode: "boolean" }).notNull(),
    // Texas applicability profile; defaulted so existing rows and the onboarding payload stay valid.
    handlesTexasResidentData: integer("handles_texas_resident_data", { mode: "boolean" })
      .notNull()
      .default(false),
    sellsToStateOfTexas: integer("sells_to_state_of_texas", { mode: "boolean" })
      .notNull()
      .default(false),
    texasPhysicalPresence: integer("texas_physical_presence", { mode: "boolean" })
      .notNull()
      .default(false),
    processesPersonalDataAtScale: integer("processes_personal_data_at_scale", { mode: "boolean" })
      .notNull()
      .default(false),
    // SB 2610 industry-overlay inputs (Phase 3). Industry drives HIPAA/GLBA; card payments drive PCI.
    industry: text("industry").notNull().$type<Industry>().default("other"),
    takesCardPayments: integer("takes_card_payments", { mode: "boolean" }).notNull().default(false),
    // JSON array of FrameworkId; CMMC is always enabled.
    enabledFrameworks: text("enabled_frameworks").notNull().default('["cmmc"]'),
    createdAt: text("created_at").notNull(),
  },
  // One org per user: the unique index is what enforces the single-tenant-per-account rule.
  (table) => [uniqueIndex("organizations_user_unique").on(table.userId)],
);

export const koiteccAssociates = sqliteTable("koitecc_associates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  title: text("title").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const organizationStaffAssignments = sqliteTable(
  "organization_staff_assignments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    associateId: text("associate_id")
      .notNull()
      .references(() => koiteccAssociates.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("organization_staff_assignment_unique").on(table.organizationId, table.associateId),
    index("organization_staff_assignments_org_idx").on(table.organizationId),
  ],
);

export const associateUpdates = sqliteTable(
  "associate_updates",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    associateId: text("associate_id")
      .notNull()
      .references(() => koiteccAssociates.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("associate_updates_org_idx").on(table.organizationId),
    index("associate_updates_associate_idx").on(table.associateId),
  ],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    practiceId: text("practice_id").notNull(),
    // Convenience/filter column only; correctness relies on globally namespaced practice ids, so
    // the UNIQUE(org_id, practice_id) index is unchanged. Null on rows created before this column.
    framework: text("framework").$type<"cmmc" | "tdpsa" | "tx521" | "tac202">(),
    status: text("status")
      .notNull()
      .$type<"draft" | "submitted" | "reviewing" | "accepted" | "needs_work">(),
    note: text("note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("submissions_org_practice_unique").on(table.orgId, table.practiceId)],
);

export const evidenceFiles = sqliteTable("evidence_files", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().$type<"photo" | "document" | "screenshot" | "video" | "text">(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  sha256: text("sha256").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: text("created_at").notNull(),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  verdict: text("verdict").notNull().$type<"accepted" | "needs_work">(),
  confidence: real("confidence").notNull(),
  summary: text("summary").notNull(),
  objectiveFindings: text("objective_findings").notNull(),
  missingItems: text("missing_items").notNull(),
  nextSteps: text("next_steps").notNull(),
  reviewerModel: text("reviewer_model").notNull(),
  isMock: integer("is_mock", { mode: "boolean" }).notNull(),
  rawResponse: text("raw_response"),
  createdAt: text("created_at").notNull(),
});

export const radarProfiles = sqliteTable("radar_profiles", {
  orgId: text("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  industries: text("industries").notNull(),
  naicsCodes: text("naics_codes").notNull(),
  keywords: text("keywords").notNull(),
  technologies: text("technologies").notNull(),
  governmentContractor: integer("government_contractor", { mode: "boolean" }).notNull(),
  handlesSensitiveData: integer("handles_sensitive_data", { mode: "boolean" }).notNull(),
  texasOperations: integer("texas_operations", { mode: "boolean" }).notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const radarDecisions = sqliteTable(
  "radar_decisions",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    decision: text("decision")
      .notNull()
      .$type<"applies" | "does_not_apply" | "expert_review" | "track" | "accepted_risk">(),
    rationale: text("rationale").notNull(),
    reviewer: text("reviewer").notNull(),
    sourceTitle: text("source_title").notNull(),
    sourceUrl: text("source_url").notNull(),
    decidedAt: text("decided_at").notNull(),
  },
  (table) => [uniqueIndex("radar_decisions_org_item_unique").on(table.orgId, table.itemId)],
);

// SB 2610 (and future multi-tier frameworks) enrollment: which tier an org landed in and which
// industry overlays attached. One row per (org, framework); the ranked plan is recomputed from the
// org profile, so only the selection is persisted here.
export const frameworkEnrollments = sqliteTable(
  "framework_enrollments",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    framework: text("framework").notNull(),
    tier: text("tier"),
    overlays: text("overlays").notNull().default("[]"), // JSON array of overlay ids
    version: text("version"),
    enrolledAt: text("enrolled_at").notNull(),
  },
  (table) => [
    uniqueIndex("framework_enrollments_org_framework_unique").on(table.orgId, table.framework),
  ],
);

// Append-only security/activity trail. Scoped to an org (nullable for pre-org events like the
// sign-up that creates the first org). actorUserId records who did it; metadata is a JSON blob.
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: text("metadata"),
    ipAddress: text("ip_address"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("audit_log_org_idx").on(table.orgId),
    index("audit_log_actor_idx").on(table.actorUserId),
  ],
);

// Append-only, hash-chained evidence ledger (Phase 5). One chain per org: each row's entryHash is
// sha256(prevHash || canonicalJson(hashedFields)), so altering any stored hashed field breaks every
// link from that seq forward. metadata is an UNHASHED JSON blob for display context only — it is
// deliberately excluded from the hash so adding display detail later cannot invalidate old chains.
// externalTimestamp is the hook for RFC 3161 trusted timestamping; left null until that is built.
export const ledgerEntries = sqliteTable(
  "ledger_entries",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type")
      .notNull()
      .$type<
        | "evidence_added"
        | "verdict_set"
        | "review_signed"
        | "integration_check"
        | "training_completed"
        | "restore_test_logged"
        | "policy_signed"
        | "framework_version_change"
        | "incident_logged"
        | "help_requested"
        | "interview_completed"
      >(),
    controlId: text("control_id"),
    evidenceSha256: text("evidence_sha256"),
    verdict: text("verdict"),
    actor: text("actor").notNull(),
    modelId: text("model_id"),
    promptVersion: text("prompt_version"),
    metadata: text("metadata"),
    prevHash: text("prev_hash").notNull(),
    entryHash: text("entry_hash").notNull(),
    externalTimestamp: text("external_timestamp"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("ledger_entries_org_seq_unique").on(table.orgId, table.seq)],
);

// Incident flows (Phase 8b). One row per reported incident; the Texas §521 breach clock is derived
// from discoveredAt + affectedTexasResidents at read time and never stored, so a corrected count or
// date recomputes every deadline.
export const incidents = sqliteTable(
  "incidents",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().$type<"wire_fraud" | "hacked_email" | "ransomware">(),
    // Calendar date (YYYY-MM-DD) the business determined the incident occurred; the statutory
    // clocks run from this date.
    discoveredAt: text("discovered_at").notNull(),
    affectedTexasResidents: integer("affected_texas_residents"),
    status: text("status").notNull().$type<"open" | "contained" | "closed">().default("open"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("incidents_org_idx").on(table.orgId)],
);

// Human follow-up queue for KOITECC reviewers: the "get help" taps from the incident and scam
// flows land here. detail is a JSON blob of redacted context only (never the raw message).
export const reviewerTasks = sqliteTable(
  "reviewer_tasks",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().$type<"incident_help" | "scam_escalation" | "general_help">(),
    status: text("status").notNull().$type<"open" | "in_progress" | "closed">().default("open"),
    summary: text("summary").notNull(),
    detail: text("detail"),
    relatedIncidentId: text("related_incident_id").references(() => incidents.id, {
      onDelete: "set null",
    }),
    requestedByUserId: text("requested_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("reviewer_tasks_org_idx").on(table.orgId)],
);

// Conversational gap-assessment interviews (Phase 9). An interview walks the owner through one
// control family and records a per-practice readiness finding. Kept separate from submissions so
// the evidence reviewer stays the only source of "accepted"; interview findings are self-reported
// (attested) or inferred, never evidence-backed. The transcript in interview_turns is the agent's
// durable state, so a session survives the owner closing the app and resumes days later.
export const interviews = sqliteTable(
  "interviews",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    framework: text("framework")
      .notNull()
      .$type<"cmmc" | "tdpsa" | "tx521" | "tac202">()
      .default("cmmc"),
    familyCode: text("family_code").notNull(),
    level: integer("level").notNull().$type<1 | 2>(),
    status: text("status").notNull().$type<"active" | "completed" | "abandoned">().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("interviews_org_idx").on(table.orgId)],
);

export const interviewTurns = sqliteTable(
  "interview_turns",
  {
    id: text("id").primaryKey(),
    interviewId: text("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    // Per-interview 1-based order. Timestamps can tie when a user+assistant pair is written in the
    // same millisecond (the mock has no model latency between them), so transcript order reads seq.
    seq: integer("seq").notNull(),
    role: text("role").notNull().$type<"assistant" | "user">(),
    content: text("content").notNull(),
    // JSON snapshot of the findings this assistant turn proposed; null on user turns.
    proposedFindings: text("proposed_findings"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("interview_turns_interview_idx").on(table.interviewId)],
);

// Append-only: the latest finding per (org, practice) wins, so the history stays auditable. source
// records whether the owner explicitly attested the control is in place or the finding was inferred.
export const interviewFindings = sqliteTable(
  "interview_findings",
  {
    id: text("id").primaryKey(),
    interviewId: text("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    practiceId: text("practice_id").notNull(),
    status: text("status").notNull().$type<"met" | "not_met" | "unclear">(),
    source: text("source").notNull().$type<"attested" | "inferred">(),
    rationale: text("rationale").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("interview_findings_org_idx").on(table.orgId),
    index("interview_findings_interview_idx").on(table.interviewId),
  ],
);

export type OrganizationRow = typeof organizations.$inferSelect;
export type NewOrganizationRow = typeof organizations.$inferInsert;
export type SubmissionRow = typeof submissions.$inferSelect;
export type NewSubmissionRow = typeof submissions.$inferInsert;
export type EvidenceFileRow = typeof evidenceFiles.$inferSelect;
export type NewEvidenceFileRow = typeof evidenceFiles.$inferInsert;
export type ReviewRow = typeof reviews.$inferSelect;
export type NewReviewRow = typeof reviews.$inferInsert;
export type RadarProfileRow = typeof radarProfiles.$inferSelect;
export type NewRadarProfileRow = typeof radarProfiles.$inferInsert;
export type RadarDecisionRow = typeof radarDecisions.$inferSelect;
export type NewRadarDecisionRow = typeof radarDecisions.$inferInsert;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
export type FrameworkEnrollmentRow = typeof frameworkEnrollments.$inferSelect;
export type NewFrameworkEnrollmentRow = typeof frameworkEnrollments.$inferInsert;
export type LedgerEntryRow = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntryRow = typeof ledgerEntries.$inferInsert;
export type LedgerEntryType = LedgerEntryRow["type"];
export type IncidentRow = typeof incidents.$inferSelect;
export type NewIncidentRow = typeof incidents.$inferInsert;
export type IncidentKind = IncidentRow["kind"];
export type IncidentStatus = IncidentRow["status"];
export type ReviewerTaskRow = typeof reviewerTasks.$inferSelect;
export type NewReviewerTaskRow = typeof reviewerTasks.$inferInsert;
export type ReviewerTaskKind = ReviewerTaskRow["kind"];
export type ReviewerTaskStatus = ReviewerTaskRow["status"];
export type InterviewRow = typeof interviews.$inferSelect;
export type NewInterviewRow = typeof interviews.$inferInsert;
export type InterviewStatus = InterviewRow["status"];
export type InterviewTurnRow = typeof interviewTurns.$inferSelect;
export type NewInterviewTurnRow = typeof interviewTurns.$inferInsert;
export type InterviewTurnRole = InterviewTurnRow["role"];
export type InterviewFindingRow = typeof interviewFindings.$inferSelect;
export type NewInterviewFindingRow = typeof interviewFindings.$inferInsert;
export type InterviewFindingStatus = InterviewFindingRow["status"];
export type InterviewFindingSource = InterviewFindingRow["source"];

export type SubmissionStatus = SubmissionRow["status"];
export type ReviewVerdictValue = ReviewRow["verdict"];
export type EmployeeCountBucket = OrganizationRow["employeeCount"];
export type ItSetup = OrganizationRow["itSetup"];
