import { narrateValueEstimate } from "@/ai/value-narration";
import { parseEnabledFrameworks, requireOrganization } from "@/lib/org";
import { getPracticesForLevel } from "@/lib/practices";
import type { CmmcLevel, FrameworkId } from "@/lib/practice-types";
import { computeProgressForFramework } from "@/lib/progress";
import { getBenchmark } from "@/lib/value-benchmarks";

export type ValueAudience = "dod" | "texas" | "both";

export type ValueDriverKind =
  | "contract_eligibility"
  | "consultant_savings"
  | "fine_exposure"
  | "breach_exposure"
  | "insurance_posture";

// A driver is "realized" as the framework that moves it fills in — so the money story tracks real
// progress instead of being a static brochure number.
export type ValueDriverStatus = "locked" | "in_progress" | "realized";

// A cited dollar range. `basis` is the one-line, source-aware explanation shown under the figure.
export type ValueAmount = { low: number; high: number; basis: string };

export type ValueDriver = {
  id: string;
  kind: ValueDriverKind;
  audience: ValueAudience;
  headline: string;
  plainEnglish: string;
  // null when the driver is about access or posture rather than a dollar figure (e.g. contract eligibility).
  amount: ValueAmount | null;
  status: ValueDriverStatus;
  source: string;
  href: string;
};

export type ValueEstimate = {
  drivers: ValueDriver[];
  // The one honest "money saved" figure: the outside readiness engagement you are doing yourself.
  // Exposure drivers (fines, breach losses) are shown per-driver, never summed into this, so the
  // number never implies you will "save" a penalty cap you were never going to pay.
  savingsLow: number;
  savingsHigh: number;
  // The savings portion already earned, scaled by CMMC accepted progress.
  savingsRealizedLow: number;
  savingsRealizedHigh: number;
  narration: string;
  isMockNarration: boolean;
};

export const VALUE_DISCLAIMER =
  "These are illustrative estimates built from published industry and statutory figures — not a quote, not legal or financial advice, and not a guarantee of savings, a contract award, or avoided penalties. Certification is granted only by a C3PAO.";

export type ValueEngineInput = {
  handlesCui: boolean;
  targetLevel: CmmcLevel;
  enabledFrameworks: FrameworkId[];
  handlesTexasResidentData: boolean;
  takesCardPayments: boolean;
  // Summed catalog effort (minutes) for the CMMC level — used to describe the DIY-hours basis.
  cmmcEffortMinutes: number;
  // Accepted percent (0–100) per enabled framework; absent frameworks are treated as 0.
  frameworkPercent: Partial<Record<FrameworkId, number>>;
};

function statusFromPercent(percent: number): ValueDriverStatus {
  if (percent <= 0) return "locked";
  if (percent >= 100) return "realized";
  return "in_progress";
}

// Pure core: turn the org profile + live progress into cited value drivers. Deterministic, no DB,
// no API key, unit-testable. Mirrors buildCoordinatorTasks. Returns everything except the narration,
// which the async orchestrator adds (keeps this function pure).
export function buildValueEstimate(
  input: ValueEngineInput,
): Omit<ValueEstimate, "narration" | "isMockNarration"> {
  const drivers: ValueDriver[] = [];
  const cmmcPercent = input.frameworkPercent.cmmc ?? 0;
  const cmmcStatus = statusFromPercent(cmmcPercent);

  // Consultant savings (both audiences) — always present; the outside engagement benchmark for the
  // target level is the realistic market cost of outsourcing the readiness prep.
  const engagement =
    input.targetLevel === 2
      ? getBenchmark("cmmc_l2_consultant_engagement")
      : getBenchmark("cmmc_l1_consultant_engagement");
  const hours = Math.max(1, Math.round(input.cmmcEffortMinutes / 60));
  drivers.push({
    id: "consultant_savings",
    kind: "consultant_savings",
    audience: "both",
    headline: "Do it yourself instead of hiring it out",
    plainEnglish: `A typical outside CMMC Level ${input.targetLevel} readiness engagement for a small business runs this much. You're doing the same prep in about ${hours} hours of your own time.`,
    amount: {
      low: engagement.low,
      high: engagement.high,
      basis: `${engagement.source} (${engagement.asOf}); excludes any separate C3PAO assessment.`,
    },
    status: cmmcStatus,
    source: engagement.source,
    href: "/path",
  });
  const savingsLow = engagement.low;
  const savingsHigh = engagement.high;
  const savingsRealizedLow = Math.round((savingsLow * cmmcPercent) / 100);
  const savingsRealizedHigh = Math.round((savingsHigh * cmmcPercent) / 100);

  // Contract eligibility (DoD) — access, not a dollar figure, so it never inflates the savings total.
  if (input.handlesCui) {
    drivers.push({
      id: "contract_eligibility",
      kind: "contract_eligibility",
      audience: "dod",
      headline: "Stay eligible to win defense contracts",
      plainEnglish:
        "Covered DoD contracts require a recorded CMMC status and an acceptable SPRS score to be awarded. This readiness work is what gets you to the point where you can affirm and keep bidding — revenue you simply can't win without it.",
      amount: null,
      status: cmmcStatus,
      source: "DFARS 252.204-7021 / 32 CFR CMMC Program rule",
      href: "/summary",
    });
  }

  // Texas fine exposure (TDPSA) — only when the track is actually enabled.
  if (input.enabledFrameworks.includes("tdpsa")) {
    const tdpsa = getBenchmark("tdpsa_per_violation");
    drivers.push({
      id: "fine_exposure",
      kind: "fine_exposure",
      audience: "texas",
      headline: "Shrink your TDPSA penalty exposure",
      plainEnglish:
        "Under the Texas Data Privacy and Security Act each violation can be assessed on its own, so unresolved obligations stack up. Closing them removes that exposure.",
      amount: {
        low: tdpsa.low,
        high: tdpsa.high,
        basis: `Per violation — ${tdpsa.source} (${tdpsa.asOf}).`,
      },
      status: statusFromPercent(input.frameworkPercent.tdpsa ?? 0),
      source: tdpsa.source,
      href: "/track/tdpsa",
    });
  }

  // Breach exposure (Texas) — the money an actual wire-fraud/BEC incident drains, which the scam
  // checker and incident tools defend; gated to businesses the breach rules reach.
  if (input.enabledFrameworks.includes("tx521") || input.handlesTexasResidentData) {
    const bec = getBenchmark("bec_average_loss");
    const penaltyCap = getBenchmark("tx521_civil_penalty_max");
    drivers.push({
      id: "breach_exposure",
      kind: "breach_exposure",
      audience: "texas",
      headline: "Avoid the cost of a breach you could have caught",
      plainEnglish: `Business-email-compromise and wire fraud are the most common way a small business loses real money — the scam checker and incident tools here are built to catch it. A late breach notice adds a civil penalty of up to $${penaltyCap.high.toLocaleString("en-US")} on top (${penaltyCap.source}).`,
      amount: {
        low: bec.low,
        high: bec.high,
        basis: `Average reported loss — ${bec.source} (${bec.asOf}).`,
      },
      status: statusFromPercent(input.frameworkPercent.tx521 ?? 0),
      source: bec.source,
      href: "/scam-check",
    });
  }

  // Insurance posture (both) — qualitative; a documented posture + evidence ledger is what insurers
  // ask for. No dollar figure, so it never touches the savings total.
  drivers.push({
    id: "insurance_posture",
    kind: "insurance_posture",
    audience: "both",
    headline: "Strengthen your cyber-insurance position",
    plainEnglish:
      "Cyber-insurers increasingly ask for documented controls and evidence at renewal. The readiness record and tamper-evident ledger here are exactly the kind of proof that can affect whether you qualify and what you pay.",
    amount: null,
    status: cmmcStatus,
    source: "Cyber-insurance underwriting questionnaires (general practice)",
    href: "/summary",
  });

  return { drivers, savingsLow, savingsHigh, savingsRealizedLow, savingsRealizedHigh };
}

// Format a dollar range for display, e.g. "$5,000–$20,000".
export function formatUsdRange(low: number, high: number): string {
  const format = (amount: number) => `$${Math.round(amount).toLocaleString("en-US")}`;
  return low === high ? format(low) : `${format(low)}–${format(high)}`;
}

export async function computeValueEstimate(): Promise<ValueEstimate> {
  const organization = await requireOrganization();
  const level = organization.targetLevel as CmmcLevel;
  const enabledFrameworks = parseEnabledFrameworks(organization);

  const cmmcEffortMinutes = getPracticesForLevel(level).reduce(
    (total, practice) => total + practice.estimatedEffortMinutes,
    0,
  );

  const frameworkPercent: Partial<Record<FrameworkId, number>> = {};
  await Promise.all(
    enabledFrameworks.map(async (framework) => {
      const progress = await computeProgressForFramework(framework);
      frameworkPercent[framework] = progress.percent;
    }),
  );

  const estimate = buildValueEstimate({
    handlesCui: organization.handlesCui,
    targetLevel: level,
    enabledFrameworks,
    handlesTexasResidentData: organization.handlesTexasResidentData,
    takesCardPayments: organization.takesCardPayments,
    cmmcEffortMinutes,
    frameworkPercent,
  });

  const { narration, isMockNarration } = await narrateValueEstimate({
    drivers: estimate.drivers.map((driver) => ({ headline: driver.headline, audience: driver.audience })),
    savingsLow: estimate.savingsLow,
    savingsHigh: estimate.savingsHigh,
    handlesCui: organization.handlesCui,
  });

  return { ...estimate, narration, isMockNarration };
}
