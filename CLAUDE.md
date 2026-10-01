@AGENTS.md

# CMMC Ready — project rules
- Read `docs/ARCHITECTURE.md` before writing code. It is the contract between agents.
- Next.js 16: before using any Next API, read the matching guide in `node_modules/next/dist/docs/` (route handlers, server actions, `params` are Promises, etc.).
- Naming: verbose English-like names. `loadingReviewResult` not `busy`; `markSubmissionSubmitted()` not `submit()`. Keep the conventional keyword (loading/show/add/delete/send/mark) and add what it applies to.
- Comments only for what a name cannot say (browser quirk, measured number, rejected alternative). Never restate code. No doc comments by default.
- Mobile first: iPhone/iPad Safari is the primary target. Use `min-h-dvh`, safe-area insets, 44px touch targets.
- Verify: `pnpm typecheck && pnpm lint` must pass before you report done.
