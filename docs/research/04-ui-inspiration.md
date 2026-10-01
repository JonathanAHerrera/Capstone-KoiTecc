# 04 — UI Inspiration & Design Spec

Research date: 2026-09-30. Target: mobile-first web app (iPhone/iPad Safari, desktop) guiding non-technical employees at small defense contractors through CMMC Level 2, one requirement at a time. Reference point: Duolingo. Constraint: it must still read as trustworthy to a DoD-adjacent buyer.

---

## 1. Duolingo — what exactly to steal

### 1.1 Onboarding (the "placement quiz" pattern)

Duolingo's onboarding is ~12 question screens before signup (38 total screens in the 2026 build per [Tasu.ai](https://tasu.ai/library/duolingo)). Concrete anatomy of every question screen:

- **Top bar**: back chevron (left) + a thin determinate progress bar (track `#e5e5e5`, fill `#58cc02`, fully rounded, ~16px tall) that fills with a 320ms ease-out when you advance. One bar for the whole flow — no step numbers.
- **Mascot + speech bubble**: Duo on the left, question text in a white rounded speech bubble with a 2px `#e5e5e5` border. The question is written as a person talking ("How did you hear about Duolingo?"), never as a form label.
- **Answer cards**: full-width vertical stack (or 2-col grid for short answers), each card white, 2px border `#e5e5e5`, bottom border 4px (the 3D lip), radius 16px, 16px padding, left icon + label, min height ~56px. Selected state: border and bottom-lip turn `#1cb0f6` blue, background `#ddf4ff`.
- **Continue button**: pinned to the bottom (safe-area aware), full width, 3D green primary, **disabled (grey `#e5e5e5`, text `#afafaf`) until a selection is made**, then animates to green. This is the single most important pattern: the only valid action is always obvious ([Appcues teardown](https://goodux.appcues.com/blog/duolingo-user-onboarding)).
- **Interstitial encouragement screens** every 3–4 questions: Duo + "Great, here's what you'll get" style copy, no input, just Continue. Keeps a long flow from feeling like a form.
- **Deferred signup**: account creation happens after the first lesson. For us: let the user finish scoping and see their path before asking for an email.

### 1.2 The learning path (home screen)

Since the 2022 redesign ([Duolingo blog](https://blog.duolingo.com/new-duolingo-home-screen-design)), the home screen is one vertical, winding path:

- **Nodes**: ~80×72px circles with a 6px darker bottom border (3D). Spaced vertically ~90px, offset horizontally in a sine wave (±~60px) so the eye follows a trail.
- **States**: gray `#e5e5e5` = locked (tapping shows a popover "Complete the previous level to unlock"); green with a pulsing ring (scale 1.0→1.05, 1.6s loop) + a floating "START" tooltip = active; gold `#ffc800` with a check = complete; crown/trophy node = unit end ("Legendary"). Chests sit between nodes as rewards.
- **Unit headers**: full-width colored banner (unit color: green, blue, purple, orange rotating per unit) with "UNIT 3 · Get directions" in uppercase small caps and a Guidebook button on the right. Descriptive phrases, not "Unit 3".
- **Floating "jump to current" button** bottom-right appears when you scroll away from the active node. Steal this verbatim for 110 requirements.
- **Tap on node** opens a popover anchored to the node (not a page) with title, XP, and a Start button in the unit color.

### 1.3 Lesson-complete celebration

Per [60fps.design](https://60fps.design/apps/duolingo) and Mobbin: full-screen takeover. Mascot slides up with a bouncy spring, headline ("Lesson complete!"), then **three stat cards stagger in** (slide up + fade, ~80ms apart) with **number tickers** counting up. Cards are white, 2px grey border, 16px radius, large colored icon (flame/bolt), bold 24px number, 13px uppercase label. Then a Continue button. Sound effect on each card (we'll skip sound).

### 1.4 Streaks and XP

Flame icon `#ff9600` with a day count; a weekly 7-dot calendar row. XP is a per-lesson integer. For compliance, translate as: **"Requirements closed this week"** (streak dots) and **"% of Level 2 complete"** (XP). Avoid the daily-pressure framing; a compliance project has a deadline, not a habit loop.

### 1.5 Feather design system — tokens

Duolingo's internal system is "Feather" (the typeface is Feather Bold; UI is DIN Round). Best public reconstructions:

- [nexu-io/open-design DESIGN.md](https://github.com/nexu-io/open-design/blob/main/design-systems/duolingo/DESIGN.md) — most complete token dump
- [shadcn.io/design/duolingo](https://www.shadcn.io/design/duolingo) — 19 colors, 22 components extracted from CSS vars
- [didot.design extract](https://didot.design/extract/examples/duolingo), [oh-my-design](https://oh-my-design.kr/design-systems/duolingo), [designmd.co](https://www.designmd.co/d/duolingo)
- Figma: [Duolingo Unofficial Design Language](https://www.figma.com/community/file/1439600081437366863/duolingo-unofficial-design-language), [Hoo-Dini](https://www.figma.com/community/file/1436088309800656493/hoo-dini-design-system-for-duolingo)

| Token | Hex | Role |
|---|---|---|
| Owl | `#58cc02` | primary CTA, correct |
| Owl pressed | `#58a700` | 3D lip under green |
| Macaw | `#1cb0f6` | selected/focus, links |
| Macaw pale | `#ddf4ff` | selected card bg |
| Cardinal | `#ff4b4b` | wrong/error |
| Bee | `#ffc800` | gold/complete |
| Fox | `#ff9600` | streak |
| Beetle | `#ce82ff` | gems/premium |
| Swan | `#e5e5e5` | borders, disabled |
| Hare | `#afafaf` | disabled text |
| Wolf | `#777777` | secondary text |
| Eel | `#4b4b4b` / `#3c3c3c` | body text |
| Snow | `#ffffff` | surface |
| Polar | `#f7f7f7` | page bg |

Typography: Feather Bold (display, 700, 48–64px, tight tracking) + DIN Round (UI, 500–700, 13–19px). Buttons: 15px, 700, **UPPERCASE, 0.8px letter-spacing**. Free substitute: **Nunito** (rounded terminals, 300–900 weights) — same vibe as DIN Round.

**The 3D button** (from [this pure-CSS replication](https://medium.com/@lilskyjuicebytes/clone-the-ui-1-replicating-duolingos-button-in-pure-css-bd37a97edb7e), [santraez/duo-buttons Tailwind](https://github.com/santraez/duo-buttons), [codefronts 3D press](https://codefronts.com/motion/tailwind-css-animated-buttons/tailwind-3d-press-effect-button/)):

```css
.btn-3d {
  background: #58cc02; color: #fff;
  border-radius: 16px; padding: 14px 24px;
  box-shadow: 0 4px 0 #58a700;          /* prefer shadow over border-bottom: no layout shift */
  transition: transform 100ms, box-shadow 100ms;
}
.btn-3d:active { transform: translateY(4px); box-shadow: 0 0 0 #58a700; }
.btn-3d:disabled { background: #e5e5e5; color: #afafaf; box-shadow: none; }
```
Tailwind: `shadow-[0_4px_0_#58a700] active:shadow-none active:translate-y-1`. Cards use the same lip in grey (`shadow-[0_4px_0_#e5e5e5]`, 2px border). Motion easing for pops: `cubic-bezier(0.34,1.56,0.64,1)` (back-out overshoot).

---

## 2. Other apps — the one thing to take from each

**TurboTax** (most relevant: a scary, bureaucratic, high-stakes process for non-experts; [Appcues teardown](https://www.appcues.com/blog/how-turbotax-makes-a-dreadful-user-experience-a-delightful-one), [UXmatters](https://www.uxmatters.com/mt/archives/2014/05/designing-solutions-for-unpleasant-tasks.php)):
- **Interview, not form.** One topic per screen, question phrased in plain English with a "Why we ask" expander. Jargon is hidden behind a "Learn more" link, never in the question.
- **"We'll guide you" opener** at each section: a milestone screen with "Here's what's coming up" (3–5 bullets) and a single "Let's go" button. Use at each CMMC family (AC, AT, AU, CM…).
- **Three progress signals at once**: section tabs with underline at top (Personal → Income → Deductions → Review), a running "refund" number that updates live (ours: **SPRS score** or **% complete**), and toast notifications when you unlock something ("You qualify for…" → ours: "This also satisfies AC.L2-3.1.3").
- **Review-and-fix loop**: after a section, "Let's check your federal return" runs validation and produces a short list of issues, each with a "Fix" button that deep-links to the exact question, then returns you to the list. This is exactly our AI-review "needs work" screen.
- **Bold the decision words** in lists so skimmers can skip what doesn't apply ("Did you **pay for childcare**?").
- **Self-segmentation before signup** ("I'm a freelancer / small business / W-2"). Ours: "We're an IT provider / manufacturer / consultancy; ~10 / ~50 / ~200 people."

**Typeform** ([conversational form pattern](https://roundpushpin.com/knowledge/conversational-form-design)): one question per screen, large 24–28px question text, answer keyboard shortcuts (A/B/C letters on cards for desktop), auto-advance on single-choice, Enter to continue. Take: auto-advance after ~250ms on single-select so the user never hunts for Continue on simple questions (keep Continue for multi-select).

**Linear**: status is a **chip with an icon, not just color** (circle-dashed = backlog, half-circle = in progress, check-circle = done, x = cancelled). Take: StatusChip with icon + 1-word label so color-blind users and black-and-white printouts still read. Also: keyboard-free clarity — every list row is one line, one status, one owner.

**Headspace**: calm progress — soft, large shapes, one accent, a "course" shown as a horizontal row of 10 numbered circles that fill in. Take: for the *family* header, a row of small dots (one per requirement) that fill — cheaper than a bar and reads progress at a glance.

**Apple Fitness / Health**: the three-ring summary and a "grid of grouped metric tiles" ([Spectr blueprint](https://www.spectr.to/gallery/apple-fitness)). Take: one **ring per status** on the summary screen (Met / Needs work / Not started) + tiles with a big number (36px, 800) and a 13px label. Health's "summary cards" with a right-chevron and a tiny sparkline = our per-family card.

**Vanta / Drata** ([Drata dashboard](https://help.drata.com/en/articles/13259515-dashboard-overview), [Vanta screen on Mobbin](https://mobbin.com/explore/screens/7e0f5747-175f-44b3-aba0-b458b75dedf5)): per-framework progress bar with "% of controls ready", a "failing tests" list sorted by severity, trend "+3 this week". Take: the **"Needs attention" list at the top of home** (max 3 items), and the framework % bar. Do not take their density; those are auditor tools.

**Cash App / Robinhood**: big 48–56px numbers with tabular figures, a counting-up ticker on change. Robinhood **removed confetti in 2021** under regulatory scrutiny for gamifying investing ([CNBC](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html)) — a warning for us: confetti on *every* accept will feel flippant for compliance. Reserve it for family-complete and 100%.

**iOS Camera / Photos picker**: on a plain `<input type="file" accept="image/*">` Safari shows a three-option action sheet: **Take Photo or Video / Photo Library / Choose File**. Users already know this sheet; don't build a custom camera.

---

## 3. Mobile-web constraints and patterns

**File input / camera** ([addpipe](https://blog.addpipe.com/correct-syntax-html-media-capture/), [web.dev](https://web.dev/articles/media-capturing-images)):
- `<input type="file" accept="image/*" capture="environment">` opens the rear camera directly on iOS; `capture="user"` opens front. `capture` is ignored on desktop (falls back to picker).
- `multiple` only works when choosing from Photo Library; **`capture` + `multiple` together = single capture**. Offer two buttons: "Take photo" (capture, single) and "Choose from library" (no capture, multiple).
- Video: `accept="video/*" capture="environment"` opens the video camera. Use a separate input; `accept="image/*,video/*"` without capture shows the picker that allows both.
- **HEIC**: iOS Safari transparently converts HEIC→JPEG on file input regardless of `accept` ([tested 2025](https://zenn.dev/kou_pg_0131/articles/safari-input-file-heic), [Apple forums](https://developer.apple.com/forums/thread/743049)). Files picked via "Choose File" (Files app) can still be raw HEIC; detect by magic bytes (`ftypheic`) and either reject with a message or decode with `heic2any` (WASM libheif, ~1MB — lazy load).
- **Client-side compression** before upload with [browser-image-compression](https://www.npmjs.com/package/browser-image-compression) (`maxWidthOrHeight: 2048, maxSizeMB: 1.5, useWebWorker: true`). iOS canvas limit is 16.7 MP (w×h ≤ 16,777,216) and ~384MB tab memory ([pqina](https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/)); a 48MP iPhone photo will crash a naive canvas resize. Process one image at a time, `createImageBitmap` with `resizeWidth`, and revoke object URLs. Strip EXIF GPS (compression lib re-encodes, so it's stripped by default — but keep orientation).
- Videos: don't transcode on device. Cap at 60s / 100MB in the UI, upload directly to storage with a progress bar (XHR/tus), and show a poster frame via `<video preload="metadata">`.

**Viewport** ([lukechannings](https://lukechannings.com/blog/2021-06-09-does-safari-15-fix-the-vh-bug/), [PWA gist](https://gist.github.com/fozzedout/5e77925381991a9570151550992baf14)):
- Never `height: 100vh` for full-screen layouts; use `min-height: 100dvh` with a `100vh` fallback, or lay out with a flex column on `body` and let the pinned button sit in normal flow.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` is required or every `env(safe-area-inset-*)` is 0. Pinned bottom button: `padding-bottom: calc(16px + env(safe-area-inset-bottom))`.
- `overscroll-behavior-y: none` on `html, body` kills the Safari rubber-band / Chrome pull-to-refresh that fights a bottom sheet drag. `touch-action: manipulation` on buttons removes the 300ms double-tap zoom delay.
- Font-size on inputs must be ≥16px or iOS zooms on focus.
- iOS keyboard: `100dvh` does not shrink for the keyboard; use `visualViewport` resize events to lift a pinned button above the keyboard.

**PWA**: `manifest.json` with `display: standalone`, 180×180 `apple-touch-icon`, `apple-mobile-web-app-status-bar-style: black-translucent`. iOS has no install prompt API; show a one-time banner "Tap Share → Add to Home Screen" with the share-icon glyph. Push notifications on iOS web need standalone mode + user opt-in (iOS 16.4+). Don't gate anything on PWA install.

**Bottom sheets**: [Vaul](https://vaul.emilkowal.ski/) (Emil Kowalski; Radix Dialog + drag, snap points, iOS-tested). Use for: node popover on small screens, evidence options, "Why we ask" help.

**Touch targets**: Apple HIG 44×44pt minimum; make every tappable card ≥56px tall, buttons 56px, path nodes 72px. Spacing between targets ≥8px.

**Haptics**: `navigator.vibrate` is unsupported in iOS Safari. Compensate with visual + motion feedback (press depth, pop). Sound is off by default on the web; skip it.

---

## 4. Design spec for the builder

### 4.1 Aesthetic in one line
"Duolingo's body, a government building's suit": chunky 3D controls, rounded 16px everything, bouncy micro-motion, a mascot-free but friendly voice — on a **navy primary** with green reserved strictly for *accepted*.

### 4.2 Color tokens (CSS variables)

```css
:root {
  /* Brand */
  --color-primary:        #1e40af;  /* navy-blue: CTAs, active node, selected */
  --color-primary-deep:   #172f8a;  /* 3D lip under primary */
  --color-primary-pale:   #e0e7ff;  /* selected card background */
  --color-ink:            #0f1f4b;  /* headings (deep navy, not black) */

  /* Status (Duolingo-literal where it maps 1:1) */
  --color-success:        #58cc02;  --color-success-deep: #58a700;  --color-success-pale: #d7ffb8;
  --color-warning:        #ff9600;  --color-warning-deep: #cc7a00;  --color-warning-pale: #fff1dc;
  --color-danger:         #ff4b4b;  --color-danger-deep:  #d33131;  --color-danger-pale:  #ffdfe0;
  --color-gold:           #ffc800;  --color-gold-deep:    #e5a800;  /* family complete / trophy */
  --color-info:           #1cb0f6;  --color-info-pale:    #ddf4ff;

  /* Neutrals */
  --color-surface:        #ffffff;
  --color-canvas:         #f6f7fb;  /* page bg, slightly cool */
  --color-border:         #e5e7eb;
  --color-border-strong:  #cfd4dc;
  --color-text:           #3c3c3c;
  --color-text-muted:     #6b7280;
  --color-text-disabled:  #afafaf;

  /* Family accents (rotate per CMMC family header, like Duolingo units) */
  --family-1: #1e40af; --family-2: #0e9f6e; --family-3: #7c3aed;
  --family-4: #d97706; --family-5: #0891b2; --family-6: #db2777;

  --radius-card: 16px; --radius-btn: 16px; --radius-chip: 9999px;
  --lip: 4px;  /* 3D bottom depth */
  --ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```
Contrast: navy `#1e40af` on white = 8.6:1; green `#58cc02` on white = 2.5:1 (fails for text) — so **green is only ever a fill behind white text ≥16px bold or an icon, never body text**. Same rule for gold.

### 4.3 Typography (Google Fonts: Nunito)

| Style | Size / weight / line-height | Use |
|---|---|---|
| display | 32 / 900 / 1.15 | summary numbers, celebration headline |
| h1 | 24 / 800 / 1.2 | screen titles, question text |
| h2 | 18 / 800 / 1.25 | card titles, family headers |
| body | 16 / 500 / 1.5 | instructions (never below 16 on inputs) |
| body-strong | 16 / 700 | decision words in questions |
| caption | 13 / 700 / 1.4, uppercase, 0.06em | labels, chips, unit headers |
| button | 16 / 800, uppercase, 0.04em | all buttons |
| number | 48 / 900, `font-variant-numeric: tabular-nums` | big stats |

Load Nunito 500/700/800/900 only. Fallback stack: `Nunito, "Nunito Sans", system-ui, -apple-system, sans-serif`.

### 4.4 Component list

| Component | Spec |
|---|---|
| **BigButton** | 56px tall, full width on mobile, radius 16, `box-shadow: 0 4px 0 var(--*-deep)`; variants primary (navy), success (green), secondary (white, 2px border, grey lip), danger-ghost. Disabled: `#e5e7eb` fill, no lip. |
| **ProgressBar** | 12px track `--color-border`, fill primary, radius 9999; width animates with spring (motion `type:"spring", stiffness:260, damping:24`). Optional label right "42 / 110". |
| **ProgressRing** | SVG 96px, 10px stroke, round caps; three concentric rings on summary (met / needs-work / not-started). |
| **PathNode** | 72px circle, 6px lip. States: `locked` (border fill, grey icon, 60% opacity), `active` (primary fill, pulsing 1.6s ring, "START" tooltip above), `in-review` (info blue, spinner), `needs-work` (warning orange, "!" icon), `complete` (gold fill, check), `not-applicable` (grey outline, dashed). Nodes alternate x-offset −48/0/+48px. |
| **PathTrail** | dashed SVG connector between nodes; lit segment to the active node. |
| **FamilyHeader** | sticky banner in family accent, radius 16, "ACCESS CONTROL · 22 requirements" caption, 2-line plain-English description, Headspace-style dot row (one dot per requirement, filled on complete), "Guide" ghost button. |
| **StatusChip** | pill, icon + 1 word: Not started (circle-dashed, grey), In progress (half-circle, navy), Submitted (clock, info), Needs work (alert-circle, orange), Met (check-circle, green), N/A (minus-circle, grey). |
| **QuestionCard** | onboarding answer card: 2px border, 4px grey lip, radius 16, 56px min; selected = primary border + pale bg + lip in primary; optional letter key badge for desktop. |
| **SpeechBubble** | question text container with a small tail; used instead of a mascot (optional shield-badge icon as the "guide" avatar). |
| **EvidenceCard** | thumbnail 72px (or video poster with ▶), filename, size, StatusChip, "x" remove. Upload state shows an inline ProgressBar. |
| **CameraCapture** | two BigButtons: "Take a photo" (`capture="environment"`), "Choose files" (`multiple`); third "Record video" (`accept="video/*" capture`). Hidden inputs, label-wrapped. |
| **ReviewVerdict** | full-width card; accepted = green lip + check badge + "Accepted"; needs-work = orange lip + numbered fix list, each item with a "Fix" BigButton (TurboTax). |
| **BottomSheet** | Vaul drawer, drag handle 36×4px, snap points 50%/90%, safe-area padding. |
| **Confetti** | canvas-confetti, two side cannons (`angle: 60/120, spread: 55, origin x 0/1`) 1.2s; only on family-complete and 100%. |
| **StatTile** | 48px tabular number + 13px caption + icon; counting ticker on mount. |
| **JumpToCurrent** | floating 48px circle bottom-right, appears when active node is off-screen. |
| **Toast** | top, 3s, "Also satisfied: AC.L2-3.1.3" with link. |

### 4.5 Micro-interactions

1. Button press: `translateY(4px)` + lip to 0, 100ms; release springs back with `--ease-pop` 180ms.
2. Card select: scale 1.0→0.98→1.02→1.0 (220ms), border color crossfade.
3. Continue enables: grey→navy fill crossfade 200ms + lip grows in.
4. Progress bar: spring to new width; number label counts up (tabular nums).
5. Node complete: scale 1→1.25→1 (`--ease-pop`, 400ms), fill crossfade grey→gold, check draws in (stroke-dashoffset 300ms), then the trail segment to the next node lights up and the next node pops from 0.8→1 and starts pulsing.
6. Family complete: FamilyHeader dots fill in sequence (40ms stagger), confetti, "Access Control complete" interstitial with StatTiles.
7. Screen transitions: forward = slide-in from right 24px + fade 200ms; back = reverse. Respect `prefers-reduced-motion` (disable pulses, confetti, slides).
8. Upload: thumbnail fades in; ring progress on thumbnail; on done, chip pops in.
9. AI review wait: skeleton verdict card with a 3-step inline checklist ("Reading your evidence… Checking against AC.L2-3.1.1… Writing feedback") each ticking — makes a 10–20s wait feel guided, not stalled.

### 4.6 Screen-by-screen wireframes

**(a) Onboarding question**
```
┌─────────────────────────────┐
│ ‹   ████████░░░░░░░░░░░░    │  progress bar, no numbers
│                             │
│ [🛡]  ┌───────────────────┐ │  speech bubble, h1 question
│       │ Do you handle CUI │ │  "Learn more" link below
│       │ on company laptops?│ │
│       └───────────────────┘ │
│                             │
│ ┌─💻 Yes, company laptops ──┐│  QuestionCard ×N, 56px, lip
│ └───────────────────────────┘│
│ ┌─🏢 Only on-site desktops ─┐│
│ └───────────────────────────┘│
│ ┌─🤷 Not sure ──────────────┐│  always offer "Not sure"
│ └───────────────────────────┘│
│                             │
│ ┌────── CONTINUE ───────────┐│  pinned, safe-area, disabled until pick
│ └───────────────────────────┘│
└─────────────────────────────┘
```
Every 3–4 questions: interstitial "Here's what's coming up" (TurboTax) with 3 bullets.

**(b) Path home**
```
┌─────────────────────────────┐
│ CMMC Level 2         [👤]   │
│ ████████████░░░░░░  42/110  │  overall ProgressBar
│ ┌ Needs attention (2) ────┐ │  Vanta-style, max 3 rows
│ │ ! AC.L2-3.1.5  Needs work│ │
│ └─────────────────────────┘ │
│ ┌ ACCESS CONTROL · 22 ─────┐│  FamilyHeader, sticky, accent
│ │ Who can get to CUI.      ││
│ │ ●●●●●●●●○○○○○○○○○○○○○○ Guide││
│ └──────────────────────────┘│
│        (✓)                  │  gold complete
│    (✓)                      │
│         (▶)  ← START        │  active, pulsing
│    ( )                      │  locked grey
│        ( )                  │
│ ┌ AWARENESS & TRAINING · 3 ┐│  next family (locked header muted)
│ …                      [↓] │  JumpToCurrent floating
└─────────────────────────────┘
```
Tap node → BottomSheet: title, plain-English one-liner, StatusChip, "Start" BigButton.

**(c) Requirement detail**
```
┌─────────────────────────────┐
│ ‹  AC.L2-3.1.1   [Met ✓ ]   │  StatusChip top-right
│ Limit who can log in        │  h1 plain English
│ "Only approved people and   │  body, decision words bold
│  devices can use systems    │
│  that touch CUI."           │
│ ▸ What the rule actually says│  collapsed official text
│ ┌ What to do (3 steps) ─────┐│
│ │ 1 ☐ List every user…      ││  checklist, each ≥44px
│ │ 2 ☐ Screenshot your…      ││
│ │ 3 ☐ Remove anyone who…    ││
│ └───────────────────────────┘│
│ Evidence                    │
│ [img] users.png     Uploaded│  EvidenceCard list
│ ┌ 📷 TAKE A PHOTO ──────────┐│  BigButton secondary
│ ┌ 🖼 CHOOSE FILES ──────────┐│
│ ┌ 🎥 RECORD A VIDEO ────────┐│
│ ┌──── SUBMIT FOR REVIEW ────┐│  pinned primary, disabled until ≥1 file
└─────────────────────────────┘
```

**(d) AI review result**
```
Accepted:                        Needs work:
┌─────────────────────────┐      ┌─────────────────────────┐
│       (✓)  big badge    │      │   (!)  orange badge     │
│  Accepted               │      │  Almost there           │
│  "Your screenshot shows │      │  2 things to fix:       │
│   MFA enforced for all  │      │  1. The screenshot cuts │
│   8 users."             │      │     off the user list.  │
│ ┌ Also satisfied: ──────┐│      │     [ FIX ]             │
│ │ IA.L2-3.5.3 ✓         ││      │  2. No evidence that    │
│ └───────────────────────┘│      │     contractors are…    │
│ ┌──── CONTINUE ─────────┐│      │     [ FIX ]             │
└─────────────────────────┘      │ ┌─ RESUBMIT ────────────┐│
                                 │ ┌ Ask a question (ghost)│
                                 └─────────────────────────┘
```
"Fix" deep-links to the exact checklist step or evidence slot, then returns here (TurboTax loop). On Accepted → node pops gold, path scrolls to the next node.

**(e) Summary / export**
```
┌─────────────────────────────┐
│ Your Level 2 progress       │
│      ╭───────╮              │  three ProgressRings
│      │ ◎◎◎   │  87 Met      │
│      │       │  14 Needs wk │
│      ╰───────╯   9 Not strt │
│ ┌ 87 ┐ ┌ 14 ┐ ┌ -32 ┐       │  StatTiles (SPRS-style score)
│ Met    Open   SPRS est.     │
│ By family                   │
│ AC  ████████████░░  18/22 › │  rows, chevron → family
│ AT  ███████████████  3/3  › │
│ …                           │
│ ┌──── EXPORT PACKAGE (PDF) ─┐│
│ ┌ Share with assessor (ghost)│
└─────────────────────────────┘
```
At 100%: confetti + gold trophy node at path end + "Download your evidence package".

---

## 5. Open-source references

- **Duolingo button/cards**: [santraez/duo-buttons](https://github.com/santraez/duo-buttons) (Tailwind), [pure-CSS writeup](https://medium.com/@lilskyjuicebytes/clone-the-ui-1-replicating-duolingos-button-in-pure-css-bd37a97edb7e), [codefronts 3D press](https://codefronts.com/motion/tailwind-css-animated-buttons/tailwind-3d-press-effect-button/)
- **Path implementations**: [arnav1803/duolingo-clone](https://github.com/arnav1803/duolingo-clone) (Next 16 + Tailwind 4, zig-zag nodes with SVG rings, 4 states, popover), [bryanjenningz/react-duolingo](https://github.com/bryanjenningz/react-duolingo) (T3, Zustand; cleanest path/lesson code), [ab2908/Duolingo-Web-App](https://github.com/ab2908/Duolingo-Web-App)
- **Design tokens**: [nexu-io/open-design DESIGN.md](https://github.com/nexu-io/open-design/blob/main/design-systems/duolingo/DESIGN.md), [shadcn.io/design/duolingo](https://www.shadcn.io/design/duolingo)
- **Confetti**: [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) (6KB, no deps); [motion.dev confetti example](https://motion.dev/examples/react-confetti)
- **Animation**: [motion](https://www.npmjs.com/package/motion) (`import { motion } from "motion/react"`, formerly framer-motion; springs, `layout`, `AnimatePresence` for screen slides)
- **Bottom sheet**: [Vaul](https://vaul.emilkowal.ski/); alt [react-modal-sheet](https://github.com/temzasse/react-modal-sheet)
- **Icons**: [lucide-react](https://www.npmjs.com/package/lucide-react) (check-circle, alert-circle, circle-dashed, camera, video, image, lock, trophy, shield-check)
- **Images**: [browser-image-compression](https://www.npmjs.com/package/browser-image-compression), [heic2any](https://www.npmjs.com/package/heic2any) (lazy-load only on HEIC magic bytes)
- **Number tickers**: [number-flow](https://number-flow.barvian.me/) (React, respects tabular nums)
- **Figma kits**: [Duolingo Unofficial Design Language](https://www.figma.com/community/file/1439600081437366863/duolingo-unofficial-design-language), [Duolingo FREE UI Kit](https://www.figma.com/community/file/1377326303556981356/duolingo-free-ui-kit-by-marvilo)
