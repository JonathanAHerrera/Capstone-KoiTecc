# 05 — Gusto palette, button glow, and "gummy" effect libraries

Research date: 2026-09-30/10-01. Goal: replace our pale-blue/navy/gradient palette (owner: "feels very AI slop") with values measured from gusto.com, reproduce Gusto's rainbow button lip and gradient hover rings, and pick small React-19 / Tailwind-v4 libraries for gummy press, glare, and a celebration effect.

---

## 1. Method

- Playwright MCP (headless Chromium, 1280x900) opened `gusto.com`, `gusto.com/product/payroll`, `gusto.com/pricing` (redirects to `/product/pricing`). No bot wall.
- Computed styles via `getComputedStyle(el)` and `getComputedStyle(el, '::before'|'::after')`, with rgb converted to hex in-page.
- `document.styleSheets[i].cssRules` was CORS-blocked (CSS is served from `cms-gcorp-cdn.gusto.com`), so all 33 Next.js CSS bundles (2.4 MB) were downloaded with curl and grepped for `--gwb-*` custom properties and the `BrandRefreshedButton_*`, `LinkCard_*`, `BrandRefreshPill_*` rules. Every CSS string below is verbatim from those files; every hex marked "measured" came from computed style.
- Gusto's token prefix is `--gwb-` (their design-system namespace; "gwb" is not expanded anywhere in the CSS). Scales run 100 → 1200 per hue: `brand`, `neutral`, `success`, `warning`, `error`, `info`, `reserved`/`intelligence` (purple).
- npm facts come from `registry.npmjs.org` + `api.npmjs.org/downloads` (npmjs.com HTML returns 403 to fetchers). Component source came from the shadcn registry JSON each library publishes (`magicui.design/r/*.json`, `ui.aceternity.com/registry/*.json`, `reactbits.dev/r/*-TS-TW.json`).

### Screenshots (`docs/screenshots/`)

| File | What |
|---|---|
| `ref-gusto-home-hero.png` | Home hero: radial red image background, white Boogy Brut headline, light CTA with rainbow lip, dark-teal card, gradient card strip |
| `ref-gusto-cta-rest.png` | "Create free account" light-variant button at rest (2x) |
| `ref-gusto-cta-hover.png` | Same button hovered (body goes `#f0f0f0`, ink shifts to `#1c1b1a`) |
| `ref-gusto-pricing-top.png` | Pricing hero + three plan cards, tab control |
| `ref-gusto-pricing-card.png` | Highlighted "Plus" card: 2px `#00535c` border, `BEST VALUE` header strip, dark CTA |
| `ref-gusto-payroll-hero.png` | Payroll hero: black Boogy Brut on `#fdfdfb`, dark + outline button pair, pink-to-coral gradient frame |
| `ref-gusto-accent-section.png` | `#03393d` section with `#78dec5` eyebrow pill, light CTA, four pastel illustration tiles |

---

## 2. Token table (measured)

Contrast ratios are against the page background `#fdfdfb` unless noted.

| Role | Gusto name | Hex | Notes / contrast |
|---|---|---|---|
| Page background | `neutral-100` / section bg | `#fdfcfb` / `#fdfdfb` | Warm off-white. Measured on body sections. Nav bar and layout wrapper are pure `#ffffff`. |
| Surface (card) | `neutral-0` | `#ffffff` | Cards: white + 1px `#d1cecc`, radius 14px (home) / 10px (pricing), **no shadow**. Floating UI mock: `0 4px 12px rgba(28,28,28,.08), 0 2px 8px rgba(28,28,28,.04)` |
| Surface alt | `neutral-150` / `neutral-200` | `#faf8f7` / `#f7f4f2` | Used for alternating bands and tab background (`#f5f9f8` = `brand-100` for the selected-adjacent tab) |
| Text primary | `neutral-1900` | `#1c1b1a` | 16.9:1 |
| Text secondary | `neutral-1400` | `#56514e` | 7.7:1 (blurbs, "+$12/mo per person") |
| Text tertiary | `neutral-1200` | `#6f6965` | 5.3:1 |
| Border | `neutral-400` | `#d1cecc` | Card border; 1.54:1 vs page. Pricing cards use 2px. |
| Border subtle | `neutral-300` | `#e7e4e2` | Dividers, UI-mock borders |
| Primary accent (text/links/icons/prices) | `brand-800` | `#1e7676` | 5.28:1. "See demo" link, `$80/mo` price, focus ring. |
| Primary CTA fill | `--brb-surface` (dark variant) | `#0f6469` | White text 6.9:1. Not in the 100-1200 scale; button-only. |
| Primary CTA ink (light variant text, "Sign in") | — | `#03393d` | 12.7:1 on white |
| Primary deep | `brand-1000` | `#00535c` | 8.6:1. Highlighted pricing border + `BEST VALUE` strip. |
| Primary darkest / dark section bg | `brand-1100` (measured `#03393d`) | `#03353d` / `#03393d` | White text 12.7:1 |
| Accent hover | computed | `color-mix(in srgb,#fff 16%,#0f6469)` ≈ `#37797f` | Dark button hover |
| Accent pressed | computed | `color-mix(in srgb,#000 16%,#0f6469)` ≈ `#0d5458` | Dark button `:active` |
| Light button hover | computed | `color-mix(in srgb,#000 6%,#fff)` = `#f0f0f0` | Measured as `oklab(0.956 0 0)` |
| Brand tints | `brand-150/200/300/400` | `#e9f7f3` `#e1f4ef` `#c6f0e5` `#84dbc5` | Pill eyebrow on dark uses `#78dec5` |
| Success | `success-500` / `-800` / `-200` | `#39c64c` / `#1c832a` / `#e4fbe7` | 500 for fills (2.2:1, decorative only); 800 for text (4.76:1); 900 `#1c7327` if you need 5.8:1 |
| Warning | `warning-500` / `-900` / `-200` | `#fac13d` / `#876413` / `#fff2d4` | 900 text 5.3:1 |
| Danger | `error-700` / `-900` / `-200` | `#eb4863` / `#a9283e` / `#ffe6ea` | 700 fill 3.7:1, 900 text 6.7:1 |
| Info | `info-700` / `-900` / `-200` | `#4673e3` / `#2352c7` / `#e0e9ff` | 900 text 6.6:1 |
| Purple ("reserved"/"intelligence") | `-600` / `-900` / `-200` | `#ce63de` / `#9b3ab6` / `#fbe0ff` | AI/"intelligence" features |
| Decorative: rainbow teal | — | `#3fa199` | Button lip gradient stop 1 |
| Decorative: magenta | — | `#ce63de` | Lip stop 2 |
| Decorative: coral | — | `#ff5765` | Lip stop 3, progress bars, text gradients |
| Decorative: orange | — | `#ff8316` | Lip stop 4, LinkCard hover ring end, badge end |
| Decorative: pink | — | `#eca4f7` | Stats section background, LinkCard hover ring start |
| Decorative: mint / periwinkle / green | — | `#31e280` `#97a3ff` `#7f8eff` | Corner-badge and carousel-arrow gradients |
| Hero red (image, radial) | — | `#c4100c → #f94c3f → #ef80ae` | `radial-gradient(60% 100%, ...)` on a PNG; only place a big gradient is used as a background |
| Logo coral | microsite `--sm-guava` | `#f45d48` (dark `#d94836`) | Logo is an SVG `<img>`; value from Gusto's own `--sm-*` microsite tokens |

The four pastel illustration tiles in `ref-gusto-accent-section.png` are images; nearest scale tokens are `error-300 #ffd3da`, `reserved-400 #e89ff4`, `brand-300 #c6f0e5`, `info-300 #c7d7fe`.

### Fonts (measured)

| Use | Family | Weights seen | Size / line-height / tracking |
|---|---|---|---|
| Body, UI, buttons, prices | **Matter** (Displaay, proprietary) | 400, 500, 700 | 16/24, buttons 16/24 w500, eyebrow 10-14px w500 uppercase `.8px`, price 42px w500 `#1e7676` |
| Headlines | **Boogy Brut** (Bureau Brut, proprietary) | 400, 500, 700 | h1 56-100px, line-height 1.05-1.15, `letter-spacing:-2.5%` |
| Legacy names in tokens | GCentra, Clearface, Moonstone (script) | — | Fallback names only; not loaded on these pages |

Type scale from `--gwb-type-*`: 12/18, 14/20, 16/24, 18/24, 20/28, 24/32, 32/40; tracking `.02em` ≤14px, `.01em` 16-20px, `0` ≥24px. Buttons: small 32px (9px 12px, 14px text), medium 40px (12px 16px, 16px), large 48px (15px 20px, 16px). `font-feature-settings:"tnum"` everywhere.

**Substitutes (Google Fonts):**
- Matter → **Figtree** (400/500/600/700). Matter is a compact, warm neo-grotesque (Typewolf: closest commercial peers Grosa, Muoto). Figtree has the same friendly geometric skeleton, tight default spacing and a true 500 weight, which Gusto leans on for buttons and prices. Inter is the safer neutral fallback but reads colder and wider. Our current Nunito is rounded and "cute" — that rounding is part of why the UI reads as generic; drop it.
- Boogy Brut → **Instrument Serif** (400 + italic, free). Same high-contrast, slightly condensed display serif with a quirky lowercase; use only ≥28px with `letter-spacing:-0.02em` and `line-height:1.05`. If more weights are needed, **Fraunces** (variable 100-900, "WONK" axis) is the alternative.

---

## 3. Button and glow CSS (verbatim)

The rainbow is **not** a border or box-shadow. It is a gradient *plate* behind the button that sticks out 2px below (a "lip"), and the button body slides down onto it on press. Our existing `.lip` / `.lip-press` pattern is the same mechanic with a flat darker color.

```css
/* wrapper <a>/<button> */
.BrandRefreshedButton_button__Uvvh_{--brb-lip:0.125rem;--brb-radius:12px;--brb-plate-radius:calc(var(--brb-radius) + var(--brb-lip));position:relative;display:inline-flex;min-block-size:var(--brb-height,2.5rem);padding:0 0 var(--brb-lip);border:0;border-radius:var(--brb-plate-radius);background:none;cursor:pointer;appearance:none;text-decoration:none}

/* the rainbow plate */
.BrandRefreshedButton_button__Uvvh_:before{position:absolute;inset:var(--brb-lip) 0 0;border-radius:var(--brb-plate-radius);background:linear-gradient(90deg,#3fa199 17.16%,#ce63de 42.41%,#ff5765 70.48%,#ff8316 97.63%);content:""}

/* body <span> */
.BrandRefreshedButton_body__ruwLV{position:relative;display:flex;align-items:center;justify-content:center;flex:1 1;gap:.5rem;padding:var(--brb-padding-block,.5rem) var(--brb-padding-inline,1rem);border-radius:var(--brb-radius);background-color:var(--brb-surface);color:var(--brb-text);font-family:Matter,...;font-feature-settings:"tnum";font-variant-numeric:tabular-nums;font-size:var(--brb-text-size,var(--gwb-type-size-75,.875rem));font-weight:500;line-height:1.5}

/* variants */
.BrandRefreshedButton_button__Uvvh_[data-variant=dark]{--brb-surface:#0f6469;--brb-surface-hover:color-mix(in srgb,#fff 16%,var(--brb-surface));--brb-surface-pressed:color-mix(in srgb,#000 16%,var(--brb-surface));--brb-text:var(--gwb-color-neutral-inverse-text-default,#ffffff);...}
.BrandRefreshedButton_button__Uvvh_[data-variant=light]{--brb-surface:var(--gwb-color-neutral-primary-surface-default,#ffffff);--brb-surface-hover:color-mix(in srgb,#000 6%,var(--brb-surface));--brb-surface-pressed:color-mix(in srgb,#000 14%,var(--brb-surface));--brb-text:#03393d;--brb-text-hover:var(--gwb-color-neutral-primary-text-default,#1c1b1a);...}

/* states */
.BrandRefreshedButton_button__Uvvh_:hover:not(:disabled) .BrandRefreshedButton_body__ruwLV{background-color:var(--brb-surface-hover);color:var(--brb-text-hover,var(--brb-text))}
.BrandRefreshedButton_button__Uvvh_:active:not(:disabled){padding:var(--brb-lip) 0 0}
.BrandRefreshedButton_button__Uvvh_:active:not(:disabled) .BrandRefreshedButton_body__ruwLV{background-color:var(--brb-surface-pressed)}
.BrandRefreshedButton_button__Uvvh_:focus-visible{outline:.125rem solid var(--brb-focus-ring,var(--gwb-color-brand-primary-border-default,#1e7676));outline-offset:.125rem}
.BrandRefreshedButton_button__Uvvh_:disabled{cursor:not-allowed;opacity:.5}
/* transitions (computed): wrapper `padding .2s ease-out`; body `background-color .2s ease-out, color .2s ease-out`; reduced-motion → 1ms */
```

Outline button + gradient ring on hover (the "rainbow highlighting around buttons" on secondary buttons):

```css
.BrandRefreshedButton_button__Uvvh_[data-outline] .BrandRefreshedButton_body__ruwLV{min-block-size:var(--brb-height,2.5rem);border:1px solid var(--brb-outline-border)}   /* --brb-outline-border:#d1cecc */
.BrandRefreshedButton_button__Uvvh_[data-outline]:before{content:none}
.BrandRefreshedButton_button__Uvvh_[data-outline][data-gradient-ring-on-hover] .BrandRefreshedButton_body__ruwLV:after{position:absolute;inset:-1px;border-radius:var(--brb-radius);padding:1px;background:linear-gradient(51.22deg,#ee3f50 36.62%,#b44bce 73.23%,#3f6bdd 122.06%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;content:"";pointer-events:none;transition:opacity .2s ease-out}
.BrandRefreshedButton_button__Uvvh_[data-outline][data-gradient-ring-on-hover][data-variant=dark]:hover:not(:disabled) .BrandRefreshedButton_body__ruwLV:after{opacity:1}
```

Card hover ring (product LinkCards) — same mask trick, 1px, fades in:

```css
.LinkCard_link__dO3Xp{...;background-color:#fdfdfb;border:1px solid var(--gwb-color-neutral-400,#d1cecc);border-radius:14px}
.LinkCard_link__dO3Xp:after{content:"";position:absolute;inset:-1px;padding:1px;border-radius:inherit;background:linear-gradient(to top right,#eca4f7,#ff8316);opacity:0;pointer-events:none;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;transition:opacity .15s ease-in-out}
.LinkCard_link__dO3Xp:focus-visible:after,.LinkCard_link__dO3Xp:hover:after{opacity:1}
/* no-mask fallback: border-color:#ff8316 */
```

Gradient pill (eyebrow chip) and corner badge:

```css
.BrandRefreshPill_gradient__xvA_Y{position:relative;display:inline-flex;border-radius:999px;padding:1px;width:fit-content}
.BrandRefreshPill_gradient__xvA_Y:before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;background:linear-gradient(95deg,#eba8f5,#fb8d90,#fb8d90,#ff5765,#ff5765,#ff8316,#ff8316);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none}
.BrandRefreshPill_gradient__xvA_Y[data-variant=flat]:before{background:#78dec5}
.TryGustoCta_cardCornerBadge__5iWgT{...;border:.0625rem solid rgba(0,0,0,0);border-radius:8px;background:linear-gradient(var(--gwb-color-neutral-0,#ffffff),var(--gwb-color-neutral-0,#ffffff)) padding-box,linear-gradient(135deg,#31e280 0,#97a3ff 40%,#eca4f7 60%,#ff8316 100%) border-box}
```

Progress fill and gradient text (the only other gradient uses on the site):

```css
.AnimatedStatItem_progressFill__rsojr{background:linear-gradient(90deg,#fbe0ff,#eba8f5 14%,#fb8d90 32%,#ff5765 50%,#ff5765 66%,#ff8316 84%,#faab3d)}
.BrandRefreshedPromoCTA_headlineEmphasis__y3ypw{background:linear-gradient(89.5deg,#ed7ffe -12.58%,#ff4833 16.18%,#ff4833 80.64%,#ff8316 110.05%,#ff8316 131.44%,#faab3d 156.45%);-webkit-background-clip:text;background-clip:text;color:rgba(0,0,0,0)}
```

Observations that matter for us:
- **Gradients are never static backgrounds.** They appear only as a 1-2px ring/lip, a progress fill, text fill, or the hero photo. Everything else is flat cream/white with hairline borders.
- No `box-shadow` on cards at all; the only shadows are the nav dropdown (`0 4px 6px rgba(0,0,0,.1)`) and the fake-app floating cards.
- Focus is a plain 2px `#1e7676` outline with 2px offset, not a glow. Input fields on these marketing pages are not styled (no form on the pages scraped), so no input-focus treatment was measurable.
- Hover never moves the button; only color changes. Press moves it 2px down.

---

## 4. Libraries (verified on npm 2026-10-01)

Install mechanism: **copy-paste** = shadcn registry drops a `.tsx` into `src/components/ui/`; **dep** = runtime npm package.

| Candidate | What it gives | Kind | npm facts | Tailwind v4 / React 19 | Verdict |
|---|---|---|---|---|---|
| **Magic UI `ShineBorder`** | Mask-composited 1px gradient ring that drifts (`radial-gradient` + `background-position` keyframe) | copy-paste, 0 deps | n/a (registry) | Yes: ships `@theme` `--animate-shine` + `@keyframes shine` for v4 | **Pick** for the rainbow ring on the current path node |
| Magic UI `BorderBeam` | A short beam travelling the border via `offset-path: rect(...)` + `motion` | copy-paste, needs `motion` (we have 13.4.6) | — | Yes (uses v4 `mask-[...]`, `border-(length:--x)` syntax) | Good alt if we want "a light orbiting the node" rather than a full ring |
| Magic UI `RainbowButton` | 5-color `--color-1..5` (oklch) conic-ish bar + blurred copy underneath as a glow | copy-paste, uses `cva` | — | Yes | Too "Vercel"; the blur-glow is what the owner calls AI slop. Skip. |
| Magic UI `ShimmerButton` | Rotating conic highlight inside the button | copy-paste | — | Yes | Skip (dark-mode look) |
| **Aceternity `HoverBorderGradient`** | Rotating `radial-gradient` highlight around the border on hover, `motion` | copy-paste, needs `motion` | — | Yes | Alternative for secondary buttons; Gusto's own `::after` ring is simpler — write that by hand |
| Aceternity `GlowingEffect` | Cursor-tracking conic glow (`repeating-conic-gradient`, `--start` angle follows pointer) | copy-paste, pulls `lucide-react` (we have it) | — | Yes | Desktop-only value; pointer events are no-ops on touch. Skip for mobile-first. |
| Aceternity `GlareCard` | Holographic foil card with tilt | copy-paste | — | Yes | Way too much. Skip. |
| **React Bits `GlareHover`** | Diagonal white glare sweeps across on hover (`background-position` tween) | copy-paste (`reactbits.dev/r/GlareHover-TS-TW.json`), 0 deps | registry; the npm bundle `@appletosolutions/reactbits` v1.0.3 (2025-06-23, 774 dl/wk, 1.6 MB, peer react 17-19) is **unmaintained** — use the registry copy, not the npm dep | Yes | **Pick** for cards (add a touch trigger) |
| **React Bits `ClickSpark`** | Canvas spark burst at click/tap point, 8 lines | copy-paste, 0 deps | registry | Yes | **Pick** as the per-tap micro-reward |
| React Bits `StarBorder` | Two blurred radial "stars" sliding along top/bottom edges | copy-paste | registry | Needs `@keyframes star-movement-*` added to `@theme` | Skip; ShineBorder is cleaner |
| React Bits `Magnet` | Element eases toward cursor | copy-paste | registry | Yes | Pointer-only. Skip. |
| **`motion`** (installed) | `type:"spring"`, `visualDuration`, `bounce` (0-1, default .25); `whileTap` | dep | v13.4.6, 2026-09-29, 26.8M dl/wk, peer react 18-19 | Yes | **Pick** for gummy press (no new dep) |
| `@react-spring/web` | `config.wobbly` `{tension:180,friction:12}` | dep | v10.1.2, 2026-06-24, 6.2M/wk, react 16-19 | Yes | Redundant with `motion`. Skip. |
| `animejs` | Timeline engine, `spring()` easing | dep | v4.5.0, 2026-06-22, 1.26M/wk, 2 MB unpacked | n/a | Redundant. Skip. |
| `liquid-gooey` | SVG-filter gooey/jelly morphing ("Morph", "Mote") | dep | v0.2.2, 2026-09-22, 35.9k/wk, 728 KB, peer react ≥18 | n/a | This is the "library called gummy-ish" the owner remembered. Real, maintained, but it is an SVG `feGaussianBlur`/`feColorMatrix` effect — expensive on iOS Safari and it blurs text edges. Not a button press. Skip. |
| `react-awesome-button` | 3D-lip pressable button | dep | v7.0.5, **2022-12-20**, 1.5k/wk, 496 KB | Styled with its own CSS | Dead; our `.lip-press` already does this. Skip. |
| `gummy`, `gumdrop`, `react-glow`, `jelly-button`, `react-jelly` | — | — | `gummy` = Kysely schema builder; `gumdrop` = markdown tool; `react-glow` 2020, 2 dl/wk; others 404 | — | Not animation libs. Nothing named "gummy" exists for this. |
| **`canvas-confetti`** (installed) | `confetti({shapes:['star'], ...})`, `shapeFromPath`, custom colors, `origin` | dep | v1.9.4, 2025-10-25, **9.56M/wk**, 90 KB, 0 deps | n/a | **Pick** for the celebration, used as star/sparkle bursts, not paper confetti |
| `@tsparticles/confetti` / `@tsparticles/fireworks` | Full particle engine presets | dep | v4.4.0, 2026-08-31, 132k / 881 per wk, 11-16 deps, ~800 KB each | n/a | Prettier fireworks, but 10x the weight. Only if the owner rejects the confetti-star burst. |
| `react-rewards` | Confetti / balloons / emoji anchored to an element | dep | v2.1.0, 2025-01-20, 137k/wk, 72 KB, peer react ≥15 | n/a | Balloons look cheap; skip. |
| `party-js` | DOM sparkles/confetti | dep | v2.2.0, **2022-07-11**, 34k/wk | n/a | Unmaintained. Skip. |
| `react-confetti-boom` | Lightweight explosion | dep | v2.0.1, 2025-05-29, 63k/wk, 32 KB | n/a | Fine but we already have canvas-confetti. |
| `tw-animate-css` | Tailwind v4 drop-in for `tailwindcss-animate` (`animate-in`, `fade-in`, `zoom-in`, enter/exit utilities) | dep (CSS only) | v1.4.0, 2025-09-24, **48M/wk**, 46 KB | Yes, `@import "tw-animate-css";` | Optional convenience for sheet/toast enter-exit. Not needed for the effects below. |

### Recommended set

**(1) Rainbow lip + ring — hand-written CSS, no library.** Gusto's primary button is 15 lines of CSS and already matches our `.lip` mechanic. Add to `globals.css`:

```css
@theme static {
  --gradient-rainbow: linear-gradient(90deg,#3fa199 17.16%,#ce63de 42.41%,#ff5765 70.48%,#ff8316 97.63%);
  --gradient-ring: linear-gradient(51.22deg,#ee3f50 36.62%,#b44bce 73.23%,#3f6bdd 122.06%);
}
@utility lip-rainbow { --lip-color: transparent; }
.lip-rainbow::before { content:""; position:absolute; inset:var(--lip-height) 0 0; border-radius:inherit; background:var(--gradient-rainbow); z-index:-1; }
@utility ring-gradient { position:relative; }
.ring-gradient::after { content:""; position:absolute; inset:-1px; padding:1px; border-radius:inherit; background:var(--gradient-ring); mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); mask-composite:exclude; opacity:0; transition:opacity .2s ease-out; pointer-events:none; }
.ring-gradient:hover::after, .ring-gradient:focus-visible::after, .ring-gradient[data-current="true"]::after { opacity:1; }
```

For the **current path node**, install Magic UI ShineBorder so the ring drifts instead of sitting still:

```bash
pnpm dlx shadcn@latest add @magicui/shine-border
```
```tsx
<div className="relative rounded-full">
  <ShineBorder shineColor={["#3fa199", "#ce63de", "#ff5765", "#ff8316"]} borderWidth={2} duration={8} />
  <PathNode ... />
</div>
```

**(2) Gummy press — `motion` (already installed), spring values.** Keep the 2px CSS lip for the "sits on a plate" look and add a spring overshoot with `whileTap`:

```tsx
import { motion } from "motion/react";

const gummyPressTransition = { type: "spring", visualDuration: 0.18, bounce: 0.55 } as const;

<motion.button
  whileTap={{ scale: 0.94, y: 2 }}
  whileHover={{ scale: 1.02 }}
  transition={gummyPressTransition}
  className="lip lip-rainbow rounded-btn ..."
/>
```

Measured-feel guidance: `bounce: 0.45-0.6` with `visualDuration: 0.15-0.2` reads as jelly without feeling slow on a 44px target; cards use `scale: 0.98, bounce: 0.4`. Use `transform` only (no layout props) so iOS Safari keeps it on the compositor. Respect `useReducedMotion()` → `bounce: 0`.

**(3) Glare on cards — React Bits GlareHover (copy-paste).**

```bash
pnpm dlx shadcn@latest add https://reactbits.dev/r/GlareHover-TS-TW.json
```
```tsx
<GlareHover glareColor="#ffffff" glareOpacity={0.35} glareAngle={-30} glareSize={220}
  transitionDuration={600} playOnce background="transparent" borderColor="#d1cecc"
  borderRadius="14px" width="100%" height="auto" className="rounded-card">
  <EvidenceCard ... />
</GlareHover>
```
The component only listens to `onMouseEnter/Leave`; add `onPointerDown={animateIn}` (3-line edit after copy) so a tap on iPhone also sweeps the glare. Keep opacity ≤0.35 on the cream surface or it washes out text.

**(4) "Pretty lights" on family completion — `canvas-confetti` (installed) in star/sparkle mode + ClickSpark for every accepted practice.**

```ts
import confetti from "canvas-confetti";

const gustoRainbow = ["#3fa199", "#ce63de", "#ff5765", "#ff8316", "#eca4f7"];

export function fireFamilyCompleteLights(originX = 0.5, originY = 0.6) {
  const burst = (particleRatio: number, options: confetti.Options) =>
    confetti({ particleCount: Math.floor(140 * particleRatio), origin: { x: originX, y: originY },
      colors: gustoRainbow, shapes: ["star", "circle"], scalar: 1.2, ticks: 220, gravity: 0.6, ...options });
  burst(0.25, { spread: 26, startVelocity: 55 });
  burst(0.2, { spread: 60 });
  burst(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });
  burst(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.4 });
  burst(0.1, { spread: 120, startVelocity: 45 });
}
```
Stars with slow gravity and a tight-then-wide stagger read as "sparkle lights" rather than ticker tape. Pair with a 600ms `ShineBorder` flash on the family header. For per-practice acceptance, wrap the Practice screen in `ClickSpark` (`pnpm dlx shadcn@latest add https://reactbits.dev/r/ClickSpark-TS-TW.json`, props `sparkColor="#ff8316" sparkCount={10} sparkRadius={22} duration={450}`). If the owner wants true fireworks later, `@tsparticles/fireworks` is the upgrade path at ~800 KB.

Not recommended: `liquid-gooey` (SVG filter cost on iOS), Magic UI RainbowButton (blurred under-glow is the AI-slop look), any pointer-tracking glow (no-op on touch).

---

## 5. Mapping our tokens → Gusto

| Ours | Now | Proposed | Why |
|---|---|---|---|
| `canvas` | `#f6f7fb` (cool blue-grey) | `#fdfcfb` | Gusto's warm off-white; the cool tint is the single biggest "AI dashboard" tell |
| `surface` | `#ffffff` | `#ffffff` | Keep; add `surface-alt #f7f4f2` for bands |
| `border` / `border-strong` | `#e5e7eb` / `#cfd4dc` | `#e7e4e2` / `#d1cecc` | Warm greys; cards = 1px `border` + no shadow |
| `text` / `ink` | `#3c3c3c` / `#0f1f4b` (navy) | `#1c1b1a` / `#1c1b1a` | One ink. Headings stop being navy. |
| `muted` / `disabled` | `#6b7280` / `#afafaf` | `#56514e` / `#afaaa6` | neutral-1400 / neutral-700 |
| `primary` | `#1e40af` (royal blue) | `#0f6469` (fills), `#1e7676` (text/links/icons) | Teal is the brand; blue is what every SaaS template ships |
| `primary-lip` | `#172f8a` | `color-mix(in srgb,#000 16%,#0f6469)` ≈ `#0d5458`, **or** rainbow plate on the 1-2 hero CTAs | Lip height 4px → 2px to match Gusto's proportion |
| `primary-pale` | `#e0e7ff` (pale blue panel) | **delete**; use `#e9f7f3` (brand-150) only for selected-tab/row state | Pale tinted panels are the gradient-era crutch; replace with cream surface + 1px border |
| `success` / lip / pale / ink | `#58cc02` Duolingo green | `#39c64c` / `#1c832a` / `#e4fbe7` / `#1c7327` | Gusto's green is cooler and less neon |
| `warning` / lip / pale / ink | `#ff9600` | `#fac13d` / `#c8951c` / `#fff2d4` / `#876413` | |
| `danger` / lip / pale / ink | `#ff4b4b` | `#eb4863` / `#c72e48` / `#ffe6ea` / `#a9283e` | |
| `gold` / `gold-lip` | `#ffc800` / `#e5a800` | `#ff8316` / `#e8ac20` | Gusto has no gold; orange is its "reward" hue (badge/ring end stop). Keep gold only for the completion crown if needed. |
| `info` / lip / pale / ink | `#1cb0f6` (sky) | `#4673e3` / `#3864d6` / `#e0e9ff` / `#2352c7` | |
| `family-1..6` | blue, green, violet, amber, cyan, pink (Tailwind defaults) | `#1e7676` teal, `#ff5765` coral, `#ce63de` magenta, `#ff8316` orange, `#4673e3` periwinkle, `#39c64c` green | Pulled from the lip gradient + info/success, so family colors and the rainbow are the same system. Pale variants for tiles: `#c6f0e5 #ffd3da #fbe0ff #ffe8b4 #c7d7fe #e4fbe7` |
| `radius-card` / `radius-btn` | 16 / 16 | 14 / 12 (plate 14) | Measured |
| `font-sans` | Nunito | Figtree (body/UI) + Instrument Serif (≥28px display) | See §2 |
| `ease-pop` | `cubic-bezier(.34,1.56,.64,1)` | keep for CSS; use `motion` spring `{visualDuration:.18,bounce:.55}` for JS presses | |

### What goes away and what replaces it

- **Pale tinted panels** (`*-pale` backgrounds behind sections, the blue onboarding wash): replace with `#fdfcfb` canvas, white `surface` cards, 1px `#d1cecc`, radius 14, no shadow. Tints survive only as *state* (selected tab `#f5f9f8`, verdict chips) and as illustration tiles.
- **Gradients as backgrounds**: gone. Gradients are allowed in exactly four places, as on gusto.com: the 2px CTA lip, a 1px hover/current ring, a progress fill, and gradient-clipped emphasis text on the summary screen.
- **Navy headings + sky-blue info**: one ink `#1c1b1a` everywhere; teal is the only "brand" colour; coral/orange carry energy.
- **Floating elements** (bottom sheet, toast): the only things that get a shadow — `0 4px 12px rgba(28,28,28,.08), 0 2px 8px rgba(28,28,28,.04)`, and the sheet gets the heavier `0 -2px 16px rgba(28,28,28,.08), 0 12px 24px rgba(28,28,28,.12), 0 8px 16px rgba(28,28,28,.08)`.
- **Dark accent surface** for the Level-2 banner / family-complete card: `#03393d` with `#78dec5` eyebrow and white Instrument Serif headline — this is Gusto's "serious" register and it reads trustworthy to a DoD-adjacent buyer without going navy.

Contrast check on the new set: body text 16.8:1, secondary 7.7:1, teal text 5.3:1, success text 4.8:1 (use `#1c7327` for 5.8:1 if text is <14px bold), danger text 6.7:1, info text 6.6:1, white on CTA fill 6.9:1 — all pass AA; rainbow stops are decorative only (2.5-3.1:1) and must never carry text.
