export const RADAR_INDUSTRIES = [
  "manufacturing",
  "construction",
  "technology",
  "healthcare",
  "professional_services",
  "energy",
  "retail_hospitality",
  "other",
] as const;

export type RadarIndustry = (typeof RADAR_INDUSTRIES)[number];
export type RadarUpdateType = "binding_requirement" | "proposed_requirement" | "framework_update" | "active_threat";
export type RadarDecisionValue = "applies" | "does_not_apply" | "expert_review" | "track" | "accepted_risk";

export type RadarProfile = {
  orgId: string;
  industries: RadarIndustry[];
  naicsCodes: string[];
  keywords: string[];
  technologies: string[];
  governmentContractor: boolean;
  handlesSensitiveData: boolean;
  texasOperations: boolean;
  updatedAt: string;
};

export type RadarItem = {
  id: string;
  source: "Federal Register" | "CISA KEV" | "Texas Register" | "NIST OSCAL";
  updateType: RadarUpdateType;
  title: string;
  summary: string;
  publishedAt: string;
  effectiveAt?: string;
  url: string;
  agency?: string;
  relevanceScore: number;
  relevanceReasons: string[];
  impact: {
    plainEnglish: string;
    mayApplyTo: string;
    changeSummary: string;
    affectedAreas: string[];
    effort: "Low" | "Medium" | "High";
    recommendedTasks: string[];
  };
};

export type RadarSourceStatus = {
  source: RadarItem["source"];
  ok: boolean;
  message: string;
};

export type RadarFeed = {
  items: RadarItem[];
  sourceStatuses: RadarSourceStatus[];
  refreshedAt: string;
};
