import type { Organization } from "@/lib/org";
import type { FrameworkId } from "@/lib/practice-types";
import type { RadarProfile } from "@/lib/radar/types";
import type { ApplicabilitySignals, FrameworkApplicability } from "./types";

// Gather the plain-data signals the rules read from the organization row and the
// optional radar profile. Radar flags OR in — they only ever broaden applicability.
export function gatherApplicabilitySignals(
  organization: Organization,
  radarProfile: RadarProfile | null,
): ApplicabilitySignals {
  return {
    handlesCui: organization.handlesCui,
    governmentContractor: radarProfile?.governmentContractor ?? false,
    handlesTexasResidentData: organization.handlesTexasResidentData,
    processesPersonalDataAtScale: organization.processesPersonalDataAtScale,
    texasPhysicalPresence: organization.texasPhysicalPresence,
    sellsToStateOfTexas: organization.sellsToStateOfTexas,
    handlesSensitiveData: radarProfile?.handlesSensitiveData ?? false,
    texasOperations: organization.texasPhysicalPresence || (radarProfile?.texasOperations ?? false),
  };
}

function evaluateCmmc(signals: ApplicabilitySignals): FrameworkApplicability {
  const reasons: string[] = [];
  if (signals.handlesCui) {
    reasons.push("You told onboarding you handle Controlled Unclassified Information (CUI).");
  }
  if (signals.governmentContractor) {
    reasons.push("Your radar profile marks you as a government contractor.");
  }
  if (reasons.length > 0) {
    reasons.push("CMMC applies to the Defense Industrial Base through DFARS/FAR contract clauses.");
    return { framework: "cmmc", verdict: "likely_applies", reasons };
  }
  return {
    framework: "cmmc",
    verdict: "unlikely",
    reasons: [
      "You have not indicated that you handle CUI or hold federal defense contracts.",
      "CMMC obligations flow down through DoD contracts, so it may not apply if you do not work with the Department of Defense.",
    ],
  };
}

function evaluateTdpsa(signals: ApplicabilitySignals): FrameworkApplicability {
  if (signals.handlesTexasResidentData && signals.processesPersonalDataAtScale) {
    return {
      framework: "tdpsa",
      verdict: "likely_applies",
      reasons: [
        "You process the personal data of Texas residents.",
        "You process personal data at scale (not a small business under the TDPSA's size test).",
        "The TDPSA governs businesses that conduct business in Texas and process consumers' personal data.",
      ],
    };
  }
  if (signals.handlesTexasResidentData) {
    return {
      framework: "tdpsa",
      verdict: "may_apply",
      reasons: [
        "You process the personal data of Texas residents.",
        "You did not indicate processing personal data at scale — the TDPSA has a small-business exemption that may narrow your obligations (sale of sensitive data still requires consent).",
      ],
    };
  }
  return {
    framework: "tdpsa",
    verdict: "unlikely",
    reasons: [
      "You have not indicated that you process personal data about Texas residents.",
      "The TDPSA attaches to businesses processing Texans' personal data; without that, it likely does not apply.",
    ],
  };
}

function evaluateTx521(signals: ApplicabilitySignals): FrameworkApplicability {
  if (signals.handlesTexasResidentData) {
    const reasons = [
      "You hold personal data about Texas residents.",
      "Chapter 521 requires notifying affected Texas residents after a breach of sensitive personal information.",
      "If a single breach affects 250 or more Texas residents, you must also notify the Texas Attorney General.",
    ];
    return { framework: "tx521", verdict: "likely_applies", reasons };
  }
  if (signals.texasPhysicalPresence || signals.handlesSensitiveData) {
    return {
      framework: "tx521",
      verdict: "may_apply",
      reasons: [
        signals.texasPhysicalPresence
          ? "You have a physical presence in Texas."
          : "Your radar profile indicates you handle sensitive data.",
        "Chapter 521 can reach any business that maintains sensitive personal information of Texas residents, even without a dedicated privacy program.",
      ],
    };
  }
  return {
    framework: "tx521",
    verdict: "unlikely",
    reasons: [
      "You have not indicated that you hold Texas residents' sensitive personal information.",
      "Chapter 521's breach-notification duties attach to businesses holding such data.",
    ],
  };
}

function evaluateTac202(signals: ApplicabilitySignals): FrameworkApplicability {
  if (signals.sellsToStateOfTexas) {
    return {
      framework: "tac202",
      verdict: "likely_applies",
      reasons: [
        "You sell to or contract with the State of Texas.",
        "TAC §202 and the Texas DIR control catalog flow down to vendors handling state information resources.",
      ],
    };
  }
  if (signals.texasOperations && signals.governmentContractor) {
    return {
      framework: "tac202",
      verdict: "may_apply",
      reasons: [
        "You operate in Texas and act as a government contractor.",
        "If any of those contracts are with Texas state agencies, TAC §202 obligations may flow down to you.",
      ],
    };
  }
  return {
    framework: "tac202",
    verdict: "unlikely",
    reasons: [
      "You have not indicated that you sell to or contract with the State of Texas.",
      "TAC §202 applies to state agencies and the vendors that serve them.",
    ],
  };
}

// Pure, deterministic evaluation — identical output with or without an API key. The
// map is ordered so CMMC stays first, matching FRAMEWORK_ORDER elsewhere.
export function evaluateApplicabilityRules(
  signals: ApplicabilitySignals,
): Record<FrameworkId, FrameworkApplicability> {
  return {
    cmmc: evaluateCmmc(signals),
    tdpsa: evaluateTdpsa(signals),
    tx521: evaluateTx521(signals),
    tac202: evaluateTac202(signals),
  };
}
