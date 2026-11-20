# Regression tests, integration tests, and hourly reports

Verified against commit `e9c7e01` plus the current local test/fix changes on November 12, 2026.

## Run the complete quality pipeline

```powershell
pnpm test:report
```

This runs the regression/integration suite, TypeScript, ESLint, production build, and the data smoke test. Every step is executed even if an earlier check fails. AI calls are mocked; fresh SQLite databases and evidence directories keep tests separate from real application data. The smoke test covers organization creation, evidence upload/encryption, review, progress, exports, interview completion, and coordinator planning.

Each run saves JSON, HTML, plain text, Vitest results, and individual logs under `data/test-status/<timestamp>/`. `data/test-status/latest.json` points to the newest report's data. Reports identify the commit and whether local changes were present. Concurrent report runs are blocked with a process lock. Nothing pulls, commits, pushes, or deploys automatically.

The final verified run passed all five checks and 163 tests. Added coverage includes:

- Administrator-only staff reads and writes; role revocation and signup role-escalation attempts.
- Active/inactive associates, duplicate assignments, removal, assignment-scoped workspaces, and client-scoped announcements.
- Password reset privacy, invalid/expired/reused tokens, password replacement, account isolation, and untrusted redirect rejection. Origin checks are explicitly enabled because Better Auth skips them by default in test mode.
- Existing-user migration to the default client role, preserved admin roles, and idempotent schema upgrades.
- Staff action input validation, denied writes, successful redirects, and cache invalidation.
- Real multipart evidence upload, encrypted storage, owner download/deletion, cross-tenant denials, and export privacy.
- Reset isolation across two organizations, including evidence files, staff assignments, updates, accounts, and enrollment records.
- Report failure handling, missing results, Central-time formatting, HTML escaping, and contradictory test counts.
- Gmail MIME encoding, fixed-recipient enforcement, credential validation, authorization failures, uncertain-send handling, and Windows-encrypted token round trips.

Two regressions were reproduced before fixing them: non-CMMC staff notes had undefined statuses; the legacy reset deleted every organization. The new reset requires the current owner's organization and uses scoped evidence selection plus foreign-key cascading deletion.

## Gmail API delivery (recommended for this local schedule)

The recipient defaults to the authenticated sender stored in the encrypted local credential. Set `KOITECC_REPORT_RECIPIENT` locally to send to another address. No personal address is embedded in the source. A Google Cloud project, a Desktop app OAuth client, and one sign-in by the sending Gmail user are required. A service account or API key alone cannot authorize this personal-mailbox flow.

1. In [Google Cloud Console](https://console.cloud.google.com/), select or create a project, then enable **Gmail API** under **APIs & Services → Library**.
2. Configure **Google Auth platform → Branding** with an app name such as `KOITECC Test Reports`, your support email, and contact email.
3. Configure **Audience**: use **External** for a personal Gmail account. While publishing status is **Testing**, add your sending Google account under **Test users**. Internal is only appropriate for users in the project's Workspace organization.
4. Under **Data Access**, add only `https://www.googleapis.com/auth/gmail.send`. This grants sending permission and does not grant inbox-reading access.
5. Under **Clients → Create client**, choose **Desktop app**. Download its JSON and save it at `data/test-notifications/gmail-client.json`. This directory is ignored by Git. Do not paste the client secret or tokens into chat.
6. From the repository root, run the following with the actual Gmail sender address:

```powershell
pnpm gmail:setup --sender your-sender@gmail.com
```

Open the printed Google authorization URL in your browser, sign in as that sender, and consent. A local callback on `127.0.0.1` receives the authorization code. The setup uses state validation and PKCE, requests offline access, and stores only the refresh credential and sender identity in `data/test-notifications/gmail-token.dpapi`. Windows user encryption protects the stored credential; the scheduled task must run as this same Windows user. Setup sends no email.

7. Send the latest saved report and confirm it appears in Gmail Sent mail and the destination inbox:

```powershell
pnpm gmail:send
```

For fresh test results followed by a send:

```powershell
pnpm test:report --send-email --email-provider=gmail
```

Successful Gmail responses create a local receipt beside the report with the Gmail message ID and timestamp. Sending is never automatically retried after an uncertain network result; check Sent mail first to avoid duplicates. Refresh/authorization errors are redacted and direct you to reconnect.

For external apps in Testing, Google generally expires refresh tokens after seven days when Gmail send access is requested. Re-run setup when necessary. A Workspace account can also require administrator approval. Google documents [Desktop OAuth setup](https://developers.google.com/workspace/gmail/api/quickstart/nodejs), [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), and [refresh-token expiry](https://developers.google.com/identity/protocols/oauth2#expiration).

## Optional SMTP delivery

The recipient defaults to `KOITECC_SMTP_FROM`; override it with `KOITECC_REPORT_RECIPIENT`. The sender requires these environment variables, available to the Windows user that runs the task:

| Variable | Meaning |
| --- | --- |
| `KOITECC_SMTP_HOST` | SMTP server that supports STARTTLS |
| `KOITECC_SMTP_PORT` | Optional port; defaults to 587 |
| `KOITECC_SMTP_USER` | Authenticated sending account |
| `KOITECC_SMTP_PASSWORD` | Dedicated app password or SMTP credential |
| `KOITECC_SMTP_FROM` | Sender address authorized by that server |

Keep credentials outside the repository and do not paste them into test output. A Gmail plugin connection is independent of this scheduled script and does not supply SMTP credentials to Windows tasks.

After configuring the sender, verify one real delivery:

```powershell
pnpm test:report --send-email --email-provider=smtp
```

This sends both plain-text and HTML versions with test counts, individual check results/durations, failing test names, commit identity, and explicit mock/live verification limits. Raw test logs, reset tokens, credentials, and uploaded evidence are not attached. SMTP acceptance is reported only after the send call succeeds; inbox delivery must still be confirmed separately. A send failure exits with a nonzero status and preserves the local report.

## Hourly schedule requested for November 12

Gmail authorization and live sending were verified on November 12 using the configured local sender and recipient. No personal addresses, passwords, or token contents are included in this document.

The Windows task `KOITECC hourly test status` was registered for November 12, 11 a.m.–11 p.m. Central, then disabled and stopped at the owner's request. No further scheduled emails are active. Its manual verification run started at 10:14:51 a.m., passed all five quality checks and 163 tests, and completed with Task Scheduler exit code `0`. Gmail accepted that fresh report at 10:15:43 a.m.; the local message receipt is saved beside its report in `data/test-status/2026-11-12T16-14-51-870Z/`. The earlier 10 a.m. slot could not be scheduled retroactively.

For future setup, register a schedule only after verifying delivery (the script refuses to replace an existing task):

```powershell
powershell -NoProfile -File scripts/register-test-status.ps1 -EmailProvider gmail
```

Its proposed defaults are November 12, 2026, at 10:00 a.m. Central, repeating hourly until midnight (10 a.m.–11 p.m. start times). The task runs on the current local checkout, then sends the result when checks finish. `-StartAt` and `-EndAt` can select a different range. Use a future start time if the original start has passed. The registrar refuses to replace an existing task, activate email without the selected provider's configuration, or use a timezone other than Central. It does not backfill past emails. For example, after the original 10 a.m. slot has passed:

```powershell
powershell -NoProfile -File scripts/register-test-status.ps1 -EmailProvider gmail -StartAt '2026-11-12T11:00:00' -EndAt '2026-11-13T00:00:00'
```

The machine must be awake and that Windows user must be logged on. Overlapping instances are ignored. These are local Windows tasks, not a hosted delivery service. `-ReportOnly` explicitly creates a local-report schedule without email, if desired.

Inspect or remove the specific task with:

```powershell
Get-ScheduledTask -TaskName 'KOITECC hourly test status'
Get-ScheduledTaskInfo -TaskName 'KOITECC hourly test status'
Unregister-ScheduledTask -TaskName 'KOITECC hourly test status' -Confirm
```

## Verification limits

Passing mocks verifies orchestration and data handling, not the quality of a live AI model or Microsoft/Google directory verification. Gmail send authorization is a separate integration for test-status reports; it does not connect the platform's identity-evidence collector. Production password-reset email delivery remains unconfigured. Gmail accepted both the initial test send and the scheduled-task verification send; destination inbox placement was not independently inspected. No repository changes were pushed or deployed by this setup.
