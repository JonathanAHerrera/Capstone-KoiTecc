# Phase 7–8 status

> Current handoff (2026-10-16). This file supersedes the older “stopped after Phase 7” note.
> Phase 8 is implemented in the current tree. The older 49-test count and “not started” list are
> historical and should not be used as the current status.

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

## Other completed work that the older handoff omits

- Phase 6 outside scan remains complete: seven passive DNS/HTTP/TLS checks, injectable probes,
  weighted grading, top-three fixes, domain normalization, public rate-limited API, public mobile
  page, and signup CTA. It does not perform active port scanning or exploitation.
- The AI barrel (`src/ai/index.ts`) exports the scam checker and its schemas. The scam API is an
  authenticated multipart route with per-user rate limiting, no-store responses, a 20,000-character
  text limit, and JPEG/PNG/GIF/WebP photos capped at 5 MB.
- Scam help requests create durable, organization-scoped `reviewer_tasks` records containing only
  categorical verdict metadata. They do not store the original message, model prose, or image.
- Incident help requests are idempotent while an existing task is open. Incident records support
  status (`open`, `contained`, `closed`), notes, and later resident-count updates; updates recalculate
  the Texas deadlines and append an audit ledger entry.
- Signup now uses an explicit same-origin auth request with a 15-second timeout, visible server
  errors, and guaranteed button recovery. The button validates on submit instead of silently staying
  disabled. Passwords must be at least 12 characters, and login uses email rather than a username.
- The SQLite test harness uses isolated worker processes and asynchronous cleanup for Windows file
  handles. This is test infrastructure only and does not alter production data.
- The current production route inventory includes `/scan`, `/scam-check`, `/incident`, and
  `/incident/[incidentId]`, plus `/api/scan`, `/api/scam-check`, and the Better Auth API.

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
- There is no production deployment configuration or migration runner beyond the startup schema
  initializer. Before deployment, define a persistent `CMMC_DB_PATH` or managed libSQL/SQLite
  strategy, persistent encrypted uploads storage, `BETTER_AUTH_SECRET`, and the evidence encryption
  key in the hosting environment. Do not reuse development secrets.
- The rate limiter is process-local. Multiple instances or restarts do not share limits; use a
  shared store before relying on it for production abuse prevention.
- There is no email delivery, password-reset email, reviewer notification, task assignment, or
  reviewer inbox. Account creation is immediately usable because email verification is intentionally
  disabled until delivery is implemented.
- No automated end-to-end browser test currently covers typing into the signup form, receiving the
  auth cookie, redirecting after signup, camera/photo selection, or Safari viewport behavior. The
  unit and route tests do not replace that QA.
- AI provider failures fall back to a medium-risk human-review response. The Anthropic integration
  has not been exercised with a live API key in CI; configure and test it separately before enabling
  paid requests.
- The in-process database schema initializer has no backup, restore, rollback, or migration-history
  UI. Back up the database and uploads before schema changes.

## Security and product decisions to preserve

- Keep `BETTER_AUTH_SECRET` and `EVIDENCE_ENCRYPTION_KEY` out of source control and rotate them with
  a documented recovery plan. Rotating the evidence key without re-encryption makes old uploads
  unreadable.
- Keep OAuth disabled until the provider review is complete. Microsoft inbox rules cover rule-based
  forwarding, not every Exchange transport or mailbox-level forwarding path. Google forwarding
  checks require broad `gmail.readonly` access; omitting that scope must produce `unknown`, never a
  passing result.
- Keep missing pages, unavailable logs, invalid activity dates, and empty directories as `unknown`.
  Do not turn missing integration data into a pass.
- Keep legal copy framed as educational, documented, or aligned with a requirement. Do not claim
  compliance, protection, guarantees, or that a safe harbor has been achieved.
- Keep raw message text, photos, account numbers, and model responses out of reviewer-task metadata
  and the ledger. The current scam pipeline redacts text identifiers but does not redact pixels
  inside images.

## Recommended next work, in order

1. Approve or reject the provider scopes in `src/lib/integrations/providers.ts`; if approved, build
   token storage, consent/revocation, pagination, retries, tenant isolation, and a scheduled job for
   the `IntegrationConnector` seam.
2. Add a real reviewer workflow: inbox, assignment, status transitions, notification delivery,
   acknowledgement, and retention policy for help requests.
3. Add password-reset/email delivery and decide whether email verification should be enabled.
4. Add browser end-to-end coverage on Chromium and iPhone/iPad Safari, including signup and the
   upload/camera flows.
5. Add production operations: shared rate limiting, database/upload backups, migration history,
   health checks, structured logs, error monitoring, and secret rotation procedures.
6. Add OCR or a local image-redaction step before sending photos to an AI provider, or require users
   to confirm that a photo contains no sensitive identifiers.

## Source checks

- [Microsoft inbox rules and read permission](https://learn.microsoft.com/en-us/graph/api/mailfolder-list-messagerules?view=graph-rest-1.0)
- [Microsoft MFA registration report permissions](https://learn.microsoft.com/en-us/graph/api/authenticationmethodsroot-list-userregistrationdetails?view=graph-rest-1.0)
- [Google auto-forwarding endpoint and scopes](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/getAutoForwarding)
- [Google filter endpoint and scopes](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.filters/list)
- [Texas AG breach reporting guidance](https://www.texasattorneygeneral.gov/consumer-protection/data-breach-reporting)
