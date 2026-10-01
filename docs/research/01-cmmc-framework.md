# CMMC Framework Research (as of 30 Sep 2026)

Purpose: ground the CMMC-readiness app (mobile-first, step-by-step, evidence upload + AI review) in what the rule and the assessment guides actually say. Facts below are sourced; where trade press and primary sources diverge, it is called out. Note: DoD has been styling itself "Department of War (DoW)" in 2026 documents; the regulations still read "DoD."

---

## 1. Rule status and where we are (Sept 2026)

| Item | Status | Source |
|---|---|---|
| 32 CFR Part 170 (CMMC Program rule) | Final rule published 15 Oct 2024, **effective 16 Dec 2024**. Defines levels, scoring, POA&M, affirmation, phases. | [S1], [S2] |
| 48 CFR / DFARS rule (252.204-7021 clause, 252.204-7025 solicitation provision) | Final rule published 10 Sep 2025, **effective 10 Nov 2025**. This started the Phase 1 clock. 7021/7025 were *not* renumbered by the 2026 FAR overhaul. | [S3], [S4], [S12] |
| FAR 52.204-21 (Basic Safeguarding, the Level 1 source) | Renumbered to **FAR 52.240-93** (new FAR Part 40) by Revolutionary FAR Overhaul class deviations effective 1 Feb 2026; text and 15 requirements unchanged. Both numbers are in circulation until formal rulemaking. | [S11] |
| DFARS 252.204-7019 / 7020 | 7019 eliminated and 7020 renumbered to 252.240-7997 (1 Feb 2026, Class Deviation 2026-O0025). DFARS 252.204-7012 (NIST 800-171 Rev 2 "adequate security") unchanged and still in force. | [S12], [S13] |
| **Phase 2 (C3PAO certification) - SUSPENDED** | On **13 Jul 2026** the DoW CIO (Kirsten Davies) and USD(A&S) suspended the Phase 2 transition (was due 10 Nov 2026) and put Phases 3-4 on hold; created a CMMC Reform Task Force and an RFI (~1,100 responses, closed 14 Aug). Contracting officers were told to accept only Level 1 (Self) and Level 2 (Self), grant no waivers, and strip C3PAO/DIBCAC requirements from solicitations/contracts at the next modification. **Class Deviation 2026-O0025 Rev 3 (3 Sep 2026)** carries this into DFARS Part 240 text. Task Force report was due to the CIO 11 Sep 2026 and is **not public** as of 28 Sep. | [S13], [S14], [S15], [S16] |

### Phased rollout as written in 32 CFR 170.3 vs. reality

| Phase | Rule text (170.3) | Planned date | Status Sept 2026 |
|---|---|---|---|
| 1 | Level 1 (Self) or Level 2 (Self) as condition of award; DoD *may* require Level 2 (C3PAO) at its discretion | 10 Nov 2025 | **In effect.** Self-assessments + SPRS affirmations are being written into solicitations. |
| 2 | Level 2 (C3PAO) as condition of award for applicable contracts; Level 3 optional | 10 Nov 2026 | **Suspended** (no restart date). |
| 3 | Level 2 (C3PAO) also for option periods; Level 3 (DIBCAC) condition of award | 10 Nov 2027 | On hold. |
| 4 | Full implementation, all applicable contracts incl. option periods | 10 Nov 2028 | On hold. |

Source: [S2] for phase text; [S13]-[S16] for the suspension.

### Which contracts need what (today)
- **Level 1 (Self)**: contracts where the contractor handles only **FCI** (Federal Contract Information). Annual self-assessment + affirmation in SPRS. Excludes COTS-only contracts.
- **Level 2 (Self)**: contracts involving **CUI** where the program office selected self-assessment. Triennial self-assessment, annual affirmation. Under the pause this is the *only* Level 2 path contracting officers may require.
- **Level 2 (C3PAO)**: third-party certification by an authorized C3PAO. Still *available* (Cyber AB says assessments continue; ~1,074 certs and 103 C3PAOs by March 2026) and primes such as Lockheed and L3Harris still ask for it in flow-downs, but DoW cannot currently require it as a condition of award. [S17]
- **Level 3 (DIBCAC)**: 110 Rev 2 + 24 NIST SP 800-172 requirements, government-assessed; requires a Final Level 2 (C3PAO) first. Effectively dormant until Phase 3. [S2]

Enforcement pressure has not paused: False Claims Act settlements in 2026 (LOGZONE $507k, Jun; Honeywell Aerospace $2.04M, 1 Sep) were for misrepresented NIST 800-171 compliance. [S13]

---

## 2. Level 1

### What the rule says: 15 requirements, not 17
32 CFR 170.14(c)(2)/170.15 and the Level 1 Assessment Guide v2.13 define Level 1 as "the 15 basic safeguarding requirements specified in FAR Clause 52.204-21" (b)(1)(i)-(xv). Identifiers are `<Domain>.L1-b.1.<roman>`. The "17 practices" number comes from CMMC 1.0 and from the NIST crosswalk: FAR (b)(1)(ix) alone maps to three NIST SP 800-171 requirements (3.10.3, 3.10.4, 3.10.5), so 15 FAR requirements = 17 NIST requirements. The current model uses the 15 FAR IDs; the extra NIST granularity survives only as assessment objectives. [S5], [S18]

| ID | Domain | Title | # objectives (171A, CUI->FCI) |
|---|---|---|---|
| AC.L1-b.1.i | AC | Authorized Access Control | 6 |
| AC.L1-b.1.ii | AC | Transaction & Function Control | 2 |
| AC.L1-b.1.iii | AC | External Connections | 6 |
| AC.L1-b.1.iv | AC | Control Public Information | 5 |
| IA.L1-b.1.v | IA | Identification | 3 |
| IA.L1-b.1.vi | IA | Authentication | 3 |
| MP.L1-b.1.vii | MP | Media Disposal | 2 |
| PE.L1-b.1.viii | PE | Limit Physical Access | 4 |
| PE.L1-b.1.ix | PE | Manage Visitors & Physical Access | 6 |
| SC.L1-b.1.x | SC | Boundary Protection | 7 |
| SC.L1-b.1.xi | SC | Public-Access System Separation | 2 |
| SI.L1-b.1.xii | SI | Flaw Remediation | 6 |
| SI.L1-b.1.xiii | SI | Malicious Code Protection | 2 |
| SI.L1-b.1.xiv | SI | Update Malicious Code Protection | 1 |
| SI.L1-b.1.xv | SI | System & File Scanning | 3 |

Roughly 58-60 assessment objectives total (counted from the v2.13 guide text; treat as approximate). Every objective must be MET or N/A for the requirement to be MET; one NOT MET objective fails the requirement. [S5]

### Rules for Level 1 (32 CFR 170.15, 170.24)
- Result is MET / NOT MET / N/A per requirement; **no POA&M, no partial credit, no score**. All 15 must be MET (or N/A, e.g. SC.L1-b.1.xi if no public-facing systems). [S6], [S9]
- Self-assessment **annually**; results posted in **SPRS** (CMMC Level, Status Date, Assessment Scope, CAGE codes, Compliance Result). Hiring a consultant does not make it a certification. [S6]
- **Affirmation** by the **Affirming Official** ("senior level representative... with authority to affirm continuing compliance") in SPRS at the time of the assessment and annually thereafter; DoD verifies affirmation before award. [S7], [S8]
- Evidence artifacts retained **6 years** from the CMMC Status Date. [S6]
- An SSP is *recommended, not required* at Level 1 (guide footnote 4). [S5]
- Scope: all assets that process/store/transmit FCI; Specialized Assets (IoT, OT, GFE, test equipment) are out of scope at L1. [S19]

---

## 3. Level 2

### Requirements
110 requirements of NIST SP 800-171 **Rev 2** (32 CFR 170.14(c)(3)); IDs `<Domain>.L2-3.x.y`. Family counts: AC 22, AT 3, AU 9, CM 9, IA 11, IR 3, MA 6, MP 9, PS 2, PE 6, RA 3, CA 4, SC 16, SI 7. [S20], [S21]

### Assessment method
Uses the NIST SP 800-171A (June 2018) assessment objectives: each requirement has lettered objectives ("Determine if: [a]...[f]") with "potential assessment methods and objects." Methods: **Examine** (specifications, mechanisms, activities), **Interview** (individuals), **Test** (exercise mechanisms/activities under specified conditions). The L2 guide states "Most objectives will require testing" and that a C3PAO assessor decides which. Results are captured at the objective level. [S10]

### Scoring (32 CFR 170.24, DoD Assessment Methodology v1.2.1)
- Start at 110; subtract per NOT MET requirement: **5 points** (23 basic + 19 derived, e.g. 3.1.1, 3.1.2, 3.5.1, 3.10.1, 3.10.2, 3.13.1, 3.14.1-3), **3 points** (7 basic + 7 derived, e.g. 3.8.1, 3.8.2, 3.1.19), **1 point** (the remaining 54). Minimum possible score is -203.
- Partial credit: IA.L2-3.5.3 MFA (-3 if only remote/privileged, -5 if none); SC.L2-3.13.11 (-3 if non-FIPS encryption, -5 if none). [S9], [S22]
- A current **SSP is mandatory**; without one the assessment cannot be completed. [S9]
- **Enduring Exceptions** (documented with mitigations in the SSP) and **Temporary Deficiencies** (post-implementation, with an operational plan of action) are scored MET. [S9], [S10]

### POA&M and status (32 CFR 170.21, 170.16, 170.17)
- POA&M allowed only if score >= **88/110** (0.8) and only for **1-point** items, plus SC.L2-3.13.11 at 3 points if non-FIPS encryption is in place.
- **Never POA&M-able** (even though 1-point): AC.L2-3.1.20, AC.L2-3.1.22, CA.L2-3.12.4 (SSP), PE.L2-3.10.3, PE.L2-3.10.4, PE.L2-3.10.5. Note three of the six are physical-protection items that are also Level 1 content.
- **Conditional** status with POA&M -> close-out assessment within **180 days** or the status expires. Passing initially or at close-out = **Final** status.
- Final Level 2 valid **3 years** (reassess "within three years of the CMMC Status Date"); **annual affirmation** regardless. Level 2 (C3PAO) results go into CMMC eMASS; Level 2 (Self) into SPRS. [S23], [S24], [S25]

---

## 4. What "evidence" assessors expect

From the L1/L2 guides and the Cyber AB CMMC Assessment Process (CAP) v2.0 [S5], [S10], [S26]:

- Evidence must be **final, not draft**: "Unacceptable forms of evidence include working papers, drafts, and unofficial or unapproved policies."
- Document examples: policy/process/procedure documents, training materials, plans, system/network/data-flow diagrams, SSP, access lists, logs, inventories, termination records, key/lock change records.
- Mechanism evidence: "viewing hardware, associated configuration information, or observing staff following a process" (screenshots of configs, admin console views, firewall rules, AV dashboards).
- Interview evidence reflects "what staff believe to be true"; documentation shows policy; **testing "demonstrates what has or has not been done."** A demonstration (e.g., showing a user being identified at login) is the strongest form.
- CAP v2.0: the OSC provides the SSP, inventory and network diagram up front; artifacts must be **hashed with a NIST-approved algorithm** and retained 6 years; assessments may be in-person, virtual or hybrid. CAP P.11 names **18 objectives the C3PAO should plan to validate on-site**, almost all physical: CM.L2-3.4.5[d], MA.L2-3.7.2[d], MP.L2-3.8.1[c,d], MP.L2-3.8.4[a,b], PE 3.10.1[b,c,d], PE 3.10.2[a-d], PE 3.10.3[a,b], PE 3.10.5[b,c], SC.L2-3.13.12[b].

Character of each family (practical, for evidence-type design):

| Mostly physical (photo/video friendly) | Mostly documentary | Mostly technical (screenshots/configs/exports) |
|---|---|---|
| PE (3.10.1-3.10.6), MP storage/marking/transport (3.8.1, 3.8.4, 3.8.5), MA.3.7.2 personnel control, CM.3.4.5[d] | AT (training records), PS (screening/termination), IR plan, RA (risk assessments), CA (SSP, POA&M, assessment), MP sanitization records, PE access lists/visitor logs | AC, IA, AU, CM (baselines, change control), SC (firewall, encryption, DMZ), SI (patching, AV), MA tool controls |

---

## 5. MVP scope recommendation (opinionated)

**Do Level 1 completely, then a deliberately narrow Level 2 slice. Do not promise "Level 2 readiness."**

Why Level 1 fully:
- It is the one level a small shop can finish with no assessor, no SSP, no score and no POA&M, and the output (SPRS entry + affirmation) is binary and required *now* under Phase 1. The whole thing is 15 requirements / ~60 objectives, half of them things a non-IT employee can photograph or screenshot.
- The suspension of Phase 2 makes Level 1 (Self) and Level 2 (Self) the only contract-enforceable paths for the foreseeable future, so a self-assessment helper is exactly what the market needs today.
- Evidence-friendliness by L1 requirement: PE viii/ix (photos of locks, badge readers, visitor log, key inventory), MP vii (destruction certificates, wipe logs), SI xiii-xv (AV console screenshots, scan logs), SI xii (patch report), IA v/vi (user list screenshot, password-policy screenshot), AC i/ii (account list, group/role screenshot), SC x/xi (firewall rule export, network diagram), AC iii/iv (policy doc + website review record).

Level 2 slice that is realistic to verify from uploads (pick 25-35 requirements, not 110):
1. **PE family (6)**: all photo/video-verifiable; three of them cannot be POA&M'd, so they are high value. Overlaps L1 (3.10.1, 3.10.3-5).
2. **MP (9)**: storage photos, marking photos, sanitization records, encrypted-media screenshots.
3. **AT (3), PS (2)**: training completion exports, screening/termination checklists. Pure documents.
4. **Select SI/SC/IA/AC items with screenshot-able state**: 3.5.3 MFA (console screenshot), 3.13.11 FIPS mode, 3.14.1-3.14.5 (patch/AV), 3.1.1/3.1.2 (account lists), 3.4.1 baseline inventory, 3.5.7-3.5.9 password settings, 3.13.8 TLS config.
5. **CA.3.12.4 SSP** and **CA.3.12.2 POA&M**: generate these *from* the collected evidence; the SSP is mandatory at L2 and is the thing small contractors most often lack.

What evidence alone cannot establish (design the AI reviewer to say "needs interview/test" rather than "MET"):
- Anything whose objective is an *activity* or *process over time*: AU log review (3.3.3), IR testing (3.6.3), CM change control, RA periodic scans, "monitored" visitor activity, "timely" flaw remediation. A single screenshot proves a point in time, not a practice.
- Interview-dependent objectives (staff know the escort policy; the Affirming Official understands scope).
- Tests the assessor runs live: MFA challenge, session lock, boundary blocking, malware sample scan, removable-media block. A video can *support* these but the L2 guide says the assessor decides what must be demonstrated.
- Scope correctness: the guide's biggest failure mode is a wrong boundary (CUI in a personal Gmail, an unlisted laptop). No photo proves absence.

Product implications: (a) label every objective with an evidence class (document / config screenshot / photo-video / record-log / demonstration / interview) and let the AI grade only the first four as potentially MET; (b) enforce "final, not draft" (ask for approval date and approver on policies); (c) hash and timestamp every upload at ingest so the artifact set meets the CAP 6-year retention and hashing rule; (d) emit an SPRS-ready summary (Level, scope description, CAGE, result) and an affirmation checklist for the Affirming Official; (e) build on Rev 2 IDs but store a Rev 3 crosswalk column now (see section 7).

---

## 6. Key official sources (direct links)

- DoD CIO CMMC program site and documentation index: https://dodcio.defense.gov/CMMC/ and https://dodcio.defense.gov/CMMC/Documentation/ (mirrored at https://dowcio.war.gov/CMMC/ in 2026; dodcio.defense.gov intermittently returns 403 to scripts)
- CMMC Model Overview v2.13 (Sep 2024): https://dodcio.defense.gov/Portals/0/Documents/CMMC/ModelOverviewv2.pdf
- CMMC Assessment Guide Level 1 v2.13: https://dodcio.defense.gov/Portals/0/Documents/CMMC/AssessmentGuideL1v2.pdf
- CMMC Assessment Guide Level 2 v2.13: https://dodcio.defense.gov/Portals/0/Documents/CMMC/AssessmentGuideL2v2.pdf
- CMMC Scoping Guide Level 1 v2.13: https://dodcio.defense.gov/Portals/0/Documents/CMMC/ScopingGuideL1v2.pdf
- CMMC Scoping Guide Level 2 v2.13: https://dodcio.defense.gov/Portals/0/Documents/CMMC/ScopingGuideL2v2.pdf
- CMMC Scoping Guide Level 3: https://dodcio.defense.gov/Portals/0/Documents/CMMC/ScopingGuideL3.pdf
- 32 CFR Part 170 (eCFR; Cornell mirror if eCFR blocks): https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-G/part-170 and https://www.law.cornell.edu/cfr/text/32/part-170
- NIST SP 800-171 Rev 2 (withdrawn by NIST 14 May 2024 but still the CMMC baseline): https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-171r2.pdf
- NIST SP 800-171A (June 2018, assessment objectives): https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-171A.pdf
- NIST SP 800-171 DoD Assessment Methodology v1.2.1: https://www.acq.osd.mil/asda/dpc/cp/cyber/docs/safeguarding/NIST-SP-800-171-Assessment-Methodology-Version-1.2.1-6.24.2020.pdf
- Cyber AB CMMC Assessment Process (CAP) v2.0 (Dec 2024): https://cyberab.org/Portals/0/CMMC%20Assessment%20Process%20v2.0.pdf
- SPRS CMMC module: https://www.sprs.csd.disa.mil/cmmc.htm
- DFARS 252.204-7021: https://www.acquisition.gov/dfars/252.204-7021-cybersecurity-maturity-model-certification-requirements.

---

## 7. 2025-2026 changes to track

1. **Phase 2 suspension (13 Jul 2026)** and **Class Deviation 2026-O0025 Rev 3 (3 Sep 2026)**: only self-assessments may be required; Task Force report overdue/unpublished. Davies has hinted at "continuous evaluation" and operational-technology focus; assessment requirements "may remain in place" in some form. Expect a program change late 2026 or 2027. [S13]-[S16]
2. **NIST 800-171 Rev 3 is NOT in CMMC.** 32 CFR 170.14 and DFARS 7012 (Class Deviation 2024-O0013) pin Rev 2. An interim final rule to move 32 CFR 170 to Rev 3 (RIN 0790-AM01) sat on the Spring 2026 Unified Agenda with a July 2026 placeholder but has **not** been published; some trade press reported it as imminent. Treat any Rev 3 date as unconfirmed. Rev 3 would be 97 requirements / 17 families with DoD-fixed ODPs. [S27], [S28]
3. **FAR CUI rule re-proposed 23 Jun 2026** (FAR Case 2026-001, 91 FR 37550): Rev 3 baseline, 72-hour incident reporting, new FAR 52.240-6/-7, self-attestation, applies to civilian agencies too; comments closed 23 Jul; final targeted by end of 2026. [S29]
4. **FAR overhaul renumbering (1 Feb 2026)**: 52.204-21 -> 52.240-93; DFARS 7019 deleted, 7020 -> 252.240-7997; 7012, 7021, 7025 unchanged. [S11], [S12]
5. **Assessment guides**: still v2.13 (Sep 2024). No 2026 revision found. DoD FAQ updated to Rev 2.3 (Apr/May 2026, new scoping section) and 2.4 (13 Jul 2026). [S13]
6. **Level 3 / NIST 800-172 Rev 3**: no CMMC change; Phase 3 on hold.
7. **FCA enforcement** continuing (Honeywell, LOGZONE) - affirmations are a personal attestation, which is a selling point for an evidence-backed trail. [S13]

Conflicts noted: some vendor blogs still state "Phase 2 begins Nov 10 2026" (pre-July content); Secureframe and several law firms describe the suspension consistently. One blog claimed a July 2026 Rev 3 interim rule had been issued; the Sept 28 briefing and Secureframe timeline say it has not appeared in the Federal Register.

---

## Sources

- [S1] 32 CFR Part 170 overview, Mayer Brown: https://www.mayerbrown.com/en/insights/publications/2025/09/department-of-defense-releases-long-anticipated-final-rule-implementing-the-cybersecurity-maturity-model-certification-program
- [S2] 32 CFR 170.3 Phased implementation: https://www.law.cornell.edu/cfr/text/32/170.3
- [S3] DFARS final rule, Pillsbury: https://www.pillsburylaw.com/en/news-and-insights/cmmc-final-dfars-rule-2025.html
- [S4] Arnold & Porter, CMMC Final Rule key takeaways: https://www.arnoldporter.com/en/perspectives/advisories/2025/09/cmmc-final-rule-key-takeaways-for-defense-contractors
- [S5] CMMC Assessment Guide Level 1 v2.13 (text extracted locally): https://dodcio.defense.gov/Portals/0/Documents/CMMC/AssessmentGuideL1v2.pdf
- [S6] 32 CFR 170.15 Level 1 self-assessment: https://www.law.cornell.edu/cfr/text/32/170.15
- [S7] 32 CFR 170.22 Affirmation: https://www.law.cornell.edu/cfr/text/32/170.22
- [S8] 32 CFR 170.4 Definitions: https://www.law.cornell.edu/cfr/text/32/170.4
- [S9] 32 CFR 170.24 Scoring methodology: https://www.law.cornell.edu/cfr/text/32/170.24
- [S10] CMMC Assessment Guide Level 2 v2.13 (text extracted locally): https://dodcio.defense.gov/Portals/0/Documents/CMMC/AssessmentGuideL2v2.pdf
- [S11] FAR 52.240-93 / DFARS 252.240-7997 explainer: https://alluvionic.com/cybersecuritycompliance/cmmc/dfars-252-240-7997-and-far-52-240-93-explained-for-small-defense-contractors/ ; Wiley FAR overhaul deviations: https://www.wiley.law/FAR-Overhaul-Class-Deviations
- [S12] Secureframe, DFARS clauses behind CMMC 2026: https://secureframe.com/blog/dfars ; Summit 7: https://summit7.us/blog/why-the-rfo-ended-dfars-7019-and-7020
- [S13] Secureframe CMMC news 2026 timeline: https://secureframe.com/hub/cmmc/news-updates-2026
- [S14] Covington, CMMC Reform Task Force updates Sept 2026: https://www.insidegovernmentcontracts.com/2026/09/cmmc-reform-task-force-updates-september-2026/
- [S15] Vigilant weekly briefing 28 Sep 2026 (Class Deviation 2026-O0025 Rev 3): https://vigilantcybersecurity.net/blog/2026-09-28-cmmc-weekly-briefing
- [S16] BakerHostetler, DoW suspends Phase II: https://www.bakerlaw.com/insights/department-of-war-suspends-cmmc-phase-ii-what-you-need-to-know/
- [S17] Cyber AB statements via Secureframe pause analysis: https://secureframe.com/blog/cmmc-news-2026-phase-2-pause
- [S18] 15 vs 17 explanation: https://www.abelsolutions.com/cmmc-level-1-requirements/ ; practice list with evidence examples: https://www.nrlabs.com/blog-posts/the-15-cmmc-level-1-practices-explained-with-examples
- [S19] CMMC Scoping Guide Level 1 v2.13: https://dodcio.defense.gov/Portals/0/Documents/CMMC/ScopingGuideL1v2.pdf
- [S20] NIST SP 800-171 Rev 2: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-171r2.pdf
- [S21] Family counts summary: https://www.securityscientist.net/blog/the-nist-800-171-v2-requirements/
- [S22] DoD Assessment Methodology v1.2.1 (text extracted locally): https://www.acq.osd.mil/asda/dpc/cp/cyber/docs/safeguarding/NIST-SP-800-171-Assessment-Methodology-Version-1.2.1-6.24.2020.pdf
- [S23] 32 CFR 170.21 POA&M: https://www.law.cornell.edu/cfr/text/32/170.21
- [S24] 32 CFR 170.16 Level 2 Self: https://www.law.cornell.edu/cfr/text/32/170.16
- [S25] 32 CFR 170.17 Level 2 C3PAO: https://www.law.cornell.edu/cfr/text/32/170.17
- [S26] Cyber AB CAP v2.0 (text extracted locally): https://cyberab.org/Portals/0/CMMC%20Assessment%20Process%20v2.0.pdf
- [S27] Rev 2 vs Rev 3 status: https://thedefensecompliancereport.com/nist-800-171-interim-baseline/ ; https://cyberz.pro/blog/2026/07/08/nist-800-171-rev-3-cmmc-transition/
- [S28] NIST SP 800-171A withdrawal notice (May 14 2024) in the PDF header: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-171A.pdf
- [S29] FAR CUI rule June 2026: https://secureframe.com/blog/far-cui-rule ; https://www.wiley.law/alert-FAR-Council-Proposes-Revised-CUI-Framework-as-Part-of-Revolutionary-FAR-Overhaul-With-Important-Guidance-and-Clarifications
