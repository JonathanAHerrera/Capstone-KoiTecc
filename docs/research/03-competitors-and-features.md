# 03 — Competitors, Pain Points, Output Requirements, and MVP Scope

Research date: 2026-09-30. Target: mobile-first web app for 5–50 person defense suppliers (machine shops, parts suppliers) getting CMMC Level 1 / Level 2 ready.

## 0. The one fact that reframes everything: Phase 2 is suspended

On **July 13, 2026 DoD suspended CMMC Phase 2** (the C3PAO-certification rollout that was due November 10, 2026) and froze Phases 3–4. What remains mandatory: **Level 1 (Self) and Level 2 (Self) assessments, SPRS score submission, annual senior-official affirmation, and DFARS 252.204-7012/7019/7020.** Contracting officers "may designate only CMMC Level 1 (Self) or Level 2 (Self)" during the pause. The August 2026 Cyber AB town hall stressed the program is not cancelled; a reform task-force report was expected mid/late September 2026 with public info "potentially by early October." Primes may still demand more in flowdowns.

Implications for us:
- The **self-assessment path is the whole market right now**. A tool that gets a shop to an honest, evidence-backed self-assessment and SPRS entry is exactly what is required, not a "nice to have before the C3PAO."
- DOJ is still enforcing: MORSECORP paid $4.6M (claimed SPRS 104, actual −142); LOGZONE (26 employees) paid $507K in June 2026. **False self-assessments are the risk, so an "evidence-or-it-doesn't-count" product is defensible positioning.**
- Reform may change Level 2 self-assessment specifics within weeks. Keep the practice list data-driven, not hard-coded.

## 1. Competitor landscape

| Tool | Target | Public pricing | Mobile | Evidence collection | AI review | Outputs |
|---|---|---|---|---|---|---|
| **Vanta** | SOC2/ISO shops adding CMMC; mid-market | Not published; buyer reports $12–28K/yr | Web only | 400+ cloud integrations, hourly pulls | AI maps/suggests; no verdict on uploaded artifacts | SSP workflow, POA&M, L1–L3 mapping; FedRAMP 20x Moderate |
| **Drata** | Mid-market, multi-framework | Quote; ~$7.5–15K+/yr | Web only | 120+ integrations, "CUI monitoring" | AI gap interpretation | SSP, POA&M w/ owners, SPRS calc, level picker |
| **Secureframe** | SMB; "Defense" tier | From ~$7–7.5K/yr; <10 employees discounted | Web only | Integrations + upload | "AI evidence validation" (commercial-framework style) | SPRS tracker, SSP, POA&M |
| **FutureFeed** | DIB contractors <50 FTE; MSPs | **$99/mo (≤25 FTE) + $1,008/yr for L2; L1 free with Core** | Not addressed | **Manual upload, user must map artifact → objective** ("your export is only as good as your mapping"); no hashing | None | Live SSP, POA&M, dynamic SPRS score, assessor read-only portal, GovCloud |
| **Summit 7 (Vigilance / NCODE)** | 25-person L2 shops; GCC High | ~$265K all-in modeled for 25-person L2; NCODE is a DoD-subsidized pilot for 2–10 employee firms | No | MSSP-operated | No | Managed enclave covering ~51% of objectives; consulting |
| **Cuick Trac** | CUI/ITAR firms lacking IT bandwidth | Quote | No | Managed VDI enclave (GCC-H) | No | Enclave covers "82% of L2 objectives", SSP/POA&M assistance |
| **Totem Tech** | Tiny DIB firms | **L1 package $5–7K/yr (10 users); L1 gap $6.1K; L2 gap $21.2K; ZCaaS $400–1,700/mo** | No | Consultant-led + their Totem tool | No | SSP, POA&M, training |
| **Kiteworks** | Secure file/email for CUI, enterprise | Business $25.50/user/mo (5-seat min); L2 tier quote-only | Mobile app for file access, not compliance | n/a (not a GRC tool) | No | Not an assessment tool |
| **PreVeil** | CUI email/files enclave | From $450/mo for 3 licenses | Yes (email/file apps) | n/a | No | Supplies pre-written SSP/POA&M text for the PreVeil portion only |
| **ComplianceForge** | Doc templates (policies, SSP, POA&M) | ~$8/user/mo billed annually; one-off bundles | No | n/a | No | Word templates |
| **Cyturus (CRT)** | Users of ComplianceForge docs | Quote | No | Manual, "Living Control Set" | No | Policy/evidence linkage, risk register |
| **Exostar PolicyPro / CMMC Ready Suite** | Prime-supplier networks | Usage-based, quote | No | Manual | AI drafts policies | Policies, assessment workflow |
| **Ignyte** | GovCon/FedRAMP, needs consultants | Quote; they cite $30–200K total program cost | No | Manual + consulting | Light | SSP, POA&M, evidence workflow |
| **Paramify** | RPOs, document-heavy orgs | **$8–25K/yr L2; $2K/yr gap tier** | No | Data model → generated docs (OSCAL) | AI generates SSP in 1–7 days | SSP, POA&M, policies |
| **Strike Graph** | Mid-market | $9–18K/yr | No | Upload + "Verify AI" evidence validation (patent-pending) | **Yes, closest to our loop** | SSP, POA&M |
| **MotherBear Security** | SMB + MSPs | Custom (Core/Plus/Ultimate) | No | Central repo | "AI Readiness Review" on Ultimate tier | SSP, policies, POA&M |
| **CMMC Map** (Hydromation, 2025–26) | Small contractors, SPRS readiness | **Free assessment; $149/mo for docs** | Not mentioned | Read-only M365/Google config reads | AI drafting off by default; MCP connector | SSP, POA&M, 14 policies, live SPRS |
| **RegulatoryForge / CMMCTrack / NormSuite / ComplyUp** (newcomers) | DIY small shops | $29–297/mo; CMMCTrack $199 one-time | No | Questionnaire | AI-drafted SSP/POA&M | Word/PDF SSP, POA&M |
| **Risk Cognizance, RegScale, Cenverity, Scytale** | Mid/enterprise GRC with AI | Quote | No | Integrations | AI gap analysis, doc generation | SSP/POA&M |

Compliance Rank: no distinct product surfaced in searches; treat as noise.

Takeaways:
1. **Nobody is mobile-first.** Not one tool advertises camera capture or a phone/iPad flow. Shop-floor evidence (badge readers, locked server closets, visitor logs, USB port blockers, posted policies) is physical and lives where the laptop isn't.
2. **"Evidence review" is mostly mapping, not judging.** FutureFeed, Ignyte, Cyturus make the user map artifacts to objectives. Strike Graph's Verify AI and MotherBear's readiness review are the only ones that render a verdict, and both are desktop and mid-market priced.
3. **Price gap**: credible small-shop tools cluster at $99–$150/mo (FutureFeed, CMMC Map) or $5–7K/yr bundles (Totem). Below that is template-generators with no evidence loop. An AI-reviewed evidence loop at ~$100–200/mo would be a new tier.
4. **Enclaves (Cuick Trac, PreVeil, Summit 7) are complementary, not competitors**: they implement controls; they don't collect the shop's own evidence for the other 18–49% of objectives.

## 2. Small-business pain points (with real quotes)

Note: reddit.com blocked all fetches from this environment, so quotes come from Congressional testimony, trade press, Cyber AB town-hall recaps, and SBA/Reuters coverage. Reddit sentiment should be sampled manually before launch copy is written.

**Cost, and cost unpredictability**
- "At Raymond, compliance with a Level 2 certification will cost approximately $500,000, including system upgrades, consultant fees, compliance documentation, third-party assessments, and the hiring of dedicated IT staff." … "a fellow business owner operating a one-person firm reported spending more than $30,000 to achieve compliance." — Michael Ramos, House Small Business Committee, Sept 2025
- "It's an overwhelming thing for a very small shop to do, but we're doing it." … early estimates ~$60K, expected "a good bit higher," timeline "a couple of years." — Jayme Rahz, CEO, Midway Swiss Turn (10 employees), Production Machining
- DoD's own estimates: L1 self $4–6K; L2 self ~$37K over 3 years; L2 C3PAO ~$105K. SBA's figures used to justify the pause: ~$388.6K (self) vs ~$593.8K (third-party), "more than $7 billion annually" across SMBs.
- Dave Trader, Pathfinder Manufacturing (Reuters): "unsure whether compliance is worth the cost since the firm does limited defense work."

**Scope / CUI confusion**
- "Equally concerning is the lack of clarity around how Controlled Unclassified Information (CUI) will be managed… The result has been broad and indiscriminate application of the CUI label, with the costs of compliance falling on contractors." — Ramos testimony
- Reuters: "confusion over what information needs protection" and primes "asking for greater compliance even if the supplier does not handle sensitive information."
- Industry comments to the CMMC Reform Task Force (Aug 2026): CUI is "overmarked, inconsistently marked, or improperly flowed down," and uncertain shops "err on the side of including all of it into their compliance boundary."
- Machine-shop-specific: "nobody scoped where CUI actually lives, so the whole network is in play, and 110 requirements suddenly apply to the shipping PC and the break-room laptop."

**Evidence burden and assessment readiness**
- "the assessor ecosystem is growing, but the population of contractors with assessment-ready evidence is still small." — Defense Compliance Report
- August 2026 town hall listed the most burdensome requirements as "FIPS-validated cryptography, audit log management, media sanitization, and documentation."
- Assessor guidance on what gets rejected: "Screenshots only — easily spoofed or outdated… Missing timestamps or context… Scattered storage — evidence spread across emails/folders." "If an assessor can't see it, test it, or trace it—assume it doesn't count."

**SSP / policy writing**: SSP + documentation quoted at $12–60K for a small shop; FutureFeed users must map every artifact by hand; template vendors (ComplianceForge, RegulatoryForge) exist precisely because shops can't write 110 narrative statements.

**MSP / consultant dependency**: "small businesses must depend on external consultants, software vendors, and managed service providers to achieve certification" (Ramos). Consulting runs $250–400/hr; RPO engagements $15–80K; MSP $2–10K/mo. The 3-year rule that your consultant can't be your assessor adds vendor-juggling overhead.

**Trust/fraud exposure**: the MORSECORP and LOGZONE settlements mean a casually-entered SPRS score is now a legal liability for an owner who signs the affirmation.

## 3. What a self-assessment output must contain

**Level 1** (32 CFR 170.15): 15 requirements from FAR 52.204-21, **58 assessment objectives**. All must be MET; **POA&Ms are not permitted at L1**. Each objective is assessed by Examine / Interview / Test. Output = a yes/no record plus retained evidence (there is no numeric score). SPRS entry: PIEE login → SPRS → Cyber Reports → "Add New CMMC Level 1 Self-Assessment" → assessment date, scope (Enterprise/Enclave), employee count, included CAGE(s), yes/no compliance → Transfer to Affirming Official → AO affirms. Status: "Pending Affirmation" → "Final Level 1 Self-Assessment"; expires after 1 year; must be redone annually.

**Level 2 (Self)** (32 CFR 170.16): 110 requirements, **320 objectives**, 14 families. Score per NIST SP 800-171 DoD Assessment Methodology: start at 110, subtract 1/3/5 per unmet requirement. SPRS Quick Entry Guide v4.0 flow: SPRS Cyber Vendor User role → Cyber Reports → CMMC Level 2 (Self) tab → enter compliance status per requirement (objectives reviewable per requirement) → scope, employee count, CAGE(s) from SAM hierarchy → score auto-calculated → transfer to AO → affirm. Only **88–109 (Conditional, valid 180 days)** or **110 (Final, 3 years with annual affirmation)** can be affirmed. "If a requirement is not able to be subject to a POA&M, then the Status Type will be No CMMC Status regardless of score."

**POA&M rules (32 CFR 170.21)**: only 1-point requirements may be deferred, except SC.L2-3.13.11 (FIPS) which can be partial for 3 points; **never** AC.L2-3.1.20, AC.L2-3.1.22, PE.L2-3.10.3, 3.10.4, 3.10.5; closeout within 180 days or the Conditional status expires. Fields that should be present: requirement ID, weakness description, responsible party, resources, planned actions, milestones with dates, start/target completion, status, evidence reference on closure.

**SSP structure** (NIST 800-171 Appendix / Strike Graph / ComplianceForge consensus): cover + revision history; system identification (name, owner, level, CAGEs); system environment and boundary (asset inventory by CMMC asset category, network diagram, external connections, CUI data flow); roles; per-requirement block containing ID + statement, implementation status, **implementation narrative written specifically** ("we use…" is flagged as weak), responsible party, evidence references; POA&M cross-reference; appendices (policies list, evidence index). Only L2/L3 require an SSP; at L1 a lightweight "self-assessment record" with evidence index is what you retain for six years.

**Evidence package**: assessors want three kinds — documents (policies/procedures), artifacts (configs, logs, screenshots, training records, photos), demonstrations. Each artifact needs timestamp, source, scope context, and a mapping to the objective. DoD publishes a CMMC Hashing Guide; FutureFeed is criticized for not hashing.

## 4. MVP feature list (one-day build), MoSCoW

**Must**
- **Scoping questionnaire** (≤6 questions): do you receive drawings/specs/CUI-marked data? FCI only? Which contracts/primes? Enclave or whole shop? Employee count, CAGE. Output: Level 1 or Level 2 (Self), and the scope string SPRS will ask for.
- **Practice checklist, data-driven**: L1 = 15 practices / 58 objectives; L2 = 110 / 320 (store as JSON with point weights and POA&M-eligibility flags). Status per practice: `not_started / evidence_submitted / under_review / accepted / needs_work / not_applicable`.
- **Practice detail page**: plain-English "what this means for a shop", "what to show us" (3–5 concrete evidence examples per practice, e.g. photo of locked server closet + visitor log page), and the objectives it must satisfy.
- **Evidence upload with camera capture** (`<input capture>` on iPad/phone), plus file, short video, and typed statement. Capture EXIF/timestamp, who uploaded, and which objective(s) it targets.
- **AI review with structured verdict**: `{verdict: accepted | needs_work, objectives_met: [...], objectives_missing: [...], feedback: plain English, suggested_next_evidence: [...]}`. Must be told it is a readiness reviewer, must cite the objective text, must never say "compliant" or "certified."
- **Progress dashboard**: practices accepted / total, objectives met / total, projected SPRS score (L2) using 1/3/5 weights, "blocking" badge for non-POA&M-eligible gaps.
- **POA&M auto-generation** for every `needs_work` item that is POA&M-eligible; non-eligible items flagged as "must fix before affirmation."
- **Export v0**: evidence binder (zip or PDF: per practice → narrative + artifacts + review verdict + hashes) and POA&M CSV; L1 "Self-Assessment Record" PDF with the exact fields SPRS asks for.
- **Non-certification disclaimer** on onboarding, dashboard, and every export.

**Should**
- SSP draft (L2) generated from accepted evidence narratives into the structure in §3.
- SPRS "entry card": the exact values to type into SPRS (scope, employee count, CAGEs, score, assessment date) and a step-by-step with the PIEE role prerequisite.
- Affirming Official hand-off: name the AO, one-page summary they sign off on (mirrors "Transfer to AO").
- Evidence freshness: flag artifacts older than 12 months; annual re-affirmation reminder.
- Hash every artifact on upload (SHA-256) and list hashes in the export.

**Could**
- Guided "CUI pathway map" for shops (RFQ → CAD → CAM → CNC → inspection) that pre-marks likely in-scope assets.
- Policy starter text for the handful of policies L1 shops actually need (access, media, physical).
- Multi-user roles (owner vs. the person on the floor taking photos).
- Read-only M365/Google config pulls (CMMC Map pattern).

**Won't (explicitly)**
- Any claim to certify, "pass," or "guarantee" anything. No C3PAO scheduling or marketplace.
- Storing CUI itself. Evidence should show controls, not contain the drawings. Say so in upload UX.
- Managed enclave, MDM, SIEM, or any control implementation.
- Direct SPRS/PIEE API submission (no public API; CAC/PIEE-gated).
- Automated cloud integrations (Vanta-style). Shops run a handful of Windows PCs and a CNC network; integrations don't reach the physical controls that matter.
- Level 3, NIST 800-171 Rev 3, FedRAMP, ITAR.
- Desktop-first layouts; multi-framework (SOC 2, ISO).

## 5. Legal and positioning cautions

- **We cannot certify, assess, or affirm.** Only a C3PAO (L2 cert) or DIBCAC (L3) certifies; only the OSA's Affirming Official affirms in SPRS. Use "readiness," "self-assessment helper," "evidence organizer." Never "CMMC certified," "compliant," or "passed."
- **The AI is not an assessor.** The Cyber AB has logged 43 complaints including "exaggerated marketing claims… and guarantees of certification outcomes." Label verdicts "AI readiness review, not an assessment." Keep the Examine/Interview/Test language but don't call outputs "assessment findings."
- **False Claims Act**: the owner signs the affirmation; if our projected score nudges them to overstate, that's their liability but our reputational risk. Make the projected score conservative (unreviewed = not met), show the evidence trail, and hash artifacts.
- **Don't be a Cyber AB-credentialed-sounding brand**: no "CCP," "RPO," "C3PAO," "Cyber AB" in product name or claims unless actually registered.
- **Don't store CUI** unless you are prepared for DFARS 7012 / FedRAMP Moderate-equivalent hosting; FutureFeed explicitly tells users not to put CUI in their platform for this reason.
- **Reform is in flight**: L2 self-assessment details may change in Q4 2026; version the practice dataset and surface the rule version in exports.
- Primes may require more than DoD during the pause; make clear our output covers DoD's rule, not prime-specific flowdowns.

## Sources

- https://www.governmentcontractslaw.com/2026/07/dod-suspends-cmmc-phase-2-what-happened-what-it-means-and-what-nobody-is-telling-you/
- https://isidefense.com/compliance-status/cmmc
- https://www.cmmc.com/newsroom/cyber-ab-town-hall-08-2026
- https://secureframe.com/hub/cmmc/news-updates-2026
- https://secureframe.com/blog/false-claims-act
- https://www.governmentenforcementreport.com/2026/09/doj-cyber-fca-settlements-and-dow-cmmc-phase-ii-suspension-what-defense-contractors-should-know/
- https://democrats-smallbusiness.house.gov/UploadedFiles/09-10-25_Mr._Ramos_Testimony.pdf
- https://www.productionmachining.com/articles/a-small-cnc-machine-shops-journey-to-cmmc-
- https://finance.yahoo.com/news/analysis-cybersecurity-rules-us-defense-110251610.html
- https://federalnewsnetwork.com/cybersecurity/2026/08/cmmc-review-dods-inconsistent-cui-marking-continues-to-plague-program/
- https://thedefensecompliancereport.com/cmmc-for-machine-shops/
- https://thedefensecompliancereport.com/best-cmmc-providers-for-small-business/
- https://thedefensecompliancereport.com/futurefeed-cmmc-review/
- https://cmmcmap.com/blog/best-cmmc-software-small-business/
- https://kioptrix.com/cmmc-compliance-software-pricing/
- https://www.complyjet.com/blog/best-cmmc-compliance-software
- https://futurefeed.co/pricing/
- https://www.totem.tech/cybersecurity-compliance-pricing/
- https://summit7.us/guides/cmmc/cmmc-cost-guide ; https://summit7.us/ncode
- https://cuicktrac.com/
- https://www.paramify.com/pricing
- https://www.motherbearsecurity.com/plans
- https://www.vendr.com/marketplace/vanta ; https://underdefense.com/blog/secureframe-pricing/
- https://www.kiteworks.com/cmmc-compliance/cmmc-compliance-vendors-showdown/
- https://thedefensecompliancereport.com/preveil-alternatives/
- https://complianceforge.com/partners
- https://www.sprs.csd.disa.mil/pdf/CMMCL2SelfQuickEntryGuide.pdf
- https://truvisory.com/federal/sprs-score-submission/
- https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-G/part-170/subpart-D/section-170.16
- https://www.exostar.com/blog/cmmc-compliance/cmmc-poams-guidelines-and-limitations/
- https://www.strikegraph.com/blog/create-cmmc-ssp
- https://praetorsec.com/blog/what-counts-as-evidence-in-cmmc-real-examples-for-l1-and-l2/
- https://etactics.com/blog/cmmc-level-1-controls
- https://secureframe.com/blog/cmmc-small-business
- https://fractionalciso.com/three-ways-to-fix-cmmc-for-small-businesses/
