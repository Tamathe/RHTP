# RHTP Asset Development Roadmap

**Status:** L1 draft.  
**Purpose:** Convert the program asset spine into sequenced work that can support a navigator-supervised retinopathy pilot and later protocol packs.

## Sequencing Principle

Build assets in the order they reduce pilot risk:

1. Trust and safety.
2. Navigator actionability.
3. Measurement.
4. Integration breadth.
5. Additional protocol packs.

## Phase A - Pilot Spine

| Asset | Output | Exit Criteria |
|---|---|---|
| Retinopathy protocol pack | Versioned protocol manifest, state transitions, escalation map | Clinical owner signs off on cohort logic, scripts, and close-loop criteria |
| Navigator playbook | Step-by-step queue handling for barriers, SDOH, red flags, abnormal/repeat results | Navigator can run a tabletop scenario without app developer support |
| Trusted data bundle | Minimum fact list and provenance requirements | Every patient-facing claim maps to a source fact |
| Sandy guardrails | Allowed and forbidden actions, fallback language, escalation triggers | Red-team prompts do not produce unsafe reassurance or off-protocol advice |
| Measurement dictionary | Outcome metrics and equity cuts | Pilot dashboard can be produced from protocol events |

## Phase B - Resource and Partner Readiness

| Asset | Output | Exit Criteria |
|---|---|---|
| Kentucky SDOH operations | kynect/211/community resource workflow | Navigator can document resource connection status and source |
| FQHC partner packet | Program one-pager, clinic workflow, site feed template | Pilot clinic can explain the workflow to staff |
| Payer/KHIE packet | Data-use case, minimum data request, claims/HIE mapping | Data partner can evaluate participation |
| Patient trust packet | Consent, privacy, what Sandy can/cannot do, opt-out | Patient advisory group can understand it without technical explanation |

## Phase C - Scale Assets

| Asset | Output | Exit Criteria |
|---|---|---|
| Hypertension pack | BP education, device binding, insight rules, escalation | Ships using same protocol-pack rails |
| Glucose pack | CGM education, nocturnal hyperglycemia rule, PCP follow-up | No dosing or diagnostic recommendations |
| Medication adherence pack | Claims PDC + smart bottle events, refill-gap support | Navigator can resolve cost/access/adherence barriers |
| Campaign pack | Flu/COVID/RSV/pneumococcal outreach workflow | Cohort campaign reports outcomes by county |
| PHQ/GAD pack | Verbatim validated instrument flow and crisis route | Deterministic scoring and crisis escalation approved |

## Asset Review Cadence

| Asset Class | Minimum Review Cadence | Required Reviewers |
|---|---|---|
| Clinical protocol pack | Before pilot and every annual guideline update | Clinical sponsor, safety lead, navigator lead |
| Patient education content | Every 12 months or when source guideline changes | Clinical content, health literacy, patient advisor |
| SDOH resource catalog | Monthly for pilot counties; quarterly statewide | Resource lead, navigator lead |
| Sandy guardrails | Before every model or prompt version change | AI lead, clinical safety, compliance |
| Measurement dictionary | Before each reporting cycle | Evaluation lead, program director |
| Consent/privacy artifacts | Before real-PHI pilot and every policy change | Compliance, legal, patient advisor |

## Decision Register To Start

| Decision | Recommended Default | Needed By |
|---|---|---|
| First clinical owner | Retinopathy clinical sponsor | Before L2 protocol review |
| First navigator owner | Community health worker lead | Before tabletop testing |
| First real data source | HIE/claims/manual gap file, with provenance | Before real-PHI pilot |
| First community resource source | kynect/211 plus curated county seed | Before resource referrals |
| First voice posture | In-app Sandy with server-gated tools | Before P2 real voice |
| First reporting audience | Navigator lead + program director | Before pilot launch |
