# CMMC Ready — Product Spec (MVP)

Synthesized from docs/research/01–04. Builder agents: read this and docs/ARCHITECTURE.md.

## Positioning (legal — non-negotiable wording)
- We are a **readiness / self-assessment helper**. We never say "certified", "compliant", "pass", or "guarantee".
- AI output is labelled **"Readiness review — not an assessment."** Only a C3PAO/DIBCAC certifies; only the company's Affirming Official affirms in SPRS.
- Disclaimer line appears on: onboarding final screen, the path home (footer), summary page, and inside every export.
- Context (Sept 2026): DoD suspended CMMC Phase 2 (C3PAO certs) on 13 Jul 2026; Level 1 (Self) and Level 2 (Self) assessments, SPRS scores and annual affirmations remain mandatory. So the self-assessment path is the whole product right now.

## Who uses it
An office manager / owner / shop lead at a 5–50 person defense supplier, on an iPhone or iPad, walking the shop floor. Not an IT person. They want to know: what do I still have to do, and is this proof good enough?

## Core loop
1. **Onboard** (one question per screen, Duolingo style): company name → Do you handle CUI? (FCI only → Level 1; CUI → Level 2) → company size bucket → IT setup (cloud / on-prem / mixed / unsure) → outside IT provider? → "Here's what's coming up" summary screen (TurboTax pattern: level chosen, N requirements, est. time = Σ estimatedEffortMinutes) → Start.
2. **Path home** (`/path`): top card = ProgressRing (% accepted) + three StatTiles (Accepted / Needs work / Remaining). Then "Needs attention" list (top 3: needs_work first, then under_review). Then the winding **PathTrail** grouped by family with sticky FamilyHeaders. Node states map to derived status; the first non-accepted node is "current" with a START HERE tooltip. Tapping any node opens its practice (nothing is hard-locked; locked styling is only for practices beyond the current one that have no submission yet — still tappable). Footer disclaimer.
   - Level 2 orgs: show L1 practices + the L2 subset in the catalog, with a banner "This preview covers 44 of the 110 Level 2 requirements".
3. **Practice detail** (`/practice/[id]`): SpeechBubble guide intro (plainEnglish), "Why it matters", collapsible official text + objectives list (letters [a]..[f]), "What to upload" examples (chips/cards), aiVerifiable badge ("AI can fully check this" / "AI can pre-check; an assessor may still interview/test"), the EvidencePicker (only allowed kinds), uploaded EvidenceCards, a note textarea ("Describe what this shows — who, where, when"), and the pinned bottom bar: **Submit for review** (disabled until ≥1 file or a ≥20-char note). On submit: optimistic "Reviewing…" state with a friendly progress message (reviews can take 10–40 s), then the ReviewVerdictCard inline. Accepted → pop animation + "Back to path"; if that completed a family → confetti (family intensity); if that completed everything → confetti (complete). needs_work → show missingItems + nextSteps, keep uploads, let them add more and resubmit. Previous review and evidence are shown when the user returns.
4. **Summary** (`/summary`): big number (% ready, tabular), level, per-family dot rows, **POA&M** section (every needs_work + not_started practice, with for L2 a "POA&M-eligible" / "must fix before affirmation" tag: eligible only if pointValue === 1 and id not in [AC.L2-3.1.20, AC.L2-3.1.22, CA.L2-3.12.4, PE.L2-3.10.3, PE.L2-3.10.4, PE.L2-3.10.5]; Level 1 never allows POA&M so label it "Must fix before self-assessment"), SPRS note for L1 ("Level 1 has no score: all 15 must be MET"), **Download readiness package** (GET /api/export) and **Copy summary**. Disclaimer.

## Status vocabulary (user-facing)
not_started → "Not started"; in_progress → "In progress"; under_review → "Reviewing"; accepted → "Accepted"; needs_work → "Needs work". Always icon + word.

## AI reviewer contract
Input: practice (text, objectives, aiReviewGuidance, commonFailures), worker note, evidence files (images/PDF/text; video = filename stub). Output (strict JSON): verdict (accepted | needs_work), confidence 0–1, summary (≤ 2 sentences, plain English, second person), objectiveFindings [{objective, met, note}], missingItems [], nextSteps []. Rules in the system prompt: readiness reviewer not assessor; be specific; visible dates/names are the strongest signal; a single-device screenshot does not prove fleet coverage; reject unreadable / irrelevant / stock-looking images; flag if an upload appears to contain secrets (passwords, SSNs) and ask for a redacted version; never claim certification. Mock reviewer runs when no API key is set and is clearly labelled "Mock review".

## Export package (markdown)
Header + disclaimer; org profile; level + counts + % ready; per-family table (ID, title, status, evidence count, last review date); POA&M table (ID, title, eligible?, missing items, next steps); evidence index (file name, type, size, SHA-256, uploaded at). Hash files at ingest (CAP retention rule).

## Out of scope (MVP)
Auth, multi-user, cloud storage, policy generation, SSP generator, SPRS/PIEE submission, Level 3, Rev 3, N/A marking, HEIC conversion, haptics, dark mode.
