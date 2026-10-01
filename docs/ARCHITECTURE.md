# CMMC Ready — Architecture Contract

Mobile-first web app that walks a small defense contractor through CMMC Level 1 (and a Level 2 subset) requirement by requirement: see what is missing, open a requirement, upload proof (photo / file / video / text), get an AI review, watch progress fill, export a readiness package.

All builder agents code against THIS document. If you must deviate, update this file in the same change.

## Stack (fixed)
- Next.js 16 App Router, React 19, TypeScript strict, `src/` dir, `@/*` alias
- Tailwind CSS v4 (CSS-first config in `src/app/globals.css` via `@theme`)
- `motion` (framer-motion successor, import from `motion/react`), `lucide-react`, `canvas-confetti`
- DB: SQLite file via `@libsql/client` + `drizzle-orm` (`drizzle-orm/libsql`). DB file: `data/app.db`. Schema in `src/db/schema.ts`, client in `src/db/client.ts`. Tables are created at startup with `CREATE TABLE IF NOT EXISTS` from `src/db/migrate.ts` (no drizzle-kit migrations needed for MVP).
  - Env overrides: `CMMC_DB_PATH` (default `data/app.db`) and `CMMC_UPLOADS_DIR` (default `data/uploads`), both resolved relative to `process.cwd()`. `src/db/client.ts` exports `getDb(): Promise<Database>` (async because libsql `execute` is async and the lazy `ensureSchema()` must finish first); never import a sync `db` constant.
- Uploads: stored on disk at `data/uploads/<fileId>.<ext>`; served by `GET /api/files/[fileId]`.
- AI review: `@anthropic-ai/sdk`, model `claude-opus-5-5` (override `CMMC_REVIEWER_MODEL`). When `ANTHROPIC_API_KEY` is unset the reviewer returns a deterministic MOCK verdict so the whole app works end-to-end without spending money.
- Package manager: pnpm. Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck` (`tsc --noEmit`).
- No auth. Single organization per database (the app is a local/pilot MVP). Everything keys off the one org row.

## Static practice catalog
`src/data/cmmc-practices.json` (produced by research) — array of `Practice`:
```ts
type EvidenceKind = "photo" | "document" | "screenshot" | "video" | "text";
type Practice = {
  id: string;            // "AC.L1-b.1.i"
  level: 1 | 2;
  family: string;        // "AC"
  familyName: string;    // "Access Control"
  nist171Ref: string;    // "3.1.1"
  title: string;
  officialText: string;
  plainEnglish: string;
  assessmentObjectives: string[];
  whyItMatters: string;
  evidenceTypes: EvidenceKind[];
  evidenceExamples: string[];
  aiVerifiable: "full" | "partial" | "none";
  aiReviewGuidance: string;
  commonFailures: string[];
  estimatedEffortMinutes: number;
  pointValue: number;    // 0 for L1
};
```
Access via `src/lib/practices.ts`: `getAllPractices()`, `getPractice(id)`, `getPracticesForLevel(level)` (level 2 includes level 1 practices), `getFamilies(level)` → ordered `{ code, name, practices[] }[]`. Family display order = the 14 NIST families in canonical order (AC, AT, AU, CM, IA, IR, MA, MP, PS, PE, RA, CA, SC, SI).

## Database schema (`src/db/schema.ts`, drizzle sqlite-core)
```
organizations: id (text pk, nanoid), name, targetLevel (int 1|2), handlesCui (int bool),
  employeeCount (text bucket: "1-10" | "11-50" | "51-250" | "250+"), itSetup (text: "cloud" | "onprem" | "mixed" | "unsure"),
  hasItProvider (int bool), createdAt (text ISO)
submissions: id (pk), orgId (fk), practiceId (text), status (text), note (text, nullable),
  createdAt, updatedAt
  status ∈ "draft" | "submitted" | "reviewing" | "accepted" | "needs_work"
  UNIQUE(orgId, practiceId)  — one living submission per practice; re-submits update it.
evidence_files: id (pk), submissionId (fk), kind (text EvidenceKind), originalName, mimeType, sizeBytes (int),
  storagePath (text, relative to data/uploads), sha256 (text), width/height (int nullable), createdAt
reviews: id (pk), submissionId (fk), verdict (text "accepted" | "needs_work"), confidence (real 0-1),
  summary (text), objectiveFindings (text JSON: {objective: string, met: boolean, note: string}[]),
  missingItems (text JSON string[]), nextSteps (text JSON string[]), reviewerModel (text), isMock (int bool),
  rawResponse (text nullable), createdAt
```
Derived practice status (never stored): `not_started` (no submission) → `in_progress` (draft) → `under_review` (submitted|reviewing) → `accepted` | `needs_work`.

## Server modules
- `src/db/client.ts` — singleton drizzle client; calls `ensureSchema()` once. `getDb()` is async (see Stack).
- `src/lib/practice-types.ts` — `Practice`, `EvidenceKind`, `DerivedPracticeStatus`, `PracticeFamily`, `CmmcLevel`, `CANONICAL_FAMILY_ORDER`, `FAMILY_NAMES`, `EVIDENCE_KINDS`.
- `src/lib/org.ts` — `getOrganization()`, `requireOrganization()` (throws if none), `createOrganization(input)` (validates with `CreateOrganizationInputSchema`; if an org already exists it updates that row in place instead of inserting a second one, preserving the single-org invariant).
- `src/lib/submissions.ts` — `getOrCreateDraftSubmission(practiceId)`, `getSubmissionWithEvidence(practiceId)` → `{ submission, evidenceFiles, latestReview } | null`, `getSubmissionWithEvidenceById(submissionId)`, `getSubmissionById(submissionId)`, `getSubmissionForPractice(practiceId)`, `listPracticeStatuses()` → `Record<practiceId, DerivedPracticeStatus>` (every catalog practice present; missing → `not_started`), `saveSubmissionNote(practiceId, note)`, `markSubmitted(submissionId)`, `markSubmissionStatus(submissionId, status)`, `deriveStatusFromSubmission(submission | null)` (pure).
- `src/lib/reviews.ts` — review-row helpers shared by submissions and the reviewer: `ReviewRecord` (JSON columns parsed into typed arrays), `getLatestReviewForSubmission(submissionId)`, `listReviewsForSubmission(submissionId)`, `insertReview(input)`.
- `src/lib/evidence.ts` — `storeEvidenceFile(submissionId, kind, file: File)` (DEVIATION: takes `kind` as the 2nd arg because the row needs it; validates kind ∈ practice.evidenceTypes, size ≤ 25 MB, allowed MIME; throws `EvidenceValidationError` with `statusCode`), `deleteEvidenceFile(id)` → boolean, `readEvidenceFile(id)` → `{ file, absolutePath } | null` (caller streams or reads), `readEvidenceFileBytes(file)`, `getEvidenceFile(id)`, `listEvidenceFilesForSubmission(submissionId)`, `isEvidenceKind(value)`, `MAX_EVIDENCE_FILE_BYTES`. `width`/`height` are stored as null for MVP (no image decoder dependency).
- `src/lib/progress.ts` — `computeProgress(level)` → `{ level, total, accepted, needsWork, underReview, inProgress, notStarted, percent, sprsScore? }`; `computeProgressFromStatuses(level, statuses)` is the pure variant. SPRS score (L2 only) = 110 − Σ pointValue of practices not accepted, floor −203.
- `src/lib/reviewer/` — `reviewSubmission(submissionId)`:
  - `index.ts` picks real vs mock reviewer based on `process.env.ANTHROPIC_API_KEY`. `reviewSubmission(submissionId)` → `ReviewRecord`: marks the submission `reviewing`, runs the reviewer, inserts the `reviews` row, sets status to the verdict. If the reviewer throws unexpectedly the submission is set to `needs_work` before rethrowing so it never sticks in `reviewing`.
  - `prompt.ts` builds the system prompt (role: CMMC readiness reviewer, NOT an assessor) and the per-practice user content: practice text, objectives, aiReviewGuidance, commonFailures, the worker's note, then each evidence file as an `image` block (jpeg/png/gif/webp), a `document` block (pdf), or extracted text (txt/md/csv). Videos: not sent to the model; pass a text stub "video uploaded: <name>, <size>" and let the reviewer ask for a screenshot/photo if needed. The system prompt enforces every rule in docs/SPEC.md "AI reviewer contract": readiness reviewer not assessor/C3PAO; be specific about what is missing; visible dates/names are the strongest signal; a single-device screenshot does not prove fleet coverage; reject unreadable/irrelevant/stock-looking evidence; flag visible secrets (passwords, SSNs, keys) and ask for a redacted re-upload without repeating the secret; summary ≤ 2 sentences in second person; never claim certification.
  - `schema.ts` zod schema `ReviewVerdictSchema` = { verdict, confidence, summary, objectiveFindings[], missingItems[], nextSteps[] }.
  - `anthropic.ts` uses `client.messages.parse({ model, max_tokens: 4000, output_config: { format: zodOutputFormat(ReviewVerdictSchema) }, system, messages })`. Parse `response.parsed_output`; guard null → store as needs_work with summary "Reviewer returned an unreadable response". Check `response.stop_reason === "refusal"` first. Any SDK error is caught and stored as a `needs_work` review with summary `Automated review failed: <message>` (`isMock: false`); the function never throws. Images over 5 MB and non-JPEG/PNG/GIF/WebP images are replaced by a text stub asking for a re-upload (the Messages API rejects them).
  - `mock.ts` returns `accepted` when ≥1 evidence file of an allowed kind exists and the note is ≥ 20 chars, else `needs_work` with concrete missingItems derived from `evidenceExamples`. Deterministic. `isMock: true`.
  - Writes a `reviews` row, sets submission status to the verdict.
- `src/lib/export.ts` — `buildReadinessPackage()` → markdown string: `# CMMC Readiness Package` header, the fixed disclaimer line ("This readiness package is a self-assessment aid, not a CMMC assessment or certification. Only a C3PAO/DIBCAC certifies; only your Affirming Official affirms in SPRS."), org profile, level + counts + % ready (+ SPRS for L2), per-family table (ID, title, NIST ref, status, evidence count, last review), POA&M table (all needs_work + not_started: ID, title, status, POA&M eligible = L2 && pointValue 1, missing items, next step, effort), evidence index (file, kind, type, size, SHA-256, uploaded, file id), submitter notes.

## Routes
- `/` → redirects to `/onboarding` if no org, else `/path`.
- `/onboarding` — one-question-per-screen questionnaire (name, CUI?, size, IT setup, IT provider?) → creates org → `/path`.
- `/path` — home: progress ring + stats, family sections with practice nodes (Duolingo path styling), tap → `/practice/[id]`.
- `/practice/[id]` — plain-English explanation, objectives, evidence examples, uploader (camera / file / video), note field, "Submit for review" → runs review → shows verdict inline (`/practice/[id]/result` is NOT a separate page; use a client state + route refresh). Previous review visible on return.
- `/summary` — big score, family breakdown, POA&M list, "Download readiness package (.md)" and "Copy".
- API route handlers (`src/app/api/...`): `POST /api/evidence` (multipart: submissionId, kind, file) → `{ file }`; `DELETE /api/evidence/[id]`; `GET /api/files/[id]` (streams file with content-type); `POST /api/review` ({ submissionId }) → `{ review }`; `GET /api/export` (text/markdown download).
- Mutations without files use Server Actions in `src/app/actions.ts` (`"use server"`): `createOrganizationAction(input | FormData)`, `saveSubmissionNoteAction(practiceId, note)`, `getOrCreateDraftSubmissionAction(practiceId)`. Each returns `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }` and never redirects; the UI decides where to navigate. `createOrganizationAction` calls `revalidatePath("/", "layout")`.
- Route handler responses: `POST /api/evidence` → 201 `{ file }` or `{ error }` with 400/404/413/415; `DELETE /api/evidence/[id]` → `{ deleted: true, id }` or 404; `GET /api/files/[id]` streams with `Content-Type`, `Content-Length`, inline `Content-Disposition`, `Cache-Control: private, max-age=3600`; `POST /api/review` → `{ review }` or 404/500; `GET /api/export` → 404 `{ error }` when no org exists.
- Smoke test: `pnpm smoke` (or `CMMC_DB_PATH=/tmp/cmmc-smoke.db pnpm tsx scripts/smoke.ts`) exercises org → draft → evidence → mock review → statuses → progress → export against a temp DB.

## UI conventions (see docs/research/04-ui-inspiration.md for the full design spec)
- Mobile-first, max content width 640px centered on desktop, 16px gutters, bottom primary action bar with `env(safe-area-inset-bottom)` padding, `min-h-dvh` not `100vh`.
- 3D "chunky" buttons: 2px translate + border-bottom shrink on press. 44px minimum touch targets.
- Design tokens in `globals.css` `@theme`. Font: Nunito via `next/font/google`.
- Components in `src/components/ui/` (primitives) and `src/components/` (feature components). Each component file exports one named component. Verbose, English-like names (see repo CLAUDE.md naming rules).

## Non-goals (MVP)
Auth, multi-tenant, cloud storage, real C3PAO workflow, policy document generation, Level 3, email, payments.
