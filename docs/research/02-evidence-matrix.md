# 02 – CMMC Evidence Matrix (Level 1 + selected Level 2)

Research date: 2026-09-30
Companion data file: `cmmc-practices.json` (44 entries, strict schema, validated with `node -e JSON.parse`).

## 1. Purpose

This document explains how the seed data in `cmmc-practices.json` was built, what sources it is traceable to, and how each Level 1 practice maps to evidence a small defense contractor can capture on a phone and submit for AI review. The matrix in section 5 is the human-readable view of the Level 1 rows of that JSON.

## 2. Sources used

All requirement text, titles, practice IDs, and assessment objectives were taken verbatim from the primary documents below. Secondary blogs and vendor sites were deliberately not used for any field that ends up in the JSON.

| Source | Version / date | What it supplied | How obtained |
|---|---|---|---|
| CMMC Assessment Guide – Level 1 | v2.13, September 2024 (DoD-CIO-00002) | Practice IDs, titles, FAR requirement text, assessment objectives, Further Discussion, Potential Assessment Considerations, FAR/NIST key references | PDF downloaded from the DoD CIO mirror at `dowcio.war.gov/Portals/0/Documents/CMMC/AssessmentGuideL1.pdf` (the `dodcio.defense.gov` host returns HTTP 403 to non-browser clients); text extracted with `pdftotext` |
| CMMC Assessment Guide – Level 2 | v2.13, September 2024 (DoD-CIO-00003) | Same fields for every Level 2 practice in scope | Same mirror, `AssessmentGuideL2.pdf` |
| CMMC Model Overview | v2.13, September 2024 | Family codes and family names | Same mirror, `ModelOverview.pdf` |
| NIST SP 800-171 Rev 2 | Feb 2020 (incl. Jan 2021 errata) | Cross-check of requirement wording and discussion text for Level 2 practices | `nvlpubs.nist.gov` |
| NIST SP 800-171A | June 2018 | Cross-check of assessment objectives (determination statements) | `nvlpubs.nist.gov` |
| FAR 52.204-21 | Current | Level 1 `officialText` (the L1 guide reproduces FAR (b)(1)(i)–(xv) verbatim as the requirement statement) | Via the L1 guide |
| NIST SP 800-171 DoD Assessment Methodology | v1.2.1, 24 June 2020 | `pointValue` for every Level 2 entry | `acq.osd.mil` PDF |

A web search on 2026-09-30 confirmed v2.13 is still the current published version of both assessment guides; no superseding version was found.

## 3. Scope decisions

**Level 1.** The task brief asked for "the 17 practices mapped to the 15 FAR requirements". That count describes CMMC 2.0 Level 1 as published in Dec 2021 (v2.0), where 3.10.3, 3.10.4 and 3.10.5 were three separate practices. The v2.13 guide (the one the final 32 CFR 170 rule points to) merged those three into a single practice, **PE.L1-b.1.ix – Manage Visitors & Physical Access**, so the current guide lists **15 practices** mapped to 15 FAR requirements and 17 NIST SP 800-171 requirements. The brief also said to "use the guide's practice list and IDs exactly", so the JSON contains 15 Level 1 entries, and the merged entry carries `nist171Ref: "3.10.3, 3.10.4, 3.10.5"` and all six of its objectives.

**Level 2 duplicates of Level 1.** Per the brief, Level 2 practices that are the CUI-flavored twin of a Level 1 practice were not emitted. In the PE and MP families that removes MP.L2-3.8.3, PE.L2-3.10.1, PE.L2-3.10.3, PE.L2-3.10.4 and PE.L2-3.10.5. The app will need the mapping below when a Level 2 user works through the full 110-practice list:

| Level 1 ID | Level 2 ID(s) | DoD AM points at L2 |
|---|---|---|
| AC.L1-b.1.i | AC.L2-3.1.1 | 5 |
| AC.L1-b.1.ii | AC.L2-3.1.2 | 5 |
| AC.L1-b.1.iii | AC.L2-3.1.20 | 1 |
| AC.L1-b.1.iv | AC.L2-3.1.22 | 1 |
| IA.L1-b.1.v | IA.L2-3.5.1 | 5 |
| IA.L1-b.1.vi | IA.L2-3.5.2 | 5 |
| MP.L1-b.1.vii | MP.L2-3.8.3 | 5 |
| PE.L1-b.1.viii | PE.L2-3.10.1 | 5 |
| PE.L1-b.1.ix | PE.L2-3.10.3, PE.L2-3.10.4, PE.L2-3.10.5 | 1 + 1 + 1 |
| SC.L1-b.1.x | SC.L2-3.13.1 | 5 |
| SC.L1-b.1.xi | SC.L2-3.13.5 | 5 |
| SI.L1-b.1.xii | SI.L2-3.14.1 | 5 |
| SI.L1-b.1.xiii | SI.L2-3.14.2 | 5 |
| SI.L1-b.1.xiv | SI.L2-3.14.4 | 5 |
| SI.L1-b.1.xv | SI.L2-3.14.5 | 3 |

The only wording differences between the L1 and L2 twins are "information system" → "system" and "Federal Contract Information/FCI" → "CUI"; objectives are identical.

**Level 2 included.** All remaining MP (8) and PE (2) practices, plus the 19 practices named in the brief. Total: 15 + 8 + 2 + 19 = 44 entries.

## 4. Field-by-field methodology

| Field | Rule applied |
|---|---|
| `id`, `title`, `family` | Exactly as printed in the v2.13 guide section headings (e.g., "Transaction & Function Control", "Removeable Media" was normalised to "Removable Media" in the JSON since the guide's own TOC uses both spellings). |
| `familyName` | From the Model Overview v2.13 domain list. |
| `nist171Ref` | From the guide's Key References block. |
| `officialText` | Verbatim requirement statement from the guide. L1 = FAR 52.204-21(b)(1) wording; L2 = NIST SP 800-171 r2 wording. |
| `assessmentObjectives` | Verbatim determination statements, including the bracketed letters and the trailing "; and"/"." punctuation, so the app can display them exactly as an assessor will. L1 objectives use the guide's `[FCI]` substitution. |
| `plainEnglish`, `whyItMatters` | Original prose, written for an office manager with no IT background, informed by the guide's Further Discussion. |
| `evidenceTypes` | Subset of the five app upload types. `video` only where a walk-through adds something a photo cannot (physical access paths). |
| `evidenceExamples` | 3–6 items each. Every item names a concrete thing to photograph, screenshot, or export, and names common small-business products (Microsoft 365, Google Workspace, Intune, Defender, BitLocker, Squarespace, KnowBe4, Nessus) so the worker recognises their own environment. Derived from the guide's "Examine" object lists and Potential Assessment Considerations, then translated to phone-capturable artifacts. |
| `aiVerifiable` | `full` when a clear upload can establish every objective on its own (settings screenshots, labelled media, a document whose required sections can be checked). `partial` when at least one objective is behavioral or needs test/interview (escorting visitors, processes being followed, fleet-wide coverage). `none` was reserved for practices with no upload that helps; none of the 44 qualified, since 800-171A lists an Examine method for every one. |
| `aiReviewGuidance` | What to look for, what to reject, and what remains for a human assessor. Includes privacy guards where the obvious evidence would contain secrets or PII (passwords, background-check results). |
| `commonFailures` | 2–4 items drawn from the guide's considerations and typical small-business findings. |
| `estimatedEffortMinutes` | Time to gather evidence (not to implement the control), assuming the control already exists: 10–20 min for single-screenshot practices, 45–60 for inventories, diagrams, and SSP-adjacent work. |
| `pointValue` | DoD Assessment Methodology v1.2.1 Annex A. Level 1 entries are 0 per the schema. For "3 to 5" requirements (3.5.3 MFA, 3.13.11 FIPS) the maximum 5 is recorded. CA.L2-3.12.4 (SSP) is "NA" in the methodology because a missing SSP means the assessment cannot be completed at all; it is recorded as 0 and the app should treat it as a hard gate, not a zero-weight item. |

## 5. Level 1 evidence matrix

| ID | NIST | Title | Plain English | Best phone evidence | AI verifiable | Effort (min) |
|---|---|---|---|---|---|---|
| AC.L1-b.1.i | 3.1.1 | Authorized Access Control | Only approved people, software and devices can log in; keep a list and disable leavers | Admin-center user list screenshot; authorized-user spreadsheet; disabled-account screenshot for a leaver; router/MDM device list | partial | 30 |
| AC.L1-b.1.ii | 3.1.2 | Transaction & Function Control | People can only do what their job needs; few admins | Folder/SharePoint permissions dialog; 'Standard user' account screenshot; admin-roles page; role matrix | partial | 30 |
| AC.L1-b.1.iii | 3.1.20 | External Connections | Control which outside devices/cloud services touch FCI | One-page approved-devices/services policy; Conditional Access or device-compliance rule; VPN settings; MDM enrolment list | partial | 45 |
| AC.L1-b.1.iv | 3.1.22 | Control Public Information | Named people post to the website; someone reviews for FCI first | CMS/social-media admin list; written review-before-posting procedure; approval email thread | partial | 20 |
| IA.L1-b.1.v | 3.5.1 | Identification | One username per person; named service accounts; unique device names | Directory screenshot; login screen with individual tiles; device inventory with hostnames/asset tags | partial | 25 |
| IA.L1-b.1.vi | 3.5.2 | Authentication | Password (ideally MFA) before access; no factory-default passwords | Password-policy settings; login prompt photo; router admin page with custom username; Wi-Fi security settings; MFA enrolment | partial | 30 |
| MP.L1-b.1.vii | 3.8.3 | Media Disposal | Wipe or destroy drives/papers before disposal or reuse | Shredder/shred-bin photo; certificate of destruction; drive-destruction log; wipe-tool report | partial | 20 |
| PE.L1-b.1.viii | 3.10.1 | Limit Physical Access | Systems and network gear in spaces only approved staff can enter | Locked entry door and server-closet photos; printer location photo; authorized-entry list; walk-through video | partial | 20 |
| PE.L1-b.1.ix | 3.10.3/4/5 | Manage Visitors & Physical Access | Visitors sign in, badge, escorted; access logged; keys/badges tracked and recovered | Sign-in sheet photo; visitor badges; badge-log export; key/badge inventory; key-cabinet photo; visitor procedure | partial | 30 |
| SC.L1-b.1.x | 3.13.1 | Boundary Protection | A firewall between office and internet; know the network edges; log what crosses | Network diagram (hand-drawn OK); firewall photo; deny-by-default rules screenshot; firewall log page; guest VLAN | partial | 45 |
| SC.L1-b.1.xi | 3.13.5 | Public-Access System Separation | Website/guest Wi-Fi on a separate network from FCI computers | List of public components; hosting-provider dashboard; VLAN/DMZ config; guest-isolation setting | partial | 25 |
| SI.L1-b.1.xii | 3.14.1 | Flaw Remediation | Patch everything within a written time frame and track it | Patch policy with day counts; 'You're up to date' screenshots with dates; RMM compliance dashboard; firewall firmware page | partial | 30 |
| SI.L1-b.1.xiii | 3.14.2 | Malicious Code Protection | Antivirus on every device and on email | AV console listing all devices; per-device 'Protected' screenshot; list of designated locations; email anti-malware setting | full | 15 |
| SI.L1-b.1.xiv | 3.14.4 | Update Malicious Code Protection | AV definitions update automatically and are current | AV settings showing auto-update on; 'Definitions last updated' date; console with no out-of-date devices | full | 10 |
| SI.L1-b.1.xv | 3.14.5 | System & File Scanning | Real-time scanning plus a scheduled full scan | AV settings showing real-time on and scheduled scan; scan history; email attachment scanning | full | 10 |

Level 1 totals: 15 practices, 12 `partial`, 3 `full`, 0 `none`; roughly 6.5 hours of evidence-gathering effort for a small business whose controls already exist.

## 6. Level 2 entries at a glance

| Family | IDs | Points | AI verifiable |
|---|---|---|---|
| MP (8) | 3.8.1, 3.8.2, 3.8.4, 3.8.5, 3.8.6, 3.8.7, 3.8.8, 3.8.9 | 3,3,1,1,1,5,3,1 | 2 partial, 6 full |
| PE (2) | 3.10.2, 3.10.6 | 5,1 | 1 full, 1 partial |
| AT (3) | 3.2.1, 3.2.2, 3.2.3 | 5,5,1 | 2 partial, 1 full |
| CM (2) | 3.4.1, 3.4.2 | 5,5 | 2 partial |
| IA (3) | 3.5.3, 3.5.7, 3.5.10 | 5,1,5 | 2 full, 1 partial |
| IR (2) | 3.6.1, 3.6.2 | 5,5 | 2 partial |
| MA (1) | 3.7.2 | 5 | partial |
| PS (2) | 3.9.1, 3.9.2 | 3,5 | 2 partial |
| RA (1) | 3.11.2 | 5 | partial |
| CA (1) | 3.12.4 | NA (recorded 0) | full |
| SC (3) | 3.13.8, 3.13.11, 3.13.16 | 3,5,1 | 1 partial, 2 full |
| SI (1) | 3.14.6 | 5 | partial |

Level 2 totals: 29 entries, 17 `partial`, 12 `full`; 98 DoD AM points represented (of 110 in the full model, with SSP as NA).

## 7. Findings relevant to app design

1. **Almost every practice needs two artifacts, not one.** The guide's objectives split consistently into "is it defined" and "is it enforced". The upload flow should prompt for a definition artifact (policy excerpt, list, text answer) and an enforcement artifact (screenshot/photo) separately, and the AI should score each objective letter, not the practice as a whole.
2. **Screenshots dominate, photos are secondary.** Of 44 practices, only the PE and MP families and two IA practices are primarily photo-verifiable. Every other practice is best evidenced by an admin-console screenshot. Mobile capture should make it easy to upload screenshots taken on a desktop (QR hand-off, email-to-upload, or a desktop companion page).
3. **Dates are the AI's strongest signal.** Patch status, AV definitions, scan history, inventory reviews, SSP revisions, training completion and badge logs are all judged on recency. Every upload should carry a capture timestamp the reviewer can compare against the visible date in the artifact.
4. **Fleet coverage is the most common hidden gap.** A single-device screenshot never proves a fleet-wide practice (SI.L1-b.1.xiii/xiv/xv, SC.L2-3.13.16, IA.L2-3.5.3). The AI guidance repeatedly asks for a console view or one screenshot per device; the app should know the device count from CM.L2-3.4.1 / IA.L1-b.1.v and compare.
5. **Privacy guard-rails are needed in three places.** Password-policy evidence (IA.L1-b.1.vi, IA.L2-3.5.10) can accidentally include real passwords; personnel-screening evidence (PS.L2-3.9.1) can include background-check results; physical-access logs can include visitor names. The AI reviewer should refuse and request redaction rather than store these.
6. **Level 1 is interview-heavy by design.** 12 of 15 L1 practices are `partial` because 800-171A's determination statements for them include behavioral objectives (escorting, following a process). The app should set the expectation that uploads prepare the self-assessment rather than replace it; for L1 self-assessment the owner affirms in SPRS, so "partial" plus a short text attestation is a reasonable completion state.
7. **The SSP is a gate, not a practice.** CA.L2-3.12.4 scored NA in the DoD methodology; an assessment stops without it. For Level 2 users the app should surface it first and treat the per-practice implementation statements it contains as the seed for every other practice's "definition" artifact.

## 8. Data quality caveats

- **15 vs 17 Level 1 practices.** See section 3. If the product team prefers the three-practice granularity for PE, split PE.L1-b.1.ix into the three L2 IDs; the objectives map cleanly ([a,b] → 3.10.3, [c] → 3.10.4, [d,e,f] → 3.10.5).
- **Point values are from the DoD Assessment Methodology v1.2.1 (2020)**, which the 32 CFR 170 rule still references for Level 2 scoring. Two "3 to 5" requirements are recorded at 5; CA.L2-3.12.4 is recorded at 0 but is NA/blocking in the source.
- **`aiVerifiable` is a judgment call** based on the mix of Examine vs Interview/Test objectives; it is not an official designation and should be tuned once real uploads are reviewed.
- **`estimatedEffortMinutes`** is an estimate of evidence-gathering time only and assumes the control is already implemented.
- **Product names in `evidenceExamples`** (Intune, Defender, KnowBe4, Nessus, etc.) are illustrative; the guide names no products.
- **Title normalisation:** MP.L2-3.8.7 appears as "Removeable Media" in the L2 guide section heading; the JSON uses "Removable Media".
- The guide text was extracted from PDF with `pdftotext`; line-wrap hyphenation was corrected by hand in the quoted `officialText` and objectives, and spot-checked against NIST SP 800-171A.
