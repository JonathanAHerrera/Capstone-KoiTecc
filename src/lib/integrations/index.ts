import { buildSb2610Plan } from "@/frameworks/sb2610";
import type { ControlDefinition, VerificationMethod } from "@/frameworks/types";
import { appendLedgerEntryBestEffort, listLedgerEntriesForOrg } from "@/lib/ledger";
import { deriveOrgProfile, requireOrganization } from "@/lib/org";
import type { IntegrationProvider } from "@/lib/integrations/providers";

export {
  INTEGRATION_PROVIDERS,
  PROVIDER_DOCUMENTATION,
  M365_DOCUMENTATION,
  GOOGLE_DOCUMENTATION,
} from "@/lib/integrations/providers";
export type { IntegrationProvider, ProviderDocumentation } from "@/lib/integrations/providers";

// The read-only facts a connector pulls from the tenant. A connector NEVER evaluates — it only
// reports observed signals, so the scoring logic stays pure and unit-testable (same seam idea as
// the outside-scan ScanProbes). The live connector (approval-gated, see ./providers.ts) and the
// mock connector both produce this shape.
export type DirectoryAccountSignal = {
  id: string;
  displayName: string;
  isAdmin: boolean;
  mfaEnrolled: boolean;
  // ISO timestamp of last sign-in, or null when the account has never signed in.
  lastActiveAt: string | null;
  // The mailbox forwards to an address outside the organization's own domains.
  hasExternalAutoForward: boolean;
  // The account signed in using basic/legacy authentication (no modern auth / MFA possible).
  usesLegacyAuth: boolean;
};

export type DirectorySignals = {
  provider: IntegrationProvider;
  tenantLabel: string;
  // True when a tenant-wide policy (Conditional Access / enforced 2SV) requires MFA for everyone.
  mfaEnforcedByPolicy: boolean;
  accounts: DirectoryAccountSignal[];
};

export type IntegrationConnector = {
  provider: IntegrationProvider;
  fetchDirectorySignals(): Promise<DirectorySignals>;
};

export const INTEGRATION_CHECK_IDS = [
  "mfa",
  "admin-count",
  "external-forwarding",
  "inactive-accounts",
  "legacy-auth",
] as const;
export type IntegrationCheckId = (typeof INTEGRATION_CHECK_IDS)[number];

// pass = observed state is good; warn = present but risky; fail = clearly wrong; unknown = no data.
export type IntegrationCheckStatus = "pass" | "warn" | "fail" | "unknown";

export type IntegrationCheckResult = {
  id: IntegrationCheckId;
  // Provider-qualified id used to match control verification tags, e.g. "m365.mfa".
  verificationTag: string;
  label: string;
  status: IntegrationCheckStatus;
  finding: string;
  fix: string | null;
};

export type IntegrationRunResult = {
  provider: IntegrationProvider;
  tenantLabel: string;
  ranAt: string;
  checks: IntegrationCheckResult[];
  // Control ids whose status this run set directly (via integration_check ledger entries).
  controlsUpdated: string[];
  // Checks whose status changed for the worse since the previous run (weekly drift alert).
  drift: IntegrationDrift[];
};

const INACTIVITY_LIMIT_DAYS = 90;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
// A tiny admin team is healthy; too many standing admins widens the blast radius of one theft.
const ADMIN_COUNT_WARN_THRESHOLD = 4;

function daysSince(isoTimestamp: string, now: Date): number {
  return (now.getTime() - Date.parse(isoTimestamp)) / MILLISECONDS_PER_DAY;
}

// Pure: turns observed signals into pass/warn/fail findings. No DB, no network, no AI.
export function evaluateDirectorySignals(
  signals: DirectorySignals,
  now: Date = new Date(),
): IntegrationCheckResult[] {
  const prefix = signals.provider;
  const accounts = signals.accounts;

  const enrolled = accounts.filter((account) => account.mfaEnrolled).length;
  const total = accounts.length;
  const everyoneEnrolled = total > 0 && enrolled === total;
  const mfa: IntegrationCheckResult = {
    id: "mfa",
    verificationTag: `${prefix}.mfa`,
    label: "Multi-factor authentication",
    status: everyoneEnrolled && signals.mfaEnforcedByPolicy ? "pass" : total === 0 ? "unknown" : "fail",
    finding:
      total === 0
        ? "No accounts were returned, so MFA could not be evaluated."
        : `${enrolled} of ${total} accounts have MFA enrolled and tenant-wide enforcement is ${
            signals.mfaEnforcedByPolicy ? "on" : "off"
          }.`,
    fix:
      everyoneEnrolled && signals.mfaEnforcedByPolicy
        ? null
        : "Require multi-factor authentication for every account and turn on tenant-wide enforcement.",
  };

  const admins = accounts.filter((account) => account.isAdmin).length;
  const adminCount: IntegrationCheckResult = {
    id: "admin-count",
    verificationTag: `${prefix}.admin-count`,
    label: "Number of admin accounts",
    status: admins === 0 ? "unknown" : admins <= ADMIN_COUNT_WARN_THRESHOLD ? "pass" : "warn",
    finding:
      admins === 0
        ? "No admin accounts were identified."
        : `${admins} accounts hold admin roles.`,
    fix:
      admins > ADMIN_COUNT_WARN_THRESHOLD
        ? "Reduce standing admin accounts to only those who truly need them; use just-in-time elevation where possible."
        : null,
  };

  const forwarders = accounts.filter((account) => account.hasExternalAutoForward);
  const externalForwarding: IntegrationCheckResult = {
    id: "external-forwarding",
    verificationTag: `${prefix}.external-forwarding`,
    label: "External email auto-forwarding",
    status: forwarders.length === 0 ? "pass" : "fail",
    finding:
      forwarders.length === 0
        ? "No mailboxes auto-forward to outside addresses."
        : `${forwarders.length} mailboxes auto-forward email to addresses outside your organization.`,
    fix:
      forwarders.length === 0
        ? null
        : "Remove external auto-forwarding rules and block auto-forwarding by policy; it is a common sign of a compromised mailbox.",
  };

  const inactive = accounts.filter(
    (account) => account.lastActiveAt === null || daysSince(account.lastActiveAt, now) > INACTIVITY_LIMIT_DAYS,
  );
  const inactiveAccounts: IntegrationCheckResult = {
    id: "inactive-accounts",
    verificationTag: `${prefix}.inactive-accounts`,
    label: "Inactive accounts (90+ days)",
    status: total === 0 ? "unknown" : inactive.length === 0 ? "pass" : "warn",
    finding:
      total === 0
        ? "No accounts were returned, so inactivity could not be evaluated."
        : inactive.length === 0
          ? "Every account has signed in within the last 90 days."
          : `${inactive.length} accounts have not signed in for over 90 days.`,
    fix:
      inactive.length > 0
        ? "Disable or remove accounts that have been inactive for over 90 days so they cannot be hijacked."
        : null,
  };

  const legacy = accounts.filter((account) => account.usesLegacyAuth);
  const legacyAuth: IntegrationCheckResult = {
    id: "legacy-auth",
    verificationTag: `${prefix}.legacy-auth`,
    label: "Legacy authentication",
    status: legacy.length === 0 ? "pass" : "fail",
    finding:
      legacy.length === 0
        ? "No accounts are signing in with legacy authentication."
        : `${legacy.length} accounts still sign in with legacy authentication, which bypasses MFA.`,
    fix:
      legacy.length === 0
        ? null
        : "Block legacy authentication protocols so every sign-in must use modern auth and MFA.",
  };

  return [mfa, adminCount, externalForwarding, inactiveAccounts, legacyAuth];
}

// A check's status maps directly to a control verdict (no AI). pass → looks_sufficient; warn/fail →
// needs_work; unknown leaves the control unchanged (we observed nothing to record).
function verdictForStatus(status: IntegrationCheckStatus): "looks_sufficient" | "needs_work" | null {
  if (status === "pass") return "looks_sufficient";
  if (status === "warn" || status === "fail") return "needs_work";
  return null;
}

// Controls whose verification list contains `integration:<tag>` are the ones this check verifies.
function controlsForTag(controls: ControlDefinition[], verificationTag: string): ControlDefinition[] {
  const needle: VerificationMethod = `integration:${verificationTag}`;
  return controls.filter((control) => control.verification.includes(needle));
}

export type IntegrationDrift = {
  checkId: IntegrationCheckId;
  verificationTag: string;
  previousStatus: IntegrationCheckStatus;
  currentStatus: IntegrationCheckStatus;
};

const STATUS_SEVERITY: Readonly<Record<IntegrationCheckStatus, number>> = {
  pass: 0,
  unknown: 1,
  warn: 2,
  fail: 3,
};

// Pure: a drift is any check that got worse (higher severity) than the previous run. Improvements
// and unchanged checks are not alerted on.
export function computeDrift(
  previous: IntegrationCheckResult[],
  current: IntegrationCheckResult[],
): IntegrationDrift[] {
  const previousByTag = new Map(previous.map((check) => [check.verificationTag, check]));
  const drift: IntegrationDrift[] = [];
  for (const check of current) {
    const before = previousByTag.get(check.verificationTag);
    if (!before) continue;
    if (STATUS_SEVERITY[check.status] > STATUS_SEVERITY[before.status]) {
      drift.push({
        checkId: check.id,
        verificationTag: check.verificationTag,
        previousStatus: before.status,
        currentStatus: check.status,
      });
    }
  }
  return drift;
}

// Reconstructs the most recent integration check result per verification tag from the ledger, so a
// weekly run can diff against it for drift. Reads the verdict + metadata.status we wrote last time.
async function previousChecksFromLedger(orgId: string): Promise<IntegrationCheckResult[]> {
  const entries = await listLedgerEntriesForOrg(orgId);
  const latestByTag = new Map<string, IntegrationCheckResult>();
  for (const entry of entries) {
    if (entry.type !== "integration_check" || !entry.metadata) continue;
    try {
      const metadata: unknown = JSON.parse(entry.metadata);
      if (!metadata || typeof metadata !== "object") continue;
      const record = metadata as Record<string, unknown>;
      const verificationTag = record.verificationTag;
      const status = record.status;
      const id = record.checkId;
      if (typeof verificationTag !== "string" || typeof status !== "string" || typeof id !== "string") {
        continue;
      }
      latestByTag.set(verificationTag, {
        id: id as IntegrationCheckId,
        verificationTag,
        label: typeof record.label === "string" ? record.label : verificationTag,
        status: status as IntegrationCheckStatus,
        finding: typeof record.finding === "string" ? record.finding : "",
        fix: typeof record.fix === "string" ? record.fix : null,
      });
    } catch {
      continue;
    }
  }
  return [...latestByTag.values()];
}

// Runs the read-only checks against a connector, records each as an integration_check ledger entry,
// and sets the matching control(s) status directly from the observed result (no AI). Returns the
// results plus any weekly drift vs. the previous run. Org-scoped via requireOrganization().
export async function runIntegrationChecks(
  connector: IntegrationConnector,
  options: { now?: Date } = {},
): Promise<IntegrationRunResult> {
  const now = options.now ?? new Date();
  const organization = await requireOrganization();
  const plan = buildSb2610Plan(deriveOrgProfile(organization));

  const previousChecks = await previousChecksFromLedger(organization.id);
  const signals = await connector.fetchDirectorySignals();
  const checks = evaluateDirectorySignals(signals, now);
  const drift = computeDrift(previousChecks, checks);

  const controlsUpdated: string[] = [];
  for (const check of checks) {
    const verdict = verdictForStatus(check.status);
    const matchedControls = controlsForTag(plan.controls, check.verificationTag);
    // Record the observation even when no control maps yet, so the ledger has a full audit trail and
    // the next run can compute drift. controlId is null for unmapped checks.
    if (matchedControls.length === 0) {
      await appendLedgerEntryBestEffort({
        orgId: organization.id,
        type: "integration_check",
        controlId: null,
        verdict,
        metadata: {
          provider: signals.provider,
          checkId: check.id,
          verificationTag: check.verificationTag,
          status: check.status,
          label: check.label,
          finding: check.finding,
          fix: check.fix,
        },
      });
      continue;
    }
    for (const control of matchedControls) {
      await appendLedgerEntryBestEffort({
        orgId: organization.id,
        type: "integration_check",
        controlId: control.id,
        verdict,
        metadata: {
          provider: signals.provider,
          checkId: check.id,
          verificationTag: check.verificationTag,
          status: check.status,
          label: check.label,
          finding: check.finding,
          fix: check.fix,
        },
      });
      if (verdict) controlsUpdated.push(control.id);
    }
  }

  return {
    provider: signals.provider,
    tenantLabel: signals.tenantLabel,
    ranAt: now.toISOString(),
    checks,
    controlsUpdated,
    drift,
  };
}

// Deterministic mock connector used by the app (until live OAuth is approved) and by tests. Returns
// a fixed, overridable set of signals so runs are reproducible. Mirrors the mock-first rule in
// spec section 9 for the AI layer, applied to integrations.
export function createMockConnector(
  provider: IntegrationProvider = "m365",
  overrides: Partial<DirectorySignals> = {},
): IntegrationConnector {
  const base: DirectorySignals = {
    provider,
    tenantLabel: provider === "m365" ? "Contoso (mock tenant)" : "example.com (mock tenant)",
    mfaEnforcedByPolicy: true,
    accounts: [
      {
        id: "owner",
        displayName: "Owner",
        isAdmin: true,
        mfaEnrolled: true,
        lastActiveAt: new Date().toISOString(),
        hasExternalAutoForward: false,
        usesLegacyAuth: false,
      },
      {
        id: "staff-1",
        displayName: "Staff One",
        isAdmin: false,
        mfaEnrolled: true,
        lastActiveAt: new Date().toISOString(),
        hasExternalAutoForward: false,
        usesLegacyAuth: false,
      },
    ],
    ...overrides,
  };
  return {
    provider,
    async fetchDirectorySignals() {
      return base;
    },
  };
}
