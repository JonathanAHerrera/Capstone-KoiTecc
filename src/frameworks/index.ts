import { FRAMEWORK_ORDER, FRAMEWORKS, type FrameworkId } from "@/lib/practice-types";
import type { FrameworkDefinition } from "@/frameworks/types";

export type {
  Applicability,
  ControlDefinition,
  ExportKind,
  ExportStyle,
  FrameworkDefinition,
  GroupingStrategy,
  Industry,
  OrgProfile,
  SafeguardKind,
  ScoringStrategy,
  ThreatTag,
  VerificationMethod,
} from "@/frameworks/types";

// The default (baseline) framework. CMMC is always enabled and owns the bespoke /path experience.
export const DEFAULT_FRAMEWORK_ID: FrameworkId = "cmmc";

const SPRS_MAX = 110;
const SPRS_MIN = -203;

// Fields shared by every Texas track; only id-derived routes/filenames differ.
function texasTrackDefinition(id: Exclude<FrameworkId, "cmmc">): FrameworkDefinition {
  const meta = FRAMEWORKS[id];
  return {
    id,
    name: meta.shortName,
    fullName: meta.fullName,
    jurisdiction: meta.jurisdiction,
    tagline: meta.tagline,
    disclaimer: meta.disclaimer,
    grouping: "catalog",
    isLevelScoped: false,
    hasDedicatedRoutes: false,
    homeRoute: `/track/${id}`,
    summaryRoute: `/summary/${id}`,
    canDisable: true,
    scoring: { kind: "percent" },
    exports: ["markdown"],
    exportStyle: "generic",
    exportFileName: `${id}-readiness-summary.md`,
  };
}

const cmmcDefinition: FrameworkDefinition = {
  id: "cmmc",
  name: FRAMEWORKS.cmmc.shortName,
  fullName: FRAMEWORKS.cmmc.fullName,
  jurisdiction: FRAMEWORKS.cmmc.jurisdiction,
  tagline: FRAMEWORKS.cmmc.tagline,
  disclaimer: FRAMEWORKS.cmmc.disclaimer,
  grouping: "nist-family",
  isLevelScoped: true,
  hasDedicatedRoutes: true,
  homeRoute: "/path",
  summaryRoute: "/summary",
  canDisable: false,
  scoring: { kind: "sprs", max: SPRS_MAX, min: SPRS_MIN },
  exports: ["markdown", "poam"],
  exportStyle: "cmmc",
  exportFileName: "cmmc-readiness-package.md",
};

export const FRAMEWORK_DEFINITIONS: Readonly<Record<FrameworkId, FrameworkDefinition>> = {
  cmmc: cmmcDefinition,
  tdpsa: texasTrackDefinition("tdpsa"),
  tx521: texasTrackDefinition("tx521"),
  tac202: texasTrackDefinition("tac202"),
};

export function getFramework(id: FrameworkId): FrameworkDefinition {
  return FRAMEWORK_DEFINITIONS[id];
}

// All framework ids in canonical order (CMMC first).
export function listFrameworkIds(): readonly FrameworkId[] {
  return FRAMEWORK_ORDER;
}

export function listFrameworks(): FrameworkDefinition[] {
  return FRAMEWORK_ORDER.map((id) => FRAMEWORK_DEFINITIONS[id]);
}

// Narrow an untrusted string (route param, query string) to a known framework id.
export function parseFrameworkId(value: string | null | undefined): FrameworkId | null {
  return value != null && FRAMEWORK_ORDER.includes(value as FrameworkId)
    ? (value as FrameworkId)
    : null;
}

export function isDefaultFramework(id: FrameworkId): boolean {
  return id === DEFAULT_FRAMEWORK_ID;
}
