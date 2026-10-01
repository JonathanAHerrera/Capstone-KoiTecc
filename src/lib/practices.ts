import { z } from "zod";
import practicesJson from "@/data/cmmc-practices.json";
import {
  CANONICAL_FAMILY_ORDER,
  EVIDENCE_KINDS,
  FAMILY_NAMES,
  type CmmcLevel,
  type Practice,
  type PracticeFamily,
} from "@/lib/practice-types";

const PracticeSchema = z.object({
  id: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2)]),
  family: z.string().min(1),
  familyName: z.string().min(1),
  nist171Ref: z.string(),
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

function loadPracticeCatalog(): Practice[] {
  const parsed = z.array(PracticeSchema).safeParse(practicesJson);
  if (!parsed.success) {
    throw new Error(
      `src/data/cmmc-practices.json failed validation: ${parsed.error.message}`,
    );
  }
  const seenIds = new Set<string>();
  for (const practice of parsed.data) {
    if (seenIds.has(practice.id)) {
      throw new Error(`Duplicate practice id in catalog: ${practice.id}`);
    }
    seenIds.add(practice.id);
  }
  return parsed.data as Practice[];
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

export function getAllPractices(): Practice[] {
  return [...allPractices].sort(comparePracticesByFamilyThenCatalogOrder);
}

export function getPractice(practiceId: string): Practice | undefined {
  return practicesById.get(practiceId);
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
