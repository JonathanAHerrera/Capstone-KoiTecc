import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb, nowIsoTimestamp } from "@/db/client";
import { radarDecisions, radarProfiles, type RadarDecisionRow } from "@/db/schema";
import { requireOrganization } from "@/lib/org";
import { RADAR_INDUSTRIES, type RadarDecisionValue, type RadarProfile } from "./types";

export const RadarProfileInputSchema = z.object({
  industries: z.array(z.enum(RADAR_INDUSTRIES)).min(1, "Choose at least one industry"),
  naicsCodes: z.array(z.string().trim().regex(/^\d{2,6}$/, "NAICS codes must contain 2 to 6 digits")).max(12),
  keywords: z.array(z.string().trim().min(2).max(80)).max(24),
  technologies: z.array(z.string().trim().min(2).max(100)).max(40),
  governmentContractor: z.boolean(),
  handlesSensitiveData: z.boolean(),
  texasOperations: z.boolean(),
});

export type RadarProfileInput = z.infer<typeof RadarProfileInputSchema>;

function parseStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function getRadarProfile(): Promise<RadarProfile | null> {
  const organization = await requireOrganization();
  const db = await getDb();
  const rows = await db.select().from(radarProfiles).where(eq(radarProfiles.orgId, organization.id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    orgId: row.orgId,
    industries: parseStringArray(row.industries).filter((value): value is RadarProfile["industries"][number] =>
      (RADAR_INDUSTRIES as readonly string[]).includes(value),
    ),
    naicsCodes: parseStringArray(row.naicsCodes),
    keywords: parseStringArray(row.keywords),
    technologies: parseStringArray(row.technologies),
    governmentContractor: row.governmentContractor,
    handlesSensitiveData: row.handlesSensitiveData,
    texasOperations: row.texasOperations,
    updatedAt: row.updatedAt,
  };
}

export async function saveRadarProfile(input: RadarProfileInput): Promise<RadarProfile> {
  const organization = await requireOrganization();
  const parsed = RadarProfileInputSchema.parse(input);
  const updatedAt = nowIsoTimestamp();
  const values = {
    orgId: organization.id,
    industries: JSON.stringify(parsed.industries),
    naicsCodes: JSON.stringify(parsed.naicsCodes),
    keywords: JSON.stringify(parsed.keywords),
    technologies: JSON.stringify(parsed.technologies),
    governmentContractor: parsed.governmentContractor,
    handlesSensitiveData: parsed.handlesSensitiveData,
    texasOperations: parsed.texasOperations,
    updatedAt,
  };
  const db = await getDb();
  await db.insert(radarProfiles).values(values).onConflictDoUpdate({
    target: radarProfiles.orgId,
    set: values,
  });
  return { ...parsed, orgId: organization.id, updatedAt };
}

export async function listRadarDecisions(): Promise<RadarDecisionRow[]> {
  const organization = await requireOrganization();
  const db = await getDb();
  return db.select().from(radarDecisions).where(eq(radarDecisions.orgId, organization.id));
}

export async function saveRadarDecision(input: {
  itemId: string;
  decision: RadarDecisionValue;
  rationale: string;
  reviewer: string;
  sourceTitle: string;
  sourceUrl: string;
}): Promise<RadarDecisionRow> {
  const organization = await requireOrganization();
  const values: RadarDecisionRow = {
    id: nanoid(),
    orgId: organization.id,
    itemId: input.itemId.slice(0, 300),
    decision: input.decision,
    rationale: input.rationale.trim().slice(0, 2000),
    reviewer: input.reviewer.trim().slice(0, 200) || "Organization owner",
    sourceTitle: input.sourceTitle.trim().slice(0, 500),
    sourceUrl: input.sourceUrl.trim().slice(0, 2000),
    decidedAt: nowIsoTimestamp(),
  };
  const db = await getDb();
  await db.insert(radarDecisions).values(values).onConflictDoUpdate({
    target: [radarDecisions.orgId, radarDecisions.itemId],
    set: {
      decision: values.decision,
      rationale: values.rationale,
      reviewer: values.reviewer,
      sourceTitle: values.sourceTitle,
      sourceUrl: values.sourceUrl,
      decidedAt: values.decidedAt,
    },
  });
  return values;
}
