# Security review before merging reporting and regression coverage

Review branch: `fix/regression-security-gmail-reports`.

The original branch was verified before integrating upstream: 165 tests, TypeScript, ESLint, production build, and isolated smoke test passed. The latest upstream `main` (`efb4610`) was then pulled and merged into this review branch. Upstream's expanded associate workflow introduced an additional release blocker described below. This document does not claim the integrated branch is ready to merge.

## Credential exposure checks

- Git candidates and available Git history were scanned for recognizable credential patterns and exact copies of the existing local environment/client secret values. No matches were found. The scan did not print secret values.
- Gmail client credentials, the Windows-encrypted refresh token, environment files, generated reports, and runtime evidence remain ignored by Git.
- Personal notification addresses were removed from source and documentation. Reports default to the locally authorized sender; `KOITECC_REPORT_RECIPIENT` can override the recipient locally.
- Additional ignore rules cover common OAuth credential downloads and local AWS configuration.
- These checks are scoped source/history checks, not a claim that every possible secret or runtime vulnerability has been ruled out.

## Fixed authorization regression

The upstream `assignKoiTeccAssociate` allowed a caller with access to their own associate profile to assign that profile to an otherwise unassigned organization. Since workspace reads trust that assignment, this allowed the caller to grant themselves client access. The function now requires administrator authorization, consistent with the documented organization-assignment workflow. A regression test covers denial for a real linked associate.

## Remaining merge blocker: unverified associate enrollment

`linkKoiTeccAssociateForCurrentUser` in `src/lib/koitecc.ts` links a user to an active employee record by matching email and then sets that user's role to `associate`. Public email/password signup currently permits an unverified email (`requireEmailVerification: false` in `src/lib/auth.ts`). Matching an unverified signup address to an employee record does not establish employee identity.

The isolated `src/lib/koitecc-security.test.ts` regression expects an unverified claimant to be denied. That test currently fails because the caller is linked and promoted. This is an authorization defect, not an observed credential leak or evidence of a real account compromise.

Do not merge this branch into `main` until the enrollment path requires an appropriate trust boundary. Two options are explicit administrator approval of new employee accounts or verified email ownership before linking. The choice affects the staff signup workflow and should be settled before implementation. Existing legitimate associates should retain access to their assigned workspaces once enrolled through the chosen control.

The hourly email task remains disabled at the owner's request. Verification commands in this review do not send emails or reactivate the schedule.
