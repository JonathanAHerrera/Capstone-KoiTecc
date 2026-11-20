# Security review before merging reporting and regression coverage

Review branch: `fix/regression-security-gmail-reports`.

The latest upstream `main` (`efb4610`) was pulled and merged into this review branch. The expanded associate workflow exposed two authorization defects, both addressed below. Final validation covers the combined branch, including the approval migration.

## Credential exposure checks

- Git candidates and available Git history were scanned for recognizable credential patterns and exact copies of the existing local environment/client secret values. No matches were found. The scan did not print secret values.
- Gmail client credentials, the Windows-encrypted refresh token, environment files, generated reports, and runtime evidence remain ignored by Git.
- Personal notification addresses were removed from source and documentation. Reports default to the locally authorized sender; `KOITECC_REPORT_RECIPIENT` can override the recipient locally.
- Additional ignore rules cover common OAuth credential downloads and local AWS configuration.
- These checks are scoped source/history checks, not a claim that every possible secret or runtime vulnerability has been ruled out.

## Fixed authorization regression

The upstream `assignKoiTeccAssociate` allowed a caller with access to their own associate profile to assign that profile to an otherwise unassigned organization. Since workspace reads trust that assignment, this allowed the caller to grant themselves client access. The function now requires administrator authorization, consistent with the documented organization-assignment workflow. A regression test covers denial for a real linked associate.

## Fixed enrollment regression: administrator approval

Previously, `linkKoiTeccAssociateForCurrentUser` matched an employee's email and promoted the account to `associate`, while public signup permitted unverified email addresses. That allowed an unverified claimant to obtain employee access. This was a demonstrated authorization defect, not evidence of a real account compromise.

Email matching now identifies a pending account without mutating roles or bindings. An administrator must review identity through a trusted channel and explicitly approve the specific account ID in Employee Management. Approval atomically binds the account, updates its role, and records the administrator in an audit event. Workspace reads require the approved binding and current database role. Revocation clears approval and blocks subsequent requests from existing sessions.

The migration deliberately leaves approval fields empty on legacy records. **Existing associates must be reapproved by an administrator**; email matching and old automatic bindings do not grandfather access. Organization assignments are preserved. Public client signup remains available without granting staff privileges.

Regression coverage includes unauthorized approval/revocation, account mismatch, inactive employees, legacy bindings, limited organization access, immediate revocation, idempotent approval, audit attribution, transactional rollback if auditing fails, server-action confirmation requirements, and repeat migrations preserving explicit approvals. Administrator identity verification remains a human responsibility.

## Final validation

On November 20, 2026, the combined branch passed all 184 regression and integration tests, TypeScript, ESLint, the production build, and the isolated data smoke test. The real Better Auth HTTP integration verifies that a signup cookie cannot claim employee access, then respects administrator approval and revocation without another sign-in. AI behavior uses deterministic mocks; live provider quality and Google/Microsoft OAuth are outside this validation.

The credential scan found no matches across 344 candidate files or available Git history, including exact comparisons against three local secret values. The hourly email task was confirmed disabled at the owner's request. Verification commands do not send emails or reactivate the schedule.
