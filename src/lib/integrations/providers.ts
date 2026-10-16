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
};

// Microsoft Graph — all scopes are ".Read.All" application permissions (read-only). No write/
// mutate scope is requested. These cover: MFA registration + Conditional Access policy (enforcement),
// directory roles (admin count), mailbox forwarding rules (external auto-forward), sign-in activity
// (inactive 90+ day accounts), and legacy authentication (authentication methods / sign-in logs).
export const M365_DOCUMENTATION: ProviderDocumentation = {
  label: "Microsoft 365 (Microsoft Graph)",
  scopes: [
    "User.Read.All",
    "UserAuthenticationMethod.Read.All",
    "Policy.Read.All",
    "RoleManagement.Read.Directory",
    "AuditLog.Read.All",
    "MailboxSettings.Read",
  ],
  scopeRationale:
    "Read-only application permissions only. User.Read.All + AuditLog.Read.All give account " +
    "inventory and last sign-in; UserAuthenticationMethod.Read.All + Policy.Read.All read MFA " +
    "registration and Conditional Access enforcement; RoleManagement.Read.Directory counts admins; " +
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
      path: "/v1.0/users/{id}/mailboxSettings",
    },
    {
      purpose: "Legacy (basic) authentication sign-ins",
      method: "GET",
      path: "/v1.0/auditLogs/signIns?$filter=clientAppUsed in ('IMAP4','POP3','SMTP','Other clients')",
    },
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
    "https://www.googleapis.com/auth/gmail.settings.basic", // read of forwarding settings
  ],
  scopeRationale:
    "Read-only Admin SDK scopes. directory.user.readonly gives account inventory, admin flag, " +
    "2-Step Verification enrollment, and last-login; reports.audit.readonly reads sign-in activity " +
    "for legacy-auth and inactivity; gmail.settings.basic reads forwarding settings. No write scope " +
    "(no admin.directory.user, no gmail.settings.sharing beyond read) is requested.",
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
      path: "/gmail/v1/users/{userId}/settings/forwardingAddresses",
    },
  ],
};

export const PROVIDER_DOCUMENTATION: Readonly<Record<IntegrationProvider, ProviderDocumentation>> = {
  m365: M365_DOCUMENTATION,
  google: GOOGLE_DOCUMENTATION,
};
