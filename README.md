# CMMC Ready

Mobile-first web app that walks a small defense contractor through CMMC Level 1 (and a Level 2 preview) one requirement at a time: see what is missing, open a requirement, upload proof from your phone (photo, file, video, note), get an AI readiness review, watch the path fill up, export a readiness package.

CMMC stays the original federal track, but the same engine now also drives additive Texas tracks and a set of small-business safety tools. CMMC Ready is a self-assessment aid, not an assessment or certification. Only a C3PAO/DIBCAC certifies; only your Affirming Official affirms in SPRS. The Texas tracks are educational, disclaimered subsets — never legal advice.

## Run it

```bash
pnpm install
cp .env.example .env.local   # fill in the required secrets below
pnpm dev                     # http://localhost:3000
```

`.env.local` needs three values (`.env.example` documents each):

- `BETTER_AUTH_SECRET` — session signing secret (base64, 32 bytes). Required.
- `BETTER_AUTH_URL` — base URL cookies/callbacks are issued against (default `http://localhost:3000`).
- `EVIDENCE_ENCRYPTION_KEY` — AES-256-GCM master key for evidence-at-rest encryption (base64, 32 bytes). Required to upload evidence.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Leave `ANTHROPIC_API_KEY` unset to run the deterministic mock reviewer/scanner — the whole app works end-to-end without a key or spending money.

Open it on a phone on the same Wi-Fi: `pnpm dev -H 0.0.0.0` then visit `http://<your-mac-ip>:3000`. Camera capture works over plain HTTP because it uses a file input, not getUserMedia. Only "Add to Home Screen" standalone mode benefits from HTTPS.

## Turn on real AI review

Set `ANTHROPIC_API_KEY` in `.env.local` and restart. The reviewer and scanner use `claude-opus-5-5` by default (`CMMC_REVIEWER_MODEL` overrides every call site at once). Images and PDFs are sent to the model; videos are described by filename only. Without a key, a deterministic mock runs and every verdict is labelled a sample review.

## What it does

- **CMMC path** — Duolingo-style path over the 44-practice catalog (all 15 Level 1 practices plus 29 photo/document-verifiable Level 2 practices). Open a requirement, upload evidence, submit for AI review, see the verdict inline, watch progress and the SPRS score (L2) fill in, then export a readiness package (`/path`, `/practice/[id]`, `/summary`).
- **Texas tracks** — additive TDPSA (consumer privacy), Texas Business & Commerce Code Ch. 521 (breach notification), and TAC §202 / DIR (state information-security standards), driven by the same engine but grouped by their own topics (`/track/[framework]`, `/summary/[framework]`).
- **"What applies to me?" advisor** — a Texas applicability profile plus per-framework verdict cards with enable/disable-track buttons; deterministic rules work with no API key, with an optional AI-written explanation when a key is set (`/applicability`).
- **Scam checker** — paste suspicious text or a forwarded email, or upload a photo; bilingual (EN/ES) payment-change detection with forced callback and escalation guidance. Text is redacted and injection-neutralized before analysis; nothing is stored (`/scam-check`).
- **Incident reporting + Texas breach clock** — log wire-fraud / hacked-email / ransomware incidents, get guided checklists, a §521 breach-notice clock (individual notice ≤60 days; AG report ≤30 days at ≥250 Texas residents), and draft notices for counsel to review (`/incident`, `/incident/[id]`).
- **Free outside scan** — passive, no-login website/email check (DNS, SPF/DMARC, TLS cert, redirects, headers) as a Texas Safe Harbor lead magnet (`/scan`).
- **SB 2610 program** — tiers the expected security program by headcount and builds an evidence binder dossier (`/sb2610`).
- **Standards & Policy Radar** — a relevance-scored feed of standards/policy updates for the org's profile (`/radar`).
- **Reviewer task inbox** — durable in-app records of help requests from the scam checker and incident flows (`/reviewer-tasks`).
- **KoiTecc administrator workspace** — separate staff sign-in (`/koitecc/sign-in`), organization portfolio, and associate assignment (`/koitecc`). Run `pnpm koitecc:setup -- your-account@example.com` after creating an account to promote that account and seed demo associates. No public KoiTecc staff sign-up is provided.
- **Associate workspace** — administrator-accessible assigned-company detail view (`/koitecc/associates/[associateId]`) with requirement progress, client notes, open concerns, and persisted announcements/updates.
- **Tamper-evident ledger** — a hash-chained audit ledger records evidence, verdicts, incidents, and help requests.

Auth: email/password via Better Auth (`/sign-in`, `/sign-up`); each account owns one organization and all reads are tenant-scoped.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build && pnpm start` | Production build and serve |
| `pnpm typecheck` / `pnpm lint` | Type and lint checks |
| `pnpm test` / `pnpm test:watch` | Vitest suite |
| `pnpm smoke` | End-to-end data-layer smoke test against a temp DB |

Storage: SQLite via `@libsql/client` + `drizzle-orm` at `data/app.db`, encrypted uploads at `data/uploads/` (override with `CMMC_DB_PATH`, `CMMC_UPLOADS_DIR`). Delete `data/` to reset.

## Where things are

- `docs/SPEC.md` product spec, `docs/ARCHITECTURE.md` the module contract every agent codes against, `docs/research/` the CMMC, evidence, competitor and UI research behind the design.
- `src/data/` the practice catalogs: `cmmc-practices.json` (44 practices with verbatim v2.13 assessment objectives) plus `tdpsa-`, `tx521-`, `tac202-requirements.json`.
- `src/lib/reviewer/` the CMMC evidence review (prompt, zod schema, Anthropic call, mock); `src/ai/` the shared AI layer (evidence scanner, scam checker, redaction, injection guards, model resolver).
- `src/frameworks/` the framework registry and SB 2610 logic; `src/lib/` the server modules (org, submissions, progress, export, incident, ledger, radar, applicability, outside scan).
- `/design` dev-only showcase of every UI primitive.

## Known limits (MVP)

Local disk storage, Level 2 covers 44 of 110 requirements, no SSP/policy generator, no HEIC conversion (pick from Photos instead of Files on iOS). Live Microsoft 365 / Google Workspace OAuth connectors are unbuilt pending scope approval. Reviewer tasks are in-app records only — no staffed inbox or external notification. Incident notice drafts retain source-catalog text and placeholders for counsel; they are not ready-to-send legal notices.
