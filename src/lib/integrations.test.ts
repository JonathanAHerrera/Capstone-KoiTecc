import { mkdtempSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import {
  computeDrift,
  createMockConnector,
  evaluateDirectorySignals,
  type DirectorySignals,
  type IntegrationCheckResult,
} from "@/lib/integrations";

// Env must be set before any module resolves the SQLite path via getDb().
const temporaryDirectory = mkdtempSync(path.join(process.env.CMMC_TEST_TEMP_ROOT!, "integrations-test-"));
process.env.CMMC_DB_PATH = path.join(temporaryDirectory, "integrations-test.db");
process.env.CMMC_UPLOADS_DIR = path.join(temporaryDirectory, "uploads");

const NOW = new Date("2025-06-01T00:00:00.000Z");

function signals(overrides: Partial<DirectorySignals> = {}): DirectorySignals {
  return {
    provider: "m365",
    tenantLabel: "Test tenant",
    mfaEnforcedByPolicy: true,
    accounts: [
      {
        id: "a",
        displayName: "A",
        isAdmin: true,
        mfaEnrolled: true,
        lastActiveAt: NOW.toISOString(),
        hasExternalAutoForward: false,
        usesLegacyAuth: false,
      },
      {
        id: "b",
        displayName: "B",
        isAdmin: false,
        mfaEnrolled: true,
        lastActiveAt: NOW.toISOString(),
        hasExternalAutoForward: false,
        usesLegacyAuth: false,
      },
    ],
    ...overrides,
  };
}

function statusFor(results: IntegrationCheckResult[], tag: string) {
  return results.find((check) => check.verificationTag === tag)?.status;
}

describe("evaluateDirectorySignals", () => {
  test.each(["m365", "google"] as const)("%s: realistic small-business risks, remediation, and regression are detected", (provider) => {
    const risky: DirectorySignals = {
      provider, tenantLabel: "Cedar Machining — fictional 18-person contractor", mfaEnforcedByPolicy: false,
      accounts: Array.from({ length: 18 }, (_, index) => ({
        id: `employee-${index + 1}`, displayName: index === 17 ? "Departed contractor" : `QA employee ${index + 1}`,
        isAdmin: index < 5, mfaEnrolled: index < 16,
        lastActiveAt: index === 17 ? "2024-12-01T00:00:00Z" : NOW.toISOString(),
        hasExternalAutoForward: index === 8, usesLegacyAuth: index === 12,
      })),
    };
    const findings = evaluateDirectorySignals(risky, NOW);
    expect(findings.map((check) => check.status)).toEqual(["fail", "warn", "fail", "warn", "fail"]);
    expect(findings.every((check) => Boolean(check.fix))).toBe(true);
    expect(findings[0].finding).toContain("16 of 18");
    const remediated: DirectorySignals = {
      ...risky, mfaEnforcedByPolicy: true,
      accounts: risky.accounts.slice(0, 17).map((account, index) => ({
        ...account, isAdmin: index < 2, mfaEnrolled: true,
        hasExternalAutoForward: false, usesLegacyAuth: false,
      })),
    };
    const healthy = evaluateDirectorySignals(remediated, NOW);
    expect(healthy.every((check) => check.status === "pass")).toBe(true);
    expect(computeDrift(findings, healthy)).toEqual([]);
    expect(computeDrift(healthy, findings)).toHaveLength(5);
  });
  test("an empty directory never passes checks", () => {
    expect(evaluateDirectorySignals(signals({ accounts: [] }), NOW).every((check) => check.status === "unknown")).toBe(true);
  });
  test("the 90-day boundary and invalid activity dates require attention", () => {
    for (const lastActiveAt of [new Date(NOW.getTime() - 90 * 86400000).toISOString(), "invalid"]) {
      const input = signals();
      input.accounts[0].lastActiveAt = lastActiveAt;
      expect(statusFor(evaluateDirectorySignals(input, NOW), "m365.inactive-accounts")).toBe("warn");
    }
  });
  test("a clean tenant passes every check", () => {
    const results = evaluateDirectorySignals(signals(), NOW);
    expect(results.every((check) => check.status === "pass")).toBe(true);
    expect(statusFor(results, "m365.mfa")).toBe("pass");
  });

  test("MFA fails when enforcement is off even if everyone is enrolled", () => {
    const results = evaluateDirectorySignals(signals({ mfaEnforcedByPolicy: false }), NOW);
    expect(statusFor(results, "m365.mfa")).toBe("fail");
  });

  test("external auto-forwarding and legacy auth are failures", () => {
    const withForward = signals();
    withForward.accounts[1].hasExternalAutoForward = true;
    withForward.accounts[0].usesLegacyAuth = true;
    const results = evaluateDirectorySignals(withForward, NOW);
    expect(statusFor(results, "m365.external-forwarding")).toBe("fail");
    expect(statusFor(results, "m365.legacy-auth")).toBe("fail");
  });

  test("accounts idle for over 90 days warn", () => {
    const idle = signals();
    idle.accounts[1].lastActiveAt = new Date(NOW.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const results = evaluateDirectorySignals(idle, NOW);
    expect(statusFor(results, "m365.inactive-accounts")).toBe("warn");
  });
});

describe("computeDrift", () => {
  test("flags a check that got worse and ignores one that improved", () => {
    const before = evaluateDirectorySignals(signals(), NOW);
    const worseSignals = signals({ mfaEnforcedByPolicy: false });
    const after = evaluateDirectorySignals(worseSignals, NOW);
    const drift = computeDrift(before, after);
    expect(drift.map((d) => d.verificationTag)).toContain("m365.mfa");

    // Reversing the diff (worse → better) must not alert.
    expect(computeDrift(after, before)).toHaveLength(0);
  });
});

describe("runIntegrationChecks", () => {
  test("records integration_check ledger entries and sets the MFA control status", async () => {
    const { getDb } = await import("@/db/client");
    const { user } = await import("@/db/auth-schema");
    const { runWithSessionUser } = await import("@/lib/request-context");
    const { createOrganization } = await import("@/lib/org");
    const { listLedgerEntriesForOrg } = await import("@/lib/ledger");
    const { runIntegrationChecks } = await import("@/lib/integrations");

    const sessionUser = { id: "integration-user", email: "integ@example.test", name: "Integ User" };
    const database = await getDb();
    await database.insert(user).values(sessionUser).onConflictDoNothing();

    await runWithSessionUser(sessionUser, async () => {
      const organization = await createOrganization({
        name: "Integration Co",
        targetLevel: 1,
        handlesCui: false,
        employeeCount: "1-10",
        itSetup: "cloud",
        hasItProvider: false,
      });

      const result = await runIntegrationChecks(createMockConnector("m365"), { now: NOW });
      expect(result.provider).toBe("m365");
      // The mock tenant is clean, so the MFA control is set to looks_sufficient.
      expect(result.controlsUpdated).toContain("essential.mfa-on-every-account");

      const entries = await listLedgerEntriesForOrg(organization.id);
      const integrationEntries = entries.filter((entry) => entry.type === "integration_check");
      expect(integrationEntries.length).toBeGreaterThanOrEqual(5);
      const mfaEntry = integrationEntries.find(
        (entry) => entry.controlId === "essential.mfa-on-every-account",
      );
      expect(mfaEntry?.verdict).toBe("looks_sufficient");
    });
  });
});

afterAll(async () => {
  const { closeDb } = await import("@/db/client");
  await closeDb();
});
