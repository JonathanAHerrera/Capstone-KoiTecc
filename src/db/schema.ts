import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetLevel: integer("target_level").notNull().$type<1 | 2>(),
  handlesCui: integer("handles_cui", { mode: "boolean" }).notNull(),
  employeeCount: text("employee_count").notNull().$type<"1-10" | "11-50" | "51-250" | "250+">(),
  itSetup: text("it_setup").notNull().$type<"cloud" | "onprem" | "mixed" | "unsure">(),
  hasItProvider: integer("has_it_provider", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
});

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    practiceId: text("practice_id").notNull(),
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

export type SubmissionStatus = SubmissionRow["status"];
export type ReviewVerdictValue = ReviewRow["verdict"];
export type EmployeeCountBucket = OrganizationRow["employeeCount"];
export type ItSetup = OrganizationRow["itSetup"];
