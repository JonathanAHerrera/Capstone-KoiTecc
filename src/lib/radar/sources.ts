import type { RadarFeed, RadarItem, RadarProfile, RadarSourceStatus, RadarUpdateType } from "./types";

const REQUEST_TIMEOUT_MS = 8_000;
const USER_AGENT = "CMMC-Ready-Policy-Radar/1.0";
const SOURCE_CACHE_MS = 60 * 60 * 1_000;

type UnscoredRadarItem = Omit<RadarItem, "relevanceScore" | "relevanceReasons" | "impact">;
let cisaMemoryCache: { expiresAt: number; items: UnscoredRadarItem[] } | undefined;

const INDUSTRY_TERMS: Record<RadarProfile["industries"][number], string[]> = {
  manufacturing: ["manufactur", "industrial", "supply chain", "factory"],
  construction: ["construction", "contractor", "infrastructure", "building"],
  technology: ["software", "technology", "cyber", "information system", "artificial intelligence"],
  healthcare: ["health", "medical", "patient", "hipaa"],
  professional_services: ["professional service", "consult", "accounting", "legal"],
  energy: ["energy", "oil", "gas", "electric", "pipeline"],
  retail_hospitality: ["retail", "hospitality", "restaurant", "consumer"],
  other: [],
};

function cleanText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMarkdown(value: string | null | undefined): string {
  return cleanText(
    (value ?? "")
      .replace(/^\s*#{1,6}\s*(summary|what(?:'|’)s changed)\s*$/gim, " ")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^\s*#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "; ")
      .replace(/\*\*|__|`/g, "")
      .replace(/\s+by\s+@[\w-]+/gi, "")
      .replace(/\s+in\s+https?:\/\/\S+/gi, "")
      .replace(/https?:\/\/\S+/g, ""),
  )
    .replace(/^;\s*/, "")
    .replace(/\.\s*;/g, ";")
    .replace(/\s*;\s*/g, "; ");
}

function excerpt(value: string, maximumLength = 440): string {
  if (value.length <= maximumLength) return value;
  const shortened = value.slice(0, maximumLength + 1);
  const lastBoundary = Math.max(shortened.lastIndexOf(". "), shortened.lastIndexOf("; "), shortened.lastIndexOf(" "));
  return `${shortened.slice(0, lastBoundary > maximumLength * 0.7 ? lastBoundary + 1 : maximumLength).trim()}...`;
}

function safeIsoDate(value: string | null | undefined): string {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function scoreItem(item: UnscoredRadarItem, profile: RadarProfile | null): RadarItem {
  const impact = buildImpact(item, profile);
  if (!profile) {
    return { ...item, impact, relevanceScore: 20, relevanceReasons: ["Complete your company profile for a tailored match."] };
  }

  const corpus = `${item.title} ${item.summary} ${item.agency ?? ""}`.toLowerCase();
  const reasons: string[] = [];
  let score = 5;

  if (profile.texasOperations && item.source === "Texas Register") {
    score += 35;
    reasons.push("Your profile says the company operates in Texas.");
  }
  if (profile.governmentContractor && /defen|federal|contract|procurement|cmmc|nist/.test(corpus)) {
    score += 35;
    reasons.push("This mentions federal contracting, defense, or a related standard.");
  }
  if (profile.handlesSensitiveData && /cyber|privacy|data|information|security|breach/.test(corpus)) {
    score += 25;
    reasons.push("This concerns security, privacy, or protected information.");
  }

  const industryMatch = profile.industries.find((industry) => INDUSTRY_TERMS[industry].some((term) => corpus.includes(term)));
  if (industryMatch) {
    score += 25;
    reasons.push(`This appears related to your ${industryMatch.replaceAll("_", " ")} industry selection.`);
  }

  const matchedKeyword = profile.keywords.find((keyword) => corpus.includes(keyword.toLowerCase()));
  if (matchedKeyword) {
    score += 25;
    reasons.push(`Matched your watch term “${matchedKeyword}”.`);
  }

  const matchedTechnology = profile.technologies.find((technology) => corpus.includes(technology.toLowerCase()));
  if (matchedTechnology) {
    score += 55;
    reasons.push(`Matched technology in your inventory: ${matchedTechnology}.`);
  } else if (item.updateType === "active_threat" && profile.technologies.length === 0) {
    score += 20;
    reasons.push("Add your software and hardware to determine whether this active threat applies.");
  }

  if (item.updateType === "binding_requirement") score += 10;
  return { ...item, impact, relevanceScore: Math.min(score, 100), relevanceReasons: reasons.length > 0 ? reasons : ["No direct profile match found; keep under watch if it affects a customer or vendor."] };
}

function buildImpact(item: UnscoredRadarItem, profile: RadarProfile | null): RadarItem["impact"] {
  const corpus = `${item.title} ${item.summary}`.toLowerCase();
  const technologyMatches = profile?.technologies.filter((technology) => corpus.includes(technology.toLowerCase())) ?? [];
  const affectedAreas = [
    ...technologyMatches,
    ...(/privacy|personal|consumer|patient|data/.test(corpus) ? ["Data handling and privacy"] : []),
    ...(/contract|procurement|acquisition|cmmc/.test(corpus) ? ["Contracts and customer requirements"] : []),
    ...(/cyber|security|vulnerab|cve|exploit/.test(corpus) ? ["Security operations and technology"] : []),
    ...(/employee|workforce|labor/.test(corpus) ? ["Workforce policies"] : []),
  ];
  const uniqueAreas = [...new Set(affectedAreas)];
  if (uniqueAreas.length === 0) uniqueAreas.push("Governance and business policies");

  const typeCopy: Record<RadarUpdateType, Pick<RadarItem["impact"], "plainEnglish" | "changeSummary" | "effort" | "recommendedTasks">> = {
    binding_requirement: {
      plainEnglish: "An agency has published a final rule or requirement. Confirm its scope and effective date before changing company controls.",
      changeSummary: "The source feed identifies a final rule. Compare the official text with the policies and contract terms you currently follow.",
      effort: "High",
      recommendedTasks: ["Assign an owner to confirm applicability", "Compare the official text with current policy", "Create dated remediation tasks if it applies"],
    },
    proposed_requirement: {
      plainEnglish: "An agency is considering a change. It belongs in planning, but should not be treated as a current obligation.",
      changeSummary: "The proposal may change before adoption. Record likely impact and monitor the docket for the final version.",
      effort: "Low",
      recommendedTasks: ["Read the proposal and comment deadline", "Estimate likely operational impact", "Track the docket for a final rule"],
    },
    framework_update: {
      plainEnglish: "A standards or guidance source has changed. Review the release before updating internal controls or evidence requirements.",
      changeSummary: "The feed announces a new publication or release. Use the official source to compare it with the version your company currently uses.",
      effort: "Medium",
      recommendedTasks: ["Record the version currently in use", "Compare changed controls or guidance", "Approve any policy or evidence updates"],
    },
    active_threat: {
      plainEnglish: "CISA reports that attackers are actively exploiting this vulnerability. Check the technology inventory and vendor guidance promptly.",
      changeSummary: "This is a newly tracked operational threat, not a change to a compliance framework.",
      effort: technologyMatches.length > 0 ? "High" : "Medium",
      recommendedTasks: ["Check whether the product and affected version are in use", "Review vendor remediation guidance", "Document patching, mitigation, or non-applicability"],
    },
  };
  const base = typeCopy[item.updateType];
  const mayApplyTo = item.source === "Texas Register"
    ? "Organizations operating in Texas whose activities fall within the agencies and subjects in this issue."
    : item.updateType === "active_threat"
      ? "Organizations using the named vendor, product, or affected version."
      : "Organizations covered by the issuing agency, rule scope, customer contract, or referenced standard.";
  return { ...base, mayApplyTo, affectedAreas: uniqueAreas.slice(0, 4) };
}

async function fetchFederalRegister(): Promise<UnscoredRadarItem[]> {
  const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
  url.searchParams.set("per_page", "18");
  url.searchParams.set("order", "newest");
  for (const agency of ["defense-department", "homeland-security-department", "commerce-department", "small-business-administration"]) {
    url.searchParams.append("conditions[agencies][]", agency);
  }
  url.searchParams.append("conditions[type][]", "RULE");
  url.searchParams.append("conditions[type][]", "PRORULE");

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`Federal Register returned ${response.status}`);
  const data = (await response.json()) as { results?: Array<Record<string, unknown>> };
  return (data.results ?? []).map((document) => {
    const documentType = String(document.type ?? "");
    const updateType: RadarUpdateType = documentType === "Rule" ? "binding_requirement" : "proposed_requirement";
    const agencies = Array.isArray(document.agencies)
      ? document.agencies.map((agency) => (typeof agency === "object" && agency ? String((agency as { name?: unknown }).name ?? "") : "")).filter(Boolean)
      : [];
    return {
      id: `federal-register:${String(document.document_number ?? document.title ?? "unknown")}`,
      source: "Federal Register",
      updateType,
      title: cleanText(String(document.title ?? "Untitled federal document")),
      summary: excerpt(cleanText(String(document.abstract ?? document.excerpts ?? "Review the official document for details."))),
      publishedAt: safeIsoDate(String(document.publication_date ?? "")),
      effectiveAt: document.effective_on ? safeIsoDate(String(document.effective_on)) : undefined,
      url: String(document.html_url ?? document.pdf_url ?? "https://www.federalregister.gov/"),
      agency: agencies.join(", "),
    };
  });
}

async function fetchCisaKev(): Promise<UnscoredRadarItem[]> {
  if (cisaMemoryCache && cisaMemoryCache.expiresAt > Date.now()) return cisaMemoryCache.items;
  const response = await fetch("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`CISA KEV returned ${response.status}`);
  const data = (await response.json()) as { vulnerabilities?: Array<Record<string, unknown>> };
  const items: UnscoredRadarItem[] = (data.vulnerabilities ?? [])
    .sort((left, right) => String(right.dateAdded ?? "").localeCompare(String(left.dateAdded ?? "")))
    .slice(0, 20).map((vulnerability) => ({
    id: `cisa-kev:${String(vulnerability.cveID ?? "unknown")}`,
    source: "CISA KEV",
    updateType: "active_threat",
    title: `${String(vulnerability.cveID ?? "CVE")} · ${cleanText(String(vulnerability.vulnerabilityName ?? "Known exploited vulnerability"))}`,
    summary: excerpt(cleanText(`${String(vulnerability.vendorProject ?? "")} ${String(vulnerability.product ?? "")}. ${String(vulnerability.shortDescription ?? "")} Required action: ${String(vulnerability.requiredAction ?? "Review vendor guidance.")}`), 520),
    publishedAt: safeIsoDate(String(vulnerability.dateAdded ?? "")),
    effectiveAt: vulnerability.dueDate ? safeIsoDate(String(vulnerability.dueDate)) : undefined,
    url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    agency: "Cybersecurity and Infrastructure Security Agency",
  }));
  cisaMemoryCache = { expiresAt: Date.now() + SOURCE_CACHE_MS, items };
  return items;
}

async function fetchTexasRegister(): Promise<UnscoredRadarItem[]> {
  const response = await fetch("https://www.sos.state.tx.us/texreg/texreg.xml", {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Texas Register returned ${response.status}`);
  const xml = await response.text();
  const entries = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8);
  return entries.map((entry, index) => {
    const block = entry[1];
    const valueOf = (tag: string) => cleanText(block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]);
    const title = valueOf("title") || "Texas Register update";
    const description = valueOf("description") || "A new Texas Register issue is available with proposed, adopted, withdrawn, and emergency rule actions.";
    const classificationText = `${title} ${description}`.toLowerCase();
    const updateType: RadarUpdateType = /adopted|emergency/.test(classificationText) ? "binding_requirement" : "proposed_requirement";
    const url = valueOf("link") || "https://www.sos.state.tx.us/texreg/index.shtml";
    return {
      id: `texas-register:${valueOf("guid") || url || index}`,
      source: "Texas Register",
      updateType,
      title,
      summary: excerpt(description),
      publishedAt: safeIsoDate(valueOf("pubDate")),
      url,
      agency: "Texas Secretary of State",
    };
  });
}

async function fetchNistOscal(): Promise<UnscoredRadarItem[]> {
  const response = await fetch("https://api.github.com/repos/usnistgov/OSCAL/releases?per_page=5", {
    headers: { "User-Agent": USER_AGENT, Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`NIST OSCAL releases returned ${response.status}`);
  const releases = (await response.json()) as Array<Record<string, unknown>>;
  return releases.map((release) => ({
    id: `nist-oscal:${String(release.id ?? release.tag_name ?? "unknown")}`,
    source: "NIST OSCAL",
    updateType: "framework_update",
    title: `NIST OSCAL ${cleanText(String(release.name ?? release.tag_name ?? "release"))}`,
    summary: excerpt(cleanMarkdown(String(release.body ?? "Updated machine-readable security control models and tooling."))),
    publishedAt: safeIsoDate(String(release.published_at ?? release.created_at ?? "")),
    url: String(release.html_url ?? "https://pages.nist.gov/OSCAL/"),
    agency: "National Institute of Standards and Technology",
  }));
}

const SOURCES = [
  { name: "Federal Register" as const, fetchItems: fetchFederalRegister },
  { name: "CISA KEV" as const, fetchItems: fetchCisaKev },
  { name: "Texas Register" as const, fetchItems: fetchTexasRegister },
  { name: "NIST OSCAL" as const, fetchItems: fetchNistOscal },
];

export async function getRadarFeed(profile: RadarProfile | null): Promise<RadarFeed> {
  const settled = await Promise.allSettled(SOURCES.map((source) => source.fetchItems()));
  const items: RadarItem[] = [];
  const sourceStatuses: RadarSourceStatus[] = [];

  settled.forEach((result, index) => {
    const source = SOURCES[index];
    if (result.status === "fulfilled") {
      items.push(...result.value.map((item) => scoreItem(item, profile)));
      sourceStatuses.push({ source: source.name, ok: true, message: `${result.value.length} current items loaded` });
    } else {
      sourceStatuses.push({ source: source.name, ok: false, message: result.reason instanceof Error ? result.reason.message : "Source unavailable" });
    }
  });

  items.sort((left, right) => right.relevanceScore - left.relevanceScore || right.publishedAt.localeCompare(left.publishedAt));
  return { items: items.slice(0, 30), sourceStatuses, refreshedAt: new Date().toISOString() };
}
