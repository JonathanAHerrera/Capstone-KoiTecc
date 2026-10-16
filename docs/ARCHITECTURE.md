# CMMC Ready — Architecture Contract

Mobile-first web app that walks a small defense contractor through CMMC Level 1 (and a Level 2 subset) requirement by requirement: see what is missing, open a requirement, upload proof (photo / file / video / text), get an AI review, watch progress fill, export a readiness package.

**Texas-first positioning:** the same engine now also drives three additive Texas tracks — TDPSA (consumer privacy), Texas Business & Commerce Code Ch. 521 (breach notification), and TAC §202 / DIR (state information-security standards). CMMC stays the original, unchanged federal track. See "Multi-framework (Texas) extension" below. The guiding rule is **additive**: CMMC behavior, the Duolingo onboarding, SPRS, and POA&M are preserved exactly; every framework-specific behavior is guarded behind `framework === "cmmc"`.

All builder agents code against THIS document. If you must deviate, update this file in the same change.

## Stack (fixed)
- Next.js 16 App Router, React 19, TypeScript strict, `src/` dir, `@/*` alias
- Tailwind CSS v4 (CSS-first config in `src/app/globals.css` via `@theme`)
- `motion` (framer-motion successor, import from `motion/react`), `lucide-react`, `canvas-confetti`
- DB: SQLite file via `@libsql/client` + `drizzle-orm` (`drizzle-orm/libsql`). DB file: `data/app.db`. Schema in `src/db/schema.ts`, client in `src/db/client.ts`. Tables are created at startup with `CREATE TABLE IF NOT EXISTS` from `src/db/migrate.ts` (no drizzle-kit migrations needed for MVP).
  - Env overrides: `CMMC_DB_PATH` (default `data/app.db`) and `CMMC_UPLOADS_DIR` (default `data/uploads`), both resolved relative to `process.cwd()`. `src/db/client.ts` exports `getDb(): Promise<Database>` (async because libsql `execute` is async and the lazy `ensureSchema()` must finish first); never import a sync `db` constant.
- Uploads: stored on disk at `data/uploads/<fileId>.<ext>`; served by `GET /api/files/[fileId]`.
- AI review: `@anthropic-ai/sdk`, model `claude-opus-5-5` (override `CMMC_REVIEWER_MODEL`). When `ANTHROPIC_API_KEY` is unset the reviewer returns a deterministic MOCK verdict so the whole app works end-to-end without spending money.
- Package manager: pnpm. Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck` (`tsc --noEmit`), `pnpm test` / `pnpm test:watch` (Vitest; config in `vitest.config.ts`, `vite-tsconfig-paths` resolves the `@/` alias, tests are `src/**/*.test.ts(x)`).
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
Access via `src/lib/practices.ts`: `getAllPractices()`, `getPractice(id)`, `getPracticesForLevel(level)` (level 2 includes level 1 practices), `getFamilies(level)` → ordered `{ code, name, practices[] }[]`. Family display order = the 14 NIST families in canonical order (AC, AT, AU, CM, IA, IR, MA, MP, PS, PE, RA, CA, SC, SI). `getAllPractices()`, `getPracticesForLevel()`, and `getFamilies()` stay **CMMC-only** — several callers assume they return the CMMC universe. `Practice` gained optional fields (`framework?`, `groupCode?`, `groupName?`, `legalRef?`) that are absent in the CMMC JSON and normalized on load (`framework ??= "cmmc"`); see the Texas section for framework-aware accessors.

## Database schema (`src/db/schema.ts`, drizzle sqlite-core)
```
organizations: id (text pk, nanoid), name, targetLevel (int 1|2), handlesCui (int bool),
  employeeCount (text bucket: "1-10" | "11-50" | "51-250" | "250+"), itSetup (text: "cloud" | "onprem" | "mixed" | "unsure"),
  hasItProvider (int bool), createdAt (text ISO)
  -- Texas applicability profile (all additive, defaulted so existing rows/onboarding stay valid):
  handlesTexasResidentData (int bool default 0), sellsToStateOfTexas (int bool default 0),
  texasPhysicalPresence (int bool default 0), processesPersonalDataAtScale (int bool default 0),
  enabledFrameworks (text JSON string, default '["cmmc"]')
submissions: id (pk), orgId (fk), practiceId (text), status (text), note (text, nullable),
  framework (text nullable: "cmmc"|"tdpsa"|"tx521"|"tac202" — convenience filter only; correctness relies on namespaced ids),
  createdAt, updatedAt
  status ∈ "draft" | "submitted" | "reviewing" | "accepted" | "needs_work"
  UNIQUE(orgId, practiceId)  — one living submission per practice; re-submits update it. Texas requirement ids are globally namespaced (TDPSA-*, TX521-*, TAC202-*) so this UNIQUE index is unchanged.
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
- `/track/[framework]` — generic Texas track (reuses `PathFamilies` + `ReadinessOverview`); `cmmc` redirects to `/path`, invalid → `notFound()`.
- `/summary/[framework]` — generic Texas summary (by-topic progress + open items + framework export); `cmmc` redirects to `/summary`, invalid → `notFound()`.
- `/applicability` — "What applies to me?" advisor: Texas profile form + per-framework verdict cards with enable/disable-track buttons.
- API route handlers (`src/app/api/...`): `POST /api/evidence` (multipart: submissionId, kind, file) → `{ file }`; `DELETE /api/evidence/[id]`; `GET /api/files/[id]` (streams file with content-type); `POST /api/review` ({ submissionId }) → `{ review }`; `GET /api/export` (text/markdown download).
- Mutations without files use Server Actions in `src/app/actions.ts` (`"use server"`): `createOrganizationAction(input | FormData)`, `saveSubmissionNoteAction(practiceId, note)`, `getOrCreateDraftSubmissionAction(practiceId)`. Each returns `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }` and never redirects; the UI decides where to navigate. `createOrganizationAction` calls `revalidatePath("/", "layout")`.
- Route handler responses: `POST /api/evidence` → 201 `{ file }` or `{ error }` with 400/404/413/415; `DELETE /api/evidence/[id]` → `{ deleted: true, id }` or 404; `GET /api/files/[id]` streams with `Content-Type`, `Content-Length`, inline `Content-Disposition`, `Cache-Control: private, max-age=3600`; `POST /api/review` → `{ review }` or 404/500; `GET /api/export` → 404 `{ error }` when no org exists.
- Smoke test: `pnpm smoke` (or `CMMC_DB_PATH=/tmp/cmmc-smoke.db pnpm tsx scripts/smoke.ts`) exercises org → draft → evidence → mock review → statuses → progress → export against a temp DB.

## UI conventions (see docs/research/04-ui-inspiration.md for the full design spec)
- Mobile-first, max content width 640px centered on desktop, 16px gutters, bottom primary action bar with `env(safe-area-inset-bottom)` padding, `min-h-dvh` not `100vh`.
- 3D "chunky" buttons: 2px translate + border-bottom shrink on press. 44px minimum touch targets.
- Design tokens in `globals.css` `@theme`. Font: Nunito via `next/font/google`.
- Components in `src/components/ui/` (primitives) and `src/components/` (feature components). Each component file exports one named component. Verbose, English-like names (see repo CLAUDE.md naming rules).

## Multi-framework (Texas) extension
The engine is framework-aware along one new dimension, `FrameworkId = "cmmc" | "tdpsa" | "tx521" | "tac202"` (`src/lib/practice-types.ts`, with `FRAMEWORK_ORDER` and a `FRAMEWORKS` metadata record: `shortName`, `fullName`, `jurisdiction`, `tagline`, `disclaimer`, `hasSprs`). CMMC groups by NIST family; Texas frameworks group by their own `groupCode`/`groupName`. Helpers: `frameworkForPractice(practice)` and `resolveGroup(practice)` → `{ code, name }`.

### Framework registry (`src/frameworks/`)
Per-framework behavior is declared as data in a single registry instead of scattered `framework === "cmmc"` guards. `src/frameworks/types.ts` defines `FrameworkDefinition` and `src/frameworks/index.ts` holds the `FRAMEWORK_DEFINITIONS` record plus accessors `getFramework(id)`, `listFrameworks()`, `listFrameworkIds()`, `parseFrameworkId(value)` (narrows an untrusted route/query string), `isDefaultFramework(id)`, and `DEFAULT_FRAMEWORK_ID = "cmmc"`. The registry imports only from `practice-types.ts`, so it is client-safe (no DB/server deps) and cycle-free. Each definition carries: `grouping` (`"nist-family"` for CMMC, `"catalog"` otherwise), `isLevelScoped` (CMMC filters to the org's target level; Texas tracks show every control), `hasDedicatedRoutes` + `homeRoute`/`summaryRoute` (CMMC owns bespoke `/path` + `/summary`; others use `/track/[id]` + `/summary/[id]`), `canDisable` (CMMC is the baseline and cannot be turned off), `scoring` (`{kind:"sprs",max,min}` vs `{kind:"percent"}`), and the export shape (`exports`, `exportStyle` `"cmmc"|"generic"`, `exportFileName`). Call sites read these flags; grep finds no framework string comparisons outside `src/frameworks/` (registry-value comparisons like `getFramework(f).exportStyle === "cmmc"` are the intended replacement). `appliesTo?`/`controls?` are reserved for the later applicability/controls engine. The CMMC readiness-package format is pinned by a characterization snapshot in `src/lib/export.test.ts`.

- **Data:** `src/data/{tdpsa,tx521,tac202}-requirements.json` reuse the `Practice` shape with namespaced ids, `level: 1`, `pointValue: 0`, `nist171Ref: ""`, a `legalRef` statute citation, and `family`/`familyName` mirroring `groupCode`/`groupName`. These are educational, disclaimered subsets — never legal advice or certification.
- **practices.ts:** merges all four catalogs (cross-file duplicate-id guard also guarantees cross-framework id uniqueness). Framework-aware accessors: `getPracticesForFramework(framework)`, `getGroupsForFramework(framework)` (NIST order only for CMMC, else JSON order), `getFrameworkForPractice(id)`. CMMC-only accessors are unchanged.
- **submissions.ts / progress.ts:** `listPracticeStatusesForFramework(framework)`; drafts store the convenience `framework` column. `computeProgressForFramework(framework)` / `computeProgressForFrameworkFromStatuses(framework, statuses)` return a `FrameworkProgressSummary`; `sprsScore` is computed **only** when the registry reports `getFramework(framework).scoring.kind === "sprs"`. The CMMC `computeProgress(level)` / `computeProgressFromStatuses(level)` wrappers are untouched.
- **export.ts / `GET /api/export?framework=`:** `buildReadinessPackage(framework = "cmmc")`. CMMC output is byte-identical to before (SPRS line, POA&M eligibility, `# CMMC Readiness Package`). Texas frameworks emit `# <shortName> Readiness Summary`, the framework disclaimer, a by-group table using `legalRef`, and a plain "open items" list (no SPRS, no POA&M eligibility column). Default (`cmmc`) download is unchanged.
- **org.ts:** `TexasProfileInputSchema` + `updateOrganizationTexasProfile(input)`; `parseEnabledFrameworks(org)` (always includes `cmmc`, ordered by `FRAMEWORK_ORDER`) and `setEnabledFrameworks(ids)`. New orgs default to the four Texas booleans `false` and `enabledFrameworks: ["cmmc"]`.
- **Applicability advisor (`src/lib/applicability/`):** `computeApplicability(org, radarProfile)` → `FrameworkApplicability[]` (`{ framework, verdict: "likely_applies"|"may_apply"|"unlikely", reasons[], plainEnglish? }`). `rules.ts` is pure/deterministic and **mock-safe** (fully usable with no API key): CMMC likely if CUI/gov-contractor; TDPSA likely if Texas-resident data at scale (small-business-exemption may-apply note); TX521 likely if holding Texas-resident data (≥250-resident AG-notice note); TAC202 likely if selling to the State of Texas. When `ANTHROPIC_API_KEY` is set, `enrich.ts` adds a friendly paragraph per framework via the same `messages.parse` + `zodOutputFormat` pattern as the reviewer, **failing closed** to the deterministic reasons. UI: `/applicability` page, `texas-profile-form.tsx` (reuses the onboarding `QuestionCard` primitive — does NOT touch `ONBOARDING_STEP_ORDER`), `applicability-card.tsx`, and `src/app/applicability/actions.ts` (`saveTexasProfileAction`, `enableFrameworkAction`, `disableFrameworkAction`; CMMC can't be disabled).
- **Path entry points:** `src/components/path/track-switcher.tsx` on `/path` lists enabled frameworks (mini progress each; each entry links to its registry `homeRoute`) and links to `/applicability`. The "44 of 110" Level 2 banner stays CMMC-only.
- **Radar Texas enhancements:** `src/lib/radar/texas-playbook.ts` (static, disclaimered `TEXAS_BREACH_PLAYBOOK` — §521 steps/timelines: notify individuals without unreasonable delay/≤60 days; AG notice when ≥250 Texas residents/≤30 days; recordkeeping), rendered by `src/components/radar/breach-playbook.tsx` on `/radar` when `handlesTexasResidentData || texasOperations`. `sources.ts` `scoreItem` adds an additive Texas-topic bonus (`/texas|tdpsa|data privacy|breach|resident/`) for Texas-oriented profiles; the 4-source array and `getRadarFeed` are unchanged, so federal items still surface.

## Non-goals (MVP)
Auth, multi-tenant, cloud storage, real C3PAO workflow, policy document generation, Level 3, email, payments.
