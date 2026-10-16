# Phase 7–8 status

The repository already contained the Phase 8 implementations when this audit began. This pass
completed incident editing and hardened the existing features rather than recreating them.

## Implemented and verified

- Authenticated scam checker: pasted text, pasted forwarded email, and photo uploads; English and
  Spanish payment-change detection; forced callback and escalation guidance; mock analyzer;
  structured AI results; text redaction and injection neutralization before analysis.
- Oversized text is rejected rather than silently truncated. Photo types and the 5 MB upload limit
  match the model adapter. Photo-only results retain the analyzer's detected language.
- Incident reporting and editing: kind, determination date, resident count, notes, and status.
  Invalid calendar dates are rejected. Updating resident counts recomputes the 250-resident AG
  threshold and records an incident update in the ledger.
- Org-scoped incident reads, updates, and help requests. Reviewer-task references cannot point to
  another tenant's incident. Repeated sequential incident-help requests reuse the open task.
- Help requests persist categorical scam metadata rather than model prose that could echo private
  message content. The UI explains that requests are recorded locally, without external dispatch.
- Empty integration directories produce unknown results. Inactivity includes the exact 90-day
  boundary. Provider documentation corrects the forwarding endpoint and Google scope tradeoff.
- Test lifecycle closes SQLite clients and cleans up this run's unique temporary directory after
  worker exit, avoiding native SQLite file locks on Windows.

Validation: 88 tests in 13 files, TypeScript, ESLint, and production build. Tests use mocked AI;
no paid model or tenant API calls were made. Browser/Safari interaction was not manually verified.

## Still gated or limited

- Live Microsoft/Google OAuth, credentials, token storage, tenant calls, and scheduled weekly runs
  remain unbuilt pending scope/endpoint approval in `src/lib/integrations/providers.ts`.
- Gmail `gmail.readonly` is read-only but grants broad mailbox access. `gmail.settings.basic` is
  not read-only. Approve the documented tradeoff separately or leave forwarding checks unknown.
- Reviewer tasks are durable in-app records. There is no staffed reviewer inbox, assignment flow,
  or external notification delivery. A help request does not promise a responder will contact you.
- Photos require an AI provider to read them. Offline mode asks for pasted text. Image pixels are
  not automatically redacted; the upload page explicitly tells users to hide sensitive data first.
- Notice drafts retain source-catalog text and TODO_SOURCE placeholders for counsel to review.
  They are not ready-to-send legal notices.

## Source checks

- [Microsoft inbox rules and read permission](https://learn.microsoft.com/en-us/graph/api/mailfolder-list-messagerules?view=graph-rest-1.0)
- [Microsoft MFA registration report permissions](https://learn.microsoft.com/en-us/graph/api/authenticationmethodsroot-list-userregistrationdetails?view=graph-rest-1.0)
- [Google auto-forwarding endpoint and scopes](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/getAutoForwarding)
- [Google filter endpoint and scopes](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.filters/list)
- [Texas AG breach reporting guidance](https://www.texasattorneygeneral.gov/consumer-protection/data-breach-reporting)
