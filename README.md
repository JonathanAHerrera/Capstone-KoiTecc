# CMMC Ready

Mobile-first web app that walks a small defense contractor through CMMC Level 1 (and a Level 2 preview) one requirement at a time: see what is missing, open a requirement, upload proof from your phone (photo, file, video, note), get an AI readiness review, watch the path fill up, export a readiness package.

CMMC Ready is a self-assessment aid, not an assessment or certification. Only a C3PAO/DIBCAC certifies; only your Affirming Official affirms in SPRS.

## Run it

```bash
pnpm install
cp .env.example .env        # leave ANTHROPIC_API_KEY empty to use the mock reviewer
pnpm dev                    # http://localhost:3000
```

Open it on a phone on the same Wi-Fi: `pnpm dev -H 0.0.0.0` then visit `http://<your-mac-ip>:3000`. Camera capture works over plain HTTP because it uses a file input, not getUserMedia. Only "Add to Home Screen" standalone mode benefits from HTTPS.

## Turn on real AI review

Set `ANTHROPIC_API_KEY` in `.env` and restart. The reviewer uses `claude-opus-5-5` by default (`CMMC_REVIEWER_MODEL` overrides). Images and PDFs are sent to the model; videos are described by filename only. Without a key, a deterministic mock reviewer runs and every verdict is labelled "Sample review".

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build && pnpm start` | Production build and serve |
| `pnpm typecheck` / `pnpm lint` | Type and lint checks |
| `pnpm smoke` | End-to-end data-layer smoke test against a temp DB |

Storage: SQLite at `data/app.db`, uploads at `data/uploads/` (override with `CMMC_DB_PATH`, `CMMC_UPLOADS_DIR`). Delete `data/` to reset.

## Where things are

- `docs/SPEC.md` product spec, `docs/ARCHITECTURE.md` module contract, `docs/research/` the CMMC, evidence, competitor and UI research behind the design.
- `src/data/cmmc-practices.json` the 44-practice catalog (all 15 Level 1 practices plus 29 Level 2 practices that are photo/document verifiable), with verbatim assessment objectives from the v2.13 assessment guides.
- `src/lib/reviewer/` the AI review (prompt, zod schema, Anthropic call, mock).
- `/design` dev-only showcase of every UI primitive.

## Known limits (MVP)

Single organization per database, no auth, local disk storage, Level 2 covers 44 of 110 requirements, no SSP generator, no HEIC conversion (pick from Photos instead of Files on iOS).
