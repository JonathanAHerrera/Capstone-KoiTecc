import { describe, expect, test } from "vitest";
import { catchUpDeadlineFor } from "@/frameworks/framework-watch";
import {
  buildSb2610Plan,
  controlsForTier,
  selectSb2610Tier,
  type Sb2610TierId,
} from "@/frameworks/sb2610";
import type { OrgProfile, SafeguardKind } from "@/frameworks/types";

// A plain-English snapshot of the ranked plan: just the fields that matter for review, so a
// content change shows up as a readable diff instead of a wall of objects.
function summarizePlan(profile: OrgProfile) {
  const plan = buildSb2610Plan(profile);
  return {
    eligible: plan.eligible,
    tier: plan.tier,
    overlays: plan.overlays,
    controls: plan.controls.map((control) => ({
      id: control.id,
      priority: control.priority,
      kind: control.safeguardKind,
      sourceRef: control.sourceRef,
    })),
  };
}

function baseProfile(overrides: Partial<OrgProfile>): OrgProfile {
  return {
    employees: 10,
    industry: "other",
    takesCardPayments: false,
    handlesCui: false,
    handlesTexasResidentData: true,
    sellsToStateOfTexas: false,
    texasPhysicalPresence: true,
    processesPersonalDataAtScale: false,
    ...overrides,
  };
}

describe("SB 2610 tier selection", () => {
  test("maps headcount to the right tier", () => {
    expect(selectSb2610Tier(1).tier).toBe("sb2610-simple");
    expect(selectSb2610Tier(19).tier).toBe("sb2610-simple");
    expect(selectSb2610Tier(20).tier).toBe("sb2610-moderate");
    expect(selectSb2610Tier(99).tier).toBe("sb2610-moderate");
    expect(selectSb2610Tier(100).tier).toBe("sb2610-full");
    expect(selectSb2610Tier(249).tier).toBe("sb2610-full");
  });

  test("250+ employees is not eligible and routes to KOITECC", () => {
    const applicability = selectSb2610Tier(250);
    expect(applicability.applies).toBe(false);
    expect(applicability.tier).toBeUndefined();
    expect(applicability.reason).toMatch(/KOITECC/);
  });
});

describe("SB 2610 safeguard coverage", () => {
  const tiers: Sb2610TierId[] = ["sb2610-simple", "sb2610-moderate", "sb2610-full"];
  const requiredKinds: SafeguardKind[] = ["administrative", "technical", "physical"];

  test.each(tiers)("%s carries at least one administrative, technical, and physical safeguard", (tier) => {
    const present = new Set(controlsForTier(tier).map((control) => control.safeguardKind));
    for (const kind of requiredKinds) {
      expect(present.has(kind)).toBe(true);
    }
  });
});

describe("SB 2610 ranked plans", () => {
  // Acceptance: a 12-person dental office yields sb2610-simple + HIPAA overlay with a ranked plan.
  test("12-person dental office: sb2610-simple + HIPAA", () => {
    const profile = baseProfile({ employees: 12, industry: "healthcare" });
    const plan = buildSb2610Plan(profile);
    expect(plan.tier).toBe("sb2610-simple");
    expect(plan.overlays).toEqual(["hipaa"]);
    expect(summarizePlan(profile)).toMatchSnapshot();
  });

  // Acceptance: a 45-person CPA firm yields sb2610-moderate + GLBA.
  test("45-person CPA firm: sb2610-moderate + GLBA", () => {
    const profile = baseProfile({ employees: 45, industry: "accounting" });
    const plan = buildSb2610Plan(profile);
    expect(plan.tier).toBe("sb2610-moderate");
    expect(plan.overlays).toEqual(["glba"]);
    expect(summarizePlan(profile)).toMatchSnapshot();
  });

  test("plan is sorted by descending priority", () => {
    const profile = baseProfile({ employees: 12, industry: "healthcare", takesCardPayments: true });
    const priorities = buildSb2610Plan(profile).controls.map((control) => control.priority);
    const sorted = [...priorities].sort((left, right) => right - left);
    expect(priorities).toEqual(sorted);
  });

  test("250+ employees produces an ineligible plan with no controls", () => {
    const plan = buildSb2610Plan(baseProfile({ employees: 300 }));
    expect(plan.eligible).toBe(false);
    expect(plan.controls).toHaveLength(0);
    expect(plan.overlays).toHaveLength(0);
  });
});

describe("framework version catch-up deadline", () => {
  test("takes the later of implementation date or one year after publication", () => {
    // One year after publication (2026-03-01) is later than the 2025-12-01 implementation date.
    expect(
      catchUpDeadlineFor({
        frameworkId: "sb2610",
        previousVersion: "2025",
        newVersion: "2026",
        publishedAt: "2025-03-01",
        implementationDate: "2025-12-01",
      }),
    ).toBe("2026-03-01");

    // Implementation date (2027-01-01) is later than one year after publication (2026-03-01).
    expect(
      catchUpDeadlineFor({
        frameworkId: "sb2610",
        previousVersion: "2025",
        newVersion: "2026",
        publishedAt: "2025-03-01",
        implementationDate: "2027-01-01",
      }),
    ).toBe("2027-01-01");
  });
});
