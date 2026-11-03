import { describe, expect, test } from "vitest";
import { buildValueEstimate, type ValueEngineInput } from "@/lib/value";
import { getBenchmark } from "@/lib/value-benchmarks";

function baseInput(overrides: Partial<ValueEngineInput> = {}): ValueEngineInput {
  return {
    handlesCui: false,
    targetLevel: 1,
    enabledFrameworks: ["cmmc"],
    handlesTexasResidentData: false,
    takesCardPayments: false,
    cmmcEffortMinutes: 600,
    frameworkPercent: { cmmc: 0 },
    ...overrides,
  };
}

describe("buildValueEstimate", () => {
  test("a DoD org (CUI, Level 2) gets contract-eligibility + consultant savings, no Texas drivers", () => {
    const estimate = buildValueEstimate(
      baseInput({ handlesCui: true, targetLevel: 2, enabledFrameworks: ["cmmc"] }),
    );
    const kinds = estimate.drivers.map((driver) => driver.kind);

    expect(kinds).toContain("contract_eligibility");
    expect(kinds).toContain("consultant_savings");
    expect(kinds).not.toContain("fine_exposure");
    expect(kinds).not.toContain("breach_exposure");

    // Level 2 pulls the larger engagement benchmark into the savings range.
    const l2 = getBenchmark("cmmc_l2_consultant_engagement");
    expect(estimate.savingsLow).toBe(l2.low);
    expect(estimate.savingsHigh).toBe(l2.high);

    // Contract eligibility is access, not money — it must not carry a dollar amount.
    const eligibility = estimate.drivers.find((driver) => driver.kind === "contract_eligibility");
    expect(eligibility?.amount).toBeNull();
  });

  test("Texas tracks surface fine and breach exposure drivers with cited amounts", () => {
    const estimate = buildValueEstimate(
      baseInput({ enabledFrameworks: ["cmmc", "tdpsa", "tx521"], frameworkPercent: { cmmc: 0, tdpsa: 0, tx521: 0 } }),
    );
    const fine = estimate.drivers.find((driver) => driver.kind === "fine_exposure");
    const breach = estimate.drivers.find((driver) => driver.kind === "breach_exposure");

    expect(fine?.amount?.high).toBe(getBenchmark("tdpsa_per_violation").high);
    expect(breach?.amount?.high).toBe(getBenchmark("bec_average_loss").high);
  });

  test("no enabled Texas framework ⇒ no Texas drivers (gating)", () => {
    const estimate = buildValueEstimate(baseInput({ enabledFrameworks: ["cmmc"] }));
    expect(estimate.drivers.some((driver) => driver.audience === "texas")).toBe(false);
  });

  test("breach exposure appears for Texas-resident data even without the tx521 track enabled", () => {
    const estimate = buildValueEstimate(
      baseInput({ enabledFrameworks: ["cmmc"], handlesTexasResidentData: true }),
    );
    expect(estimate.drivers.some((driver) => driver.kind === "breach_exposure")).toBe(true);
  });

  test("savings realize in step with CMMC accepted progress", () => {
    const locked = buildValueEstimate(baseInput({ frameworkPercent: { cmmc: 0 } }));
    expect(locked.savingsRealizedLow).toBe(0);
    expect(locked.drivers.find((driver) => driver.kind === "consultant_savings")?.status).toBe("locked");

    const half = buildValueEstimate(baseInput({ frameworkPercent: { cmmc: 50 } }));
    expect(half.savingsRealizedLow).toBe(Math.round(half.savingsLow / 2));
    expect(half.drivers.find((driver) => driver.kind === "consultant_savings")?.status).toBe("in_progress");

    const done = buildValueEstimate(baseInput({ frameworkPercent: { cmmc: 100 } }));
    expect(done.savingsRealizedHigh).toBe(done.savingsHigh);
    expect(done.drivers.find((driver) => driver.kind === "consultant_savings")?.status).toBe("realized");
  });
});
