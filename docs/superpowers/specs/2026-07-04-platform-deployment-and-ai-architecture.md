# RHTP Platform — Deployment & AI Expansion Brief

**Date:** 2026-07-04
**Status:** Recommendation for review
**Builds on:** `2026-07-03-rhtp-production-architecture.md` (locked decisions stand), `2026-07-03-longitudinal-health-companion.md`, `2026-07-04-health-alerts` spec
**Question answered:** how to deploy this as a platform — device sync (BP cuffs, wearables, CGMs, smart pill bottles), statewide HIE/claims ingestion, the personal-record chat agent, and the AI capability roadmap (mental-health screening, vaccination campaigns, SDOH detection, and beyond).

---

## 1. Platform thesis

**Every new capability ships as a protocol pack on the existing care-plan engine. Nothing ships as a one-off feature.**

The production-architecture spec locked "protocolized care-plan platform" with retinopathy as protocol #1. Every request since — BP education + cuff, CGM drift insight, med adherence + pill bottle, mental-health screening, flu campaigns, SDOH detection — is the same shape:

> cohort trigger → education → (optional device signal) → insight rules → conversation → barrier collection → escalation → navigator work → measurable outcome

A **protocol pack** is the platform's unit of shipment. Each pack declares:

1. **Cohort rules** — who enters (dx codes, age, gap evidence, device signal, ADT event).
2. **Education module** — approved plain-language content (6th-grade reading level, read-aloud, translated).
3. **Device bindings** — which observation types it consumes (BP, glucose, bottle events, steps/sleep).
4. **Insight rules** — deterministic pattern detectors that emit protocol events (see §5).
5. **Conversation tools** — the Sandy tools this protocol authorizes, with server-side gates.
6. **Escalation map** — red flags, thresholds, and crisis routes; always deterministic.
7. **Navigator work types** — what lands in the queue and with what priority.
8. **Outcome metrics** — the numbers the program reports (most map 1:1 to HEDIS/RHTP measures).
9. **Red-team suite** — protocol-specific adversarial tests as a launch gate.

The retinopathy rails already prove the loop; the Health tab already simulates packs 2–4 (BP, glucose, meds). The platform work is making the rails real: device rail, ingestion rail, insight engine, and the grounded agent.

---

## 2. Deployment architecture

Six layers. Concrete picks per layer.

### 2.1 Channels

- **PWA-first** stays correct for reach (rural mixed devices, no app-store friction, navigator-assisted enrollment in a waiting room).
- **Thin native shell (Capacitor wrapping the existing React app) becomes mandatory the day real device sync ships** — Apple HealthKit and Android Health Connect are native-only APIs. This is the single hard constraint the current PWA posture hits. Ship the shell only when the device rail ships; don't pay app-store friction before then.
- **SMS** is the outreach/reminder channel (register A2P 10DLC early; approval takes weeks). Never put clinical detail in the SMS body — deep-link into the app.
- **Voice** in-app via backend-created WebRTC sessions (already specced).

### 2.2 Experience surfaces

Patient app, navigator console (both exist in prototype form), then: program dashboard (RHTP outcome reporting per county/cohort), and later clinician-facing summary views (SMART on FHIR app so it launches inside the EMR rather than being another portal).

### 2.3 Data platform — FHIR-native canonical record

**Adopt a FHIR R4 store as the canonical patient record now**, alongside the event-sourced protocol state the P1 backend already established.

- Every planned inbound speaks FHIR or maps to it: payer Patient Access APIs are FHIR R4 by regulation, HIE CCDs map to FHIR, TEFCA exchange is FHIR-flavored, EMR writeback will be SMART on FHIR. Storing canonically once turns each future integration into an adapter instead of a migration.
- Device readings become `Observation` resources with `Device` + `Provenance` attached — the provenance ledger requirement falls out of the data model for free.
- Recommended: **Medplum** (open-source, Postgres-backed, self-hostable on HIPAA-eligible cloud, built-in SMART-on-FHIR auth and audit) if we want control and low run-cost; **Azure Health Data Services / AWS HealthLake** if we prefer managed. Either is fine; the decision is FHIR-native vs bespoke, and bespoke loses.
- **High-frequency streams** (CGM ≈ 288 readings/day): store the raw stream in partitioned Postgres/Timescale; project clinically meaningful summaries into FHIR (daily time-in-range, pattern flags) rather than 288 Observations/day. Insight rules run on the stream; the record keeps the conclusions.

### 2.4 Care-plan engine

The P1 backend (persistence, protocol actions, audit, routes) is the seed. Production hardening: event-sourced protocol instances, tool/action gateway with server-side authorization (specced §6.5), consent versioning, outreach scheduler. No change of direction — this layer is already right.

### 2.5 Intelligence layer — rules decide, models explain

Three lanes:

- **Deterministic insight engine (new, and load-bearing):** thresholds, drift windows, care-gap schedules, PDC adherence math, screening intervals. Runs on every new observation/claim/event; emits typed protocol events (`nocturnal_hyperglycemia_pattern`, `bp_morning_surge`, `refill_gap`, `discharge_followup_due`). **No LLM in this lane.** This is what keeps the FDA posture clean and the behavior auditable.
- **Live voice lane:** realtime speech-to-speech (OpenAI Realtime per existing spec), protocol tools only.
- **Async reasoning lane:** navigator summaries, insight explanations, visit-prep generation, message drafting — Claude Sonnet for analysis/generation, Haiku for high-volume classification (message triage, SDOH signal tagging, intent routing). BAA + zero-retention terms with **every** model vendor; model/version logged per action (already specced).

The grounded chat agent ("trained on your medical history") is **RAG + tools over the FHIR record**, not fine-tuning: retrieval of the patient's resources with provenance citations, plus gated tools (`get_care_plan`, `get_observations`, `record_barrier`, …). Fine-tuning on individual PHI is the wrong tool — it's unauditable, unupdatable, and a privacy liability. The knowledge bundle concept in the companion spec is exactly the retrieval scope definition.

### 2.6 Hosting & security

HIPAA-eligible cloud (AWS or Azure), private VPC, IaC from day one, KMS envelope encryption for sensitive columns, short-lived signed URLs for any media, role-based access, append-only audit (exists in P1). Single environment per program initially; multi-tenant only if this serves multiple states/programs later. BAA chain: cloud, model vendors, SMS vendor, any aggregator.

---

## 3. Device & wearable rail

Three tiers plus an escape hatch. Sequence by coverage-per-effort:

| Tier | What | How | Notes |
|---|---|---|---|
| 1 | BP cuffs, wearables, scales, steps/sleep/HR | **Apple HealthKit + Android Health Connect** via the native shell | Omron/Withings/iHealth cuffs and mainstream wearables already write here. Patient-mediated consent, zero per-vendor contracts. This one integration covers the majority of consumer devices. |
| 2 | CGM | **Dexcom API** (official, patient OAuth). Libre access is partner-gated via Abbott/LibreView — pursue partnership; consider Tidepool as a bridge | CGM is the flagship insight surface. Nighttime-hyperglycemia detection is exactly the intended pattern: rules detect, Sandy explains, output is "discuss with your PCP," never a dosing suggestion. |
| 3 | Med adherence | **Claims-based refill adherence (PDC) first**; smart bottle/cap APIs (Hero/AdhereTech/Pillsy-class) as enhancers | Refill data covers ~everyone with pharmacy claims and costs nothing in hardware — this keeps the adherence signal equitable. Smart bottles are a premium add-on, not the foundation. |
| — | Escape hatch | Validic/Terra-class aggregator | Buys breadth fast at per-member cost. Only if a pilot demands device diversity before Tiers 1–2 land. |

Ingestion pattern is uniform: device event → normalize → `Observation` + `Device` + `Provenance` → insight engine → protocol events. Device data is **never** presented without its source labeled (the provenance strip already does this in the UI).

---

## 4. Statewide ingestion — HIE and claims

"All the data flowing through the state" is reached in three moves, sequenced by permission cost:

### Move 1 — Patient-authorized claims APIs (weeks, no org agreements)

The CMS Interoperability & Patient Access rule obligates Medicare and Medicaid managed-care plans to expose FHIR R4 Patient Access APIs. With only the patient's OAuth consent:

- **Medicare Blue Button 2.0** — claims history for Medicare members.
- **Kentucky Medicaid MCO Patient Access APIs** — diagnoses, encounters, medication fills for the Medicaid population, which is the RHTP-relevant population.

This is the fastest legitimate path to a longitudinal record: no data-use agreements with payers, consent is native to the flow, and med-fill history unlocks the adherence protocol with zero hardware.

### Move 2 — KHIE participation (months, real agreements)

The Kentucky Health Information Exchange is the "acute care hospitals and primary care offices" pipe:

- **Document query (CCDs)** — problem lists, meds, allergies, labs, encounters from participating facilities.
- **Event notifications (ADT)** — admit/discharge/transfer alerts. **This is the highest-value real-time signal in the state pipe:** a discharge event triggers the transitional-care protocol (follow-up within 7 days, med reconciliation conversation, barrier check). Readmission-reduction is measurable and fundable.
- Lab results and immunization registry access feed the glucose/A1C and vaccination protocols.

Requires a participation agreement, identity matching discipline, and sensitive-data handling (§6). Start the paperwork early; it's calendar time, not engineering time.

### Move 3 — TEFCA Individual Access Services (year+)

For out-of-state and national completeness, patient-mediated record retrieval through a QHIN. Watch, don't build yet.

### Identity, the precondition

Wrong-patient linkage is this platform's existential failure mode (the health-domain analog of a fabricated deadline). Controls: identity proofing at enrollment before any external linkage; **navigator-attested enrollment** as the rural trust channel (the person at the clinic sets you up — trust transfers); deterministic + probabilistic matching with a low-confidence queue (already a specced navigator work type); patient confirmation of imported facts before they become plan-driving truth (mirrors the source-fact confirmation model already specced).

---

## 5. AI capability catalog

Organized by lane. Every item follows the same law: **deterministic rules decide; models explain, personalize, and converse; humans own exceptions.**

### A. Conversational (Sandy, grounded on the patient's record)

| Capability | Notes |
|---|---|
| Personal health Q&A | RAG + tools over the FHIR record; every answer cites its sources via the provenance strip; off-bundle questions get the fallback + navigator offer. |
| Medication education | "What is metformin for, what if I miss a dose" — grounded in RxNorm/approved monographs, never dosing changes. |
| Visit preparation | Agenda builder from recent insights: "3 questions to ask about your morning BP pattern." High value, near-zero risk. |
| After-visit / discharge explainers | Translate CCDs and discharge summaries into 6th-grade plain language once KHIE data flows. One of the strongest uses of the HIE pipe. |
| Coverage & logistics navigation | "Is this screening covered," ride options, low-cost sites — reuses claims hints + site feed. |

### B. Pattern & drift detection (insight engine + LLM explanation)

Nocturnal hyperglycemia, time-in-range decay, BP morning surge/variability trends, refill-gap and missed-dose patterns, weight trajectory (CHF-ready), post-discharge follow-up windows. Each emits a protocol event → education nudge, "discuss with your care team" suggestion, or navigator task per the protocol's escalation map. Alerting UX rails (due/snooze/done + safety copy) just shipped in the alert center and are the right substrate.

### C. Proactive campaigns (population → cohort → conversation)

- **Vaccination campaigns (flu, COVID, RSV, pneumococcal):** cohort rules (age/condition/registry status) select; Sandy personalizes outreach, answers hesitancy questions from approved content, finds nearby sites, collects barriers, arranges transport help via navigator. **This reuses the retinopathy rails verbatim** — site matching, barrier intake, navigator queue — which is the protocol thesis paying off.
- **Screening recalls:** the retinopathy pattern generalized (mammography, colorectal, A1C, nephropathy).
- **Care-gap sweeps:** rules pick cohorts from claims/HIE evidence; outreach scheduler paces contact; every message says why it fired.

### D. Conversational screenings & SDOH

- **Mental health:** PHQ-2 → PHQ-9 and GAD-7 administered conversationally, **instrument wording verbatim, scoring deterministic**, results routed to navigator/PCP. Crisis routing (suicidal-ideation item or free-text red flag → 988 + human escalation) is hard-coded, never model-discretionary.
- **SDOH detection:** two inputs — PRAPARE-aligned conversational intake, plus passive signal tagging (Haiku classifies transportation/food/housing/cost mentions already being collected as barriers). Output: Z-code-mapped flags → community-resource referral (findhelp/211-class) + navigator task. **Assistive-only forever:** SDOH flags open doors to help; they never gate or deprioritize care.

### E. Navigator & program intelligence

Queue prioritization (rules first, model-assisted second — already specced), conversation summarization with cited sources, cohort outcome analytics, county-level equity dashboards, RHTP outcome reporting, protocol-drift detection ("cost barriers spiked in county X this month").

### F. Safety lane (cross-cutting)

Red-flag detection in every conversation (chest pain, stroke signs, severe hypoglycemia symptoms, SI) → interrupt + escalate (the red-flag lock exists); approved-answer library as the first response tier; provenance-cited generation; per-protocol red-team suites (prompt injection, unsafe reassurance, off-protocol advice, false closure, identity mismatch — the P0 suite generalizes).

---

## 6. Regulatory & safety posture

- **Non-device CDS bright lines.** Educate, organize, remind, detect patterns, and suggest *discussing* with a clinician — while displaying the basis for every suggestion — and the platform stays in non-device/wellness CDS territory. The lines never to cross without a regulatory strategy: dosing recommendations (especially insulin), diagnostic claims from device data, autonomous triage decisions. The existing autonomy boundary already encodes this; the insight engine keeps it provable because every clinical-adjacent output traces to a deterministic rule.
- **HIPAA:** the platform becomes a business associate as provider/HIE data flows. BAAs across the chain (cloud, models, SMS, aggregators). The P1 audit rail and consent versioning are the right skeleton.
- **42 CFR Part 2:** SUD data arriving via HIE/claims is segmented and default-suppressed from AI context; per-category consent before it enters the knowledge bundle. Same treatment for adolescent-confidentiality categories.
- **Mental-health instruments:** validated wording verbatim, deterministic scoring, human escalation path, crisis flows hard-coded.
- **Patient-owned means provable:** full FHIR-bundle export, real deletion (including derived data and embeddings), no data sale ever, plain-language per-source consent. Publish the posture before the first pilot.
- **Equity monitoring:** device-derived insights skew toward device owners; claims-based signals keep the floor equitable. Track insight/outreach/outcome rates by county, language, and demographic strata as a first-class metric, not an afterthought.

---

## 7. Sustainability (why this survives the grant)

RHTP funds the build; the protocols are chosen to map onto durable payment rails:

- **MCO quality contracts:** eye exams, BP control, A1C control, med adherence (PDC), follow-up-after-hospitalization are exactly the HEDIS-class measures MCOs are scored on. Gap-closure-per-cohort is a sellable outcome.
- **CHW reimbursement:** Kentucky Medicaid covers community health worker services — the navigator loop is the billable artifact.
- **RPM/CCM/APCM codes** once real devices and care-plan management are live, in partnership with the clinics that own the billing relationship.
- **State program contracts** for campaign-style work (vaccination, maternal health).

Instrument outcomes from day one so these conversations are backed by data.

---

## 8. Roadmap

Phases P0–P1 are done (production-shaped prototype; backend foundation). P2–P4 stand as specced (real voice; data intake; pilot ops). The platform expansion sequences after or alongside:

| Phase | Scope | Exit criteria |
|---|---|---|
| **P2 — Real voice** | Realtime sessions, tool gateway, transcripts, red-team suite | Voice journey passes red-team gate; all tools server-gated |
| **P3 — Ingestion rail** | Patient-authorized claims APIs (Blue Button + one Medicaid MCO) → FHIR store; KHIE agreement started in parallel | A real longitudinal record renders with provenance; med list from fills |
| **P4 — Retinopathy pilot** | Navigator-supervised pilot (as specced) | Closed-loop screenings measured |
| **P5 — Device rail** | Capacitor shell; HealthKit/Health Connect; Dexcom OAuth; insight engine v1 (BP + glucose rules) | Health tab runs on real device data end-to-end; simulated labels removed |
| **P6 — Protocol packs 2–4** | Hypertension management; med adherence (claims-PDC); transitional care (ADT-triggered, requires KHIE live) | Second protocol ships with zero new rail code — the platform test |
| **P7 — Screenings & campaigns** | PHQ/GAD + SDOH conversational flows; campaign engine; flu season pilot | Screening completion + referral rates reportable; crisis-path drill passed |
| **P8 — Scale & writeback** | TEFCA IAS evaluation; SMART-on-FHIR clinician views; EMR writeback adapter; multi-county expansion | Navigator-reviewed summaries land in one EMR; expansion map goes real |

P6 is the platform's proof point: if hypertension ships as pure configuration + content on existing rails, the thesis holds. If it needs new rail code, fix the rails before adding more packs.

---

## 9. Top risks

1. **Wrong-patient identity match** — existential; mitigated by proofing-before-linkage, match-confidence queue, patient confirmation of imported facts.
2. **Unsafe reassurance / LLM drift under multi-turn pressure** — red-team gates per protocol, approved-answer first tier, deterministic red-flag interrupts.
3. **Alert fatigue → ignored alerts** — protocol-level rate caps, alert consolidation, "why this fired" on every alert, snooze analytics as a health metric of the alert system itself.
4. **HIE data quality/staleness** (dead med lists, duplicate problems) — never present imported facts as truth without confirmation state; navigator reconciliation queue.
5. **Device-equity gap** — claims-based signals as the floor; device insights as enhancement; equity dashboards.
6. **Grant cliff** — §7 revenue bridges; instrument outcomes from day one.
7. **Content-ops rot** — education modules, cohort rules, and site feeds decay; assign an owner per protocol pack with a review cadence.
8. **Scope gravity toward diagnosis** — CGM insights especially will tempt dosing/diagnostic features; the insight-engine boundary and §6 bright lines are the guardrail; revisit only with a regulatory strategy.

---

## 10. Decisions needed

1. **FHIR store:** Medplum (self-host, control, low run-cost) vs managed (Azure HDS / HealthLake). Recommendation: Medplum, revisit at multi-state scale.
2. **Native shell timing:** confirm P5 (with device rail), not earlier.
3. **First payer target for P3:** Blue Button 2.0 plus which Kentucky Medicaid MCO first.
4. **KHIE engagement:** start participation conversations now (calendar-bound, not engineering-bound). Owner needed.
5. **Aggregator:** skip (recommended) or buy for pilot breadth.
6. **Model BAAs:** execute BAA + zero-retention with OpenAI (voice lane) and Anthropic (reasoning lane) before any real-PHI pilot.
7. **Kentucky Health LLM lane** (open decision from the architecture spec): keep parked until P5+; the rules-first posture makes it non-blocking.
