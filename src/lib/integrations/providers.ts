// Phase 7: read-only identity integrations (Microsoft 365 / Google Workspace).
//
// APPROVAL GATE: per the spec, the exact endpoints and least-privilege scopes are written down HERE
// and must be reviewed and approved before any live OAuth is wired. This module deliberately ships
// no OAuth client, no secrets, and no network calls — it is the documentation of record plus the
// typed seam (IntegrationConnector) that a reviewed live connector will later implement. The mock
// connector in ./index.ts is what the app and tests use until the live wiring is approved.
//
// Design rules (spec section 7 + 9):
//   - Least privilege: request only the read scopes each check needs, nothing that can mutate.
//   - No AI: integration results set control status directly from observed facts.
//   - Everything a check reads is an observable signal, recorded as an integration_check ledger entry.

export const INTEGRATION_PROVIDERS = ["m365", "google"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export type ProviderEndpoint = {
  // What the call observes, in plain English.
  purpose: string;
  method: "GET";
  // The documented API path (no base url interpolation here — this is reference text).
  path: string;
};

export type ProviderDocumentation = {
  label: string;
  // OAuth scopes requested, least-privilege and READ-ONLY. Listed for the approval review.
  scopes: readonly string[];
  endpoints: readonly ProviderEndpoint[];
  // Why each scope is the minimum needed.
  scopeRationale: string;
  limitations: readonly string[];
  sources: readonly string[];
};

// Microsoft Graph — read-only application permissions. No write/
// mutate scope is requested. These cover: MFA registration + Conditional Access policy (enforcement),
// directory roles (admin count), mailbox forwarding rules (external auto-forward), sign-in activity
// (inactive 90+ day accounts), and legacy authentication (authentication methods / sign-in logs).
export const M365_DOCUMENTATION: ProviderDocumentation = {
  label: "Microsoft 365 (Microsoft Graph)",
  scopes: [
    "User.Read.All",
    "Policy.Read.All",
    "RoleManagement.Read.Directory",
    "AuditLog.Read.All",
    "MailboxSettings.Read",
  ],
  scopeRationale:
    "Read-only application permissions only. User.Read.All + AuditLog.Read.All give account " +
    "inventory, last sign-in, and MFA registration reports; Policy.Read.All reads " +
    "Conditional Access policies; RoleManagement.Read.Directory counts admins; " +
    "MailboxSettings.Read reads forwarding rules. Nothing requested can change tenant state.",
  endpoints: [
    {
      purpose: "Account inventory and last sign-in activity (inactive 90+ day accounts)",
      method: "GET",
      path: "/v1.0/users?$select=id,displayName,accountEnabled,signInActivity",
    },
    {
      purpose: "Per-user MFA registration state",
      method: "GET",
      path: "/v1.0/reports/authenticationMethods/userRegistrationDetails",
    },
    {
      purpose: "Conditional Access policies that enforce MFA tenant-wide",
      method: "GET",
      path: "/v1.0/identity/conditionalAccess/policies",
    },
    {
      purpose: "Directory role members (count of privileged/admin accounts)",
      method: "GET",
      path: "/v1.0/directoryRoles?$expand=members",
    },
    {
      purpose: "Mailbox forwarding rules (external auto-forwarding)",
      method: "GET",
      path: "/v1.0/users/{id}/mailFolders/inbox/messageRules",
    },
    {
      purpose: "Legacy (basic) authentication sign-ins",
      method: "GET",
      path: "/v1.0/auditLogs/signIns?$filter=clientAppUsed in ('IMAP4','POP3','SMTP','Other clients')",
    },
  ],
  limitations: [
    "Inbox messageRules exposes rule-based forwarding, not Exchange mailbox-level forwarding or transport rules. Missing coverage must remain unknown, never pass.",
    "MFA registration is not enforcement. Evaluate enabled Conditional Access policies, assignments and exclusions; licenses and API coverage may prevent a tenant-wide conclusion.",
    "Follow every nextLink; failed pages, permissions, and unavailable sign-in history must produce unknown signals. Sign-in history only establishes activity in its retention window.",
  ],
  sources: [
    "https://learn.microsoft.com/en-us/graph/api/mailfolder-list-messagerules?view=graph-rest-1.0",
    "https://learn.microsoft.com/en-us/graph/api/authenticationmethodsroot-list-userregistrationdetails?view=graph-rest-1.0",
    "https://learn.microsoft.com/en-us/graph/api/conditionalaccesspolicy-list?view=graph-rest-1.0",
  ],
};

// Google Workspace — Admin SDK Directory + Reports, both read-only scopes. Covers: user inventory +
// admin flag, last-login (inactive accounts), 2-Step Verification enrollment (MFA), and email
// forwarding settings via Gmail API read-only.
export const GOOGLE_DOCUMENTATION: ProviderDocumentation = {
  label: "Google Workspace (Admin SDK)",
  scopes: [
    "https://www.googleapis.com/auth/admin.directory.user.readonly",
    "https://www.googleapis.com/auth/admin.reports.audit.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
  scopeRationale:
    "Read-only Admin SDK scopes. directory.user.readonly gives account inventory, admin flag, " +
    "2-Step Verification enrollment, and last-login; reports.audit.readonly reads sign-in activity " +
    "for legacy-auth and inactivity; gmail.readonly is the read-only option for autoForwarding " +
    "and filters. It also permits reading mailbox content, a significant approval tradeoff. " +
    "gmail.settings.basic is NOT read-only and is excluded. No scope is authorized until approval.",
  endpoints: [
    {
      purpose: "Account inventory, admin flag, 2SV enrollment, last login",
      method: "GET",
      path: "/admin/directory/v1/users?customer=my_customer&projection=full",
    },
    {
      purpose: "Login audit events (inactive accounts, legacy auth)",
      method: "GET",
      path: "/admin/reports/v1/activity/users/all/applications/login",
    },
    {
      purpose: "Per-user email forwarding (external auto-forwarding)",
      method: "GET",
      path: "/gmail/v1/users/{userId}/settings/autoForwarding",
    },
    { purpose: "Filter-based forwarding destinations", method: "GET", path: "/gmail/v1/users/{userId}/settings/filters" },
  ],
  limitations: [
    "There is no settings-only read-only Gmail scope for these endpoints. Approve broad gmail.readonly separately, or omit Gmail checks and report forwarding as unknown.",
    "Directory isAdmin alone misses delegated administrators; include isDelegatedAdmin. isEnrolledIn2Sv and isEnforcedIn2Sv are distinct signals.",
    "Follow nextPageToken. Domain-wide delegation and user impersonation require administrator approval; missing logs or settings must remain unknown.",
  ],
  sources: [
    "https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/getAutoForwarding",
    "https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.filters/list",
    "https://developers.google.com/workspace/admin/directory/reference/rest/v1/users",
  ],
};

export const PROVIDER_DOCUMENTATION: Readonly<Record<IntegrationProvider, ProviderDocumentation>> = {
  m365: M365_DOCUMENTATION,
  google: GOOGLE_DOCUMENTATION,
};
