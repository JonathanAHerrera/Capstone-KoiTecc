import { z } from "zod";
import cmmcPracticesJson from "@/data/cmmc-practices.json";
import tdpsaRequirementsJson from "@/data/tdpsa-requirements.json";
import tx521RequirementsJson from "@/data/tx521-requirements.json";
import tac202RequirementsJson from "@/data/tac202-requirements.json";
import {
  CANONICAL_FAMILY_ORDER,
  EVIDENCE_KINDS,
  FAMILY_NAMES,
  FRAMEWORK_ORDER,
  frameworkForPractice,
  resolveGroup,
  type CmmcLevel,
  type FrameworkId,
  type Practice,
  type PracticeFamily,
} from "@/lib/practice-types";
import { DEFAULT_FRAMEWORK_ID, getFramework } from "@/frameworks";

const PracticeSchema = z.object({
  id: z.string().min(1),
  // Optional so the original CMMC catalog validates unchanged; normalized to "cmmc" on load.
  framework: z.enum(FRAMEWORK_ORDER as unknown as [string, ...string[]]).optional(),
  level: z.union([z.literal(1), z.literal(2)]),
  family: z.string().min(1),
  familyName: z.string().min(1),
  groupCode: z.string().min(1).optional(),
  groupName: z.string().min(1).optional(),
  nist171Ref: z.string(),
  legalRef: z.string().optional(),
  title: z.string().min(1),
  officialText: z.string(),
  plainEnglish: z.string(),
  assessmentObjectives: z.array(z.string()),
  whyItMatters: z.string(),
  evidenceTypes: z.array(z.enum(EVIDENCE_KINDS as [string, ...string[]])),
  evidenceExamples: z.array(z.string()),
  aiVerifiable: z.enum(["full", "partial", "none"]),
  aiReviewGuidance: z.string(),
  commonFailures: z.array(z.string()),
  estimatedEffortMinutes: z.number().int().nonnegative(),
  pointValue: z.number().int(),
});

function parseCatalogFile(sourceName: string, json: unknown): Practice[] {
  const parsed = z.array(PracticeSchema).safeParse(json);
  if (!parsed.success) {
    throw new Error(`${sourceName} failed validation: ${parsed.error.message}`);
  }
  return parsed.data as Practice[];
}

// Merge the federal CMMC catalog with the additive Texas frameworks. Requirement IDs are
// globally namespaced (TDPSA-*, TX521-*, TAC202-*), so the single duplicate-ID guard also
// guarantees cross-framework uniqueness and keeps the submissions UNIQUE(orgId, practiceId) valid.
function loadPracticeCatalog(): Practice[] {
  const merged: Practice[] = [
    ...parseCatalogFile("src/data/cmmc-practices.json", cmmcPracticesJson),
    ...parseCatalogFile("src/data/tdpsa-requirements.json", tdpsaRequirementsJson),
    ...parseCatalogFile("src/data/tx521-requirements.json", tx521RequirementsJson),
    ...parseCatalogFile("src/data/tac202-requirements.json", tac202RequirementsJson),
  ];
  const seenIds = new Set<string>();
  for (const practice of merged) {
    if (seenIds.has(practice.id)) {
      throw new Error(`Duplicate practice id in catalog: ${practice.id}`);
    }
    seenIds.add(practice.id);
  }
  return merged;
}

const allPractices: Practice[] = loadPracticeCatalog();
const practicesById: ReadonlyMap<string, Practice> = new Map(
  allPractices.map((practice) => [practice.id, practice]),
);
// The catalog lists practices in official order; sorting ids as strings would put "ix" before "viii".
const catalogIndexById: ReadonlyMap<string, number> = new Map(
  allPractices.map((practice, catalogIndex) => [practice.id, catalogIndex]),
);

function familySortRank(familyCode: string): number {
  const rank = CANONICAL_FAMILY_ORDER.indexOf(familyCode);
  return rank === -1 ? CANONICAL_FAMILY_ORDER.length : rank;
}

function comparePracticesByFamilyThenCatalogOrder(left: Practice, right: Practice): number {
  const familyDifference = familySortRank(left.family) - familySortRank(right.family);
  if (familyDifference !== 0) return familyDifference;
  if (left.level !== right.level) return left.level - right.level;
  return (catalogIndexById.get(left.id) ?? 0) - (catalogIndexById.get(right.id) ?? 0);
}

function cmmcPractices(): Practice[] {
  return allPractices.filter((practice) => frameworkForPractice(practice) === DEFAULT_FRAMEWORK_ID);
}

// CMMC-only. Several callers assume this returns the entire CMMC universe, so it must not
// include the additive Texas frameworks.
export function getAllPractices(): Practice[] {
  return cmmcPractices().sort(comparePracticesByFamilyThenCatalogOrder);
}

export function getPractice(practiceId: string): Practice | undefined {
  return practicesById.get(practiceId);
}

export function getFrameworkForPractice(practiceId: string): FrameworkId | undefined {
  const practice = practicesById.get(practiceId);
  return practice ? frameworkForPractice(practice) : undefined;
}

export function getPracticesForLevel(level: CmmcLevel): Practice[] {
  return getAllPractices().filter((practice) => practice.level <= level);
}

export function getFamilies(level: CmmcLevel): PracticeFamily[] {
  const familiesByCode = new Map<string, PracticeFamily>();
  for (const practice of getPracticesForLevel(level)) {
    const existingFamily = familiesByCode.get(practice.family);
    if (existingFamily) {
      existingFamily.practices.push(practice);
      continue;
    }
    familiesByCode.set(practice.family, {
      code: practice.family,
      name: practice.familyName || FAMILY_NAMES[practice.family] || practice.family,
      practices: [practice],
    });
  }
  return [...familiesByCode.values()].sort(
    (left, right) => familySortRank(left.code) - familySortRank(right.code),
  );
}

export function getPracticeCountForLevel(level: CmmcLevel): number {
  return getPracticesForLevel(level).length;
}

// Framework-aware accessors. CMMC keeps its NIST-family ordering; Texas frameworks preserve the
// order their JSON catalog lists groups in.
export function getPracticesForFramework(framework: FrameworkId): Practice[] {
  const practices = allPractices.filter(
    (practice) => frameworkForPractice(practice) === framework,
  );
  if (getFramework(framework).grouping === "nist-family") {
    return practices.sort(comparePracticesByFamilyThenCatalogOrder);
  }
  return practices.sort(
    (left, right) => (catalogIndexById.get(left.id) ?? 0) - (catalogIndexById.get(right.id) ?? 0),
  );
}

export function getGroupsForFramework(framework: FrameworkId): PracticeFamily[] {
  const groupsByCode = new Map<string, PracticeFamily>();
  for (const practice of getPracticesForFramework(framework)) {
    const group = resolveGroup(practice);
    const existingGroup = groupsByCode.get(group.code);
    if (existingGroup) {
      existingGroup.practices.push(practice);
      continue;
    }
    groupsByCode.set(group.code, {
      code: group.code,
      name: group.name,
      practices: [practice],
    });
  }
  if (getFramework(framework).grouping === "nist-family") {
    return [...groupsByCode.values()].sort(
      (left, right) => familySortRank(left.code) - familySortRank(right.code),
    );
  }
  return [...groupsByCode.values()];
}
