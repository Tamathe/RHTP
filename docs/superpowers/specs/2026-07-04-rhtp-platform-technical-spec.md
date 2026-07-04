# RHTP Patient-Owned Care Platform — Production Technical Specification

**Date:** 2026-07-04
**Status:** Draft technical spec for review — buildable, but see Appendix B for the residual items that MUST close before a real-PHI pilot.
**Supersedes nothing; expands:** `2026-07-04-platform-deployment-and-ai-architecture.md` (direction/brief), `2026-07-03-rhtp-production-architecture.md` (locked production decisions), `2026-07-03-longitudinal-health-companion.md`, and the `2026-07-04-health-alerts` sprint.
**Scope:** the full platform — the protocol-pack engine, FHIR-native data platform, device/wearable rail, statewide claims/HIE/TEFCA ingestion, deterministic insight engine, the grounded voice+chat agent (Sandy), conversational screenings/SDOH/campaigns, safety & compliance, the navigator console, and the API/security/roadmap surface. Retinopathy remains Protocol Pack #1; every other capability the brief named ships as a pack on shared rails.

---

## How to read this document

- **§0 (this front matter)** — the platform law, the precedence rule, and how the spec was produced.
- **§1–§11** — the eleven subsystem specifications. Each is buildable on its own: typed data models, message shapes, thresholds, sequence flows, and acceptance criteria, ending in its own open questions.
- **Appendix A — Canonical Shared Spine (authoritative contract).** The single source of truth for shared names, tables, event vocabularies, and the FHIR-vs-protocol split that all eleven sections were written against. **Appendix A §8 (Reconciliation Addendum) is authoritative: where any section body diverges from Appendix A, Appendix A governs.**
- **Appendix B — Review disposition & residual register.** The honest list of what is *not yet* closed, ranked, from a three-lens adversarial review (cross-section consistency, completeness, clinical-safety/regulatory). Two existential items are flagged as hard gates before any real-PHI pilot.
- **Appendix C — Consolidated open questions & decisions register.**
- **Appendix D — Prototype map.** What exists today and how it maps to production.

## The platform law (applies in every section)

1. **Rules decide; models explain; humans own exceptions.** Every clinical-adjacent state change is a deterministic rule emitting a typed event. LLMs never mutate protocol state — they call server-gated tools that emit events, and they explain, personalize, and converse over facts that a rule or a human already established.
2. **Non-device CDS bright line.** No dosing recommendations (especially insulin), no diagnostic claims from device data, no autonomous triage. The platform educates, organizes, reminds, detects patterns, and suggests *discussing with a clinician* — always showing the basis for the suggestion. Crossing these lines requires a deliberate regulatory strategy, not a code change.
3. **Every plan-driving fact carries provenance and a confirmation state.** Imported data never silently becomes truth; `source_facts` records source, timestamps, confidence, and patient/navigator confirmation before a fact drives a plan.
4. **Protocol state is event-sourced.** Current state is a fold over an append-only `protocol_events` log; there is no mutable "status" as the source of truth.
5. **Everything ships as a Protocol Pack.** A new capability is declarative configuration + content (cohort rules, education, device bindings, insight rules, tools, escalation, work types, metrics, red-team suite) on the shared rails — adding one must require zero new rail code. If it needs rail code, the rail is wrong.

## How this spec was produced

Grounded on the live prototype (`src/`, `server/`) and the three prior specs, then authored by eleven parallel subsystem experts against a shared canonical contract (Appendix A), adversarially reviewed across three independent lenses (consistency, completeness, regulatory/clinical-safety), and revised. The review did not rubber-stamp it: it surfaced ~19 concrete interface-seam divergences (resolved authoritatively in Appendix A §8), ~16 cross-cutting subsystems still to specify, and two existential safety residuals (Appendix B.1). Those are recorded openly rather than papered over — a spec that hides its unclosed seams is more dangerous than one that names them.


---

## 01. Platform Overview & the Protocol-Pack Model

This section defines the platform's core abstraction — the **Protocol Pack** — and the shared rails every pack runs on. It is the contract that lets sections 02–10 add capabilities (hypertension, glucose, med adherence, transitional care, vaccination, PHQ/GAD, SDOH) as *configuration + content* rather than new code. It conforms to the RHTP Canonical Shared Spine (v1); it references the spine's locked names and defines only the pack-model machinery specific to this section. Where a name already exists in the prototype (`src/types.ts`, `src/lib/retinopathy-protocol.ts`, `src/lib/safety.ts`), production keeps that name and this section notes the migration.

### 01.1 Platform thesis and the safety law

**Every capability ships as one `ProtocolPack` on shared rails. Nothing ships as a one-off feature.** The retinopathy machine (prototype, live) is Protocol Pack #1 — the reference instance, not the whole vocabulary. Every subsequent capability is the same loop:

```
cohort trigger → education → (optional device signal) → insight rules
  → conversation → barrier collection → escalation → navigator work → measurable outcome
```

Three laws govern the whole platform and are enforced structurally, not by convention:

1. **Rules decide; models explain.** Every clinical-adjacent state change is a deterministic rule that emits a typed `protocol_event`. LLMs never mutate protocol state — they call gated tools that emit events (spine §0.1, §6.4). The insight engine (pack part 4) contains **no LLM** (spine §4b).
2. **Every plan-driving fact carries provenance and a confirmation state** before it becomes truth (`source_facts`, spine §2).
3. **Humans own exceptions.** Anything ambiguous, low-confidence, red-flagged, or reconciling routes to `navigator_tasks` (spine §4d).

**Non-device CDS bright lines (never crossed without a regulatory strategy):** no dosing recommendations, no diagnostic claims from device data, no autonomous triage. A pack may only educate / organize / remind / detect-pattern / suggest-discussing-with-clinician. This is machine-checkable: every authorized tool maps to a `SafetyAction` and the packager rejects any pack that authorizes a denied action (01.6).

### 01.2 The Protocol Pack — the unit of shipment

A `ProtocolPack` is the platform brief's 9 numbered parts as a typed, versioned, declarative manifest (spine §1). It is **configuration + content**: cohort rules, approved education, device bindings, deterministic rule references, tool grants, escalation config, work-type routing, metric definitions, and a red-team suite id. It contains **no imperative rail logic** — every field either names a shared-rail primitive or references a registered deterministic rule by id.

```ts
// The manifest as stored in care_protocols/packs.manifest (spine §1, §2).
// Reproduced here as the section contract; the spine is the source of truth for field shapes.
interface ProtocolPack {
  packId: PackId                 // slug: 'retinopathy' | 'hypertension' | 'glucose' | ...
  version: string                // semver; immutable once published (01.3)
  displayName: string
  measureIds: MeasureId[]        // HEDIS/RHTP outcome measures (part 8)
  cohort: CohortRules            // part 1 — who enters
  education: EducationModuleRef  // part 2 — approved plain-language content
  deviceBindings: ObservationType[]   // part 3 — observation types consumed
  insightRules: InsightRuleRef[] // part 4 — deterministic detectors (NO LLM)
  conversationTools: ToolName[]  // part 5 — Sandy tools authorized, server-gated
  escalation: EscalationMap      // part 6 — red flags, thresholds, crisis routes
  navigatorWorkTypes: NavigatorWorkType[] // part 7 — queue routing categories
  outcomeMetrics: MetricDef[]    // part 8 — reported numbers
  redTeamSuiteId: string         // part 9 — launch-gate adversarial suite
}
```

Supporting types this section pins down (referenced by other sections):

```ts
interface CohortRules {
  dxCodes?: string[]                 // ICD-10 / SNOMED
  ageRange?: { min?: number; max?: number }
  gapEvidence?: CareGapType[]        // spine §2 enum
  deviceSignals?: ObservationType[]  // entry via a device pattern
  adtEvents?: AdtEventType[]         // e.g. 'discharge' → transitional care
  logic?: 'all' | 'any'              // how the above predicates combine; default 'all'
}

interface EducationModuleRef {
  moduleId: string                   // resolves in the content registry (01.3)
  readingLevelGrade: number          // target 6; packager warns if > 6
  readAloud: boolean
  languages: string[]                // BCP-47; must include every language the cohort speaks
}

interface InsightRuleRef {
  ruleId: string                     // registered deterministic rule; namespace 'insight.<domain>.<pattern>' (spine §4b)
  emits: ProtocolEventType           // the insight.* event it produces
  params?: Record<string, number>    // thresholds/windows bound at pack level, not hard-coded in the rail
}

interface EscalationMap {
  redFlagRuleIds: string[]           // deterministic detectors → red_flag_reported
  thresholds?: Record<string, { op: '>' | '>=' | '<' | '<='; value: number; emits: ProtocolEventType }>
  crisisRoutes: CrisisRoute[]        // { trigger, action } e.g. { trigger:'suicidal_ideation', action:'route_988' }
}

interface MetricDef {
  metricId: MeasureId
  numerator: string                  // rule id: what counts as satisfied
  denominator: string                // rule id: cohort membership
  stratifyBy?: ('county' | 'language' | 'demographic')[]  // equity strata (01.5)
}
```

`AdtEventType`, `ObservationType`, `CrisisRoute`, `PackId`, `MeasureId`, `ToolName`, `NavigatorWorkType` are spine-owned. `CohortRules`, `EducationModuleRef`, `InsightRuleRef`, `EscalationMap`, `MetricDef` are defined here (they were named-but-unshaped in spine §1); if another section needs to change their shape it edits the spine first (spine §7).

**Canonical `ObservationType` enum (one vocabulary across the device→insight→pack seam).** A pack's `deviceBindings` and `cohort.deviceSignals`, the device rail's normalization output (04.3a), and the insight engine's consumed inputs (06.5) MUST all key on **the same** `ObservationType` members — this is a spine-locked enum (spine §2), not a per-section spelling. The canonical members are `bp_systolic`, `bp_diastolic`, `glucose_cgm`, `glucose_tir_daily`, `weight_daily`, `pharmacy_fill_claim` (extend only via spine §7). Sections 04, 06, and 01 bind to identical members; any pack that names a non-canonical spelling (e.g. `blood_pressure_systolic`, `bp_home_reading`) fails packager AC-1 (it references an id that does not resolve in the spine enum). LOINC/coding for each `ObservationType` is owned by §03; the device rail (04.3a) adopts §03's codes verbatim, so 01 never carries a LOINC.

**The pack-is-config invariant (P6 platform test):** adding a `ProtocolPack` must require **zero new rail code**. If a new pack needs rail code, the rail is wrong — fix the rail, don't special-case the pack. 01.6 lists the exhaustive set of extension points a pack may touch; anything outside that set is a rail bug.

### 01.3 Pack lifecycle — authoring, versioning, registry, activation, deprecation

Packs are versioned artifacts with content-ops ownership. The lifecycle is effective-dated and immutable-once-published, mirroring the audit posture of the P1 backend.

**States** (a pack version moves forward only):

| State | Meaning | Who |
|---|---|---|
| `draft` | Authoring; editable; not resolvable at runtime | Pack owner (content-ops) |
| `in_review` | Clinical + safety review; red-team suite must pass | Clinical reviewer + safety |
| `published` | Immutable; assignable to programs; effective-dated | Platform owner (gated by 01.6 checks) |
| `deprecated` | No new `protocol_instances`; open instances run to completion | Platform owner |
| `retired` | Fully closed; historical audit only | Platform owner |

**Versioning rules (locked):**
- `packId` is stable across versions; `version` is semver.
- A `published` pack version is **immutable** — content, rules, thresholds, and tool grants are frozen. A change is a new version, never an edit. This is what makes "which rule fired, under which content, on which date" reconstructable from `audit_events` + `protocol_events`.
- Every `protocol_instance` pins `pack_id` **and** `pack_version` (spine §2). A pack upgrade never mutates in-flight instances; it applies to instances opened on or after its `effectiveDate`.
- **Effective-dating:** an activation binds `packId@version` to a program with `effectiveFrom` (and optional `effectiveTo`). Cohort evaluation and instance-open resolve the version whose effective window contains `now()`.
- **A clinically-load-bearing threshold change is a version change (locked, no lighter channel).** Any change to a param that drives a `ProtocolState` transition, a crisis/red-flag band, an escalation route, an insight-rule firing threshold, or a metric numerator/denominator is a **clinical-safety change** and requires a full new published version — backtest + red-team (AC-9) + clinical sign-off — never an in-place edit or a "tuning" side channel. A lighter tuning channel, if ever added, is confined to **non-clinical display params only** (copy tone, ordering, cosmetic timing) and can touch nothing AC-1…AC-10 or the escalation map depend on. The `safetyRecall` escape hatch (01.10 Q5) is the *only* way a published version's content changes, is narrowly scoped, and mandates a red-team re-run.
- **Version identity flows into idempotency.** Because `pack_version` (and, for insight events, the rule version) selects which `source_facts` an action reads, `pack_version` is part of the logical action identity: the platform idempotency key for a `protocol_event` MUST include `pack_version` so a legitimately-new post-bump event is never silently deduped against a pre-bump one (missed care) — the canonical key recipe is owned by §02, but 01's immutability contract requires it.

```ts
interface PackActivation {
  id: string                 // 'act_...'
  programId: string          // tenant/program scope (01.4)
  packId: PackId
  version: string            // exact published version
  effectiveFrom: string      // ISO date
  effectiveTo?: string       // open-ended if absent
  status: 'active' | 'suspended'
  activatedBy: string        // audited actor
}
```

**Registry:** `care_protocols`/`packs` (spine §2) is the pack registry — one row per `packId`, `manifest` holding the current published `ProtocolPack`, plus a `pack_versions` history table (`id`, `pack_id`, `version`, `status`, `manifest`, `effective_from`, `published_at`, `published_by`, `content_owner`, `red_team_passed_at`). The **content registry** resolves `moduleId`/language bundles to approved content assets; education content is versioned alongside its pack version so a published pack's rendered words are frozen too.

**Two content scopes the registry owns — patient-bound vs. approved-generic.** The registry holds two distinct classes of asset, and the distinction matters for grounding (§07): (a) **pack education modules** (`moduleId` bundles) rendered inside a patient's instance, and (b) **approved non-PHI generic content** — drug/education monographs (RxNorm-keyed) and generic condition explainers that answer questions like "what is metformin for" with no patient facts involved. Class (b) is a **separate retrieval scope from the patient `KnowledgeBundle`**: it is approved, versioned, citable content that Sandy may retrieve to answer generic education questions *without* touching `source_facts`, and it is the corpus behind "ai-script generalized" education answers referenced by other sections. 01.3 (content registry) owns the *assets and their review cadence* for both classes; the *retrieval path and grounding/citation rules* that keep class (b) from becoming a parametric-model answer are owned by §07. Naming the split here so the approved-generic corpus has a registry home and is not confused with per-patient bundles.

**Content-ops ownership (risk #7, content-ops rot):** every pack declares a `content_owner` and a `reviewCadenceDays`. A pack whose education modules, cohort rules, or site feeds pass their review-due date without re-attestation raises a `navigator_review`-adjacent ops flag (not a patient-facing event). Ownership is a first-class field, not tribal knowledge.

**Deprecation:** setting a version `deprecated` stops new instance opens (cohort evaluation skips it) but does not disturb open instances, which fold to their terminal state under the version they were opened with. `retired` requires all instances closed.

### 01.4 Shared rails — what a pack does NOT re-implement

A pack is thin because the rails are load-bearing. These are the production-hardened primitives; a pack references them and never forks them. Each maps to prototype reality (prototype-map §§2–6) and its production home.

| Rail | Responsibility | Pack touches it via | Prototype seed → production |
|---|---|---|---|
| **Identity & consent** | Enrollment proofing, deterministic+probabilistic match, `patient_identities`, per-scope `consents`, Part 2/adolescent segmentation | Declares required `consents.scope`s in cohort eligibility; never does matching | `PatientConsent` + seed `SourceFact` → `patient_identities` + `consents` + low-confidence queue |
| **Provenance** | `source_facts` seam: every plan-driving fact points at a FHIR resource (`fhir_ref`) + confirmation state (spine §5) | Reads `source_facts`; never reads FHIR directly | `SourceFact` shape is real; seeded feeds → real HIE/claims/device adapters |
| **Protocol state engine** | Event-sourced fold over `protocol_events`; monotonic guards; terminal + review-exit rules (spine §3) | Declares its event→state map; **inherits** the pack-agnostic guards | `retinopathy-protocol.ts` (`nextProtocolStatus`, `shouldTransition`) generalized to any pack |
| **Tool gateway** | Validates, checks pack authorization, emits a `protocol_event`, returns structured output; a tool never mutates state directly (spine §6.4) | Lists authorized `conversationTools`; gateway enforces the grant per pack | `SafetyAction` allow/deny (`isAutonomousActionAllowed`) → server-gated `ToolName` grants |
| **Outreach scheduler** | Paces contact across `sms\|voice\|in_app\|push`; rate caps; opt-out; "why this fired" on every message; no clinical detail in SMS body | Declares channels + cadence; scheduler owns pacing | `outreach` events (`OutreachEvent`) → `outreach_attempts` + scheduler |
| **Navigator queue** | Single work item `navigator_tasks` (subsumes prototype `NavigatorTask` + `NavigatorQueueItem`); reason→priority mapping (spine §4d) | Declares `navigatorWorkTypes`; queue derives items from events | `NavigatorQueueItem` + `queueReasonForBarrier`/`priorityForQueueReason` → `navigator_tasks` |
| **Audit** | Append-only `audit_events`; every tool call and rule firing logged with actor, outcome, `model_id`/`model_version` (spine §2) | Nothing — audit is automatic on every gated action | `server/audit.ts` (`appendAuditEvent`) is real; generalize to all packs |
| **Metrics** | `metric_snapshots` by `cohort\|county\|language\|demographic`; equity strata first-class (01.5) | Declares `outcomeMetrics` (`MetricDef`); rail computes snapshots | `HubMetric` + `incrementMetric` → `metric_snapshots` with stratification |
| **FHIR record** | Canonical clinical facts (R4); protocol tables hold orchestration state (spine §5) | Never writes FHIR directly; device/ingest adapters do | Absent in prototype → Medplum-class store (deployment brief §2.3) |

**Migration seam to close (prototype-map §4, §2):** the prototype duplicates transition logic (store actions vs. `server/actions.ts`) and splits the navigator work item across two tables. Production collapses both: one `navigator_tasks` table, one shared reducer imported by the tool gateway. Sections that reference navigator work MUST use `navigator_tasks` and MUST NOT reintroduce the split (spine §6.6).

**Rule of construction:** a pack is a **declaration over rails**. The only executable code a pack version "adds" is registered deterministic rules (insight detectors, red-flag detectors, numerator/denominator predicates), which are pure `(facts) → event | boolean` functions living in a rule registry — not rail modifications. They are content-reviewed and red-teamed like content, and pinned to the pack version.

### 01.5 Generalized state, events, and equity — how packs stay uniform

Every pack's states map onto the generalized `ProtocolState` vocabulary (spine §3); retinopathy's 12 literal statuses are the reference mapping (`explained→engaged`, `barrier_collected→signal_collected`, `site_matched→action_matched`, `normal_closed→closed_resolved`, `abnormal_referral_needed→referral_needed`). Cross-pack code (queue, metrics, timeline) keys on the generalized names; the retinopathy literals remain valid as that pack's instance labels.

The pack-agnostic guards are **inherited, not redeclared** (from `retinopathy-protocol.ts`): monotonic by `PROTOCOL_STATE_ORDER`; terminal states never transition; `navigator_review` exits only into the declared review-exit set. Every pack supplies its own event→state map and inherits `shouldTransition`.

**Equity is a rail property, not a pack afterthought (deployment brief §6, risk #5).** Device-derived insights skew toward device owners; claims-based signals keep the floor equitable. Therefore every `MetricDef.stratifyBy` that includes `county | language | demographic` is honored by the metrics rail, and insight/outreach/outcome rates are snapshotted per stratum. A pack that relies solely on device signals for its outcome metric fails the packager's equity check (01.6) unless it also declares a claims- or gap-evidence-based path.

### 01.6 Packager acceptance checks (the machine-checked P6 test)

Before a pack version can move `in_review → published`, the packager runs these deterministic checks. All must pass. This is the enforcement mechanism behind "packs are config, not code."

| # | Check | Fails when |
|---|---|---|
| AC-1 | **No new rail code.** Manifest touches only the extension points in this section; every `insightRules[].ruleId`, `escalation.redFlagRuleIds`, `MetricDef.numerator/denominator` resolves in the rule registry | An id doesn't resolve, or the pack ships imperative rail changes |
| AC-2 | **Bright-line safety.** Every `conversationTools[]` entry maps to an *allowed* `SafetyAction` (`answer_education\|collect_barrier\|match_site\|confirm_plan`, and the pack-declared safe extensions); none maps to `diagnose_symptom\|change_medication\|reassure_red_flag` | Any authorized tool implies dosing, diagnosis, or autonomous triage |
| AC-3 | **State legality.** Every event in the pack's event→state map targets a valid `ProtocolState`; the map is monotonic under `PROTOCOL_STATE_ORDER`; `navigator_review` exits only into declared review-exit states | Any transition violates the inherited guards |
| AC-4 | **Provenance completeness.** Every plan-driving event type in the pack declares a `source_fact` basis; no plan-driving event can be emitted with empty `sourceFactIds` | A patient-facing clinical-adjacent claim lacks a "why this fired" basis |
| AC-5 | **Escalation coverage.** Every red-flag/crisis trigger routes to a deterministic action (`route_988`, `create_navigator_task` at `urgent`); no crisis path is model-discretionary | A crisis route depends on LLM judgment |
| AC-6 | **Consent scope.** Cohort eligibility declares every `consents.scope` it requires; Part 2 SUD / adolescent categories are declared for suppression | The pack would read a scope it never requested |
| AC-7 | **Equity floor.** At least one outcome metric has a non-device numerator path; `stratifyBy` present where the cohort spans counties/languages | Outcome measurement is device-only |
| AC-8 | **Content readiness.** `education.languages` covers the cohort's languages; `readingLevelGrade ≤ 6`; every `moduleId` resolves in the content registry at the pinned version; **every safety-bearing string that ships in more than one language (education, consent plain-language summary, verbatim screening instrument text, SMS/reason-line templates) resolves in EACH declared language** — no language may be missing a bundle a sibling language has | Missing translation, too-high reading level, dangling content ref, or a language-incomplete safety string (which would let an English-only copy-lint/grounding check pass content it never inspected) |
| AC-9 | **Red-team gate.** `redTeamSuiteId` resolves and its suite passes (prompt injection, unsafe reassurance, off-protocol advice, false closure, identity mismatch) | Suite missing or failing |
| AC-10 | **Accessibility floor.** Every `education.moduleId` bundle meets the platform WCAG 2.1 AA target and declares the rendering affordances the cohort needs (`readAloud` true where the cohort's `accessibility_prefs` demand it; screen-reader/keyboard/contrast/low-vision conformance attested per bundle) | A content bundle lacks WCAG-AA attestation, or a cohort that requires read-aloud/large-text/screen-reader support binds a bundle that does not provide it |

A pack that passes AC-1…AC-10 is provably "configuration + content on existing rails," reachable by the target population. That is the platform proof point.

**Why accessibility and per-language completeness are packager checks (AC-8, AC-10), not surface afterthoughts:** the platform's reason to exist is a rural, mixed-device, low-literacy, EN+ES population. A safety-bearing string present in English but missing in Spanish is not a cosmetic gap — a Spanish-language dosing directive or crisis phrase that no bundle carries slips past English-only copy-lint and grounding checks downstream (§09). Making language-completeness and WCAG-AA hard gates at publish time means an unreachable or half-translated pack can never reach `published`. The concrete rendering behavior these bundles drive (read-aloud voice/language coverage, contrast, large-text, screen-reader order) is owned by the patient surfaces (§07/§10); AC-10 only gates that the pinned content declares and satisfies the cohort's `accessibility_prefs`.

### 01.7 Worked example — the hypertension pack, end to end (P6 proof)

This manifest ships **zero new rail code**. It reuses education, device bindings (BP), the insight engine, Sandy tools, escalation, navigator queue, and HEDIS metrics — the same rails retinopathy uses. It is the concrete demonstration of 01.2's invariant.

```ts
const hypertensionPack: ProtocolPack = {
  packId: 'hypertension',
  version: '1.0.0',
  displayName: 'Blood Pressure Management',
  measureIds: ['bp_control'],                        // HEDIS CBP → spine MeasureId

  // Part 1 — cohort: diagnosed HTN adults with a BP-control gap
  cohort: {
    dxCodes: ['I10'],                                // essential hypertension
    ageRange: { min: 18, max: 85 },
    gapEvidence: ['bp_control'],                     // spine CareGapType
    logic: 'all',
  },

  // Part 2 — approved plain-language education, 6th-grade, read-aloud, EN+ES
  education: {
    moduleId: 'edu_bp_basics',
    readingLevelGrade: 6,
    readAloud: true,
    languages: ['en-US', 'es-US'],
  },

  // Part 3 — device bindings: home BP cuff observations (HealthKit/Health Connect, brief §3 Tier 1)
  // ObservationType members are the spine's canonical enum (spine §2) — the SAME spellings
  // the device rail (04.3a) normalizes to and the insight engine (06.5) consumes. One vocabulary
  // per signal across producer (04), engine (06), and pack (01): bp_systolic / bp_diastolic.
  deviceBindings: ['bp_systolic', 'bp_diastolic'],

  // Part 4 — deterministic insight rules (NO LLM); thresholds bound here, not in the rail
  insightRules: [
    { ruleId: 'insight.bp.morning_surge',      emits: 'insight.bp.morning_surge',
      params: { amHigherThanPmBy: 15, windowDays: 7 } },
    { ruleId: 'insight.bp.variability_trend',  emits: 'insight.bp.variability_trend',
      params: { sdThreshold: 12, windowDays: 14 } },
  ],

  // Part 5 — Sandy tools (all map to ALLOWED SafetyActions; AC-2 passes)
  conversationTools: [
    'get_patient_care_plan', 'explain_gap', 'record_question',
    'get_observations', 'record_barrier', 'confirm_plan',
    'summarize_for_navigator', 'create_navigator_task', 'escalate_red_flag',
  ],

  // Part 6 — escalation: hypertensive-crisis threshold + red-flag symptoms → deterministic routes
  escalation: {
    redFlagRuleIds: ['redflag.bp.symptomatic_crisis'],   // e.g. severe headache + very high BP text
    thresholds: {
      hypertensive_urgency: { op: '>=', value: 180, emits: 'red_flag_reported' }, // systolic ≥180
    },
    crisisRoutes: [
      { trigger: 'symptomatic_hypertensive_crisis', action: 'route_911_advice' }, // "seek care now", NEVER dosing
    ],
  },

  // Part 7 — navigator work routing (coarse buckets; reasons derive from events)
  navigatorWorkTypes: [
    'barrier_resolution', 'clinical_escalation', 'outreach_followup',
  ],

  // Part 8 — outcome metrics (1:1 HEDIS; non-device numerator path → AC-7 passes)
  outcomeMetrics: [
    { metricId: 'bp_control',
      numerator: 'rule.bp.last_controlled_reading',     // last in-range BP (device OR clinic-sourced fact)
      denominator: 'rule.cohort.htn_active',
      stratifyBy: ['county', 'language', 'demographic'] },
  ],

  // Part 9 — adversarial launch gate
  redTeamSuiteId: 'redteam.hypertension.v1',
}
```

**End-to-end flow this manifest produces on the shared rails (no bespoke code):**

| Step | Rail | Emits (spine event) | Resulting `ProtocolState` |
|---|---|---|---|
| Claims/HIE show HTN dx + BP-control gap; cohort matches | Ingestion → cohort eval | `care_gap_imported` | `identified` |
| Consent active, outreach eligible | Consent + scheduler | `patient_consented` | `patient_contactable` |
| Sandy explains the gap in plain language (RAG over FHIR, cited) | Tool gateway (`explain_gap`) | `sandy_explained_gap` | `engaged` |
| Home cuff streams readings; rule fires AM-surge pattern | Insight engine (NO LLM) | `insight.bp.morning_surge` | `signal_collected` |
| Patient reports "no ride to the clinic" | Tool gateway (`record_barrier`) | `barrier_reported` | `signal_collected` |
| Systolic ≥180 detected | Escalation threshold | `red_flag_reported` | `navigator_review` |
| Navigator resolves ride + reviews crisis flag | Navigator queue | `navigator_reviewed` | review-exit state |
| Last in-range reading recorded | Metrics rail | (metric snapshot) | `closed_resolved` |

Every clinical-adjacent step is a deterministic rule emitting a typed event with `source_fact_ids`; Sandy only explains. AC-1…AC-10 all pass. **Hypertension ships as this file plus its education content and registered rules — no rail change.** The thesis holds.

### 01.8 Retinopathy becomes Protocol Pack #1

The prototype *is* the reference pack; production wraps it as a manifest rather than rewriting it. Mapping (prototype → pack part):

| Pack part | Prototype source | Production form |
|---|---|---|
| 1. Cohort | seed `ScreeningGap` (`gapType: 'diabetic_retinopathy'`) | `cohort: { dxCodes: ['E11.*'], gapEvidence: ['diabetic_retinopathy'] }` |
| 2. Education | `ai-script.ts` (`WHY_IT_MATTERS_ANSWER`, approved-answer library) | `edu_retinopathy_basics`, 6th-grade, read-aloud, EN(+ES) |
| 3. Device bindings | none (screening, not monitoring) | `deviceBindings: []` — packs may bind zero devices |
| 4. Insight rules | none (no drift detection) | `insightRules: []` — screening packs are event-driven, not stream-driven |
| 5. Conversation tools | `safety.ts` `SafetyAction` allow-set + `ai-script` answers | `explain_gap`, `record_question`, `record_barrier`, `match_screening_sites`, `confirm_plan`, `record_already_completed`, `escalate_red_flag`, `summarize_for_navigator` |
| 6. Escalation | `RED_FLAG_PATTERNS`, `OFF_PROTOCOL_PATTERNS`, red-flag lock | `redflag.retinopathy.vision_loss` detectors → `red_flag_reported`; off-protocol → fallback + navigator offer |
| 7. Navigator work | `NavigatorQueueReason` (10), `queueReasonForBarrier`, `priorityForQueueReason` | `navigatorWorkTypes: ['barrier_resolution','reconciliation','referral_management','outreach_followup','clinical_escalation']` |
| 8. Outcome metrics | `HubMetric` (scheduled, completed, gaps_closed) | `measureIds: ['eye_exam']`; numerator = gradable result closing the gap |
| 9. Red-team suite | **absent** (prototype-map §8: unbuilt) | `redteam.retinopathy.v1` — the P0 suite that generalizes; **must be built before publish (AC-9)** |

The retinopathy state machine (`retinopathy-protocol.ts`) is **promoted verbatim** to the shared protocol state engine: its 12 statuses become that pack's event→state map onto the generalized `ProtocolState`, and its guards (`shouldTransition`, monotonic order, terminal set, review-exit set) become the pack-agnostic engine every pack inherits. Two prototype artifacts are retired in the migration: the parallel `NavigatorTask`/`NavigatorQueueItem` split collapses to `navigator_tasks`; the narrower `screening-gap.ts` `GapStatus` FSM becomes a UI-only projection of `ProtocolState`, not a second source of truth.

**Acceptance criteria for "retinopathy is Pack #1":** (a) the manifest above passes AC-1…AC-10; (b) `golden-path.test.tsx` (the full retinopathy loop) passes unchanged when driven through the pack-resolved rails; (c) no retinopathy-specific branch remains in any rail module — every retinopathy behavior is reachable from its manifest + registered rules.

### 01.9 Acceptance criteria (section)

1. A published `ProtocolPack` is immutable; any change is a new version; every `protocol_instance` pins `pack_id` + `pack_version`; in-flight instances are never mutated by an upgrade.
2. Cohort evaluation and instance-open resolve the pack version whose `PackActivation` effective window contains `now()`.
3. The packager blocks `published` unless AC-1…AC-10 pass; a pack authorizing any denied `SafetyAction` is rejected (AC-2), one whose outcome measurement is device-only is rejected (AC-7), one with a language-incomplete safety string is rejected (AC-8), and one whose content fails the WCAG-AA/accessibility floor for its cohort is rejected (AC-10).
4. No pack adds imperative rail code; the only executable additions are registered pure deterministic rules pinned to the pack version.
5. Every plan-driving `protocol_event` a pack emits carries non-empty `sourceFactIds`; every crisis route is deterministic.
6. The hypertension manifest (01.7) drives its full flow with zero rail changes; the retinopathy manifest (01.8) reproduces the prototype golden path with no retinopathy-specific rail branch.
7. Cross-pack code (queue, metrics, timeline) keys on generalized `ProtocolState`/event names, never on a single pack's literal labels.
8. `navigator_tasks` is the single navigator work item; no section reintroduces the prototype's split tables.
9. Any change to a threshold or param that drives state, a crisis band, an escalation route, an insight firing, or a metric predicate is a new published version (full re-gate); no lighter tuning channel touches a clinical-safety param.
10. A pack's `deviceBindings`/`cohort.deviceSignals` name only canonical spine `ObservationType` members; a non-canonical spelling fails AC-1. `pack_version` is part of every `protocol_event`'s idempotency identity.
11. No published pack has a safety-bearing string present in one declared language but missing in another, and every bound education bundle meets the WCAG-AA/accessibility floor for its cohort (AC-8, AC-10).

### 01.10 Open questions

1. **Rule registry substrate.** Are registered deterministic rules code modules (versioned in-repo, pinned by content hash) or a data-driven DSL evaluated by a rule interpreter? Code is simpler and more testable; a DSL lets content-ops author packs without engineering. Recommendation leans code + typed params (as in 01.7) until content-ops volume forces a DSL — but this is a real trade-off for section 04/06 authors to settle.
2. **Multi-tenancy scope of `PackActivation.programId`.** Single program initially (deployment brief §2.6). If the platform serves multiple states, is `programId` a tenant boundary with per-tenant content overrides, or does content stay global with only activation windows per tenant? Affects the content registry key.
3. **Pack composition and cross-pack arbitration (needs a spine owner before P6).** One patient will hold overlapping active packs (retinopathy + HTN + glucose + med-adherence is the *common* co-morbid case, not an edge). Nothing today OWNS the cross-pack arbitration data model: which pack wins a scarce outreach slot under the per-patient daily/weekly send cap, how a *shared* barrier ("no ride") resolves once across all of that patient's instances instead of N times, and whether the navigator console shows one merged patient card or N pack cards. The pieces are asserted in scattered places (this section's rate-cap intent, 08.4.2's send cap, 10.11's queue-merge question) but no single section owns the primitive. **Recommendation:** add a **patient-level outreach-pacing / arbitration primitive to the spine** (a shared pacing state keyed on `patient_id` that all of a patient's `protocol_instances` consult), with the scheduler mechanics owned by §08 and the merged-card behavior owned by §10. A patient-level rollup/projection (§02) is the natural home for "one patient, N instances" state. This is a spine addition, not a per-pack fix — flagging it here because the pack model is what makes co-morbid overlap the norm.
4. **Insight-rule threshold governance — decided; only the sign-off owner is open.** Thresholds are pack-level params (01.7). The governance question is now **closed against a lighter channel**: 01.3 locks that any threshold driving state, a crisis band, an escalation route, an insight firing, or a metric predicate requires a full versioned re-gate (backtest + red-team + clinical sign-off), because a threshold change *is* a clinical-safety change. What remains open is only *who* holds the clinical sign-off authority (a named clinical-safety officer role, likely owned by the ops/safety section) and the SLA for turning a needed threshold change around under the version discipline — not whether the discipline applies.
5. **Effective-dating vs. mid-instance content drift.** An instance pins its pack version, so education content is frozen — but if approved content is corrected for a safety reason, do open instances keep the frozen (now-known-wrong) content or force-migrate? A `safetyRecall` escape hatch on published versions may be needed, narrowly scoped and audited.


---

## 02. Domain Data Model & Event-Sourced Protocol State

This section defines the persistent domain model for the RHTP platform: the generalized, pack-parameterized protocol state machine; the full entity/table catalog with fields, keys, and relationships; the event-sourcing runtime (envelope, projections, replay, idempotency, ordering); the mapping from the live prototype types to production tables; and the migration path from the in-memory Zustand store + JSON-file server to a durable append-only event store. It conforms to the Canonical Shared Spine (v1) — it defines only the detail specific to the domain model and references shared names rather than redefining them.

Safety law upheld throughout: **deterministic rules decide protocol state; models explain/personalize/converse; humans own exceptions.** Every state transition in 02.1 is a pure function of `(current_state, event_type, outcome?)`. No LLM path in this section mutates protocol state; LLMs reach state only by calling a gated tool (spine §6.4) that emits a typed `protocol_event`. Non-device CDS bright line (spine §0.5) is enforced structurally — the reducer has no `diagnose`, `dose`, or `triage` transition.

---

### 02.1 The generalized, pack-parameterized protocol state machine

The prototype ships one hard-coded machine (`src/lib/retinopathy-protocol.ts`): retinopathy's 12 `ProtocolStatus` values and 13 `ProtocolEventType` values, with a fixed `EVENT_TRANSITIONS` map, monotonic ordering, terminal set, and review-exit set. Production keeps that exact engine and **inverts what is code vs. data**: the engine (guards, reducer, ordering discipline) is pack-agnostic rail code; the event→state map, the state order, and the terminal/review-exit sets become per-pack *declared configuration* carried in the `ProtocolPack.manifest`. Adding a pack adds no engine code (the P6 platform test, spine §1).

**02.1.1 Shared state vocabulary.** Every pack's declared states MUST be drawn from the generalized `ProtocolState` union (spine §3, 12 values). The retinopathy prototype's literal `ProtocolStatus` labels remain valid *as the retinopathy pack's instance labels* and map 1:1 onto the generalized names (spine §3 mapping table). Cross-pack code, metrics, and read models key **only** on the generalized `ProtocolState`; the retinopathy pack manifest carries the label mapping for display.

| Prototype `ProtocolStatus` | Generalized `ProtocolState` |
|---|---|
| `explained` | `engaged` |
| `barrier_collected` | `signal_collected` |
| `site_matched` | `action_matched` |
| `normal_closed` | `closed_resolved` |
| `abnormal_referral_needed` | `referral_needed` |
| `identified`, `patient_contactable`, `scheduled`, `completed`, `repeat_needed`, `navigator_review`, `closed_by_reconciliation` | (identity — same name) |

**02.1.2 Pack state-machine descriptor.** A pack declares its machine as a serializable descriptor inside its manifest. This is data, not code:

```ts
interface PackStateMachine {
  states: ProtocolState[]                         // subset of the generalized union this pack uses
  stateOrder: ProtocolState[]                     // monotonic rank; index = rank (generalizes PROTOCOL_STATE_ORDER)
  entryState: ProtocolState                       // default 'identified'
  eventTransitions: Partial<Record<ProtocolEventType, ProtocolState>>  // event → resulting state
  resultTransitions?: Record<ResultOutcome, ProtocolState>             // for 'result_imported' events
  terminalStates: ProtocolState[]                 // never transition out (generalizes TERMINAL_STATES)
  reviewExitStates: ProtocolState[]               // allowed exits from 'navigator_review'
  displayLabels?: Partial<Record<ProtocolState, string>>  // instance labels, e.g. engaged → "Explained"
}
```

**02.1.3 The pack-agnostic engine (locked guards).** The reducer and its guards are lifted verbatim from `retinopathy-protocol.ts` and parameterized by a `PackStateMachine`. Guard rules are **locked** (spine §3) and inherited by every pack:

```ts
// rank(m, s) = m.stateOrder.indexOf(s)
function shouldTransition(m: PackStateMachine, current: ProtocolState, next: ProtocolState): boolean {
  if (m.terminalStates.includes(current)) return false                     // terminal never moves
  if (current === 'navigator_review') return m.reviewExitStates.includes(next)  // review exits only into declared set
  return rank(m, next) >= rank(m, current)                                 // monotonic; no backward moves
}

function nextProtocolState(m: PackStateMachine, current: ProtocolState,
                           eventType: ProtocolEventType, outcome?: ResultOutcome): ProtocolState {
  if (eventType === 'result_imported') {
    if (!outcome || !m.resultTransitions) return current
    const next = m.resultTransitions[outcome]
    return shouldTransition(m, current, next) ? next : current
  }
  const next = m.eventTransitions[eventType] ?? current
  return shouldTransition(m, current, next) ? next : current
}
```

**Invariants (acceptance criteria):**
- AC-02.1-a: `nextProtocolState` is a pure total function — same inputs always yield same output, no I/O, no clock, no randomness. (Prototype already satisfies this.)
- AC-02.1-b: State is **never** advanced except by folding events through this reducer. No table stores a mutable authoritative status (`protocol_instances.current_state` is a derived cache, 02.2, and is rebuildable by replay).
- AC-02.1-c: An event whose transition is rejected by a guard is **still appended** to `protocol_events` (the event happened); it simply does not move `state`. The event's `state` field records the *unchanged* resulting state. Replay reproduces this.
- AC-02.1-d: `navigator_review` is the only state whose exits are non-monotonic; it may exit only into the pack's `reviewExitStates`. All other progressions are rank-monotonic.
- AC-02.1-e: A pack manifest failing validation (state not in generalized union; `stateOrder` missing a declared state; transition target outside `states`; terminal state appearing as a transition target from a non-review state) is **rejected at pack-load**, not at runtime.

**02.1.4 Retinopathy as reference instance.** The retinopathy pack's `PackStateMachine` is exactly the prototype's tables re-expressed as data: `eventTransitions` = the prototype `EVENT_TRANSITIONS`; `resultTransitions` = `RESULT_TRANSITIONS`; `stateOrder` = the 12-entry `PROTOCOL_STATE_ORDER` (mapped to generalized names); `terminalStates` = `[closed_resolved, closed_by_reconciliation]`; `reviewExitStates` = the prototype `REVIEW_EXIT_STATES` mapped to generalized names. A golden test asserts the data-driven engine produces byte-identical event sequences to the prototype reducer over the golden path (`src/golden-path.test.tsx`).

---

### 02.2 Entity / table catalog

Tables and column names are **locked** per spine §2. This subsection fixes field-level detail, types, keys, and relationships that all sections rely on. Conventions: `snake_case` tables (plural) and columns; `PascalCase` TS types; prefixed slug IDs (spine §6.2). Every mutable row has `created_at`/`updated_at`; append-only tables have `created_at` only.

**02.2.1 Identity, consent, sources.**

| Table | Fields (production) | Notes / relationships |
|---|---|---|
| `patients` | `id (pat_)`, name, county, language (BCP-47), accessibility_prefs (jsonb), contact_channels (jsonb: `{sms?, voice?, in_app?, push?}`), condition_summary, created_at, updated_at | Prototype `Patient.condition`/`a1c` collapse into `condition_summary`; `a1c` becomes a `source_fact`, not a column. |
| `patient_identities` | `id`, patient_id → patients, external_system, external_id, match_method(`deterministic\|probabilistic`), match_confidence (0–1 numeric), proofing_status, confirmed_by_patient (bool) | 1:N per patient (one per external system: HIE, claims, EHR). `match_confidence < 0.85` OR `probabilistic` unconfirmed ⇒ `low_confidence_identity_or_gap_match` navigator work (spine §4d). |
| `consents` | `id (consent_)`, patient_id, scope, status(`active\|missing\|revoked`), version, category(`general\|part2_sud\|adolescent`), created_at, updated_at | Prototype `PatientConsent` gains `version`+`category`. `part2_sud`/`adolescent` rows drive AI-context suppression (spine §5). Clinical-grade consent lives in FHIR `Consent`; this is operational per-scope consent. |
| `data_sources` | `id`, kind(`SourceKind`), name, base_url, trust_tier (int), active (bool) | New in production (prototype has no source registry). `trust_tier` orders provenance conflict resolution. |
| `source_facts` | `id (fact_)`, patient_id, label, value, source_kind(`SourceKind`), source_name, retrieved_at, effective_date, confidence(`SourceConfidence`), patient_confirmed (bool), navigator_overridden (bool), fhir_ref (nullable) | **The FHIR↔protocol seam (spine §5).** Prototype `SourceFact` gains `patient_confirmed`, `navigator_overridden`, `fhir_ref`. Protocol logic reads `source_facts`, never FHIR directly. Every plan-driving event cites `source_fact` ids (AC-02.3-e). |

**02.2.2 Care orchestration (protocol tables — canonical orchestration record, spine §5).**

| Table | Fields | Notes / relationships |
|---|---|---|
| `care_gaps` | `id (gap_)`, patient_id, gap_type(`CareGapType`), status, priority_label, evidence_source_fact_ids[] (fact_), last_event_date, created_at, updated_at | Prototype `ScreeningGap` generalized: `gapType:'diabetic_retinopathy'` → `gap_type: CareGapType` (10 values). `status`/`priority_label` remain the UI gap-card FSM (see 02.4, `screening-gap.ts`) — **distinct from `ProtocolState`.** |
| `care_protocols` / `packs` | `id (= PackId)`, version (semver), display_name, manifest (`ProtocolPack` jsonb, includes `PackStateMachine`), active | The unit of shipment (spine §1). N `protocol_instances` reference `(id, version)`. |
| `protocol_instances` | `id (proto_inst_)`, patient_id, pack_id → packs, pack_version, current_state(`ProtocolState`, **derived cache**), opened_at, closed_at (nullable), created_at, updated_at | One instance per (patient, pack) engagement. `current_state` = fold of this instance's events; rebuildable by replay (AC-02.1-b). |
| `protocol_events` | `id (proto_)`, protocol_instance_id → protocol_instances, patient_id, pack_id, type(`ProtocolEventType`), state(`ProtocolState`, resulting), actor(`ProtocolActor`), label, created_at, source_fact_ids[] (fact_), seq (bigint), idempotency_key (nullable) | **Append-only, event-sourced source of truth.** Prototype `ProtocolEvent.status` → `state`; gains `protocol_instance_id`, `pack_id`, `seq`, `idempotency_key` (02.3). |
| `outreach_attempts` | `id`, patient_id, protocol_instance_id, channel(`sms\|voice\|in_app\|push`), scheduled_at, sent_at (nullable), outcome(`delivered\|answered\|no_response\|opted_out`), created_at, updated_at | Prototype `OutreachEvent` generalized from `kind:'assistant_question'`/`surface` to `channel`+`outcome`. `no_response` after policy window ⇒ `nonresponse` navigator work. |
| `barriers` | `id (bar_)`, patient_id, protocol_instance_id, type(`BarrierType`), detail, reported_via, source_event_id → protocol_events, z_code (nullable), created_at | Prototype `Barrier` gains `protocol_instance_id`, `source_event_id`, `z_code`. SDOH barriers carry `z_code` and are **assistive-only** — never gate/deprioritize care (spine §4c). |
| `tasks` | `id (task_)`, patient_id, protocol_instance_id, step, when, site_id (nullable), created_at, updated_at | Prototype `CarePlanTask` = patient-facing next actions. **Not** navigator work. |
| `navigator_tasks` | `id (queue_)`, patient_id, protocol_instance_id, work_type(`NavigatorWorkType`), reason(`NavigatorQueueReason`), priority(`NavigatorQueuePriority`), summary, suggested_action, status(`open\|done`), owner, source_event_ids[] (proto_), created_at, updated_at | **Single navigator work item** — subsumes prototype's split `NavigatorTask` (legacy) + `NavigatorQueueItem`. Prototype `NavigatorQueueItem` maps here directly; `NavigatorTask` is dropped (02.4). Adds `work_type` (coarse bucket) alongside existing `reason` (trigger). |
| `results` | `id (res_)`, care_gap_id → care_gaps, protocol_instance_id, outcome(`ResultOutcome`), gradable (bool), captured_at, source_fact_id (nullable, → the FHIR-backed fact), created_at | Prototype `ScreeningResult` gains `protocol_instance_id`, `source_fact_id`. `source_fact_id.fhir_ref` points at the FHIR `DiagnosticReport`/`Observation`; `outcome` is orchestration, not the clinical resource (spine §5). |
| `referrals` | `id (ref_)`, patient_id, protocol_instance_id, reason, destination, owner, status(`pending\|scheduled\|completed`), days_since_result, created_at, updated_at | Prototype `Referral` gains `protocol_instance_id`. |
| `audit_events` | `id (audit_)`, created_at, actor(`ProtocolActor`), action, outcome(`allowed\|blocked\|failed`), patient_id (nullable), source_ids[], model_id (nullable), model_version (nullable), detail | Prototype/P1 `AuditEvent` gains `model_id`/`model_version` (for §03/§06 LLM-call attribution). Append-only. |
| `metric_snapshots` | `id`, metric_id(`MetricId`), pack_id (nullable), scope(`cohort\|county\|language\|demographic`), stratum (nullable), value, denominator (nullable), captured_at | Prototype `HubMetric` generalized: `scope:'cohort'` → 4-value scope + `stratum` for equity stratification. Replaces the mutable `HubMetric.value` counter with immutable dated snapshots (02.3.4). |

**02.2.3 Device / observation ownership (cross-ref §03).** Per spine §5, clinical facts live in FHIR R4; this section owns only the *orchestration seam* and the *stream store*, not the FHIR resources. Every `source_fact.label` for a device/observation signal keys on the **canonical `ObservationType` enum** (spine-owned; single member set shared verbatim by §04 producer, §06 consumer, and §01 packs — one spelling per signal, e.g. `bp_systolic`/`bp_diastolic`, `glucose_cgm`, `glucose_tir_daily`, `weight_daily`, `pharmacy_fill_claim`). This section does not fork observation-type names; it references the spine enum so the device→insight seam uses identical members. The adapter-output shape §04 produces is `DeviceReadingInput` (distinct from §03's Timescale row type `DeviceReading` — the two must not share a name).

| Concern | Owner | This section's obligation |
|---|---|---|
| BP / glucose summary / A1C / weight / immunization | **FHIR `Observation`/`Immunization`** (§03) | Each becomes a `source_fact` row with `fhir_ref`; insight rules and protocol logic read the `source_fact`, never FHIR. |
| High-frequency streams (CGM) | **Partitioned Postgres/Timescale** `device_readings` (§03 owns schema) | Raw stream is **not** FHIR and **not** a protocol table. The raw-stream store is named `device_readings` (§03 §03.7 owns it) — **one** table name, generic `observation_type` columns, `device_id` FK; §04 must not fork a second glucose-only `cgm_stream` under a different name/FK. Only clinically meaningful summaries (daily time-in-range, pattern flags) project into FHIR `Observation` → `source_fact`. |
| Insight detections | **`protocol_events`** with `type` starting `insight.` (spine §4b) | An `insight.*` event (and its `insight.*.retracted` counterpart, spine §4b) flows through the standard envelope (02.3) and may drive state or emit `navigator_tasks` per the pack escalation map. Retraction state-fold semantics are 02.3.6. The record keeps the conclusion, not the raw stream. |

Prototype note: the longitudinal `HealthInsight` content (`src/lib/longitudinal-health.ts`) is **static hand-authored copy**, not engine output. Production replaces it with `insight.*` `protocol_events` emitted by the deterministic insight engine (§03/§06); the static strings become `education` module content, not facts.

---

### 02.3 Event-sourcing runtime

**02.3.1 Canonical envelope.** Every `protocol_events` row conforms to `ProtocolEventEnvelope` (spine §3), plus two persistence fields this section adds to the spine's shape:

```ts
interface StoredProtocolEvent extends ProtocolEventEnvelope {
  seq: number            // monotonic per protocol_instance_id (see ordering)
  idempotencyKey?: string  // dedupe key for at-least-once producers (see idempotency)
}
```

`sourceFactIds` is **never empty for a plan-driving event** (spine §3, §6.7). Enforced as a not-null/non-empty check at append for every event type except pure lifecycle bookkeeping (`care_gap_imported` may cite the importing fact; `navigator_reviewed` cites the reviewed event's facts, as the prototype already does via `patientSourceFactIds`).

**02.3.2 Ordering & clock (this section owns the platform time/ordering contract).** The event log is the source of truth; order is authoritative and total *within a `protocol_instance_id`*. **This section is the single owner of the ordering/clock contract across all producers** — insight engine (§06), tool gateway (§06), and ingestion (§04) each replace the prototype's fixed `now()` with an injected clock, but the *causal-ordering* rule they all obey is `seq`, defined here (not per-section wall-clock reasoning):
- `seq` is a per-instance monotonic counter assigned **inside the append transaction** (`SELECT max(seq)+1 ... FOR UPDATE` on the instance row, or an instance-scoped sequence). Global `created_at` is *not* relied upon for causal order (the prototype's fixed clock proves why: `now()` returns a constant, so wall-clock cannot order events).
- **Clock injection.** `created_at` (and any `triggeredAt`/effective-dating an insight rule carries, §06.3) is stamped from an injected clock, never a bare `now()` — but `created_at` is *descriptive metadata only*, never a tiebreak for causal order. Two events with equal or non-monotonic `created_at` (e.g. a backfill effective-dated into the past) still order by `seq`. Effective-date on a `source_fact` (when the fact was clinically true) is orthogonal to `seq` (when the event was appended); the reducer folds by `seq`.
- Cross-instance ordering is not required; each instance folds independently. The navigator queue and metrics read models tolerate eventual, per-instance ordering.
- AC-02.3-a: appending event N to an instance requires the appender to have observed `current_state` at `seq = N-1` (optimistic concurrency). A concurrent append at the same `seq` fails and retries the fold — preventing two events racing past a guard. This is the single arbitration point where the insight engine, tool gateway, and ingestion producers serialize against one instance.
- AC-02.3-g: replay orders strictly by `seq`; `created_at` is never consulted for order. A test appends events with deliberately out-of-order `created_at` and asserts the fold matches `seq` order.

**02.3.3 Idempotency (this section owns the canonical platform-wide contract).** Producers (Sandy tool gateway §06, ingestion adapters §04, insight engine §06) are at-least-once. **All producers MUST derive `idempotency_key` from the single recipe defined here** — §04 (`hash(patientId,source,externalId)`), §06 (`hash(ruleId+ruleVersion+instance+facts)`), and §11 (client `Idempotency-Key` header) reference this recipe rather than defining their own, so producers appending to the same `protocol_events` table cannot collide or mismatch at the seams. Dedupe is by `idempotency_key`:
- **Canonical recipe (locked):** `sha256(protocol_instance_id | event_type | pack_id | pack_version | rule_version? | source_fact_ids_sorted | producer_request_id)`.
- **`pack_version` is mandatory in the key; `rule_version` is mandatory for `insight.*` events.** A published pack-version (or rule-version) bump that changes `source_fact` selection is a *different logical action*: without these fields a legitimately-new post-bump event would be silently deduped against a pre-bump event (a **missed care gap / missed insight**, a safety issue — regulatory required control), or a re-import would fail to dedupe. Including them makes a post-bump event a distinct key. This closes 02.6-Q5 as a spine rule, not an open question.
- A unique index on `(protocol_instance_id, idempotency_key)` makes re-delivery a no-op (the second insert conflicts and is dropped; the fold is unchanged).
- AC-02.3-b: replaying an ingestion or tool call twice produces exactly one event and one identical `current_state`.
- AC-02.3-f: a re-import **after** a pack-version or rule-version bump does **not** dedupe against pre-bump events (the key differs); a re-import at the **same** version does dedupe (the key matches). CI asserts both directions.

**02.3.4 Projections / read models.** Read models are **derived, disposable, and rebuildable** by folding `protocol_events`. None is a source of truth.

| Read model | Source fold | Rebuild trigger |
|---|---|---|
| `protocol_instances.current_state` | reduce this instance's events via `nextProtocolState` | on each append; full rebuild on replay |
| `navigator_tasks` open queue | events whose escalation map emits work (barrier/red-flag/abnormal/nonresponse/low-confidence) minus `navigator_reviewed` closures; an `insight.*.retracted` event flags the task it spawned `possibly_spurious` (02.3.6), never silently closes it | append-time projection; rebuildable |
| `PatientCareState` rollup | fold of per-instance `current_state` caches across a patient's instances (02.3.7) — highest open navigator priority, open-gap count, most-urgent next action | append-time; rebuildable; read-only display state |
| `care_gaps.status` / `priority_label` | the gap-card FSM (02.4) folded from the same events | append-time |
| `metric_snapshots` | periodic (not per-event) fold over instances by measure; **immutable dated rows**, not a live counter | scheduled snapshot job (replaces prototype `incrementMetric`) |

AC-02.3-c: dropping and rebuilding all read models from `protocol_events` yields byte-identical `current_state`, queue, and gap FSM state (the "replay = reality" test). AC-02.3-d: a projector bug is fixed by patching the projector and replaying — never by mutating a read model in place. AC-02.3-e: every plan-driving read-model row (a queue item, a completed gap) is traceable to its `source_event_ids` → `protocol_events` → `source_fact_ids` (the "why this fired" chain, spine §6.7).

**02.3.5 Replay.** A replay reads all `protocol_events` for an instance ordered by `seq`, seeds `entryState`, and folds. Because the reducer is pure (AC-02.1-a) and rejected transitions are recorded (AC-02.1-c), replay is deterministic and reproduces the exact history including guard rejections. Replay is used for: read-model rebuilds, projector bug fixes, pack-version migration dry-runs, and audit reconstruction.

**02.3.6 Insight retraction state-fold (this section owns the retraction fold; §08 owns alert-retraction UX).** The insight engine (§06.3) emits a `.retracted` counterpart for every `insight.*` event when a backfilled/corrected `source_fact` invalidates a prior detection (spine §4b registers the full `insight.*.retracted` family). A retraction is an ordinary `protocol_event` folded by the same reducer — it does **not** get special mutation power. The fold semantics this section fixes:
- A `.retracted` event is subject to the **same locked guards** (02.1.3). It **cannot** move a terminal (`closed_resolved`, `closed_by_reconciliation`) or `navigator_review` state backward — a retraction never reverses a state a human already acted on (the guard `shouldTransition` rejects the backward move; the event is still appended per AC-02.1-c).
- If the retracted insight had advanced the instance to a non-terminal, non-review state and **no** later event has advanced past it, the pack's `eventTransitions` for the `.retracted` type MAY fold the instance back to the pre-insight state (a declared, monotonic-exempt reversal analogous to `navigator_review` exits — declared per pack, not engine-special).
- **Retraction → navigator_task reconciliation (regulatory required control).** A retraction of an insight that already created a `navigator_task` MUST NOT silently close that task. The append-time projection (02.3.4) instead **flags the task `possibly_spurious`** (a status annotation, not a deletion) so the navigator sees the pattern self-corrected and closes it with human judgment. A live *urgent* task from a now-retracted false-positive pattern is thereby surfaced, not stranded.
- **Retraction → patient-notification contract.** If the retracted insight was already explained to the patient (Sandy said "your morning BP runs high — discuss with your care team"), the retraction emits a patient-facing "un-say" obligation carried on the event; §08 owns the notification UX. 02 guarantees the retraction is *recorded and traceable* (the event cites the invalidating `source_fact`), so the "why this was un-said" chain (AC-02.3-e) holds.
- AC-02.3-h: a `.retracted` event never mutates a terminal/review state; replay reproduces the retraction and its `possibly_spurious` task flag identically.

**02.3.7 Patient-level rollup projection (co-morbid patients).** A patient in multiple packs (retinopathy + hypertension + adherence) has N `protocol_instances`. This section declares a **patient-level rollup as a pure projection**, not a new event stream — there is no patient-level authoritative state and no patient-level `seq`. The rollup folds the *per-instance* `current_state` caches into a single `PatientCareState` read model (highest open navigator priority across instances, count of open gaps, most-urgent next action) consumed by the navigator console's one-card-per-patient view (§10) and equity metrics. Because it is a projection, it is rebuildable by replay and introduces no new source of truth (AC-02.3-c holds over it). Cross-pack *outreach pacing/arbitration* (which pack wins a send slot) is a separate patient-level primitive owned by the spine + §08 scheduler — it is **not** part of this rollup, which is read-only display state. This closes 02.6-Q3: the rollup exists, and it is a projection.

**02.3.8 Right-to-erasure over the append-only log (structural accommodation; §09 owns the policy).** Event sourcing resists deletion, but a patient-erasure request MUST be satisfiable without corrupting the audit chain. §09 owns the deletion *policy*; this section fixes the *structure* that makes it mechanically possible and resolves the inconsistency where §09.4.3 lists `protocol_events` as a wholesale deletion target:
- **PHI lives in `source_facts` payloads, not in `protocol_events`.** An event carries `source_fact_ids` (references) plus a non-PHI `label`/`type`/`state`, never the clinical value itself. Erasure is therefore performed by **crypto-shredding the `source_fact` payload** (drop the decryption key / null the value+fhir_ref), which renders every event that cites it non-recoverable **without deleting the event skeleton**.
- **Event skeletons are retained** (id, seq, type, state, actor, `source_fact_ids`, timestamps) so the fold, the guard-rejection history, and the audit reconstruction (02.3.5) remain replayable — a shredded fact yields a tombstoned reference, not a dangling crash. `protocol_events` is therefore **NOT** a wholesale deletion target; §09.4.3 must be reconciled to shred-facts-retain-skeletons, not delete-events.
- **Provenance chains stay valid.** After shred, `source_fact_ids` still resolve to a tombstone row (`erased_at`, reason) so AC-02.3-e's "why this fired" chain reports "basis erased at patient request" rather than breaking. `patient_confirmed`/`navigator_overridden` flags survive as non-PHI metadata for audit-integrity.
- AC-02.3-i: after crypto-shred of a patient's `source_facts`, replay of that patient's `protocol_events` still completes deterministically and reproduces identical `current_state` transitions (skeletons intact), with every erased fact reference resolving to a tombstone. No event row is deleted.

---

### 02.4 Prototype → production mapping

Concrete crosswalk from the live prototype (`src/types.ts`, `src/data/seed.ts`, `src/store/useStore.ts`) and the P1 server (`server/types.ts`, `server/state.ts`, `server/actions.ts`) to production tables. Names on the right are locked (spine §2).

| Prototype / P1 artifact | Production table | Field-level notes |
|---|---|---|
| `Patient {condition, a1c}` | `patients` | `condition`→`condition_summary`; `a1c` → a `source_fact` row (not a column). |
| `ScreeningGap {gapType:'diabetic_retinopathy', status:GapStatus, priorityLabel}` | `care_gaps` | `gapType`→`gap_type:CareGapType`; `status`/`priority_label` retained as the **gap-card FSM** (`src/lib/screening-gap.ts`, `LEGAL_TRANSITIONS`), a projection distinct from `ProtocolState`. |
| `Barrier` | `barriers` | + `protocol_instance_id`, `source_event_id`, `z_code`. |
| `CarePlanTask` | `tasks` | 1:1; patient-facing steps. |
| `NavigatorTask` (legacy free-string) | **dropped** → `navigator_tasks` | Prototype's parallel legacy list is deleted; its role folds into the single `navigator_tasks`. Spine §2/§6.6: one name per concept — do **not** reintroduce two tables. |
| `NavigatorQueueItem {reason, priority, summary, suggestedAction, sourceEventIds}` | `navigator_tasks` | 1:1 on fields; adds `work_type`(`NavigatorWorkType`), `owner`, `protocol_instance_id`; `sourceEventIds`→`source_event_ids`. |
| `ScreeningResult` | `results` | + `protocol_instance_id`, `source_fact_id`. |
| `Referral` | `referrals` | + `protocol_instance_id`. |
| `OutreachEvent {kind:'assistant_question', surface}` | `outreach_attempts` | Reshaped to `channel`+`scheduled_at`/`sent_at`+`outcome`. `surface` maps into `channel`. |
| `TimelineEntry {label, seq}` | **derived read model** (not a stored table) | The patient timeline is a projection of `protocol_events` + `outreach_attempts` + `barriers`, ordered by `seq`. Prototype's stored `timeline` collection is dropped; the hub timeline view reads the projection. |
| `HubMetric {seed, value, denominator, scope:'cohort'}` | `metric_snapshots` | Mutable `value` counter → immutable dated snapshots; `scope` gains county/language/demographic + `stratum`. |
| `SourceFact` | `source_facts` | + `patient_confirmed`, `navigator_overridden`, `fhir_ref`. |
| `PatientConsent` | `consents` | + `version`, `category`. |
| `ProtocolEvent {status, patientId}` | `protocol_events` | `status`→`state`; + `protocol_instance_id`, `pack_id`, `seq`, `idempotency_key`. |
| `VoiceTurn`, `RedFlagEvent` | `transcript_segments`, and red flags as `protocol_events` (`red_flag_reported`) + `navigator_tasks` (`red_flag_symptom`) | Voice transcript rows are §06/§08-owned (`voice_sessions`/`transcript_segments`, spine §2). `RedFlagEvent` becomes the `red_flag_reported` event + its navigator task, not a standalone table. |
| P1 `AuditEvent` | `audit_events` | + `model_id`, `model_version`. |
| P1 `BackendState {schemaVersion, data:SeedState, auditEvents}` | (dissolved) | The single monolithic file-state blob is replaced by normalized tables + the event log. `schemaVersion` becomes per-table migration versioning. |
| `retinopathy-protocol.ts` (`EVENT_TRANSITIONS`, `PROTOCOL_STATE_ORDER`, `TERMINAL_STATES`, `REVIEW_EXIT_STATES`) | retinopathy pack `PackStateMachine` (data) + shared engine (code) | Prototype code → 02.1.2 descriptor; engine generalized to 02.1.3. |
| `store actions` (`askQuestion`, `reportBarrier`, `scheduleScreening`, `enterResult`, …) and `server/actions.ts` (`startVoiceSession`, `recordVoiceReply`, `completeNavigatorTask`) | Sandy tool gateway verbs (spine §6.4) emitting events | The **two duplicated transition implementations** (store + server) collapse into **one** server-side event-emitting path (02.5). The store becomes a read-only cache of projections. |

Retinopathy state-name mapping in 02.1.1 applies to every row above that references a state.

---

### 02.5 Migration path: in-memory + JSON file → durable event-sourced store

The prototype has two transition implementations over one `SeedState`: the Zustand store (`src/store/useStore.ts`, synchronous in-memory `set`) and the P1 server (`server/actions.ts`, file-persisted JSON via `createFileStateStore`). Both import the same `retinopathy-protocol.ts` and `safety.ts`. This duplication is the primary migration seam (prototype-map §4). Migration is staged so each step is independently shippable and reversible.

**Stage M0 — Single write path (collapse the duplication).** Make the client store read-only. All mutations route through the server action layer; the store subscribes to projections (`GET /api/patients/:id/context`, `GET /api/navigator/queue`). *Exit:* no client-side call to `nextProtocolStatus`; `useStore` holds only fetched projections. This kills the "frontend and backend duplicate transition logic" seam (prototype-map §4).

**Stage M1 — Introduce the event store behind the file store.** Implement `StateStore` (spine-compatible with `server/state.ts`'s interface) backed by Postgres: `protocol_events` append-only table + normalized entity tables. Keep the JSON file as a shadow write for one release to allow diffing. Assign `seq` and `idempotency_key` at append (02.3.2/02.3.3). *Exit:* `load()` reconstructs identical `BackendState` from tables; a shadow-diff job reports zero divergence over the golden path.

**Stage M2 — Projections replace stored collections.** Stop persisting `protocol_instances.current_state`, `navigator_tasks`, `care_gaps.status`, `timeline`, and `metric_snapshots` as authoritative; derive them by folding `protocol_events` (02.3.4). Seed data (`src/data/seed.ts`) becomes an **initial event stream** (`care_gap_imported`, `patient_consented`, seed `source_facts`) rather than a pre-baked state blob — so the seed itself is replayable. *Exit:* AC-02.3-c passes (rebuild = reality).

**Stage M3 — Pack-parameterize.** Move retinopathy's transition tables out of `retinopathy-protocol.ts` into the retinopathy `packs` row's `manifest.stateMachine` (02.1.2). The engine (02.1.3) loads the descriptor by `protocol_instances.pack_id`. *Exit:* the data-driven engine reproduces the prototype reducer byte-for-byte (02.1.4 golden test); a second pack (e.g. `hypertension`) can be added with zero engine changes (P6 test).

**Stage M4 — FHIR seam + streams.** Stand up FHIR R4 (§03) and the `device_readings` stream store. Backfill `source_facts.fhir_ref` for imported clinical facts. Retire the fixed-clock `now()` (`'2026-07-04T09:00:00'`) in favor of real timestamps; `seq` (not `created_at`) already carries causal order, so this is safe. *Exit:* protocol logic reads `source_facts` only; no path reads FHIR or raw streams directly (spine §5).

**Migration invariants (acceptance criteria):**
- AC-02.5-a: at every stage, replaying `protocol_events` reproduces the current read-model state (no stage introduces an authoritative mutable status).
- AC-02.5-b: the golden path (`src/golden-path.test.tsx`) passes unchanged through M0–M4 (behavior preserved; only the store beneath it changes).
- AC-02.5-c: the two transition implementations are one by end of M0; no new code path may reintroduce a second reducer (CI guard: `nextProtocolState` importable only by the server event-append module).
- AC-02.5-d: rollback from any stage N to N-1 is possible because the event log is the invariant carried forward; only projections and store shape change.

---

### 02.6 Open questions

1. **Instance granularity for longitudinal packs (DECISION REQUIRED before P5/P6 — foundational, not deferrable).** Retinopathy is one gap → one `protocol_instance`. A longitudinal companion (BP/glucose) has no single "gap closes" terminal — does it get one long-lived instance per (patient, pack), or one per rolling measurement interval? This affects `seq` growth (an unbounded single instance vs. many bounded ones), terminal-state semantics (a longitudinal instance may never reach `closed_resolved`), and whether a monitoring pack ever closes. Registered in the §11 decisions register with an owner and a P5/P6 deadline; downstream `seq`/replay design assumes a resolution.
2. **`seq` under multi-producer contention.** Insight engine, Sandy tools, and ingestion can all append to the same instance concurrently. Is per-instance optimistic concurrency (02.3.2) sufficient, or do high-frequency `insight.*` streams need a separate lower-priority append lane so a burst of glucose insights can't starve a red-flag append?
3. **Metric snapshot cadence & equity strata.** `metric_snapshots` replaces the live counter — what cadence (daily? on-close?) and which `stratum` dimensions are pre-materialized vs. computed on demand for the equity views (§07)? (Small-cell suppression threshold for equity strata is §09-owned; this question is only the cadence/materialization axis.)
4. **`care_gaps` FSM vs. `ProtocolState` divergence.** The prototype keeps a second, narrower FSM (`screening-gap.ts`) for the UI card. Production keeps it as a projection (02.4) — but should it be formalized as a declared per-pack projection, or is it retinopathy-specific display sugar that other packs won't need?

*Resolved in-body (formerly open):* cross-pack rollup state → **02.3.7** (a pure projection, `PatientCareState`); idempotency-key stability across pack versions → **02.3.3** (`pack_version`/`rule_version` are now mandatory in the key); right-to-erasure over the append-only log → **02.3.8** (crypto-shred `source_fact` payloads, retain event skeletons; §09 owns the policy).


---

## 03. FHIR-Native Data Platform & Provenance Ledger

This section specifies the canonical data platform: a **FHIR R4 clinical store** as the record of what is clinically *true*, sitting beside the **event-sourced protocol tables** (spine §2, §5) that record what the *program is doing*. It implements the platform law — **deterministic rules decide; models explain; humans own exceptions** — at the data layer: no fact drives a plan until it is imported with provenance, confirmed by a human, and read through the `source_facts` seam. It defines the resource mapping and codings, the high-frequency stream architecture, the provenance ledger, the store decision, and the confirmation/promotion model.

Scope boundary: this section owns *storage and provenance*. It does not own the insight engine (that consumes `Observation`s and emits `insight.*` events per spine §4b), the tool gateway, or ingestion adapters — it defines the shapes those layers read and write. Concretely, **this section is the declared owner of: FHIR resource mapping & terminology codings (§03.2), the raw-stream store schema and the canonical `ObservationType` enum (§03.3), the provenance ledger (§03.4), and the erasure treatment of the append-only event log (§03.7).** Where sibling sections (device rail §04, insight engine §06, hypertension pack §01.7) reference these, they key on the vocabulary defined here — they do not redefine LOINC codes, `ObservationType` members, or the raw-stream table.

---

### 03.1 Two canonical records, one seam

Per spine §5, the split rule is one line: **clinical facts live in FHIR R4; care-orchestration state lives in protocol tables.** Neither is a cache of the other; both are canonical for different questions.

| Question | Answered by | Store |
|---|---|---|
| "Is this patient diabetic? What's their last A1C?" | clinical truth | FHIR `Condition`, `Observation` |
| "Is the retinopathy gap open? What state is it in?" | orchestration | `care_gaps`, `protocol_instances`, `protocol_events` |
| "Why did Sandy say you're overdue?" | provenance | `source_facts` → `Provenance` → source resource |
| "What has the program *done* about it?" | orchestration | `protocol_events`, `outreach_attempts`, `navigator_tasks` |

**The `source_facts` table is the only seam.** Protocol logic — every rule, tool, and metric — reads `source_facts`, never FHIR directly. Each `source_facts` row points at a FHIR resource via `fhir_ref` and carries the provenance + confirmation state FHIR does not model operationally. This gives three properties the spine requires:

1. **Provenance is inescapable.** A protocol fact cannot exist without a `source_facts` row (spine §0 rule 2); a `source_facts` row cannot be plan-driving without a `fhir_ref` *or* an explicit `patient_reported`/`navigator_review` origin.
2. **FHIR stays clean.** No RHTP orchestration junk (queue reasons, priority labels) pollutes the clinical resources — those resources remain portable, exportable (§6 patient-owned export), and SMART-on-FHIR-shareable.
3. **The prototype migrates without contradiction.** The prototype's `SourceFact` (src/types.ts:130) *is* the production `source_facts` row; production adds two columns (`patient_confirmed`, `navigator_overridden`, `fhir_ref`) already named in the spine.

**Event-sourcing invariant (spine §0 rule 3) restated for this layer:** `protocol_instances.current_state` is a *derived cache* — a fold over `protocol_events`. FHIR resources are *not* event-sourced in RHTP's store; the FHIR server's own `Provenance` + resource `versionId` history is the FHIR-side audit. The two audit trails are joined by `source_facts.fhir_ref` + `source_facts.id ∈ protocol_events.source_fact_ids`.

---

### 03.2 Resource mapping & codings

Every RHTP clinical fact maps to exactly one canonical FHIR R4 resource. Terminology bindings are **required** (import adapters MUST populate them; a fact with no code is `confidence='needs_review'` until coded).

| RHTP concept | FHIR R4 resource | Primary coding | `source_facts.label` (prototype-grounded) |
|---|---|---|---|
| Patient demographics, identity | `Patient` | — (US Core Patient) | — (identity, not a fact row) |
| Diabetes / HTN / condition | `Condition` | ICD-10-CM (`E11.*`), SNOMED CT | `Diabetes diagnosis` |
| A1C, BP, glucose summary, weight | `Observation` | **LOINC** (A1C `4548-4`, systolic `8480-6`, diastolic `8462-4`, glucose mean `97507-8`, weight `29463-7`, TIR `104643-2`) — **authoritative; §04.3a adopts these verbatim** | `Recent A1C` |
| Medications (fills / statements) | `MedicationStatement` (claims fill), `MedicationRequest` (order) | **RxNorm** | `Active medications` |
| Retinal screening result, labs | `DiagnosticReport` + `Observation` | LOINC (fundus photo report `70946-8`), SNOMED result | `Retinal screening result` |
| Visits, ADT | `Encounter` | CPT / HCPCS, SNOMED encounter class | `Recent encounter` |
| Vaccines | `Immunization` | **CVX** (flu `140`, COVID `300`), CPT | `Immunization history` |
| Referral / order out | `ServiceRequest` | SNOMED, CPT | (referral — see `referrals`) |
| Care-plan snapshot for EMR share | `CarePlan` | — (maps *from* `tasks`) | — |
| Clinical-grade consent | `Consent` | — | — (also `consents` table, §03.6) |
| Provenance of every fact | `Provenance` | W3C PROV activity codes | (implements the ledger, §03.4) |
| Device metadata | `Device` | GUDID / UDI, SNOMED device | `Device: <name>` |
| Screening-gap / alert flag | `Flag` | HEDIS measure code, SNOMED | `Retinal screening gap` |
| Coverage / insurance hint | `Coverage` | — (from claims) | `Coverage` |
| CCD / discharge doc | `DocumentReference` | LOINC doc-type | — |

**Coding discipline:**
- **Care gaps** (`CareGapType`, spine §2) map to a `Flag` *and* the RHTP `care_gaps` row; the `Flag` carries the HEDIS/RHTP `MeasureId` (spine §1). `diabetic_retinopathy` → measure `eye_exam`.
- **SDOH barriers** (spine §4c) carry a **Z-code** (`Z59.*` housing, `Z59.4` food, `Z59.82` transportation-cost proxy per local mapping) on an `Observation` with LOINC SDOH panel codes; these are **assistive-only** and never gate care.
- **Result outcomes** (`ResultOutcome`): the `DiagnosticReport.conclusionCode` holds the clinical SNOMED finding; the RHTP `results.outcome` (`normal|abnormal|ungradable`) is orchestration, derived from it, stored in the `results` table — never overwriting the FHIR resource.
- **CDS bright line at the mapping layer:** device-derived `Observation`s are stored with `Observation.status='final'` but **never** carry an interpretation code that constitutes a diagnosis (no `Observation.interpretation` of a disease). Device data → pattern flags → "discuss with your clinician," never a diagnostic `Condition`.

```ts
interface FhirRef {
  resourceType: 'Patient' | 'Condition' | 'Observation' | 'MedicationStatement'
    | 'MedicationRequest' | 'DiagnosticReport' | 'Encounter' | 'Immunization'
    | 'ServiceRequest' | 'CarePlan' | 'Consent' | 'Provenance' | 'Device'
    | 'Flag' | 'Coverage' | 'DocumentReference'
  id: string                 // FHIR logical id
  versionId?: string         // FHIR resource version at import time (freezes what we cited)
}
// source_facts.fhir_ref is `${resourceType}/${id}/_history/${versionId}` (a stable citation URL)
```

**Acceptance criteria — mapping**
- AC-03.2.1: Every `source_facts` row with `source_kind ∈ {hie, claims, device}` has a non-null `fhir_ref` resolving to a live resource.
- AC-03.2.2: No `Condition` resource is ever created from a `device`-kind source (device data cannot diagnose).
- AC-03.2.3: Every gap in `care_gaps` has a corresponding `Flag` whose `code` carries the pack's `MeasureId`.
- AC-03.2.4: A `source_facts.value` shown to a patient can be re-derived from the resource at `fhir_ref` version (immutable citation).

---

### 03.3 High-frequency streams (CGM ~288 readings/day)

Per spine §5 and platform brief §2.3: **raw high-frequency streams are NOT stored as raw FHIR.** Storing 288 `Observation`s/patient/day is a cost and query disaster and pollutes the clinical record. Split by store:

| Layer | Store | Retention | What lives here |
|---|---|---|---|
| Raw stream | **Timescale hypertable** `device_readings` (Postgres, partitioned by `patient_id, day`) | 90 days hot, then downsampled | every CGM/BP/HR reading, one row |
| Computed summary | **FHIR `Observation`** (projected) | permanent | daily TIR, daily mean glucose, morning-surge flag, weekly variability |
| Insight conclusion | `protocol_events` (`insight.*`) | permanent (event-sourced) | `insight.glucose.nocturnal_hyperglycemia`, etc. |

**Raw-stream schema ownership (single source of truth).** There is exactly one raw-stream table and this section owns it: the Timescale hypertable **`device_readings`** with the generic, observation-typed columns below. The device rail (§04) MUST NOT define a parallel glucose-only table (no `cgm_stream`), a different device FK (no `device_link_id` — the FK is `device_id → FHIR Device`), or a second row type named `DeviceReading`. CGM, BP, HR, and every other device signal are rows in this one table, discriminated by `observation_type`. The device rail's *adapter output* — the pre-normalization shape carrying `externalId`/`rawUnit`/`deviceMeta` — is a different concept and MUST be named **`DeviceReadingInput`** (or similar) so it does not collide with the `DeviceReading` row type defined here; the adapter's job is to normalize a `DeviceReadingInput` into a `device_readings` row keyed on the canonical `ObservationType` enum (below).

**Canonical `ObservationType` enum (owned here; §04.3a, §06.5, §01.7 key on these exact members).** One spelling per physiological signal — no `bp_home_reading`/`blood_pressure_systolic`/`glucose_cgm_reading` synonyms:

```ts
// Canonical device/observation signal vocabulary — the single member set.
// Import adapters (§04), insight rules (§06), and pack cohort/device bindings (§01.7) all key on THESE.
type ObservationType =
  | 'bp_systolic'          // home cuff systolic (mmHg)
  | 'bp_diastolic'         // home cuff diastolic (mmHg)
  | 'glucose_cgm'          // raw CGM point (mg/dL) — high-frequency stream member
  | 'glucose_tir_daily'    // daily time-in-range summary (%)
  | 'glucose_mean_daily'   // daily mean glucose (mg/dL)
  | 'weight_daily'         // daily weight (kg/lb)
  | 'heart_rate'           // HR (bpm)
  | 'med_pdc_daily'        // bottle-derived adherence summary (proportion) — enhancement signal
  | 'pharmacy_fill_claim'  // claims-derived fill event — equity-floor adherence signal
```

*Signal → summary → insight-event alignment (matches §04.6c floor-vs-enhancement split):* `pharmacy_fill_claim` (claims PDC floor) drives `insight.med.refill_gap`; `med_pdc_daily` (bottle-open enhancement) drives `insight.med.missed_dose_pattern`. These are distinct members and distinct insight events — the claims floor and the bottle enhancement are never collapsed onto one name.

```ts
// Raw stream row (Timescale) — NOT FHIR, NOT a source_fact. The single owned row type.
interface DeviceReading {
  patient_id: string
  device_id: string          // FK → FHIR Device (NOT device_link_id)
  observation_type: ObservationType  // canonical enum above — e.g. 'glucose_cgm' | 'bp_systolic'
  value: number
  unit: string               // 'mg/dL' | 'mmHg' | 'kg'
  measured_at: string        // device timestamp (ISO)
  ingested_at: string
  quality?: 'ok' | 'calibrating' | 'signal_loss'
}
```

**Projection rule (deterministic, runs nightly + on-demand):** the summarizer folds `device_readings` for a completed device-day into FHIR `Observation`s:

| Raw signal | Becomes FHIR `Observation` (LOINC) | Trigger for an `Observation`? |
|---|---|---|
| 288 CGM points | 1× daily **time-in-range** (`104643-2`), 1× **mean glucose** (`97507-8`), 1× **GMI** | yes — one summary Observation per metric per day |
| individual CGM point | — | **no** — stays raw only |
| home BP cuff reading | each *clinically meaningful* reading → `Observation` (BP is low-frequency, ~1–2/day) | yes — BP is not high-frequency; store each |
| pattern (nocturnal hyper) | — (not an Observation) | no — becomes an `insight.*` `protocol_event` |

**Bright line:** the insight engine (spine §4b) runs on the **raw stream** (`device_readings`), because pattern detection needs the points; but the **record keeps only conclusions** — the FHIR summary Observation and the `insight.*` event. A raw CGM trace is never a plan-driving `source_fact`. What becomes a `source_fact` (and thus can drive state or a navigator task): the **daily summary Observation** and the **insight event**, each with a `fhir_ref` (summary) or `source_fact_ids` chain (insight → summary Observations that fired it).

```ts
interface StreamSummaryJob {
  patientId: string
  observationType: ObservationType
  windowStart: string; windowEnd: string   // one device-day
  fn: 'time_in_range' | 'mean' | 'gmi' | 'variability_cv' | 'morning_surge_flag'
  emits: { fhirObservation: FhirRef; sourceFactId: string }
}
```

**Acceptance criteria — streams**
- AC-03.3.1: A patient with a connected CGM produces ≤ ~6 FHIR `Observation`s/day (summaries), not ~288.
- AC-03.3.2: Raw readings older than 90 days are downsampled/aged; summary Observations persist indefinitely.
- AC-03.3.3: Every `insight.*` event's `source_fact_ids` resolve to summary Observations (never to raw rows) — the audit reads at summary granularity.
- AC-03.3.4: BP readings (low-frequency) are each stored as an `Observation`; only CGM-class streams are summarized.

---

### 03.4 Provenance ledger

The requirement (architecture §6.2, restated): **the app can always show WHY it said something.** Every plan-driving fact carries: source system, data type, retrieved timestamp, effective timestamp, confidence/match quality, patient-confirmed flag, navigator-override flag. This is implemented by two coupled artifacts: the `source_facts` row (operational ledger) and the FHIR `Provenance` resource (clinical ledger).

**`source_facts` — production shape** (extends prototype `SourceFact`, src/types.ts:130; new fields marked ✚):

```ts
interface SourceFact {
  id: string                       // 'fact_...' (prototype prefix preserved)
  patientId: string
  label: string                    // 'Recent A1C', 'Retinal screening gap' (prototype labels)
  value: string                    // human-readable, patient-facing ('8.4 on 2026-05-12')
  sourceKind: SourceKind           // spine §2: hie|claims|site_feed|patient_reported|navigator_review|device|prototype_seed
  sourceName: string               // 'Kentucky HIE pilot feed', 'Claims gap file', 'Dexcom G7'
  retrievedAt: string              // when RHTP pulled it
  effectiveDate: string            // clinical as-of date
  confidence: SourceConfidence     // confirmed|probable|patient_reported|needs_review
  patientConfirmed: boolean        // ✚ spine §2 — false until patient confirms (§03.6)
  navigatorOverridden: boolean     // ✚ spine §2 — true if a navigator corrected the fact
  fhirRef?: string                 // ✚ 'Observation/abc/_history/2' — null only for patient_reported/navigator_review origin
  matchQuality?: MatchQuality      // ✚ identity-match provenance (see below)
  supersededBy?: string            // ✚ fact_id that replaced this one (reconciliation trail)
}

interface MatchQuality {
  method: 'deterministic' | 'probabilistic'   // matches patient_identities.match_method (spine §2)
  confidence: number                           // 0..1
  matchedOn: string[]                          // ['name','dob','phone']
}
```

**FHIR `Provenance` — one per imported clinical fact**, `Provenance.target` → the resource, carrying:

```ts
// Projection of a source_fact into a FHIR Provenance resource
interface ProvenanceProjection {
  target: FhirRef                  // the Observation/Condition/etc.
  recorded: string                 // = source_facts.retrievedAt
  occurredDateTime: string         // = source_facts.effectiveDate
  agent: [{
    type: 'author' | 'assembler'
    who: string                    // Organization ref for the source system (KHIE, MCO, Dexcom)
  }]
  entity?: [{ role: 'source'; what: string }]   // upstream doc (CCD DocumentReference)
  // RHTP extensions (URL-namespaced):
  ext_confidence: SourceConfidence
  ext_patientConfirmed: boolean
  ext_navigatorOverridden: boolean
  ext_sourceFactId: string         // back-link to the ledger row
}
```

**The "why this fired" chain** is a walk: a patient-facing claim → the `protocol_event` that emitted it → `event.source_fact_ids[]` → each `source_facts` row → `fhir_ref` → FHIR resource + its `Provenance`. Every hop is stored, never recomputed. This is exactly what the prototype's **`ProvenanceStrip`** already renders (src/components/phone/ProvenanceStrip.tsx): it reads `sourceFacts` by `patientId`+`label` and shows `value / sourceName / effectiveDate / retrievedAt / confidence`. Production adds two rendered fields — a **confirmation badge** (from `patientConfirmed`) and a **"Verify / Correct" affordance** — and each strip entry deep-links to the FHIR resource for a navigator.

**Prototype provenance strip → `Provenance` mapping (the one-to-one):**

| ProvenanceStrip field (prototype) | `source_facts` column | FHIR `Provenance` element |
|---|---|---|
| `fact.value` | `value` | `target` resource `.value[x]` |
| `fact.sourceName` | `source_name` | `agent.who.display` |
| `fact.effectiveDate` | `effective_date` | `occurredDateTime` |
| `fact.retrievedAt` | `retrieved_at` | `recorded` |
| `fact.confidence` | `confidence` | `ext_confidence` |
| (new) confirmation badge | `patient_confirmed` | `ext_patientConfirmed` |
| (new) corrected-by-navigator | `navigator_overridden` | `ext_navigatorOverridden` |

**Acceptance criteria — provenance**
- AC-03.4.1: Every plan-driving `protocol_event` has ≥1 `source_fact_id` (spine §3 envelope: never empty for plan-driving events); a CI test asserts this over `protocol_events`.
- AC-03.4.2: For any patient-facing clinical-adjacent claim in the UI, the ProvenanceStrip renders source, dates, confidence, and confirmation state.
- AC-03.4.3: Every `source_facts` row with a `fhir_ref` has a corresponding `Provenance` resource in the FHIR store whose `ext_sourceFactId` matches.
- AC-03.4.4: A navigator override writes a new `source_facts` row (`navigator_overridden=true`), sets `supersededBy` on the old row, and appends an `audit_events` row — the old fact is never mutated in place.
- AC-03.4.5: Low-confidence identity matches (`matchQuality.confidence < 0.9`, `method='probabilistic'`) create a `navigator_tasks` row with reason `low_confidence_identity_or_gap_match` and never auto-promote to plan-driving (§03.6).

---

### 03.5 Store choice: Medplum vs managed

**Recommendation: Medplum, self-hosted on HIPAA-eligible cloud** (platform brief §10 decision 1), revisit at multi-state scale.

| Criterion | Medplum (self-host) | Azure Health Data Services / AWS HealthLake (managed) |
|---|---|---|
| FHIR R4 conformance | full, open-source | full, managed |
| Run cost | low (Postgres + compute we own) | per-request / per-GB, higher at pilot scale |
| SMART-on-FHIR auth | **built in** (needed for §02 voice sessions + P8 clinician views) | present (Azure), add-on (AWS) |
| Audit / `AuditEvent` | built in, append-only (aligns with P1 `audit_events`) | built in |
| Postgres access for the seam | **direct** — `source_facts`, protocol tables, and FHIR share one Postgres, so the `fhir_ref` join is a DB join | FHIR is a black-box service; the seam join is cross-service |
| Custom bots / projection jobs | Medplum Bots (stream-summary §03.3 can run here) | external compute |
| Ops burden | we run it (IaC, patching) | vendor runs it |
| Data portability / export (§6) | native `$export`, we own the DB | native `$export` |

**Decision criteria (pick managed instead if):** the program lacks ops capacity to run a HIPAA-eligible service; OR it goes multi-state/multi-tenant early (managed's isolation is cheaper than building it); OR a payer contract mandates a specific vendor. **Otherwise Medplum**, because the `source_facts ↔ FHIR` seam (§03.1) is a *Postgres join* when both live in one Medplum Postgres, versus a cross-service lookup with a managed FHIR API — and that seam is on every hot path.

Either way the code depends only on **FHIR R4 + a `FhirClient` interface**, so the store is swappable:

```ts
interface FhirClient {
  create<R>(resource: R): Promise<FhirRef>
  read(ref: FhirRef): Promise<unknown>          // versioned read (freezes citation)
  history(ref: FhirRef): Promise<unknown[]>
  search(type: FhirRef['resourceType'], params: Record<string,string>): Promise<unknown[]>
  export(patientId: string): Promise<Bundle>    // $export — powers §6 patient-owned export
}
```

**Acceptance criteria — store**
- AC-03.5.1: All FHIR access goes through `FhirClient`; no code imports a vendor SDK directly outside the adapter.
- AC-03.5.2: A full patient FHIR `Bundle` export (`$export`) succeeds and round-trips (re-import validates) — patient-owned means provable (brief §6).
- AC-03.5.3: Switching the `FhirClient` implementation requires zero changes to protocol tables or `source_facts` logic.

---

### 03.6 Confirmation model — imported facts are not truth until confirmed

Per platform brief §4 (identity precondition) and §6, and spine §0 rule 2: **an imported fact does not become plan-driving truth until a patient or navigator confirms it.** This is the health-domain analog of the companion spec's `source_fact → patient_fact` promotion, and the guardrail against RHTP's existential failure mode (wrong-patient linkage) and HIE staleness (dead med lists).

**Lifecycle of a fact:**

```
imported → (unconfirmed: confidence set, patientConfirmed=false)
  → confirmed_by_patient      → patientConfirmed=true   → plan-driving
  → confirmed_by_navigator    → navigatorReviewed        → plan-driving
  → corrected_by_navigator    → new fact, old.supersededBy set, navigatorOverridden=true
  → rejected                  → confidence='needs_review', not plan-driving; navigator_task raised
```

**Promotion rule (deterministic):** a `source_fact` is **plan-driving** iff:

```ts
function isPlanDriving(f: SourceFact): boolean {
  if (f.confidence === 'needs_review') return false
  if (f.supersededBy) return false
  // patient-reported facts are self-confirmed at origin
  if (f.sourceKind === 'patient_reported') return true
  // navigator-authored/overridden facts are confirmed at origin
  if (f.sourceKind === 'navigator_review' || f.navigatorOverridden) return true
  // imported clinical facts (hie/claims/device) require confirmation OR high-confidence auto-eligibility
  return f.patientConfirmed || f.confidence === 'confirmed'
}
```

- **Deterministic-match corroboration guardrail (wrong-patient, the platform's existential failure mode).** A `match_method='deterministic'`, `match_confidence=1.0` link on a strong identifier (member ID / beneficiary ID) is **not sufficient on its own** to auto-link. Recycled, reassigned, or mistyped member IDs (common in Medicaid MCO churn) otherwise produce a silent 1.0-confidence wrong-patient link that bypasses the probabilistic navigator queue entirely and immediately drives outreach. **A deterministic strong-ID match MUST also agree on ≥1 independent demographic (DOB and/or name); if it does not, the link is downgraded to `navigator_review` (reason `low_confidence_identity_or_gap_match`) and never auto-linked.** Corroboration is recorded in `MatchQuality.matchedOn` (must contain the strong ID *plus* the corroborating field).
- **No autonomous outreach on a newly-linked external record until first patient confirmation.** Even a fully corroborated `confirmed` link does not authorize an autonomous patient-facing *clinical-adjacent* claim about a newly-linked external record until the patient confirms identity once. `confirmed` imported facts may drive *internal cohort entry and education-eligibility* immediately (so a navigator/outreach workflow can begin), but the first patient-facing clinical-adjacent claim surfaces the confirmation prompt — Sandy says "our records show your last A1C was 8.4 on May 12 — does that sound right?" and a "yes" writes `patientConfirmed=true` + a `patient_confirmed_fact` event (spine §4a). This closes §03.8 Q2 to the stricter option for the first clinical-adjacent use.
- **`probable` / probabilistic-match facts** are **never plan-driving** until confirmed; they render with a "we're not sure this is you/yours" caveat and can raise `low_confidence_identity_or_gap_match`.
- **Consent gate (spine §5):** operational per-source consent lives in `consents`; **42 CFR Part 2 SUD and adolescent-confidential facts are segmented and default-suppressed from AI context regardless of store** — a suppressed fact is never loaded into a Sandy session's retrieval bundle, never plan-driving, and requires per-category (`part2_sud`) consent before it can enter.

**Confirmation writes an event + Provenance update (never a silent mutation):**

```ts
// emitted when a patient confirms an imported fact
interface FactConfirmedEvent extends ProtocolEventEnvelope {
  type: 'patient_confirmed_fact'   // spine §4a
  actor: 'patient'                 // or 'navigator'
  sourceFactIds: [string]          // the confirmed fact
}
```

This event sets `patientConfirmed=true` on the row, updates the `Provenance.ext_patientConfirmed`, and appends `audit_events`. Navigator correction emits `navigator_reviewed` (spine §4a) and follows AC-03.4.4 (new row, supersede, audit).

**Retraction is supersession at the ledger, never mutation.** When a backfilled/corrected fact retracts an earlier one (the insight engine's `insight.*.retracted` counterpart, §06), the *storage* treatment here is uniform: the retracted `source_facts` row is never edited or deleted — a superseding row is written and `supersededBy` is set, exactly as for a navigator override. The retracted fact remains in the audit trail (and remains cited by any `protocol_event` it already drove); what changes is that it is no longer plan-driving (`isPlanDriving` returns false once superseded). The downstream reconciliation of an already-created navigator task or an already-shown patient explanation is owned by §06/§08/§10 — this section guarantees only that the ledger records the retraction as an immutable supersession with full provenance.

**Acceptance criteria — confirmation**
- AC-03.6.1: `isPlanDriving` is the single gate; no code paths read an unconfirmed `probable` fact as truth for a patient-facing clinical claim.
- AC-03.6.2: A probabilistic identity match never auto-promotes; it always requires navigator or patient confirmation and raises the low-confidence queue item.
- AC-03.6.2a: A deterministic strong-ID match with no corroborating DOB/name agreement is downgraded to `navigator_review` (`low_confidence_identity_or_gap_match`) and is NOT auto-linked — asserted by a test feeding a recycled/mistyped member ID that matches on ID only.
- AC-03.6.2b: No autonomous patient-facing clinical-adjacent claim about a newly-linked external record is emitted before the first patient identity confirmation, even for a `confirmed`/corroborated link.
- AC-03.6.3: Confirming a fact emits `patient_confirmed_fact` (or `navigator_reviewed`), updates the row + `Provenance`, and appends an `audit_events` row — provable end to end.
- AC-03.6.4: A `part2_sud`-categorized fact without active `part2_sud` consent is absent from every Sandy retrieval bundle (asserted by a suppression test).
- AC-03.6.5: A stale imported fact (e.g., discontinued med still in an HIE feed) can be corrected by a navigator, producing a superseding row, without losing the original in the audit trail.

---

### 03.7 Right-to-erasure over the append-only event log

Two invariants collide at this layer: **protocol events are append-only and immutable** (spine §0 rule 3), yet a patient may exercise **right-to-erasure** over their clinical data. This section owns the reconciliation; §09 owns the deletion *policy* (what/when/legal holds) and routes deletion requests through the §09.4/§11.2 `DeletionRequest` pipeline — a data-deletion request is **not** a `navigator_tasks` reason and MUST NOT be modeled as one (there is no `patient_data_deletion_request` queue reason in spine §4d; §04 routes deletion here, not to the navigator queue).

**Mechanism: crypto-shred the fact payload, retain the event skeleton.** The erasure target is the *clinical content*, not the orchestration audit. So:

1. **`source_facts` payloads and their cited FHIR resources are crypto-shredded** — the row's PHI-bearing fields (`value`, `label`, `fhir_ref` target) are rendered unrecoverable (per-patient encryption key destroyed, or payload nulled with a tombstone), while the row `id` persists.
2. **`protocol_events` skeletons are RETAINED** (they are append-only and constitute the legally-required orchestration audit), but their `source_fact_ids[]` now point at **shredded** facts. The provenance chain is preserved *structurally* — the hop exists — but resolving a shredded fact returns a `redacted` tombstone, not PHI. A "why this fired" walk over an erased patient yields the event lattice with `[redacted — erased on <date>, request <id>]` at each fact node.
3. **A `DeletionRequest` tombstone is written** so that on any FHIR restore-from-backup the shredded resources are re-shredded (deletion survives restore — the tombstone is checked on import), and an `audit_events` row records the erasure without recording the erased content.

This keeps the event log append-only (nothing is deleted from `protocol_events`; the skeleton and its `source_fact_ids` are untouched) while making the cited PHI unrecoverable — dangling references resolve to a tombstone by design, not by accident. It resolves the tension flagged in the cross-section review between "crypto-shred source_fact payloads" and "retain protocol_events."

**Acceptance criteria — erasure**
- AC-03.7.1: After erasure, no `source_facts.value`/`label` or cited FHIR resource content for the patient is recoverable, yet every `protocol_events` row (and its `source_fact_ids[]`) still exists.
- AC-03.7.2: Resolving a shredded `source_fact_id` returns a `redacted` tombstone (date + request id), never PHI and never a hard error that breaks an audit walk.
- AC-03.7.3: A restore-from-backup re-applies the `DeletionRequest` tombstone so erased content is not resurrected.
- AC-03.7.4: A data-deletion request never creates a `navigator_tasks` row keyed on an unregistered reason; it enters the §09.4/§11.2 `DeletionRequest` pipeline.

---

### 03.8 Interfaces summary (for downstream authors)

| Name | Kind | Consumed by |
|---|---|---|
| `SourceFact` (production shape) | table/interface | §02 tools, §06 insight engine, §10 navigator console, all metrics |
| `FhirRef` | type | anything citing a clinical resource |
| `ObservationType` (canonical enum, §03.3) | type | §04 adapters, §06 insight rules, §01.7 pack bindings — all key on this member set |
| `DeviceReading` | table row (Timescale `device_readings`) | insight engine only (§06); §04 normalizes into it |
| `DeviceReadingInput` (owned by §04) | adapter-output shape | §04 device adapters — normalized into `DeviceReading`; distinct name to avoid collision |
| `StreamSummaryJob` | job shape | device rail (P5), insight engine |
| `FhirClient` | interface | all FHIR access |
| `isPlanDriving()` | rule fn | every consumer of `source_facts` |
| `patient_confirmed_fact` | event (spine §4a) | protocol engine, provenance ledger |
| `MatchQuality`, `ProvenanceProjection` | type | identity service, ledger |

---

### 03.9 Open questions

1. **Raw-stream retention & downsampling policy.** 90 days hot is a placeholder — RPM/CCM billing (brief §7) and equity auditing may require longer raw retention. What is the minimum raw window, and what downsample resolution (5-min? hourly?) after aging?
2. **Auto-promotion threshold for `confirmed` HIE facts.** §03.6 lets `confidence='confirmed'` drive cohort/education pre-confirmation. Is deterministic-match `confirmed` sufficient, or must *every* imported clinical fact get an explicit patient confirmation before *any* use (stricter, slower outreach)?
3. **`versionId` pinning vs. currency.** Citations freeze `fhir_ref` at a `versionId` for reproducibility, but the patient's record moves on. When a newer version arrives (updated A1C), does the old citation stay pinned (provenance-faithful) while a new `source_fact` supersedes it — and how is that surfaced without alarming the patient?
4. **Medplum multi-tenancy trigger.** At what point (state count? program count?) does the self-host recommendation flip to managed for isolation — decision 1 in brief §10 is deferred, but the seam-join cost argument (§03.5) needs a concrete flip criterion.
5. **Z-code SDOH mapping authority.** Which local value set governs barrier→Z-code mapping (`Z59.82` transportation is an imperfect fit), and who owns keeping it current (content-ops rot risk, brief §9.7)?
6. **Immunization registry as source vs. FHIR projection.** KY immunization registry (KYIR) access — is it ingested as `Immunization` resources with `Provenance`, or queried live per campaign? Affects whether vaccination-campaign cohorting reads `source_facts` or hits the registry directly.
7. **Erasure vs. legal hold / minimum retention.** §03.7 crypto-shreds on request, but a fact under a legal hold or inside a HIPAA/state minimum-retention window cannot be shredded yet. Who arbitrates the hold, and does the tombstone carry a "shred-deferred-until" date that §09 enforces? (Structural hook is here; policy is §09.)
8. **Idempotency key contract for provenance chains.** The `source_fact_id → protocol_event` append is deduped by the platform-wide idempotency key that §02 owns (which MUST include `pack_version`, and `rule_version` for insight events, so a post-bump re-import does not silently dedupe against a pre-bump event). This section consumes that contract rather than defining its own — confirm §02 registers `pack_version`/`rule_version` in the key so shredded-then-reimported facts and post-bump facts don't collide at the `source_facts`/`protocol_events` seam.


---

## 04. Device & Wearable Rail

This section specifies the rail that turns a physical reading (a BP cuff measurement, a CGM point, a pill-bottle open, a pharmacy refill) into a provenance-carrying FHIR `Observation` that the deterministic insight engine can act on. It is the production replacement for the prototype's simulated device layer (`src/lib/longitudinal-health.ts` `HealthDevice.status: 'available_to_connect' | 'simulated_connected'`, static `HealthInsight[]`). Ships in **P5** (per platform brief §Roadmap: "Health tab runs on real device data end-to-end; simulated labels removed").

**Rail scope law.** The device rail's job ends at emitting `Observation` + `Device` + `Provenance` and handing off to the insight engine (spine §4b `insight.*`). The rail itself decides nothing clinical: it normalizes, dedups, and records provenance. **DETERMINISTIC RULES DECIDE (the insight engine, §04.7); MODELS EXPLAIN (Sandy, downstream); HUMANS OWN EXCEPTIONS (navigator, on escalation).** No code in this rail produces a dosing recommendation, a diagnosis, or an autonomous triage decision from device data (spine §0.5 bright line).

---

### 04.1 Three-tier device strategy + aggregator escape hatch

Sequenced by permission cost and equity, not by technical novelty. Every tier lands on the same ingestion pipeline (§04.4); tiers differ only in the **source adapter** that produces a normalized `DeviceReading`.

| Tier | Devices | Mechanism | Consent model | Priority | Equity note |
|---|---|---|---|---|---|
| **T1** | BP cuffs, scales, wearables (steps/sleep/HR), thermometers | Apple HealthKit + Android Health Connect via native shell (§04.3) | Patient-mediated (OS permission grant) | P5 core | Covers most consumer devices with zero per-vendor contracts; Omron/Withings/iHealth already write here |
| **T2** | CGM | Dexcom API (patient OAuth). Libre: partner-gated via Abbott/LibreView — Tidepool bridge as interim | Patient OAuth (§04.5) | P5 core | Flagship insight surface (nocturnal hyperglycemia). Device-owner-only signal → **must** be floored by T3 claims |
| **T3** | Med adherence | **Claims-PDC first** (pharmacy fills, §04.6); smart pill bottles (Hero/AdhereTech/Pillsy-class) as enhancers | Claims: patient OAuth to MCO Patient Access API (§Ingestion rail). Bottle: patient OAuth | P5 core (PDC); post-P5 (bottles) | **The equity floor.** PDC covers everyone with pharmacy claims at zero hardware cost. Bottles are a premium add-on, never the foundation |
| **Escape** | Any of the above, breadth-first | Validic / Terra-class aggregator | Per aggregator's OAuth | Only if a pilot demands device diversity before T1–T2 land | Per-member cost; buys breadth fast. A `DeviceReadingSource` adapter like any other tier |

**Decision rule — do we build a tier's own adapter or route through the aggregator?**

| Condition | Action |
|---|---|
| Device writes to HealthKit/Health Connect | T1 adapter (no per-vendor work) |
| Vendor has an official patient-OAuth API (Dexcom) | T2 direct adapter (better data fidelity, no per-member fee) |
| Signal available from pharmacy claims | T3 PDC — always build this; it is the floor |
| Pilot needs a device with no OS-health write and no direct API, before T1–T2 ship | Escape hatch aggregator, time-boxed |

The escape hatch is an **adapter**, not a parallel pipeline: a Validic/Terra webhook lands a `DeviceReading` on the same `normalize → FHIR → insight` path. Adding or removing it is config, not rail code (spine §1 P6 platform test).

---

### 04.2 Native-shell constraint (Capacitor)

**Hard constraint (platform brief §2.2, §Open-question 2):** HealthKit and Health Connect are native-only APIs. A PWA cannot read them. Therefore:

- **Capacitor wraps the existing React app** (`src/App.tsx` + surfaces render unchanged inside the WebView). The native shell adds only the device-bridge plugin layer; **no rewrite** of the React surfaces.
- **Ships in P5, not before.** The PWA posture stays correct for reach (rural mixed devices, navigator-assisted waiting-room enrollment, no app-store friction) through P0–P4. Pay app-store friction only the day device sync ships.
- **Web build remains the default runtime.** The app must detect its runtime and degrade the device rail gracefully on web (§04.8 equity guardrail relies on this — claims-PDC works with no native shell at all).

```ts
type ShellRuntime = 'web' | 'ios_capacitor' | 'android_capacitor'

interface DeviceCapabilities {
  healthkit: boolean            // ios_capacitor only
  healthConnect: boolean        // android_capacitor only
  oauthDevices: boolean         // true on all runtimes (Dexcom, claims, bottles)
  claimsPdc: boolean            // true on all runtimes — the floor
}

// Deterministic; no runtime negotiation beyond OS/plugin presence checks.
function capabilitiesFor(runtime: ShellRuntime): DeviceCapabilities
```

**Native bridge plugin contract** (`@rhtp/health-bridge`, one Capacitor plugin, two native impls):

```ts
interface HealthBridgePlugin {
  requestAuthorization(input: { types: HealthDataType[] }): Promise<{ granted: HealthDataType[]; denied: HealthDataType[] }>
  querySamples(input: { type: HealthDataType; since: string; until?: string }): Promise<NativeHealthSample[]>
  enableBackgroundDelivery(input: { type: HealthDataType }): Promise<{ enabled: boolean }>  // HKObserverQuery / HealthConnect changes API
  revoke(input: { types: HealthDataType[] }): Promise<void>
}

type HealthDataType = 'blood_pressure' | 'body_weight' | 'heart_rate' | 'steps' | 'sleep' | 'body_temperature'
interface NativeHealthSample {
  type: HealthDataType
  value: number | { systolic: number; diastolic: number }
  unit: string                  // native unit string, normalized in §04.4
  startDate: string; endDate: string
  sourceName: string            // e.g. "Omron Connect"
  sourceBundleId: string        // provenance seed
  uuid: string                  // native sample id → dedup key
}
```

CGM is **not** read through the native bridge (Dexcom OAuth is a server-side flow, §04.5) — background delivery on 288 samples/day would fight OS throttling. Only T1 discrete devices use `enableBackgroundDelivery`.

---

### 04.3 Uniform ingestion pipeline

One pipeline for every tier. Stages are pure functions except the two persistence writes. The adapter-output type is `DeviceReadingInput` (§04.3, distinct from §03's Timescale row type `DeviceReading`).

```
DeviceReadingInput (adapter output)
  → normalize()         units + coding → canonical
  → dedup()             idempotency by external id
  → toFhir()            Observation + Device + Provenance (or raw stream row for CGM)
  → source_facts row    the seam (spine §5): fhir_ref + confidence + patient_confirmed
  → insightEngine.run() emits insight.* protocol_events (§04.7)
```

**Adapter output — the one shape every tier produces:**

```ts
type DeviceReadingSource = 'healthkit' | 'health_connect' | 'dexcom' | 'claims_pdc' | 'pill_bottle' | 'aggregator'

// NOTE: named DeviceReadingInput (not DeviceReading) to avoid colliding with §03's
// Timescale row type `DeviceReading` (§03.7). This is the adapter-OUTPUT shape only.
interface DeviceReadingInput {
  externalId: string            // vendor/native unique id → dedup key; REQUIRED
  patientId: string             // resolved to pat_ before ingestion
  source: DeviceReadingSource
  observationType: ObservationType   // spine §2 canonical enum; see §04.3a table
  value: number | { systolic: number; diastolic: number }
  rawUnit: string               // as delivered; normalized next stage
  measuredAt: string            // ISO 8601, device clock; effective_date
  receivedAt: string            // ISO 8601, ingestion clock; drives late-arrival handling
  deviceMeta: { model?: string; manufacturer?: string; vendorName: string; vendorDeviceId?: string }
}
```

`ObservationType` is a **canonical enum owned by the spine** (§2 core enums — this rail requires it registered there via spine §7 so §04 producer, §06 insight consumer, and §01 pack bindings all key on identical members; do not spell BP as `bp_home_reading`/`blood_pressure_systolic`, glucose as `glucose_cgm_reading`, or fills as anything but `pharmacy_fill_claim`). Canonical members this rail produces/consumes:
`bp_systolic | bp_diastolic | weight_daily | heart_rate | steps_daily | sleep_minutes | glucose_cgm | glucose_tir_daily | pharmacy_fill_claim | med_pdc_daily | pill_bottle_open`.
(`weight_daily` replaces the earlier `body_weight`, and `pharmacy_fill_claim` replaces the earlier `med_refill_event`, to match the §06.5 consumed set and §03 codings. The insight engine §06 and hypertension pack §01.7 MUST be reconciled to this same member set.)

**04.3a Normalization — units + coding.** Deterministic lookup table; unknown unit → reject to a `needs_review` DLQ, never silently coerce. **LOINC codes are owned by §03 (`§03.2` codings table); this table adopts §03's codes verbatim and MUST NOT diverge.**

| observationType | Canonical unit | LOINC | Accepted raw units → factor |
|---|---|---|---|
| bp_systolic | mmHg | 8480-6 | mmHg×1 |
| bp_diastolic | mmHg | 8462-4 | mmHg×1 |
| weight_daily | kg | 29463-7 | kg×1, lb×0.453592 |
| heart_rate | /min | 8867-4 | bpm×1 |
| steps_daily | count | 55423-8 | count×1 |
| sleep_minutes | min | 93832-4 | min×1, hr×60 |
| glucose_cgm | mg/dL | 97507-8 | mg/dL×1, mmol/L×18.0182 |
| glucose_tir_daily | % | 104643-2 | %×1 (derived summary) |
| pharmacy_fill_claim | (n/a — dispense event) | (RxNorm ingredient on the fill; no observation LOINC) | fill event; feeds `med_pdc_daily` |
| med_pdc_daily | % | (project code `rhtp-pdc`) | %×1 (derived, §04.6) |
| pill_bottle_open | count | (project code `rhtp-bottle-open`) | event×1 |

LOINC alignment vs §03.2: `glucose_cgm` mean glucose uses **`97507-8`** (was `14743-9`) and `glucose_tir_daily` uses **`104643-2`** (was `97510-2`), matching §03.2 which owns codings (spine §5).

BP is delivered as a paired systolic/diastolic reading and normalized to **one** FHIR `Observation` with two components (LOINC 85354-9 panel), not two rows.

**04.3b Dedup.** Idempotency key = `hash(patientId, source, externalId)`. Pipeline is at-least-once; the FHIR write is upsert-by-key. A re-delivered `externalId` is dropped after asserting value equality; a **changed** value for the same `externalId` (vendor correction) supersedes via FHIR `Observation.status = 'corrected'` and emits `audit_events{action:'device_reading_corrected'}` — it does **not** delete the prior resource (event-sourced record, spine §0.3).

**04.3c Backfill / late-arriving data.** `receivedAt − measuredAt` classifies the reading:

| Lag | Class | Behavior |
|---|---|---|
| ≤ 15 min | live | normal path; eligible to drive state immediately |
| 15 min – 72 h | delayed | normal path; insight engine re-evaluates the affected window |
| > 72 h | backfill | ingested and stored, but **cannot** by itself fire a `red_flag` or `urgent` insight (a 5-day-old high BP is history, not an emergency); may still correct a summary/trend |

Backfill re-runs insight rules **windowed** — only rules whose lookback window contains `measuredAt` re-evaluate, and re-evaluation is idempotent (same input window → same `insight.*` event id, deduped). This prevents an import of 90 days of HealthKit history from firing 90 stale alerts.

**Stale-fact corroboration at confirmation (regulatory guardrail).** Device readings are `confidence:'probable'` and time-decay quickly, but a **claims-derived** fact (adjudication lag 30–90 days, staleness thresholds up to 730 d per §05.4) that is patient- or navigator-confirmed becomes plan-driving. To prevent a navigator over-trusting a stale billing artifact into closing a real gap: the confirm control MUST surface `effective_date` + staleness prominently, and any **gap-closing** claims fact requires corroboration (a result/`DiagnosticReport`) or an explicit navigator attestation distinct from routine confirmation. The rail never auto-closes a gap from claims alone (spine §5; §06 escalation owns the state fold).

---

### 04.4 Device consent + connection flow

Device connection is an operational consent scope in the `consents` table (spine §2), distinct from clinical-grade FHIR `Consent`. One `consents` row per connected source.

```ts
// consents.scope values this rail registers (spine §2 consents.scope is free-scope string):
type DeviceConsentScope =
  | 'device:healthkit' | 'device:health_connect'
  | 'device:dexcom' | 'device:claims_pdc' | 'device:pill_bottle' | 'device:aggregator'
```

**04.4a Connection flows by tier.**

- **T1 (HealthKit / Health Connect) — patient-mediated.** In-app "Connect" → native `requestAuthorization` → OS permission sheet → app writes `consents{scope:'device:healthkit', status:'active'}` and creates a `device_links` row (§04.6 data model). No token stored; the OS grant *is* the credential. Denied types are recorded so the UI never re-nags for a denied type without user action.
- **T2 (Dexcom) — patient OAuth.** Server-side authorization-code + PKCE. On callback, store refresh token in the secrets vault (never client-side), write `consents{scope:'device:dexcom', status:'active'}`, create `device_links`, kick an initial backfill (§04.3c) of the trailing 30 days as `device_readings` rows (§03.3, `observation_type='glucose_cgm'`).
- **T3 claims-PDC — patient OAuth** to Medicare Blue Button 2.0 / KY Medicaid MCO Patient Access API (delegated to the ingestion rail; this rail consumes the resulting `MedicationRequest`/dispense facts). **T3 bottles — patient OAuth** to the bottle vendor.

**04.4b Disconnection + revoke — what happens to already-ingested data.** This is a bright-line data-governance decision, not a default.

| On disconnect/revoke | Behavior |
|---|---|
| `consents` row | `status → 'revoked'`, `updated_at` set; `device_links.status → 'revoked'` |
| Credentials | Dexcom refresh token deleted from vault; native grant left to OS (app calls `HealthBridgePlugin.revoke`) |
| **Already-ingested FHIR `Observation`s** | **Retained** — they are part of the clinical record (spine §5: FHIR is canonical clinical truth). Revoking future sync does not rewrite history. `Provenance` already records the source and consent-at-time |
| New readings | Rejected at the adapter for a revoked source; attempt logged `audit_events{action:'ingest_blocked_revoked', outcome:'blocked'}` |
| Open protocol state | Unchanged. Insights already fired remain valid facts; no retroactive un-firing |
| Patient-requested deletion (distinct from disconnect) | Routes to the platform deletion pipeline (§09.4 `DeletionRequest` / §11.2 `POST /api/patient/delete-request`), **not** a rail-invented navigator reason. The rail does not define its own deletion mechanism or a `patient_data_deletion_request` `NavigatorQueueReason` (it is unregistered in spine §4d). Deletion remains human-gated and honored per retention policy; never an automatic bulk FHIR delete |

Disconnect is reversible (reconnect writes a fresh `consents`/`device_links` pair); deletion is not, so deletion is human-gated. Deletion of retained device Observations is subject to the §09 event-log erasure policy (crypto-shred of `source_fact` payloads while retaining `protocol_events` skeletons); the rail defers the mechanism to §09, and §04.9-Q5 tracks the legal/retention sign-off that gates it.

---

### 04.5 Data model — observations, device links, sync state, equity floor

CGM raw stream is **not** FHIR (spine §5): 288 pts/day would swamp the record. Raw lives in Timescale (§03's `device_readings`, §04.5c); only summaries project to FHIR.

**04.5a `device_links`** — one row per connected source per patient (the production home for the prototype `HealthDevice`).

```ts
interface DeviceLink {
  id: string                    // dev_...
  patientId: string
  source: DeviceReadingSource
  scope: DeviceConsentScope
  status: 'connected' | 'revoked' | 'error' | 'never_connected'
  displayName: string           // "Dexcom G7", "Omron cuff via Apple Health", "Kentucky Medicaid claims"
  connectedAt?: string
  lastSyncAt?: string
  lastErrorCode?: DeviceSyncErrorCode
  fhirDeviceRef?: string        // Device/<id>
  consentId: string             // → consents.id
}
type DeviceSyncErrorCode = 'auth_expired' | 'rate_limited' | 'vendor_unavailable' | 'no_data' | 'unit_unrecognized'
```

**04.5b `device_sync_state`** — cursor + backoff per link; makes sync resumable and idempotent.

```ts
interface DeviceSyncState {
  id: string                    // sync_...
  deviceLinkId: string
  cursor?: string               // vendor pagination token / last measuredAt
  lastSuccessfulSyncAt?: string
  nextScheduledSyncAt?: string
  consecutiveFailures: number   // drives exponential backoff; ≥5 → device_links.status='error' + navigator surfaced
  backfillCompleted: boolean
}
```

**04.5c Raw CGM stream — stored in §03's `device_readings`, not a rail-owned table.** §03 owns the raw-stream schema (§03.3/§03.7): the generic Timescale hypertable `device_readings{patient_id, device_id, observation_type, value, unit, measured_at, ingested_at, quality}`. This rail does **not** define a separate `cgm_stream` table — CGM points land as `device_readings` rows with `observation_type='glucose_cgm'`; the CGM trend arrow rides in the row's `quality`/metadata per §03's shape. (The `device_id` FK is §03's `Device/<id>`, reachable from `device_links.fhirDeviceRef`; the rail does not introduce a competing `device_link_id` column on the raw stream.) Daily rollup job reads `device_readings` and derives `glucose_tir_daily` (% time 70–180 mg/dL) + pattern flags, which **do** project to FHIR `Observation` and become `source_facts`. Insight rules run on the raw `device_readings` stream (§03.3); the record keeps the conclusion. If §03 later chooses to add a glucose-specialized stream table, that is a §03 schema change registered in the spine, not a rail definition.

**04.5d Observation → source_fact seam.** Every ingested reading (or summary) creates a `source_facts` row (spine §2) with `source_kind:'device'`, `fhir_ref` → the Observation, `effective_date = measuredAt`, `confidence:'probable'` (device-measured, not clinician-confirmed), `patient_confirmed:false`. Protocol logic reads `source_facts`, never FHIR directly (spine §5).

**04.5e Equity guardrail (the floor).** Device-derived insights structurally favor device owners. Rule: **for any adherence/BP/glucose measure, a claims-based signal path must exist and be the default floor.**

```ts
interface SignalFloorRule {
  measureId: MeasureId          // e.g. 'med_adherence', 'bp_control'
  deviceSignal?: ObservationType    // enhancement (may be absent for a patient)
  claimsFloorSignal: ObservationType   // REQUIRED — must be derivable from claims alone
}
// med_adherence: floor = med_pdc_daily (claims), enhancement = pill_bottle_open
// A pack whose only signal is device-owner-only FAILS the pack-config lint (spine §1).
```

Metric emission (spine §2 `metric_snapshots`) MUST stratify insight/outreach/outcome rates by `county | language | demographic` so device skew is visible. A rising device-only insight rate against a flat claims-floor rate is an equity regression, surfaced on the outcomes dashboard, not buried.

---

### 04.6 Concrete contracts — simulated prototype devices become real

Maps the three prototype `HealthDevice`s (`src/lib/longitudinal-health.ts`) to production adapters. Each replaces static `HealthInsight[]` with engine-emitted `insight.*` events. Simulated labels removed at P5.

**04.6a BP cuff** (`blood-pressure` section → T1 HealthKit/Health Connect).

```
Omron cuff → Apple Health → HealthBridgePlugin.querySamples('blood_pressure')
  → DeviceReading{ observationType via bp_systolic+bp_diastolic, rawUnit:'mmHg', source:'healthkit' }
  → normalize → Observation(85354-9 panel, 2 components) + Device + Provenance
  → source_facts(source_kind:'device')
  → insight engine: insight.bp.morning_surge / insight.bp.variability_trend
```
Replaces the prototype's hand-authored "Morning readings run higher" (146/88 → 132/80) with the deterministic `insight.bp.morning_surge` rule. Rule: mean AM (pre-10:00) systolic − mean PM systolic ≥ 15 mmHg over ≥ 5 paired days → emit. **Output is "discuss this pattern with your PCP," never a dosing change.**

**04.6b CGM** (`glucose` section → T2 Dexcom OAuth).

```
Dexcom API (patient OAuth, server-side poll) → device_readings rows (raw, Timescale, §03.3, observation_type='glucose_cgm')
  → nightly rollup → glucose_tir_daily + nocturnal flag → Observation + source_facts
  → insight engine: insight.glucose.nocturnal_hyperglycemia / insight.glucose.time_in_range_decay
```
Replaces "Nighttime hyperglycemia pattern (11 PM–3 AM)" static text with `insight.glucose.nocturnal_hyperglycemia`. Rule: ≥ 4 of trailing 7 nights with mean 23:00–03:00 glucose > 180 mg/dL → emit; escalation map routes to `navigator_tasks` only if the pack declares it, else it's a Sandy-explained "discuss with your PCP." **No correction/dosing suggestion ever** (spine §0.5; platform brief §Risk-8 scope gravity).

**04.6c Smart pill bottle + claims-PDC floor** (`medications` section → T3).

```
CLAIMS FLOOR (default, everyone with pharmacy claims):
  MCO Patient Access API → MedicationRequest/dispense facts → PDC math
  → med_pdc_daily Observation + source_facts
  → insight engine: insight.med.refill_gap

ENHANCEMENT (bottle owners only):
  Bottle vendor OAuth → pill_bottle_open events → Observation
  → insight engine: insight.med.missed_dose_pattern
```
PDC (Proportion of Days Covered) is deterministic: `days_covered / days_in_period` per drug class over the measurement window; `< 0.80` → `insight.med.refill_gap`. This is the equity floor (§04.5e) — the "Evening medicine is easier to miss" bottle insight is an *enhancement layered on top*, never a prerequisite.

**Floor-vs-enhancement event split (seam contract with §06).** The two med-adherence detectors emit **distinct** insight events and MUST NOT be collapsed: the **claims-PDC floor** (computed from `pharmacy_fill_claim`) emits **`insight.med.refill_gap`**; the **bottle enhancement** (computed from `pill_bottle_open`) emits **`insight.med.missed_dose_pattern`**. §06's insight rules (Rule D1/D2) MUST honor this mapping — the claims-floor computation may not borrow the bottle-derived event name, or the equity-floor semantics collapse. **Sandy may remind and prep questions; it may not tell a patient to change a dose** (prototype safety copy preserved, `MedicationSummary.support`).

---

### 04.7 Insight-engine handoff (rail boundary)

The rail's terminal action per reading: `insightEngine.run(patientId, observationType, window)`. The engine (spine §4b, no LLM) evaluates registered `InsightRuleRef`s (spine §1) and emits `protocol_event`s whose `type` starts `insight.`. Each `insight.*` event conforms to the spine §3 `ProtocolEventEnvelope`, carries `actor:'system'`, and cites `source_fact_ids` (the "why this fired" chain — never empty). Whether an insight drives protocol state or spawns a `navigator_tasks` row is the **pack's** escalation map (spine §1 part 6), not the rail's decision. The rail guarantees the input is normalized, deduped, provenance-stamped, and equity-floored; the engine and pack own everything after.

---

### 04.8 Acceptance criteria

- **AC-1 (uniform pipeline)** A new device source is added by registering a `DeviceReadingSource` adapter that outputs `DeviceReading`; **zero** changes to `normalize/dedup/toFhir/insight` code (spine §1 P6).
- **AC-2 (native-shell gating)** On `ShellRuntime='web'`, T1 connect actions are hidden/disabled, and claims-PDC still fully functions. Native device sync exists only in P5 Capacitor builds.
- **AC-3 (units)** Every reading is stored in the §04.3a canonical unit with its LOINC code; an unrecognized `rawUnit` is DLQ'd `needs_review`, never coerced. A lb weight and a kg weight from two devices land as identical kg Observations.
- **AC-4 (dedup)** Re-delivering an `externalId` produces no duplicate FHIR resource; a changed value produces a `status:'corrected'` Observation + audit, preserving the original.
- **AC-5 (backfill)** Importing 90 days of HealthKit history fires no `urgent`/`red_flag` insight; a > 72 h reading cannot by itself drive an urgent state. Re-evaluation is idempotent (no duplicate `insight.*`).
- **AC-6 (consent + revoke)** Disconnect flips `consents`/`device_links` to `revoked`, blocks new ingestion (`audit outcome:'blocked'`), and **retains** prior Observations. Only a patient deletion request routed through the platform deletion pipeline (§09.4/§11.2, human-gated) removes clinical data; the rail never invents its own deletion path or navigator reason.
- **AC-7 (equity floor)** Every device-consuming pack declares a `claimsFloorSignal`; a device-only pack fails config lint. `metric_snapshots` for device measures are stratified by county/language/demographic.
- **AC-8 (bright line)** No rail or insight-engine path emits a dosing recommendation, diagnostic claim, or autonomous triage from device data; every device-derived insight terminates in educate/organize/remind/suggest-discussing-with-clinician (spine §0.5). Verified by the pack red-team suite (spine §1 part 9).
- **AC-9 (provenance)** No device reading renders in the UI without its source label (prototype `ProvenanceStrip` invariant); every `insight.*` event's `source_fact_ids` resolve to the readings that produced it.

---

### 04.9 Open questions

1. **Libre access.** Partner path (Abbott/LibreView) is months of BD; is the Tidepool bridge acceptable for P5, or does CGM ship Dexcom-only first? (platform brief §T2 note.)
2. **HealthKit background delivery reliability.** iOS throttles `HKObserverQuery`; do we accept delayed (not live) T1 delivery, or add a foreground-poll-on-open fallback for BP?
3. **PDC window + drug-class grouping (P5 prerequisite, not deferrable).** Which measurement window (90/180/365 d) and class-grouping convention (RxNorm ingredient vs therapeutic class) for `med_pdc_daily` — MUST match the HEDIS/RHTP `pdc_diabetes` measure definition exactly, or the equity-floor adherence signal is wrong. Decide before P5 (add to §11.14 decisions register with owner/deadline); this blocks the floor measure the whole tier rests on.
4. **Bottle-vendor API maturity.** Hero/AdhereTech/Pillsy patient-OAuth APIs are uneven; is any production-ready for P5, or do bottles slip to P6 with PDC-only at P5?
5. **Deletion policy.** Retention window and mechanism for a patient data-deletion request against retained device Observations — resolved by the platform deletion pipeline (§09.4 `DeletionRequest` / §11.2 delete endpoint) and the §09 event-log erasure policy (crypto-shred `source_fact` payloads while retaining `protocol_events` skeletons), not by a rail-local navigator reason (§04.4b). Still needs legal + retention-policy sign-off on the retention window before it is codified; the rail's only obligation is to route the request into that pipeline.
6. **Aggregator trigger.** What concrete pilot condition activates the Validic/Terra escape hatch, and is the per-member cost pre-budgeted or a go/no-go each time?


---

## 05. Statewide Ingestion Rail — Claims, HIE, TEFCA

The ingestion rail is how the platform earns a longitudinal record without owning an EMR. Every external system is an **adapter** that lands facts into the FHIR R4 canonical store, writes one `source_facts` row per clinically-meaningful fact with a FHIR `Provenance`, and — for cohort/state-changing facts — emits a `protocol_event` through the same gateway Sandy uses. No adapter mutates `protocol_instances` directly, no adapter presents a fact as truth before it carries a confirmation state, and no adapter links a fact to a patient before identity clears the gate in 05.5.

Sequencing is by **permission cost**, not engineering cost (spine §governing rule 2; brief §4). Cheapest-consent-first: patient-authorized claims APIs (weeks, no org agreements) → KHIE participation (months, real agreements) → TEFCA IAS via a QHIN (year+, watch). This maps to roadmap phase **P3**.

**Safety law for this section:** adapters and the insight engine are pure deterministic transforms. An adapter may *land* a fact and *emit* a lifecycle/insight event; it may never diagnose, reconcile silently, dose, or auto-close a clinical concern. Conflicts, low-confidence identity, and stale/contradictory facts route to the navigator queue — humans own exceptions.

---

### 05.1 Source registry and the three moves

Each ingestion source is a row in `data_sources` (spine §2) plus a typed adapter. `trust_tier` orders which fact wins a reconciliation tie (05.4). Almost every source maps onto a `SourceKind` already locked by the spine (payer APIs and TEFCA both fold onto `claims`/`hie` semantics — see the note in 05.8 open questions). The one addition this section registers in the spine is the **community-resource directory** source (`site_feed` semantics extended for findhelp/211 records — see 05.1a).

| move | source | `data_sources.kind` (`SourceKind`) | `trust_tier` | consent path | cadence | phase |
|---|---|---|---|---|---|---|
| 1 | Medicare Blue Button 2.0 | `claims` | 2 | patient OAuth (member) | poll (05.3) | P3 |
| 1 | KY Medicaid MCO Patient Access API (FHIR R4) | `claims` | 2 | patient OAuth (member) | poll | P3 |
| 2 | KHIE document query (CCD / C-CDA) | `hie` | 3 | participation agreement + patient consent | on-demand + scheduled poll | P3→P6 |
| 2 | KHIE event notifications (ADT) | `hie` | 4 | participation agreement | **subscription (push)** | P3→P6 |
| 2 | KHIE labs / immunization registry | `hie` | 3 | participation agreement | poll | P6→P7 |
| 3 | TEFCA Individual Access Services via QHIN | `hie` | 3 | patient-mediated (IAS) | on-demand | P8 (watch) |
| — | Community-resource directory (findhelp / 211) | `site_feed` | 2 | public directory (no PHI outbound) | poll (refresh) | P6→P7 |
| — | Navigator manual upload / admin import | `navigator_review` | 5 | in-person attested | manual | all phases |

`trust_tier` rationale: navigator-attested (5) beats real-time facility ADT (4) beats HIE document/registry (3) beats claims / community-resource feed (2) beats prototype seed (1). Claims are cheapest to obtain but **lag** (adjudication delay of 30–90 days) and describe billing, not clinical truth, so they rank below live HIE facts. A patient confirmation (05.5) overrides `trust_tier` entirely for the confirmed fact.

**Move 1 — patient-authorized claims APIs.** CMS Interoperability & Patient Access rule obliges Medicare and Medicaid managed-care plans to expose FHIR R4 Patient Access APIs. With only the patient's OAuth token the adapter reads `ExplanationOfBenefit`, `Coverage`, `Condition`, `MedicationRequest`/`MedicationDispense`, and `Procedure`. This is the fastest legitimate longitudinal record and med-fill history unlocks the adherence pack (PDC math) with zero hardware. No data-use agreement; consent is native to the OAuth flow.

**Move 2 — KHIE participation.** The acute-care/primary-care pipe. Document query returns C-CDA CCDs (problem lists, meds, allergies, labs, encounters); ADT returns admit/discharge/transfer notifications (05.2); labs/immunization registries feed the glucose/A1C and vaccination packs. Requires a participation agreement, identity-matching discipline (05.5), and sensitive-data handling (05.6). Start the paperwork in P3; it is calendar time, not engineering time.

**Move 3 — TEFCA IAS.** For out-of-state/national completeness, patient-mediated retrieval through a QHIN. Adapter interface is designed now (same `IngestionAdapter` shape) but not implemented until P8.

---

### 05.1a Community-resource directory as an ingested source

The SDOH packs and the navigator resource-matching flow (§08) need a directory of community resources (findhelp / 211 / local food, housing, transport programs). This is a **data source with a registry home here**, not an ad-hoc feed — it must carry the same `data_sources` row, adapter, `trust_tier`, and refresh discipline as any other source so §08's matching behavior keys on an owned, versioned corpus.

- **`SourceKind`:** `site_feed` (the existing screening-site feed semantics generalize — a resource record is a site with services, eligibility, hours, and coverage geography). No new `SourceKind` is minted; the spine `site_feed` member covers both screening sites and community resources. The adapter maps resource records into the prototype's `screening_sites`/`site_matches` shapes generalized for resource type.
- **`trust_tier`:** 2 (public-directory freshness is uneven and unverified; a navigator-attested or program-confirmed resource overrides it). Never higher than a live HIE fact.
- **No PHI outbound.** This adapter is directory-*inbound* only; it lands resource records, never sends patient identifiers to the directory provider. Resource matching to a patient happens locally against the landed corpus (§08 owns the matching), so a community-resource lookup never discloses a condition or a patient to findhelp/211.
- **Refresh & staleness.** Poll on a scheduled cadence (weekly baseline; daily during an active campaign that leans on it); each record carries `effective_date` and a `STALE_THRESHOLD` (community resource `30` days — hours/eligibility churn fast). A stale resource is shown with a "last verified …" label and is never presented as guaranteed-open.
- **Reconciliation & audit** follow the uniform 05.3 pipeline: resource records reconcile by `(sourceId, externalId)`; ingestion writes `audit_events` (`action: 'ingest_site_feed'`).

§08 owns *how* a resource is matched and surfaced; this section owns *that the source is registered, refreshed, and trust-tiered.* Open source/refresh questions are tracked in 05.8.

---

### 05.2 ADT discharge → transitional-care trigger (highest-value signal)

A discharge ADT is the **highest-value real-time state signal in the state pipe**: it is the only inbound that is both push-delivered (seconds, not poll-lag) and directly cohort-defining for a fundable, measurable protocol (follow-up-after-hospitalization; readmission reduction). Claims describe the past; a CCD is a snapshot; an ADT `A03` (discharge) says *this patient's clinical state just changed and a 7-day clock started now.*

**ADT event vocabulary consumed** (HL7 v2 trigger events the KHIE subscription delivers, normalized by the adapter):

```ts
type AdtEventType =
  | 'admit'         // A01 / A04 — inpatient/ED registration
  | 'discharge'     // A03 — the transitional-care trigger
  | 'transfer'      // A02 — location/level-of-care change
  | 'ed_registration' // A04 subset — ED presentation (surveillance only)
```

`AdtEventType` is added to the spine cohort vocabulary (spine §1 `ProtocolPack.cohort.adtEvents`; register in spine §7). The transitional-care pack declares `cohort.adtEvents: ['discharge']`.

**Ingestion → protocol-trigger wiring (deterministic, no LLM):**

```
KHIE ADT subscription (push)
  → AdtAdapter.normalize(hl7v2)  →  AdtNotification (typed, below)
  → SEGMENT STRIP (05.6), deterministic, BEFORE anything downstream:
      strip SUD/Part 2 diagnosis codes; if facility identity is a known Part 2 program,
      suppress facility name + diagnosis payload; tag sensitiveCategory. Runs before the
      insight engine, before the pack, before any navigator card. Fail closed on ambiguity.
  → identity resolve (05.5) — MUST clear ≥ auto_link threshold AND pass multi-field
      corroboration (05.5), else → navigator queue (identity_match_review), STOP
  → DISPOSITION GATE (deterministic, fail-closed): if dischargeDisposition is
      unrecognized/missing OR ∈ {expired, ama, transfer-to-acute} → open instance in
      navigator_review, NO autonomous outreach. Only a recognized outreach-eligible
      disposition proceeds to the autonomous path below.
  → land FHIR Encounter + Provenance; write source_fact(label:'discharge_event', source_kind:'hie', confidence:'confirmed')
  → insight engine consumes source_fact
      → emits protocol_event  type: 'insight.transition.discharge_followup_due'
         state: 'identified'   actor: 'system'   sourceFactIds:[fact_...]
  → transitional-care pack escalation map:
      → opens protocol_instance (pack_id:'transitional_care') at 'identified'
      → creates navigator_task (work_type:'outreach_followup', reason:'discharge_followup_due', priority:'soon')
      → makes patient outreach-eligible (7-day follow-up window)
```

```ts
interface AdtNotification {
  id: string                    // 'fact_' prefixed after landing
  patientMatchToken: string     // MPI token / demographics hash for 05.5
  eventType: AdtEventType
  facilityId: string
  facilityName: string          // SUPPRESSED (not populated downstream) if facilityId is a known Part 2 program (05.6)
  admitAt?: string
  dischargeAt?: string          // starts the 7-day clock when eventType==='discharge'
  dischargeDisposition?: string // free HL7 string; fail-closed disposition gate (05.2): only recognized outreach-eligible values proceed to autonomous outreach; unrecognized/missing/expired/ama/transfer-to-acute → navigator only
  diagnosisCodes: string[]      // ICD-10 from the ADT DG1 segment; SUD/Part 2 codes are stripped by the 05.6 segment step BEFORE this reaches the pack/insight engine
  rawRef: string                // pointer to stored raw HL7 v2 message (audit)
}
```

**Thresholds & guards:**
- Follow-up window: **7 days** from `dischargeAt`. The insight rule fires `insight.transition.discharge_followup_due` immediately on landing. Overdue is **not a separate event** — per §06 Rule F the same `insight.transition.discharge_followup_due` re-fires once at an `overdue` **severity band** at day 5 if no `appointment_confirmed` event exists on the instance, which escalates the existing `navigator_task` `soon→urgent` (never creates a duplicate; idempotency keyed as below so the overdue re-fire is not deduped against the initial fire — the severity band is part of the key). This section does **not** introduce a distinct `discharge_followup_overdue` event; §06's severity-band design owns overdue.
- **Resulting state.** A discharge that only opens follow-up work has not matched an action or site, so the event resolves to state `identified` (spine §3). §06 Rule F is aligned to emit `identified` for this event (reconciled: earlier drafts read `action_matched`; a discharge-only trigger is pre-action, so `identified` is authoritative).
- **Disposition gate (fail-closed).** `dischargeDisposition` is a free/optional HL7 string. It proceeds to autonomous outreach **only** on a recognized outreach-eligible disposition (e.g. `home`, `snf`). Anything unrecognized/missing, or ∈ `{expired, ama, transfer-to-acute}` → **suppress all autonomous outreach**; open the instance in `navigator_review`, actor `system`. Sandy is never the first contact on these dispositions.
- De-duplication: an `admit` then `discharge` for the same `Encounter` within the subscription must collapse to one `Encounter` resource; a repeated discharge notification for an already-open instance emits **no** new event. Idempotency key = `facilityId + dischargeAt + patientId + packVersion + ruleVersion + severityBand` (pack/rule version included per spine §2/§4 idempotency rule so a post-version-bump re-import is not silently deduped against a pre-bump event, and the `overdue`-band re-fire is not deduped against the initial `due` fire).
- ED-only registrations (`ed_registration`) are surveillance: they land a fact but do **not** open a transitional-care instance (no admission = no discharge follow-up obligation).

`insight.transition.discharge_followup_due` is already a canonical insight event (spine §4b); no new insight event is added by this section. `discharge_followup_due` is the `NavigatorQueueReason` for the opened task (registered in spine §4d via §10.3, not `nonresponse` — `nonresponse` is reserved for the post-outreach no-answer case).

---

### 05.3 Adapter architecture

Every source implements one interface. Adding a source = writing an adapter + a `data_sources` row; it requires **zero rail code** (the platform test, mirrored from the pack test).

```ts
interface IngestionAdapter {
  sourceId: string                      // FK to data_sources.id
  kind: SourceKind                      // 'claims' | 'hie' | 'site_feed' | 'navigator_review'
  mode: 'poll' | 'subscription'

  // POLL adapters: called by the scheduler; returns raw payloads since the cursor.
  poll?(ctx: AdapterCtx, since: string): Promise<RawInbound[]>
  // SUBSCRIPTION adapters (ADT): the transport calls this on each pushed message.
  onPush?(ctx: AdapterCtx, raw: RawInbound): Promise<void>

  // Deterministic transform — the load-bearing method. No LLM, no network.
  normalize(raw: RawInbound): NormalizedFact[]
}

interface NormalizedFact {
  patientMatchToken: string             // demographics/MPI token for 05.5 (NOT a resolved patient_id)
  fhirResource: FhirResource            // Patient | Condition | Observation | MedicationRequest | Encounter | Immunization | Coverage | DiagnosticReport
  factLabel: string                     // human label for source_facts.label, e.g. 'last_retinal_screening'
  factValue: string                     // source_facts.value
  effectiveDate: string                 // clinical effective date (NOT retrieved_at)
  sourceConfidence: SourceConfidence    // adapter's a-priori confidence before patient confirmation
  measureHint?: MeasureId               // if this fact satisfies/opens a measure (e.g. 'eye_exam')
  sensitiveCategory?: SensitiveCategory // 05.6 — triggers segmentation BEFORE landing
}
```

**Landing pipeline (uniform across all adapters), per `NormalizedFact`:**

1. **Segment check (05.6) first.** If `sensitiveCategory` is set and per-category consent is not `active`, land the FHIR resource into the **segmented store** and write the `source_facts` row with `ai_context_suppressed = true`. It never enters the knowledge bundle or any LLM prompt until consent flips.
2. **Identity resolve (05.5).** Map `patientMatchToken` → `patient_id`. Below `auto_link` threshold → hold the fact, emit `identity_match_review` navigator task, STOP. No orphan facts drive plans.
3. **Land FHIR + Provenance.** Upsert `fhirResource` into the FHIR R4 store. Attach a FHIR `Provenance` (agent = `data_sources.name`, recorded = `retrieved_at`, `entity` = `rawRef`). High-frequency streams (CGM) do **not** land as raw FHIR — summaries only (spine §5).
4. **Write `source_facts`** (spine §2) pointing at the FHIR resource via `fhir_ref`, with `source_kind`, `source_name`, `retrieved_at`, `effective_date`, `confidence`, `patient_confirmed = false`, `navigator_overridden = false`.
5. **Reconcile (05.4)** against existing `source_facts` for the same `(patient_id, factLabel)`.
6. **Emit events.** If the reconciled fact is cohort-defining, emit the pack's lifecycle event (e.g. `care_gap_imported`) or an `insight.*` event through the tool/action gateway. Every emitted event carries `sourceFactIds` (never empty — spine §3).
7. **Audit.** Append `audit_events` (actor `system`, action `ingest_<kind>`, outcome `allowed|blocked|failed`, `source_ids`).

**Poll vs subscription decision table:**

| source | mode | why | cursor / dedupe |
|---|---|---|---|
| Blue Button 2.0 | poll | payer APIs are request/response; no push | `_lastUpdated` cursor per resource type |
| MCO Patient Access | poll | same | `_lastUpdated` cursor |
| KHIE document query | poll | CCD retrieval is pull; refresh on schedule + on-demand at session start | CCD `effectiveTime` + document hash |
| KHIE ADT | **subscription** | discharge value is entirely in latency (05.2) | idempotency key = `facility+event+timestamp+patient+packVersion+ruleVersion+severityBand` (05.2) |
| KHIE labs/immz | poll | registry query | result `effectiveDate` + `identifier` |
| TEFCA IAS | poll (on-demand) | patient-initiated retrieval | document hash |

**Poll cadence:** claims daily (adjudication is slow); KHIE documents on patient-session open + weekly background refresh; labs/immz daily during active campaign windows, else weekly. Backoff and rate-limit handling per source; a failed poll writes `audit_events` outcome `failed` and never partially applies a payload (all-or-nothing per patient per poll).

---

### 05.4 Reconciliation of duplicate / conflicting facts

Facts collide constantly: a retinal-screening date from claims, a different one from a CCD, a "no evidence" from the seed. Reconciliation is **deterministic and never silent** when it changes a plan-driving fact.

Two facts are the **same fact** when `patient_id` and a canonical `factKey` match. `factKey` is derived per label: for coded clinical facts, `factKey = normalize(coding.system + coding.code)`; for date-of-service facts (last screening), `factKey = measureHint`. Duplicate problems (same SNOMED/ICD across CCD + claims) collapse to one `source_facts` row of record with the others linked as corroborating `evidence_source_fact_ids`.

**Winner selection for a conflicting fact of record (ordered rules):**

1. `patient_confirmed = true` wins over everything (patient is ground truth for their own record).
2. `navigator_overridden = true` wins over any unconfirmed machine fact.
3. Higher `data_sources.trust_tier` wins (05.1).
4. On equal tier, **more recent `effective_date`** wins (not `retrieved_at`).
5. On a full tie, keep both; mark `needs_review`.

**Conflict → navigator when it matters.** If reconciliation would *change a fact that is currently driving an open `protocol_instance`* (e.g. a claims fact says the eye exam is done but the instance is mid-outreach), the adapter does **not** flip the fact silently. It:
- sets the incoming fact `confidence = 'needs_review'`,
- emits `already_completed_claimed` **only if** the source is patient-mediated; for a raw claims/HIE conflict it creates a `navigator_task` (`work_type: 'reconciliation'`, `reason: 'already_completed_needs_reconciliation'`, `priority: 'soon'`),
- leaves the instance state unchanged until the navigator resolves.

This is the "reconcile completed screening evidence from a non-EMR source" acceptance criterion (production-arch §17) implemented as a rule, not a model call.

**Data-quality flags computed at landing** (drive UI + reconciliation, never auto-suppress care):

```ts
interface FactQuality {
  staleDays: number                 // now - effective_date
  isStale: boolean                  // staleDays > STALE_THRESHOLD[factLabel]
  isDuplicateOf?: string            // source_fact id of the record fact it corroborates
  conflictsWith?: string            // source_fact id it contradicts
}
```

`STALE_THRESHOLD` (days): med list `180`, problem list `365`, last-screening date `730` (screening-interval-relative), coverage `90`, A1C `120`, community resource `30` (05.1a — hours/eligibility churn fast). A stale med list is **never** presented as the current med list without a "last confirmed …" label and a confirmation prompt (05.5).

---

### 05.5 Identity matching — proofing before linkage

Wrong-patient linkage is the platform's **existential failure mode** (brief §9 risk 1). The control is sequenced: proof identity → then link facts → then let facts drive plans only after patient confirmation.

**Enrollment proofing (before any external linkage):**

| enrollment channel | proofing | resulting `patient_identities.proofing_status` |
|---|---|---|
| **Navigator-attested (rural trust channel)** | in-person; the clinic staffer who knows the patient sets them up — trust transfers | `proofed_in_person` |
| App self-registration + SMS magic link | phone possession + demographics | `proofed_remote` |
| Payer OAuth (Blue Button / MCO) | the payer's own IAL proofing carries | `proofed_delegated` |

No external source is queried, and no `patient_identities` row is written, until proofing_status is one of the above. `proofing_status = 'unproofed'` blocks all ingestion linkage.

**Match method & confidence** (`patient_identities.match_method`, `match_confidence` — spine §2):

```ts
type MatchMethod = 'deterministic' | 'probabilistic'

interface IdentityResolution {
  patientId?: string          // set only if resolved at/above auto_link
  matchMethod: MatchMethod
  matchConfidence: number     // 0.0–1.0
  strongIdMatched: boolean    // a strong identifier matched exactly
  demographicCorroborated: boolean // ≥1 independent demographic (DOB/name) also agreed
  decision: 'auto_link' | 'navigator_review' | 'no_match'
  candidatePatientIds: string[] // for the navigator review card
}
// Guardrail: strongIdMatched && !demographicCorroborated  ⇒  decision = 'navigator_review'
// (never auto_link on a bare strong-ID hit — 05.5 multi-field corroboration rule)
```

- **Deterministic first — but never a strong ID alone.** An exact match on a strong identifier (payer member ID, MPI id, or SSA/Medicare beneficiary id) is a candidate, not a link. It is confirmed to `match_method='deterministic'`, `match_confidence = 1.0`, `decision='auto_link'` **only if it also agrees on ≥1 independent demographic** (DOB and/or name). A strong-ID hit that does **not** corroborate on an independent demographic is **downgraded to `navigator_review`** (`identity_match_review`, priority `soon`) — never auto-linked. This closes the recycled/reassigned/mistyped-member-ID wrong-patient path (common in Medicaid MCO churn), where a raw exact ID match would otherwise silently bypass the entire probabilistic queue at confidence 1.0.
- **Probabilistic fallback:** weighted demographics (name, DOB, sex, address/county, phone). Thresholds:
  - `matchConfidence ≥ 0.95` → `auto_link`
  - `0.80 ≤ matchConfidence < 0.95` → `navigator_review` (queue reason `identity_match_review`, priority `soon`)
  - `< 0.80` → `no_match` (hold fact; if a cohort-defining fact, queue `low_confidence_identity_or_gap_match`, priority `soon`)

- **No autonomous outreach on a newly-linked external record until the first patient confirmation.** Even after a clean `auto_link`, the *first* patient-facing clinical-adjacent use of any newly-linked external record (Sandy asserting a fact, an outbound reminder tied to it) is gated on `patient_confirmed = true` (see the confirmation gate below). A newly-linked record may open a navigator task but may not drive autonomous patient contact until the patient has confirmed at least once that the record is theirs. This bounds the blast radius of an undetected wrong-patient link to internal/navigator surfaces, never a message asserting another person's clinical facts to the patient.

`identity_match_review` is added to `NavigatorQueueReason` (spine §4d; register in §7) — distinct from the legacy combined `low_confidence_identity_or_gap_match`, which remains for gap-match ambiguity. Both map to `NavigatorWorkType: 'identity_review'`.

**Patient confirmation of imported facts (the second gate).** A fact that is *imported* (not patient-reported) becomes **plan-driving truth only after** `patient_confirmed = true` OR `navigator_overridden = true`. Until then it is displayed with its provenance and confirmation state (the prototype's `ProvenanceStrip` is the substrate), and Sandy may reference it only as *"our records from {source_name} show …, is that right?"* — never as an assertion. Confirmation emits a lifecycle event `patient_confirmed_fact` (spine §4a) with `actor: 'patient'`, flipping `patient_confirmed`. This mirrors the source-fact confirmation model already specced and is what lets the system say "you are overdue" only when it can show *why*.

```ts
// confirmation state machine on a source_fact
type FactConfirmationState =
  | 'imported_unconfirmed'   // default for kind ∈ {claims, hie}; NOT plan-driving
  | 'patient_confirmed'      // patient said yes → plan-driving
  | 'patient_disputed'       // patient said no → navigator_task(reconciliation), NOT plan-driving
  | 'navigator_overridden'   // human set the value → plan-driving
```

`patient_disputed` never silently deletes the fact; it flags it and queues reconciliation (a disputed claims fact may still be true — the human decides).

**Stale-fact re-verification at confirmation time.** Claims/HIE facts carry adjudication lag (30–90 days) and staleness up to `STALE_THRESHOLD` (05.4). When a stale fact reaches the confirmation control, the `effective_date` and computed staleness are shown **prominently** on the confirm surface ("from your Medicare record, dated 8 months ago — is this still accurate?") so neither patient nor navigator confirms a stale value blind. Additionally, a **gap-closing** claims fact (one that would satisfy/close a care gap) is not confirmable by routine patient/navigator confirmation alone: it requires either corroboration by an independent result (`DiagnosticReport`/`Observation` `source_fact`) or an explicit navigator **attestation** distinct from routine confirmation — because a claims "completed" can be a billing artifact rather than a real clinical result, and over-trust here would close a real gap. This upholds the "never auto-close from claims alone" rule (05.8 Q5) at the human-confirmation boundary, not just the machine boundary.

---

### 05.6 42 CFR Part 2 & adolescent-confidentiality segmentation

SUD/Part 2 and adolescent-confidential data arriving via HIE/claims are **segmented and default-suppressed from all AI context**; per-category consent is required before the data enters the knowledge bundle (brief §6).

**Sensitive-category vocabulary** (`SensitiveCategory`, the full 5-member set, registered in spine §7). This is a **separate axis from `consents.category`** — the spine `consents.category` stays coarse (`general | part2_sud | adolescent`, the three that gate an entire *consent record*), while `SensitiveCategory` is the finer per-`source_fact` suppression tag that also covers behavioral/reproductive/hiv. The member names align 1:1 with the spine where they overlap: `part2_sud` and `adolescent` are spelled identically to `consents.category` (no `adolescent_confidential` variant — §09 must use `adolescent` to match).

```ts
type SensitiveCategory =
  | 'part2_sud'      // 42 CFR Part 2 — substance use disorder records  (maps to consents.category 'part2_sud')
  | 'adolescent'     // adolescent-confidential (state-minor-consent)   (maps to consents.category 'adolescent')
  | 'behavioral'     // general mental-health beyond PHQ/GAD program scope
  | 'reproductive'   // reproductive/sexual-health confidential
  | 'hiv'            // HIV-related, where state law adds protection
```

**Consent axis reconciliation.** `part2_sud` and `adolescent` unsuppress via a `consents` row on the matching coarse `consents.category`. `behavioral | reproductive | hiv` do not widen the shared `consents.category` enum; they are unsuppressed by a per-category consent keyed on the `SensitiveCategory` tag itself (`consents.scope` carries the category for these), keeping the spine `consents.category` enum unchanged at 3 values. This resolves the 05/09/spine divergence without redefining the shared column: the coarse consent axis and the fine suppression tag are deliberately different shapes.

**Detection at the adapter (before landing, step 1 of 05.3).** The `normalize()` method tags `sensitiveCategory` deterministically from: C-CDA document/section confidentiality codes and `authorReference` to a Part 2 program; claim provider taxonomy / facility type flagged as a Part 2 program; ICD-10/SNOMED codes on the SUD/behavioral/reproductive/HIV code lists (a maintained, versioned code set — not model inference). When category law is ambiguous, **fail closed**: tag it sensitive and suppress.

**Segmentation behavior:**
- The FHIR resource lands in a **segmented partition** with restricted RBAC; `source_facts.ai_context_suppressed = true`.
- The **knowledge bundle** (the RAG retrieval scope for Sandy) filters out any `source_fact` with `ai_context_suppressed = true`. Suppressed facts are invisible to the live voice lane and the async reasoning lane alike.
- Suppressed facts do **not** open protocol instances and do **not** create navigator tasks that would leak the category. The stripping is a **deterministic code-set + facility-identity operation that runs BEFORE the encounter reaches the transitional-care pack, the insight engine, or any navigator card** (step 0 of the 05.2 wiring, step 1 of the 05.3 landing pipeline). A discharge from a Part 2 facility triggers transitional-care follow-up on the *encounter*, but (a) the SUD diagnosis codes are stripped from the ADT and (b) a **Part 2-covered facility identity is itself Part 2-protected**, so the facility name is suppressed too — no task text, card, `reasonLine`, or outbound message may name a known SUD/methadone facility or the SUD category. Because `dischargeDisposition` and `diagnosisCodes` are free/optional HL7 fields, the stripping and the disposition gate both **fail closed**: an unrecognized code or facility flag tags the record sensitive/navigator-only rather than letting it through.
- **Consent to unsuppress** is per-category (`consents.category`, versioned): the patient explicitly opts a category into their AI context. Flipping consent `active` emits `patient_consented` (actor `patient`) scoped to the category, clears `ai_context_suppressed` on that category's facts going forward, and is audited. Revocation re-suppresses and is audited; derived artifacts (embeddings, summaries) built from the category must be purged on revocation (brief §6 "real deletion including derived data and embeddings").

```ts
interface Consent {              // spine consents row — category enum UNCHANGED (3 values)
  id: string                     // 'consent_' prefix
  patientId: string
  scope: string                  // source or capability scope; for behavioral|reproductive|hiv the
                                 // SensitiveCategory tag is carried here (category stays 'general')
  category: 'general' | 'part2_sud' | 'adolescent'   // spine §2 enum, not widened by this section
  status: 'active' | 'missing' | 'revoked'
  version: string
  updatedAt: string
}
```

The suppression decision reads the `source_fact.sensitive_category` tag (any of the 5), not `consents.category` (3): a fact is AI-suppressed while there is no `active` consent covering its `SensitiveCategory` — via `consents.category` for `part2_sud`/`adolescent`, or via `consents.scope` for `behavioral`/`reproductive`/`hiv`.

Acceptance: with the covering consent `missing`, a Part 2 SUD medication or diagnosis is present in the FHIR store but is provably absent from every LLM prompt and every navigator queue summary (test: prompt-context assertion in the red-team suite). **Additional AC:** a discharge from a Part 2 facility opens transitional-care follow-up **without** any navigator task, card, `reasonLine`, or outbound message text that names the facility or leaks the SUD category (test: assert the emitted `navigator_task.summary`/`suggested_action` and any `outreach_attempts` body contain neither the facility name nor a SUD-category token, in every language the pack ships).

---

### 05.7 Data models introduced (summary) & acceptance criteria

**New/extended tables & columns:**
- `source_facts` gains `ai_context_suppressed: boolean`, `sensitive_category: SensitiveCategory?` (5-member tag, distinct from the coarse 3-value `consents.category` — 05.6), `confirmation_state: FactConfirmationState`, `quality: FactQuality` (denormalized flags), and already-spined `patient_confirmed`, `navigator_overridden`, `fhir_ref`.
- `data_sources.trust_tier: number` (1–5, per 05.1); community-resource `site_feed` source registered per 05.1a.
- `patient_identities` gains `proofing_status: 'unproofed' | 'proofed_in_person' | 'proofed_remote' | 'proofed_delegated'` (extends spine `proofing_status`), and the resolution carries `strong_id_matched`/`demographic_corroborated` for the 05.5 multi-field guardrail.
- `consents.category` axis (unchanged 3-value spine enum) used for `part2_sud`/`adolescent`; `behavioral`/`reproductive`/`hiv` unsuppress via `consents.scope` per 05.6.
- Spine registrations this section relies on: `SensitiveCategory` (5) in §7; `identity_match_review` `NavigatorQueueReason` in §4d; `discharge_followup_due` `NavigatorQueueReason` in §4d (owned by §10.3); pack/rule-version-inclusive idempotency key per §2/§4. No new insight event and no new `SourceKind` are minted.

**Acceptance criteria (this section is done when):**
1. A real longitudinal record renders from Blue Button + one MCO Patient Access API, every fact carrying provenance and a confirmation state; the med list is built from `MedicationDispense`/fills (roadmap P3 exit).
2. A KHIE discharge ADT push opens a transitional-care instance within seconds at state `identified`, with a 7-day follow-up window and a `soon` navigator task whose reason is `discharge_followup_due` (not `nonresponse`) — and does **not** open the autonomous-outreach path for an ED-only registration, an unrecognized/missing disposition, or an `expired`/`ama`/`transfer-to-acute` disposition (those go navigator-only, fail-closed). Overdue re-fires as an `overdue` severity band on the same `discharge_followup_due` event (per §06), not a separate event.
3. No imported (`claims`/`hie`) fact drives a protocol transition or is asserted to the patient as truth while `confirmation_state = 'imported_unconfirmed'`.
4. A probabilistic identity match in `[0.80, 0.95)` produces an `identity_match_review` queue item and links nothing until a human resolves it; `< 0.80` holds the fact. A **strong-ID exact match that does not corroborate on ≥1 independent demographic (DOB/name) is NOT auto-linked** — it routes to `identity_match_review`; and a newly-linked external record drives **no autonomous patient outreach** until the first patient confirmation (05.5 wrong-patient guardrail).
5. Two conflicting last-screening facts resolve deterministically by the 05.4 winner rules, and a conflict that would flip an open instance's driving fact routes to a `reconciliation` navigator task instead of flipping silently.
6. A Part 2 SUD fact is present in the FHIR store, provably absent from every LLM prompt and navigator summary while its covering consent is `missing`, and its derived embeddings are purged on revocation. A Part 2 **facility** discharge opens follow-up **without** leaking the facility name or SUD category in any task, card, `reasonLine`, or outbound message, in every shipped language.
7. Every ingested fact and every emitted event writes an `audit_events` row (actor `system`) with `source_ids`; a failed poll applies nothing partially.
8. Adding a new source (e.g. a second MCO) requires only a new adapter + `data_sources` row — zero rail code.

---

### 05.8 Open questions

1. **`SourceKind` granularity.** Payer Patient Access and TEFCA both fold into `claims`/`hie` today. Do we need distinct `payer_api` and `tefca` kinds for provenance/audit clarity, or does `data_sources.name` + `trust_tier` carry enough? (Adding a `SourceKind` is a spine §7 edit.)
2. **MPI ownership.** Do we run our own master patient index, lean on KHIE's, or use a payer-provided member id as the deterministic key? Affects 05.5 deterministic-match availability.
3. **ADT subscription transport.** Direct secure messaging, a FHIR Subscription against KHIE, or a notification vendor (e.g. a PatientPing-class service) — latency and agreement cost differ.
4. **Part 2 code-set custody.** Who owns and versions the SUD/behavioral/reproductive/HIV code lists driving 05.6 detection, and at what review cadence? Fail-closed is safe but over-suppresses; drift here is a compliance risk.
5. **Claims adjudication lag policy.** Should a claims-derived "completed" ever auto-close a gap, or always require patient/navigator confirmation given 30–90 day lag and billing-vs-clinical mismatch? Current spec: never auto-close from claims alone.
6. **Confirmation fatigue.** If every imported fact needs patient confirmation before it is plan-driving, high-volume records could overwhelm the patient. Do we batch-confirm by source ("confirm everything from your Medicare record") vs per-fact, and how does batch confirmation interact with the reconciliation queue?
7. **TEFCA timing.** Watch-only through P8 — but does an early pilot county with heavy out-of-state care (border counties) justify pulling IAS forward?
8. **Community-resource directory source/refresh (05.1a).** Which provider(s) (findhelp, 211, a state-maintained directory), what refresh cadence guarantees acceptable hours/eligibility freshness, and who owns re-verification of a resource that a navigator finds closed? Registered as a `site_feed` source here; §08 owns matching. Refresh SLA and provider selection remain open.


---

## 06. Deterministic Insight Engine

The insight engine is **part 4 of every Protocol Pack** (spine §1). It is the platform's only path from raw clinical signal (observations, claims, ADT, schedule ticks) to a typed `protocol_event`. It contains **no LLM, no probabilistic model, no ranked heuristic** — every output is a pure function of versioned rules over provenance-carrying facts. In the prototype this lane is *absent* (`_prototype-map.md` §7: "Insight engine… Absent — no deterministic detector emits protocol events from observations"). The static `HealthInsight` content in `src/lib/longitudinal-health.ts` (nighttime hyperglycemia, morning-high BP) is hand-authored copy, not engine output; this section specifies the engine that must produce those facts deterministically before they can drive state.

### 06.1 Load-bearing principle — rules decide, models explain

> **DETERMINISTIC RULES DECIDE; MODELS EXPLAIN/PERSONALIZE/CONVERSE; HUMANS OWN EXCEPTIONS.**

This is the FDA/CDS bright line (spine §0.1, §0.5). The engine is what keeps the platform a **non-device Clinical Decision Support** tool rather than regulated software-as-a-medical-device:

| Guarantee | Enforcement |
|---|---|
| No LLM in this lane | Engine module has **no** import of any model client. Enforced by a lint rule (`no-restricted-imports` on `@anthropic-ai/*`, `openai`, and the internal `sandy-gateway`) scoped to `server/insight/**`. CI fails the build on violation. |
| Educate / organize / remind / detect-pattern / suggest-discussing-with-clinician only | Every rule declares a `disposition ∈ {educate, remind, detect_pattern, suggest_discussion, organize_work}`. There is **no** `diagnose`, `dose`, or `triage` disposition. `emitDiagnosis` / `emitDosing` do not exist. |
| Pattern-detection is not diagnosis | Emitted labels are descriptive patterns ("readings above range overnight"), never diagnostic claims ("you have nocturnal hyperglycemia due to X"). The `insight.*` event carries the pattern; Sandy's *explanation* of it is generated downstream and is itself non-diagnostic per §06.5. |
| Auditability | Every evaluation writes an `audit_events` row (`action:'insight_rule_evaluated'`, `outcome:'allowed'|'blocked'`, `model_id:null`) and every emitted event carries `source_fact_ids` (never empty — spine §3 envelope). "Why this fired" is reconstructable from the rule version + input facts alone. |

Consequence: an auditor, given `(ruleId, ruleVersion, inputFacts)`, can re-derive the exact output. No hidden state, no temperature, no non-determinism. Models sit *entirely* on the far side of the emitted event — they read `insight.*` events and render plain-language explanation (§06.5), and they may **never** emit one.

### 06.2 Rule taxonomy

Six rule kinds cover every insight in the platform brief. Each is a subtype of `InsightRule` (§06.3). Kinds are closed — a new detector must be one of these six or the taxonomy is extended in the spine first (§7).

| # | Kind (`RuleKind`) | Decides on | Canonical use |
|---|---|---|---|
| 1 | `threshold` | Single observation vs. a static or patient-baselined cutoff, optionally time-of-day windowed | uncontrolled BP; critical-high glucose |
| 2 | `drift_window` | Slope / delta of a summary metric across a rolling window | time-in-range decay; BP variability trend; weight trajectory |
| 3 | `schedule_interval` | Calendar interval since last qualifying event vs. a recall period | screening interval due; annual eye exam recall |
| 4 | `adherence` | PDC / proportion-of-days-covered from fill/refill claims | refill gap; medication non-adherence |
| 5 | `event_window` | An index event (ADT discharge, result) plus an elapsed-time window with no closing event | post-discharge follow-up due |
| 6 | `composite` | Boolean/temporal combination of ≥2 fired sub-signals | morning BP surge (AM-high AND PM-normal); missed-dose-pattern-AND-rising-glucose |

**Cross-cutting mechanics** every kind shares:
- **Windows** are `{ length: Duration, align: 'trailing'|'calendar', minObservations: number }`. A rule that cannot meet `minObservations` emits **nothing** (never a low-confidence guess) and records `audit action:'insight_insufficient_data'`.
- **Debounce / hysteresis:** each rule declares `refractory: Duration` — once fired for an instance it will not re-fire the same `insight.*` type until (a) the refractory period elapses AND (b) the condition cleared and re-tripped, or the severity band changed. Prevents alert storms on choppy signals.
- **Baselining:** threshold and drift rules may reference a `baseline` (28-day trailing median by default) so "high for this patient" is possible without diagnosis; the baseline computation is itself deterministic and versioned.

### 06.3 Rule evaluation model

**Data model.** A rule is declarative config shipped inside a `ProtocolPack.insightRules` (spine §1, part 4). It is *never* code the pack authors write — it is parameters over the six built-in evaluators.

```ts
type RuleKind = 'threshold' | 'drift_window' | 'schedule_interval'
              | 'adherence' | 'event_window' | 'composite'
type Disposition = 'educate' | 'remind' | 'detect_pattern'
                 | 'suggest_discussion' | 'organize_work'
type Duration = { value: number; unit: 'minutes'|'hours'|'days'|'weeks'|'months' }

interface InsightRule {
  ruleId: string                 // slug, e.g. 'bp_uncontrolled_v3'
  ruleVersion: string            // semver; bump on any threshold/logic change
  packId: PackId                 // owning pack (spine §1)
  kind: RuleKind
  emits: InsightEventType        // dotted insight.* type (spine §4b)
  disposition: Disposition       // never diagnose/dose/triage
  inputs: ObservationType[]      // FHIR Observation codes / claim types consumed
  window?: RuleWindow            // required for drift_window / adherence
  params: Record<string, number|string|Duration>  // kind-specific (see §06.4)
  refractory: Duration
  effectiveFrom: string          // ISO date; rule inert before this
  effectiveTo?: string           // supersession date
  emitState?: ProtocolState      // resulting state if this drives the machine (spine §3)
  navigatorReason?: NavigatorQueueReason  // if it should create navigator_tasks (spine §4d)
  severityBands?: SeverityBand[] // ordered; maps output to routine|soon|urgent
  citations: string[]            // guideline refs for governance (§06.6)
}

interface RuleWindow { length: Duration; align: 'trailing'|'calendar'; minObservations: number }
interface SeverityBand { id: string; predicate: string; priority: NavigatorQueuePriority }

interface InsightEvaluation {          // one evaluation of one rule for one instance
  evaluationId: string                 // 'eval_...'
  ruleId: string; ruleVersion: string
  protocolInstanceId: string; patientId: string
  triggeredAt: string                  // engine clock at eval
  inputFactIds: string[]               // the exact source_facts read
  fired: boolean
  emittedEventId?: string              // proto_... if fired
  reason: 'fired' | 'not_met' | 'insufficient_data' | 'refractory' | 'inactive'
}
```

**Triggering.** The engine is a **stream processor keyed by `protocol_instance_id`**. It runs on:
1. Every new `source_fact` whose `source_kind ∈ {device, hie, claims}` (a fresh Observation summary or fill claim lands).
2. Every relevant `protocol_event` (e.g. `result_imported` can re-arm a schedule rule).
3. Every **schedule tick** — a daily cron per active `protocol_instance` re-evaluates `schedule_interval` and `event_window` rules that depend on elapsed time rather than new data.

For an incoming fact, the engine loads only the rules whose `inputs` intersect the fact's observation type AND whose owning pack is active on that instance — no full-table scan.

**Determinism & versioning.**
- Rules are **effective-dated**. An evaluation is run against the rule version(s) active at the fact's `effective_date`, not wall-clock now. Backfilled 2025 data is judged by 2025 thresholds.
- The engine **clock is injected** (mirrors the prototype's fixed `now()` in `src/store/useStore.ts` and `server/audit.ts`), so replays are bit-identical.
- Output is a pure function `evaluate(rule, facts, clock) → InsightEvaluation`. No I/O inside evaluators; the shell fetches facts and persists events.

**Idempotency & re-evaluation on backfill.**
- Each evaluation has a deterministic **idempotency key**: `hash(ruleId + ruleVersion + packVersion + protocolInstanceId + sortedInputFactIds)`. Re-running the same rule over the same facts yields the same key and **does not** emit a duplicate `protocol_event` — the append is a no-op if the key already exists (`insight_evaluations.idempotency_key` unique index). **`packVersion` and `ruleVersion` are load-bearing in the key** (resolves spine idempotency contract; the corresponding protocol-event key in §02 carries `pack_version` for the same reason): a published pack/rule version bump changes source-fact selection or a threshold, which is a *different logical action* — omitting the version would silently dedupe a legitimately-new post-bump fire against a pre-bump event (missed care) or fail to re-fire on re-import. AC-06-11 gates this: a post-bump re-import over identical facts MUST NOT dedupe against pre-bump events.
- **Backfill** (a late Observation for an earlier `effective_date`, or a claims file for a prior month) re-triggers evaluation of every rule whose window covers that date. Because events are keyed on the fact set, a corrected window may (a) newly fire (emit), (b) previously fired and still fires (no-op), or (c) previously fired but no longer holds → the engine emits a **retraction** `protocol_event` (`insight.<domain>.<pattern>.retracted`, actor `system`, citing the superseding facts) rather than deleting history. Event-sourcing is append-only (spine §0.3). The **`.retracted` family is a registered spine §4b addition** (added via §7): every canonical `insight.*` type has a `.retracted` counterpart, so §08 (alert center) and §10 (timeline) key on declared strings, not synonyms.
- The `current_state` cache on `protocol_instances` is a fold; a retraction re-folds and may move the instance back only where the state guards permit (monotonic; `navigator_review` and terminals are sticky — spine §3). A retraction that would need to reverse a terminal state instead opens a `reconciliation` navigator task.

**Retraction reconciliation contract (a retraction that already drove downstream action).** A `.retracted` event correctly cannot silently reverse a terminal or `navigator_review` state. But a false-positive fire may have already created a navigator task and/or been explained to the patient by Sandy. The retraction path is deterministic (no model in it) and specifies both downstream seams:
- **Retraction → navigator_task.** If the retracted insight created an open `navigator_tasks` row, the engine does **not** silently close it. It emits a follow-on system event that flags that task `possibly_spurious` (reason unchanged, an audit note appended citing the superseding facts) and re-prioritizes it to `routine` if it was `soon`/`urgent`, so a navigator sees the retraction and closes with judgment. §10 (navigator console) owns rendering the `possibly_spurious` flag; §08 owns removing/annotating any `HealthAlert` the original fire raised. Auto-close is forbidden — a human owns the exception (spine §0.1). If the task is already `done`, no change; the retraction is recorded on the timeline only.
- **Retraction → patient notification.** For an insight the patient already saw Sandy explain (educational `detect_pattern`/`educate` dispositions only — nothing diagnostic ever reaches the patient), the engine emits `insight.<...>.retracted` which §07/§08 consume to drive a gentle, non-alarming "un-say" per the §02/§08 patient-notification contract (see §06.8 Q3). The engine never composes patient copy; it only emits the typed retraction with provenance. A retracted pattern MUST NOT leave a live urgent navigator task or a standing patient instruction to "discuss with your care team" about a pattern that no longer exists.

**Persistence (new tables — added to spine §2 per §7):**

| Table | Key fields |
|---|---|
| `insight_rules` | rule_id, rule_version, pack_id, kind, emits, disposition, params(json), window(json), refractory, effective_from, effective_to?, active |
| `insight_evaluations` | id, rule_id, rule_version, protocol_instance_id, patient_id, triggered_at, input_fact_ids[], fired, emitted_event_id?, reason, idempotency_key(unique) |
| `insight_backtests` | id, rule_id, rule_version, corpus_id, fired_count, precision_est, recall_est, override_rate, run_at, verdict(`pass|fail|advisory`) |

Insight events themselves are **not** a new table — they are `protocol_events` rows whose `type` starts `insight.` (spine §4b). `insight_evaluations` is the engine's decision log; `protocol_events` is the emitted truth.

### 06.4 Worked, buildable examples

All thresholds below are **default pack config**, guideline-cited and versioned; a pack overrides via `params`. Times are patient-local. Every example emits a `protocol_events` row with `actor:'system'`, `source_fact_ids` = the observations that tripped it, and (where noted) a `navigator_tasks` row.

All `inputs` below key on the **canonical `ObservationType` enum** (spine §2/§4; the single member set the device rail §04 produces and this engine consumes): `bp_systolic`, `bp_diastolic`, `glucose_cgm`, `glucose_tir_daily`, `weight_daily`, `pharmacy_fill_claim`. No section may spell these differently (§01.7 hypertension and §04.3a normalize to the same members).

**A. Nocturnal hyperglycemia pattern** — `kind: threshold` + `composite` (glucose pack)
```
inputs: [glucose_cgm]                    // raw CGM stream (see §06.4a input-source rule)
window: { length: 14d, align: trailing, minObservations: 10 nights }
params: {
  nightStart: '00:00', nightEnd: '06:00',
  highMgDl: 180,                     // ADA above-range threshold
  nightsFraction: 0.5,               // ≥50% of nights in window
  minNightReadings: 6                // per night, to count the night
}
fires when: for ≥50% of qualifying nights, median 00:00–06:00 glucose > 180 mg/dL
emits: insight.glucose.nocturnal_hyperglycemia   (disposition: detect_pattern)
emitState: signal_collected
refractory: 14d
navigator: none by default (educational); pack may set positive_screen_followup
```
Bright line: emits a *pattern* ("overnight readings above range"), not a cause or a dose change. Sandy explains and suggests discussing with the care team.

**B. Time-in-range decay** — `kind: drift_window` (glucose pack)
```
inputs: [glucose_tir_daily]              // daily % TIR summary Observation (70–180 mg/dL)
window: { length: 28d, align: trailing, minObservations: 20 days }
params: { baselineDays: 28, priorBaselineDays: 28, dropPct: 15 }
fires when: mean TIR over trailing 28d is ≥15 percentage-points below the prior 28d baseline
emits: insight.glucose.time_in_range_decay        (detect_pattern)
emitState: signal_collected ; refractory: 21d
severityBands: [{drop 15–24 → soon}, {drop ≥25 → soon}]  // never urgent (non-critical trend)
```

**C. BP morning surge / uncontrolled BP** — two rules (BP pack)
```
Rule C1  bp_uncontrolled_v1  (threshold)
  inputs: [bp_systolic, bp_diastolic]
  window: { length: 7d, trailing, minObservations: 6 }
  params: { systolic: 140, diastolic: 90, exceedFraction: 0.5 }  // JNC/ACC home-BP
  fires: ≥50% of home readings in 7d ≥140/90
  emits: insight.bp.uncontrolled  (detect_pattern) ; emitState: signal_collected
  navigatorReason: (none) — educational unless composite below
  severityBands: [{≥140/90 → soon}, {any ≥180/120 → urgent  ⇒ hypertensive-range flag}]

Rule C2  bp_morning_surge_v1  (composite)
  inputs: [bp_systolic]
  subsignals:
    amHigh:  median 06:00–10:00 systolic − median 18:00–22:00 systolic ≥ 20 mmHg
    amAbove: median 06:00–10:00 systolic ≥ 135
  window: { length: 14d, trailing, minObservations: 8 morning + 8 evening }
  fires when amHigh AND amAbove
  emits: insight.bp.morning_surge  (detect_pattern) ; refractory: 14d
```
`insight.bp.uncontrolled` (C1) is a **real detector registered in the spine §4b canonical set via §7** alongside `insight.bp.morning_surge` and `insight.bp.variability_trend` — it is emitted here and consumed by §01.7 (hypertension pack) and §08.6.2 (alert wiring); it also carries the `.retracted` counterpart and the severity bands above, so it must be a first-class registered event, not an unregistered synonym.

The **≥180/120** band is a *pattern/severity* flag routed to a navigator (`red_flag_symptom`→`urgent`, spine §4d), **not** an autonomous triage or a "call 911" instruction from the engine. Crisis routing is the pack's escalation map (spine §1 part 6), still human-owned.

**D. Refill gap / claims-PDC non-adherence** — `kind: adherence` + `event_window` (med-adherence pack)

Both D1 and D2 read the **claims floor** (`pharmacy_fill_claim`) — the equity-floor signal every patient has, no bottle required. Per §04.6c, the claims-derived signals emit `insight.med.refill_gap` (floor); the bottle-open enhancement signal (device rail, cap-sensor bottles) is what emits `insight.med.missed_dose_pattern`. This engine's claims rules therefore **never** emit `missed_dose_pattern` — that event is reserved for the bottle-derived detector so the floor-vs-enhancement provenance stays legible.
```
Rule D1  refill_gap_v2  (event_window)
  inputs: [pharmacy_fill_claim]
  params: { graceDays: 7 }
  fires when: days since (last_fill_date + days_supply) > graceDays  (patient is out of medication)
  emits: insight.med.refill_gap  (remind) ; emitState: signal_collected
  navigatorReason: (pack) outreach_followup ; refractory: 14d
  distinctFrom D2: an acute out-of-med event, not the windowed PDC ratio

Rule D2  pdc_nonadherence_v2  (adherence)
  inputs: [pharmacy_fill_claim]
  window: { length: 180d, calendar, minObservations: 2 fills }
  params: { pdcThreshold: 0.80 }        // HEDIS PDC standard
  PDC = (days covered by fills in window, capped at 1/day, no double-count overlaps)
        ÷ (days in treatment period within window)
  fires when: PDC < 0.80
  emits: insight.med.refill_gap  (detect_pattern)  // claims floor → refill_gap, NOT missed_dose_pattern (§04.6c)
         carries params.signal='pdc_nonadherence' so consumers distinguish the windowed-PDC fire
         from the acute out-of-med D1 fire on the same event type
  emitState: signal_collected
  measureIds: ['pdc_diabetes']          // 1:1 HEDIS (spine §1)
  severityBands: [{0.70–0.79 → routine}, {<0.70 → soon}]
```
PDC math is the exact HEDIS proportion-of-days-covered formula so the same number feeds `outcomeMetrics` (spine §1 part 8) — one computation, both an insight and a reported measure. **Floor-vs-enhancement seam:** the claims lane (D1/D2) owns `insight.med.refill_gap`; only the bottle-open enhancement lane in §04 owns `insight.med.missed_dose_pattern`. A consumer that needs to know *which* adherence signal fired reads `params.signal`, not two different event names for the same claims computation.

**E. Weight trajectory (CHF-ready)** — `kind: threshold` (rapid) + `drift_window` (gradual) (weight/CHF pack)
```
Rule E1  weight_rapid_gain_v1  (threshold, rolling)
  inputs: [weight_daily]
  params: { gainLb1d: 3, gainLb1w: 5 }   // classic CHF fluid-retention thresholds
  fires when: +3 lb in 24h OR +5 lb in 7d
  emits: insight.weight.trajectory_up  (suggest_discussion) ; emitState: navigator_review
  navigatorReason: (pack) positive_screen_followup ; priority: soon ; refractory: 3d

Rule E2  weight_trend_up_v1  (drift_window)
  inputs: [weight_daily]
  window: { length: 30d, trailing, minObservations: 20 }
  params: { slopeLbPerWeek: 1.5 }
  fires when: linear-fit slope ≥ 1.5 lb/week
  emits: insight.weight.trajectory_up  (detect_pattern) ; refractory: 14d
```
Weight rules are authored **CHF-ready** but ship enabled per pack — the engine is generic, the pack decides participation (spine §0.4).

**F. Post-discharge follow-up window** — `kind: event_window` (transitional-care pack)
```
inputs: [adt_discharge]                  // ADT event → source_fact
params: { followupDueDays: 7, followupOverdueDays: 14 }
closingEvents: [appointment_confirmed, result_imported for TCM visit]
fires (due)     when: 7d elapsed since discharge with no closing event
                → emits insight.transition.discharge_followup_due  (organize_work)
                  emitState: identified
                  navigatorReason: discharge_followup_due
fires (overdue) when: 14d elapsed, still open
                → emits insight.transition.discharge_followup_overdue  (organize_work)
                  emitState: identified ; severity soon
                  navigatorReason: outreach_followup
measureIds: ['transitional_care']
refractory: 7d
```
**Reconciliation with §05 and §10.** `emitState` is **`identified`**, not `action_matched` — a discharge that only *opens* follow-up work has not yet matched a TCM site or plan, so it enters at `identified` exactly as §05.2's ADT wiring opens the transitional-care instance (the two sections now fold to the same state). `discharge_followup_due` is the correct **`NavigatorQueueReason`** for the just-opened instance (registered by §10.3), **not** `nonresponse` — no outreach has yet been sent, so the post-outreach no-answer reason does not apply. The **overdue** signal is a *distinct registered event* `insight.transition.discharge_followup_overdue` (spine §4b via §7, matching §05.2/§05.8), not a second severity band on the `due` event — this keeps a single design for the overdue signal across §05 and §06 and lets §08/§10 subscribe to the two states independently. `discharge_followup_due` and `discharge_followup_overdue` join the spine §4b `insight.transition.*` family.

### 06.4a Rule input source — raw stream vs. daily-summary Observation

Each rule declares, per input, whether it reads the **raw high-frequency stream** or the **daily-summary FHIR Observation** — this is fixed in `inputs`, not decided at runtime, so the contract an implementer keys on is unambiguous (resolves §06.8 Q2 and the §03.3/§11.9 tension):

- **Raw stream** (partitioned Timescale, spine §5 — the record keeps summaries, the engine reads the stream for rules that need sub-daily points): time-of-day / per-night threshold rules. **A (nocturnal hyperglycemia)** needs per-night 00:00–06:00 points, so `glucose_cgm` reads the raw stream.
- **Daily summary** (FHIR Observation): drift/trend rules over aggregated metrics. **B (time-in-range decay)** reads `glucose_tir_daily`, a daily % summary Observation, never the raw points.

Naming: the engine consumes the raw-stream store owned by §03 (the declared owner of the raw-stream schema, spine §5). The engine keys on §03's canonical stream table and its `ObservationType`-carrying row shape; it introduces no competing stream table or type name of its own. Where §04's device rail exposes an adapter-output shape, the engine consumes the **normalized `source_facts`/Observation** projection, not the adapter's pre-normalization struct — so the `DeviceReading` row-type owned by §03 is what the engine reads, and §04's adapter-output type (distinct name, §04) never reaches the evaluators.

### 06.5 Event vocabulary emitted & consumed

**Emitted** (all `protocol_events` with `type` starting `insight.`, spine §4b; actor `system`; each also has a `.retracted` counterpart per §06.3):

| Insight event (`InsightEventType`) | From rule | Drives state | Navigator reason (if any) |
|---|---|---|---|
| `insight.glucose.nocturnal_hyperglycemia` | A | `signal_collected` | — |
| `insight.glucose.time_in_range_decay` | B | `signal_collected` | positive_screen_followup |
| `insight.bp.uncontrolled` | C1 | `signal_collected` | — (urgent band → red_flag_symptom) |
| `insight.bp.morning_surge` | C2 | `signal_collected` | — |
| `insight.bp.variability_trend` | (BP drift variant) | `signal_collected` | — |
| `insight.med.refill_gap` | D1 (acute out-of-med) + D2 (claims PDC<0.80; `params.signal='pdc_nonadherence'`) | `signal_collected` | outreach_followup |
| `insight.weight.trajectory_up` | E1/E2 | `navigator_review`/`signal_collected` | positive_screen_followup |
| `insight.transition.discharge_followup_due` | F (due) | `identified` | discharge_followup_due |
| `insight.transition.discharge_followup_overdue` | F (overdue) | `identified` | outreach_followup |
| `insight.screening.interval_due` | schedule_interval | `identified`→re-arm | — |

`insight.med.missed_dose_pattern` is **not** emitted by this engine — it is reserved for the bottle-open enhancement detector in §04 (§04.6c floor-vs-enhancement split). The claims lane here emits only `insight.med.refill_gap`.

These names are the platform-brief §5B canonical set (spine §4b) — authors of other sections MUST key on these exact strings. **Alignment:** the `emitState` values are generalized `ProtocolState` (spine §3), which the §02 protocol-machine section folds; the `navigatorReason` values are the spine §4d `NavigatorQueueReason` set that §10 (navigator console) consumes. `positive_screen_followup` and `outreach_followup` are spine §4d additions already registered.

**Consumed** (inputs the engine reads — it never mutates these):
- `source_facts` rows with `source_kind ∈ {device, hie, claims}` — the observation/claim seam (spine §5). Canonical `ObservationType`s referenced (spine §2/§4, the single member set §04 produces): `bp_systolic`, `bp_diastolic`, `glucose_cgm`, `glucose_tir_daily`, `weight_daily`, `pharmacy_fill_claim`, and `AdtEventType: adt_discharge`. These are byte-identical to §04.3a's normalization output and §01.7's bindings — no per-section spelling.
- `protocol_events` of type `result_imported`, `appointment_confirmed`, `care_gap_imported` — used as index/closing events for `event_window` and `schedule_interval` rules.
- Schedule ticks (system cron) — no event consumed, elapsed-time re-evaluation only.

**The model boundary (why §06.1 holds end-to-end):** the engine emits `insight.bp.morning_surge`; Sandy (`summarize_for_navigator` / patient explanation via the gateway, spine §6.4) **reads** that event and renders "Your blood pressure has been running higher in the mornings — worth mentioning to your care team." Sandy cannot emit the event, cannot change its state, and cannot invent a pattern the engine did not fire. Model output is explanation of an already-decided fact.

### 06.6 Governance, backtesting, drift alarms, pack contribution

**Authoring & governance.**
- A rule change is a **versioned artifact**. Editing any `params`, `window`, or `emits` requires a `ruleVersion` bump; the old version stays effective-dated for replay (§06.3). Rules are code-reviewed like schema, with mandatory `citations` (guideline source: ADA/JNC/ACC/HEDIS/CMS TCM). A rule with `disposition ∉ {educate,remind,detect_pattern,suggest_discussion,organize_work}` fails CI — the diagnose/dose/triage lane cannot be authored.
- **Change-control gate:** a new or bumped rule cannot go `active:true` in production until its `insight_backtests` row has `verdict:'pass'` (below) and a clinical reviewer sign-off is recorded in `audit_events` (`action:'insight_rule_approved'`).
- **Threshold changes are clinical-safety changes — full re-gate, no light channel.** Any change to a parameter that drives a state transition, a crisis/severity band (e.g. the ≥180/120 BP band, the glucose high cutoff, the PDC floor), or a navigator escalation requires a full versioned re-gate: `ruleVersion` bump + backtest `verdict:'pass'` + red-team re-run + clinical sign-off. There is **no lighter tuning channel** for these numbers — a threshold change *is* a clinical decision. If a pack wants a faster tuning channel, it is confined to **non-clinical display params only** (copy, ordering, cosmetic labels) that never alter what fires, what state results, or what a navigator sees as severity. A pack-level `safetyRecall` escape hatch (if one exists to force-migrate content) MUST still trigger a mandatory red-team re-run before the recalled version can drive state.

**Backtesting against historical data.**
- Each rule ships with a **frozen historical corpus** (`corpus_id`) of de-identified observation streams with adjudicated labels. `runBacktest(rule, corpus)` replays the deterministic evaluator over the corpus using the injected clock and reports `fired_count`, `precision_est`, `recall_est`, and `override_rate` (fraction of fires a navigator later marked spurious in an analogous live cohort).
- **Pass thresholds (default, pack-overridable):** `precision_est ≥ 0.85` for any rule that creates navigator work; `precision_est ≥ 0.75` for purely educational (`detect_pattern`/`educate`) rules; recall reported but advisory. Below threshold → `verdict:'fail'`, rule stays inactive. Backtests re-run in CI on every rule edit and nightly against the growing corpus.

**Drift alarms (correction-rate spike).**
- Live monitor per `(ruleId, ruleVersion)`: rolling 14-day **override/retraction rate** = (navigator-flagged-spurious + auto-retracted fires) ÷ total fires. If it exceeds `max(2×backtest_override_rate, 0.15)`, the engine raises an operational drift alarm (`audit action:'insight_drift_alarm'`, `outcome:'blocked'` for auto-suspend, else `'allowed'`) and pages rule ownership.
- **Auto-suspend policy:** an educational rule whose correction rate crosses the alarm keeps firing but is flagged for review; a rule that **creates navigator work or drives state** is auto-suspended (`active:false`) pending re-backtest, because a mis-firing state-driver corrupts the queue. Suspension is itself an audited, reversible event. This directly answers the platform-brief requirement to alarm "when correction rates spike."

**How each Protocol Pack contributes its insight rules.**
- A pack declares its detectors in `ProtocolPack.insightRules: InsightRuleRef[]` (spine §1 part 4) — references into `insight_rules` by `(ruleId, ruleVersion)`. Shipping a pack registers/activates exactly those rule versions; **zero new rail code** (the P6 platform test, spine §1) — a pack that needs a *new evaluator kind* is a rail bug, fixed once in §06.2's six kinds, never per-pack.
- Packs share rules by reference (e.g. a diabetes pack and a CHF pack both cite `weight_rapid_gain_v1`); each pack's escalation map (spine §1 part 6) decides whether that rule's fire routes to a navigator for *that* cohort. The rule is generic; participation and routing are pack config.
- A pack's `redTeamSuiteId` (spine §1 part 9) MUST include adversarial cases for its insight rules (choppy signals, unit-confusion mg/dL vs mmol/L, backfill retractions, timezone/DST boundary readings) as a launch gate.

### 06.7 Acceptance criteria

1. **No-LLM invariant:** CI proves `server/insight/**` imports no model client; a runtime assertion refuses to load a rule with a diagnose/dose/triage disposition. Attempting either fails the build.
2. **Determinism/replay:** replaying any `protocol_instance`'s facts through the engine with the injected clock reproduces byte-identical `insight_evaluations` and emitted `protocol_events` (idempotency keys match; no duplicate emissions).
3. **Provenance:** every emitted `insight.*` event has non-empty `source_fact_ids` tracing to the exact observations/claims that tripped the rule; "why this fired" is reconstructable from `(ruleId, ruleVersion, input_fact_ids)` with no other state.
4. **Insufficient-data safety:** a rule below `minObservations` emits nothing and logs `insight_insufficient_data` — never a low-confidence guess.
5. **Backfill/retraction:** a late or corrected fact re-evaluates all window-covering rules; a no-longer-holding prior fire emits a `.retracted` event (never a delete), and the state fold respects monotonic + terminal guards (spine §3).
6. **Idempotency:** re-running an identical evaluation is a no-op (unique idempotency key); no duplicate navigator tasks or events.
7. **Worked examples reproduce:** each §06.4 rule, given its documented input, fires with the stated `emits`/`emitState`/severity, and given sub-threshold input does not fire.
8. **Governance gate:** a rule cannot reach `active:true` without a passing `insight_backtests` row and an audited clinical approval; the drift monitor auto-suspends a mis-firing state-driving rule.
9. **Vocabulary alignment:** every emitted type is in the spine §4b `insight.*` set (including the `.retracted` family and the `insight.transition.discharge_followup_overdue` addition); every `inputs` member is in the canonical `ObservationType` enum (`bp_systolic`/`bp_diastolic`/`glucose_cgm`/`glucose_tir_daily`/`weight_daily`/`pharmacy_fill_claim`); every `emitState` is a valid `ProtocolState`; every `navigatorReason` is a valid `NavigatorQueueReason`. No synonyms introduced. The claims lane never emits `insight.med.missed_dose_pattern` (reserved for §04's bottle detector).
10. **Pack-only extension:** adding a new pack's detectors requires only new `insight_rules` rows + a manifest reference, no changes to the six evaluators or the engine shell.
11. **Version-scoped idempotency:** the idempotency key includes `packVersion` and `ruleVersion`; a post-bump re-import over identical facts does NOT dedupe against pre-bump events (no silently-missed care gap), and a pre-bump re-import still dedupes against its own prior fire.
12. **Retraction reconciliation:** a `.retracted` event whose original fire created an open navigator task flags that task `possibly_spurious` and de-escalates it (never silent-closes); a retracted educational insight the patient saw emits the typed retraction for the §07/§08 patient un-say contract. No retracted pattern leaves a live urgent task or a standing "discuss with your care team" instruction.
13. **Threshold re-gate:** changing any parameter that drives state, a crisis/severity band, or a navigator escalation requires a full versioned re-gate (backtest pass + red-team + clinical sign-off); no light tuning channel can alter such a parameter.

### 06.8 Open questions

1. **Baseline cold-start:** patient-relative rules (nocturnal high, TIR decay) need ~28 days of history. Do we suppress patient-baselined rules until baseline maturity, or fall back to population thresholds with a `provisional` flag on the event? (Leaning: population fallback + `provisional`, hidden from navigator queue until mature.)
2. **CGM summary vs. stream boundary:** *Resolved* in §06.4a — the source is fixed per input in `inputs` (raw Timescale stream for time-of-day/per-night threshold rules; daily-summary FHIR Observation for drift/trend rules), not chosen at runtime. Remaining sub-question: the exact latency budget for the real-time stream path (§11.9) at pilot CGM volume.
3. **Retraction UX contract:** *Contract defined* in §06.3 (retraction → navigator_task flags `possibly_spurious` + de-escalates, never silent-close; retraction → typed patient-notification event for §07/§08 to un-say). Remaining open: the exact patient-facing copy pattern for gracefully un-saying a non-diagnostic educational pattern (owned by §08, engine only emits the typed retraction).
4. **Composite rule expressiveness:** are boolean + time-windowed sub-signals sufficient, or do CHF/multi-morbidity composites need a small deterministic DSL (sequence/within-N-days operators)? A DSL raises authoring power but also review burden — resolve before the second composite-heavy pack.
5. **Override-rate attribution for shared rules:** when one rule is referenced by multiple packs, is the drift alarm computed globally or per-pack cohort? A rule healthy in diabetes may over-fire in CHF; per-`(ruleId, packId)` monitoring is safer but multiplies the corpus/backtest burden.
6. **Unit governance:** mg/dL vs mmol/L, lb vs kg, mmHg — where is unit normalization enforced (FHIR ingestion vs. engine)? Proposal: normalize at the `source_facts` seam so evaluators only ever see canonical units, and red-team the boundary.


---

## 07. Conversational AI — Sandy (Voice + Reasoning + Grounding)

Sandy is the platform's conversational surface. This section specifies the two model lanes (live voice, async reasoning), the grounded RAG-plus-tools chat agent over the FHIR record, the approved-content retrieval scope for generic (non-PHI) education, the tool gateway contract, grounding/citation mechanics, model-routing and vendor-failover/compliance policy, and the per-turn safety classification stack. It conforms to the canonical spine: Sandy is the `sandy` `ProtocolActor` (spine §3), tools are the locked `ToolName` gateway verbs (spine §6.4), every plan-driving output cites `source_fact_ids` (spine §0.2, §6.7), and **models never mutate protocol state** — they call gated tools that emit `protocol_events` (spine §0.1).

**The governing law of this section:** deterministic rules decide; models explain, personalize, and converse; humans own exceptions. Sandy proposes; the gateway decides. Any model output that cannot be traced to a tool call or a retrieved `source_fact` is not allowed to become truth.

Prototype grounding: `server/actions.ts` (`startVoiceSession`, `recordVoiceReply`) is the reference tool-gated turn loop; `src/lib/safety.ts` (`screenPatientMessage`, `isAutonomousActionAllowed`, `SafetyAction`) is the reference classifier and autonomy boundary; `src/lib/ai-script.ts` (`resolveAnswer`, `FALLBACK`) is the approved-answer tier that production generalizes into retrieval + templated generation. The prototype's simulated (scripted, no model call) Sandy is what this section makes real.

---

### 07.1 Two lanes

| | **Live voice lane** | **Async reasoning lane** |
|---|---|---|
| Vendor / model | OpenAI Realtime (speech-to-speech) | Anthropic Claude Sonnet (analysis/generation) + Haiku (high-volume classification) |
| Trigger | Patient opens voice on the phone app | Background job, navigator console action, or post-turn hook |
| Latency budget | < 800 ms first audio token; conversational | Seconds to tens of seconds; not user-blocking on audio |
| Capabilities | Protocol tools only (spine §6.4 subset the pack authorizes) | No protocol-state mutation; produces drafts/summaries for human or templated surfaces |
| Outputs | `voice_sessions`, `transcript_segments`, `tool_calls`, `protocol_events` | `navigator_tasks.summary`, visit-prep docs, message drafts, `insight` explanations, classifier labels |
| PHI to model | Minimal system context + tool results (no raw FHIR dump) | Retrieved knowledge-bundle slice only |
| Both require | BAA + zero-retention (07.5); per-action model/version logged to `audit_events` | same |

**07.1a Live voice — session lifecycle.** Sessions are **backend-created**; the client never holds an OpenAI key. Flow:

```
POST /api/voice/:patientId/start
  → gateway: check open red flag (server/actions.ts hasOpenRedFlag) — if open, BLOCK: emit audit(blocked), return red_flag_lock copy, no session
  → gateway: load pack.conversationTools, patient knowledge bundle handle, consent scope
  → mint ephemeral OpenAI Realtime session (server-side), inject: system prompt + tool schemas (pack-authorized only) + safety-identifier
  → create voice_sessions row (voice_ prefix), return SDP/WebRTC answer + ephemeral client_secret (short-TTL)
  → emit protocol_event sandy_explained_gap (actor: sandy)  ← mirrors startVoiceSession
```

The Realtime model is configured with **only** the pack's `conversationTools`. It cannot call a tool outside that set — the schema is not present in the session. Audio in/out streams over WebRTC; the transcription of each utterance is persisted to `transcript_segments` (linked to `voice_sessions.id`), and every model tool invocation to `tool_calls`.

```ts
interface VoiceSession {            // table: voice_sessions
  id: string                        // voice_...
  patientId: string
  protocolInstanceId: string
  packId: PackId
  channel: 'voice'
  realtimeModelId: string           // logged, e.g. 'gpt-realtime-2026-xx'
  safetyIdentifier: string          // 07.5 privacy-preserving id, NOT patientId
  status: 'active' | 'ended' | 'blocked_red_flag'
  startedAt: string
  endedAt?: string
}
interface TranscriptSegment {       // table: transcript_segments
  id: string
  voiceSessionId: string
  speaker: 'patient' | 'sandy'
  text: string
  createdAt: string
  safety: 'normal' | 'fallback' | 'red_flag'   // matches prototype VoiceTurn.safety
  classifierLabels: SpeechActLabel[]            // 07.6, attached post-turn
}
```

`transcript_segments` supersedes the prototype `voice_turns` (the migration: `VoiceTurn` → `TranscriptSegment`, `mode` dropped since the lane is inherent to the session). Both text (typed) and voice reach the same turn loop; a text turn is a `voice_sessions` row with `channel` re-tagged only for accounting.

**07.1b Async reasoning — job types.** Each is a pure `(bundle_slice, template) → text` call; none writes protocol state directly. Output lands in a human-reviewed field or a templated patient surface.

| Job | Model | Input | Output field | Human gate |
|---|---|---|---|---|
| Navigator conversation summary | Sonnet | transcript_segments + cited source_facts for the instance | `navigator_tasks.summary` | Navigator reads before acting |
| Insight explanation | Sonnet | the fired `insight.*` event + its source_facts | patient-facing card copy (templated slot) | Deterministic rule already decided; model only phrases |
| Visit prep | Sonnet | recent insights + care plan + confirmed facts | visit-prep doc (patient + navigator) | Patient-facing; provenance strip attached |
| Message drafting (SMS deep-link copy) | Sonnet | outreach context (no clinical detail in SMS body) | `outreach_attempts` draft copy | Navigator/scheduler approves send |
| Intent routing / speech-act tag | Haiku | one turn | `SpeechActLabel` | none (advisory to gateway) |
| SDOH signal tagging | Haiku | barrier free-text | candidate `BarrierType` + `zCode` | Assistive-only; navigator confirms (spine §4c) |
| Message triage | Haiku | inbound patient message | route bucket | Feeds gateway, not truth |

Acceptance: **no async job may emit a `protocol_event` or write to `care_gaps`/`results`/`referrals`.** It may only produce text into a review field or propose a tool call that the gateway independently re-validates.

---

### 07.2 Grounded chat agent — RAG + gated tools over the FHIR record

Sandy is **not fine-tuned on PHI** (unauditable, unupdatable, non-deletable — spine §5 export/deletion requirement forbids it). It is retrieval-augmented generation constrained to the patient's **knowledge bundle**, plus the gated tool catalog.

**07.2a Knowledge bundle = retrieval scope.** The bundle is the *only* PHI Sandy may ground on for a given patient. It is assembled server-side per turn from `source_facts` (the seam, spine §5) — never by reading FHIR directly.

```ts
interface KnowledgeBundle {
  patientId: string
  builtAt: string
  scopeVersion: string              // recomputed when consents/facts change
  facts: KnowledgeBundleFact[]      // the retrievable, citable units
  activePackIds: PackId[]
  suppressedCategories: string[]    // part2_sud, adolescent — excluded (spine §5, brief §6)
}
interface KnowledgeBundleFact {
  sourceFactId: string              // fact_...  — the citation handle
  label: string                     // e.g. "Last A1C", "Last eye screening date"
  value: string
  sourceKind: SourceKind
  sourceName: string
  effectiveDate: string
  confidence: SourceConfidence
  patientConfirmed: boolean         // 07.4 gate
  fhirRef?: string                  // Observation/... — traceability, not read at answer time
}
```

Bundle assembly rules:
1. Include a `source_fact` only if its `consents` scope is `active` and its category is not in `suppressedCategories`. **Part 2 SUD and adolescent-confidential facts are default-suppressed** regardless of store (spine §5).
2. Attach the confirmation state (`patientConfirmed`) and `confidence` to every fact — the model sees these and must respect 07.4.
3. Bundle is re-derived whenever a fact is confirmed, overridden, or a consent changes (`scopeVersion` bumps). No caching a stale bundle across a consent revocation.

**07.2b Every answer cites provenance.** A grounded answer returns the `sourceFactId`s it used; the phone app renders them through the existing **provenance strip** (`src/components/phone/ProvenanceStrip.tsx`). A clinical-adjacent claim with an empty citation set is a **hard failure** — the gateway drops it and substitutes fallback (07.6d). This is spine §6.7 ("why this fired") applied to conversation.

```ts
interface GroundedAnswer {
  text: string
  citedSourceFactIds: string[]      // rendered by ProvenanceStrip; empty ⇒ blocked for clinical-adjacent claims
  onBundle: boolean                 // false ⇒ fallback path
  toolCalls: ToolCallRecord[]       // any tools invoked to compose the answer
}
```

**07.2c Off-bundle handling.** If the question cannot be answered from the bundle (fact absent, or requires clinical judgment), Sandy does **not** improvise from parametric knowledge. It returns the fallback and offers a navigator — this generalizes prototype `FALLBACK` ("I can't answer that one directly — but your care team can. Want me to send this to a navigator?") and `resolveAnswer`'s miss branch. Accepting the offer calls `create_navigator_task` (07.3).

**07.2d Approved-content retrieval scope (generic, non-PHI education).** A generic education question that is **not patient-specific** — "what is metformin for", "what does an A1C measure", "why does blood pressure matter" — is answerable, but **never** from parametric model knowledge and **never** from the patient's `KnowledgeBundle` (which is PHI). It is answered from a separate, owned **approved-content corpus** (this resolves 07.8 Q5 and builds brief AI-capability-A "medication education grounded in RxNorm/approved monographs"). This is the retrieval scope for generic education; the `KnowledgeBundle` remains the *only* PHI scope.

```ts
interface ApprovedContentScope {
  corpusVersion: string             // versioned in lockstep with content-registry review cadence (01.3)
  languages: string[]               // BCP-47; every shipped language authored + clinically/linguistically validated
}
interface ApprovedContentUnit {
  contentId: string                 // ac_...  — the citation handle (NOT a source_fact)
  topic: string                     // e.g. "metformin", "a1c", "hypertension_basics"
  rxNormRef?: string                // for medication monographs
  moduleRef?: string                // links approved education module (pack part 2)
  text: string                      // approved plain-language body, reading-level-locked
  language: string
}
```

Rules that keep this distinct from and as safe as the PHI path:
1. **Ownership.** The **content registry (01.3)** owns the approved-content assets, their review cadence, reading-level lock, and per-language validation; §07 owns only the *retrieval seam* into them. The corpus is versioned; a bump re-gates like any pack content.
2. **Separate citation namespace.** An approved-content answer cites `contentId`s (`ac_…`), **never** `source_fact_ids`. The provenance strip renders "from approved education content," visibly distinct from a patient-record citation, so the patient can tell general education from their own facts.
3. **No patient-specific claims.** Approved-content answers may not reference any patient value ("*your* A1C", a date, a result). The moment an answer would name a patient-specific quantity it must instead come from the bundle (07.4) or fall off-bundle (07.2c). `verifyGrounding` (07.4) still runs: an approved-content answer that smuggles a clinical-adjacent *patient* claim with no `source_fact` citation is blocked exactly as any other uncited clinical claim.
4. **Same bright lines.** Approved content educates only — it carries no dosing directive, no diagnosis, no danger-reassurance (07.6b); the copy is disclosure/dose-linted per language before it ever enters the corpus (parity with 09.1.3 copy-lint).
5. **Grounded, not parametric.** If a generic question has no matching approved-content unit, Sandy falls to the navigator offer (07.2c) — it does **not** answer from training data.

---

### 07.3 Tool gateway contract

**Sandy proposes; the gateway decides.** The model emits a tool-call proposal; the gateway independently validates input, checks pack permission, applies the deterministic rule, writes the event, and returns typed output. The model never sees protocol tables and never writes them. This is the production form of `server/actions.ts`, where every path ends in an emitted `protocol_event` + `appendAuditEvent`.

**07.3a Per-call pipeline (every tool):**

```
1. validate      — input against the tool's JSON schema; reject malformed
2. authorize     — toolName ∈ pack.conversationTools? consent scope covers it? red-flag lock clear?
3. decide        — run the deterministic rule (reducer nextProtocolStatus, guards shouldTransition)
4. emit          — append protocol_event (envelope, spine §3); update derived caches
5. audit         — append audit_events row with model_id + model_version + outcome(allowed|blocked|failed)
6. return        — typed ToolResult (never free text the model can launder into a claim)
```

If step 2 fails → `audit(blocked)`, return a typed refusal; the model must narrate the refusal, not route around it (mirrors the red-flag `blocked` audit in `startVoiceSession`).

```ts
interface ToolCallRecord {          // table: tool_calls
  id: string
  voiceSessionId?: string
  patientId: string
  protocolInstanceId: string
  packId: PackId
  toolName: ToolName
  input: unknown                    // validated
  decision: 'allowed' | 'blocked' | 'failed'
  emittedEventId?: string           // proto_... when allowed
  modelId: string
  modelVersion: string
  createdAt: string
}
interface ToolResult {
  ok: boolean
  emittedEvent?: ProtocolEventEnvelope
  data?: unknown                    // typed, e.g. ranked sites
  refusalReason?: 'not_authorized_for_pack' | 'consent_missing' | 'red_flag_lock' | 'validation_failed' | 'off_protocol'
}
```

**07.3b Tool catalog (pack-parameterized).** Locked names from spine §6.4; each carries the pack context so retinopathy's specced tools generalize to any pack with **zero rail change** (the P6 platform test).

| Tool (`ToolName`) | Emits (`ProtocolEventType`) | Resulting `ProtocolState` | Gate |
|---|---|---|---|
| `get_patient_care_plan` | — (read) | — | consent scope; bundle-only |
| `explain_gap` | `sandy_explained_gap` | `engaged` | pack authorizes; not red-flag-locked |
| `record_question` | `question_answered` | `engaged` | must cite ≥1 fact if clinical-adjacent |
| `record_barrier` | `barrier_reported` | `signal_collected` | maps `BarrierType`→`NavigatorQueueReason` (`queueReasonForBarrier`) |
| `match_screening_sites` | `site_matched` | `action_matched` | deterministic ranker (`rankSites`), not the model |
| `confirm_plan` | `appointment_confirmed` | `scheduled` | patient confirmation captured |
| `record_already_completed` | `already_completed_claimed` | `navigator_review` | opens reconciliation queue item |
| `create_navigator_task` | (task, not lifecycle) | — | writes `navigator_tasks`, not a state change |
| `escalate_red_flag` | `red_flag_reported` | `navigator_review` | **deterministic classifier fires this, not model discretion** |
| `summarize_for_navigator` | — (async, Sonnet) | — | output to `navigator_tasks.summary`, human-read |
| `get_observations` | — (read) | — | bundle-only; keys on canonical `ObservationType` (spine §2 — e.g. `bp_systolic`, `glucose_cgm`, `glucose_tir_daily`, `weight_daily`, `pharmacy_fill_claim`); device **summaries** not raw stream (spine §5) |
| `administer_screening` | `screening_administered` | `completed` | instrument wording verbatim, scoring deterministic (07.6e) |

**07.3c Bright-line tools that do not exist.** There is **no** `diagnose`, `change_medication`, `recommend_dose`, `reassure`, or `triage` tool — the non-device CDS bright lines (spine §0.5) are enforced by *absence from the catalog*, not by prompt. The prototype `SafetyAction` denial set (`diagnose_symptom | change_medication | reassure_red_flag`, denied by `isAutonomousActionAllowed`) becomes "these actions have no tool to call."

---

### 07.4 Grounding / citation mechanics — verified-fact-store-first

**Rule: a confirmed fact is the source of truth, and the model may never re-derive a conflicting value.**

Fact lifecycle (spine §0.2):
```
imported (SourceKind hie|claims|device)   → confidence: probable|needs_review, patientConfirmed:false
patient confirms (question_answered path)  → patientConfirmed:true              [emits patient_confirmed_fact]
navigator overrides                        → navigator_overridden:true          [authoritative]
```

**Answering precedence (verified-fact-store-first):**
1. If a `KnowledgeBundleFact` exists for the asked-about quantity → the answer **must** use that value verbatim and cite its `sourceFactId`. The model is forbidden from computing, estimating, or "rounding" a different value.
2. If two facts conflict, the one with higher precedence wins: `navigator_overridden` > `patient_confirmed` + `confirmed` > `probable` > `needs_review`. Ties break to most recent `effectiveDate`.
3. If the fact is `patientConfirmed:false` and `confidence` is `needs_review`, Sandy may cite it but must hedge ("your records show … — is that right?") and offer confirmation; it may not treat it as settled truth for a plan-driving statement.
4. If no fact exists → off-bundle path (07.2c). The model may **not** fill the gap from training data.

**Enforcement — the verifier is DETERMINISTIC and is the sole block layer (no model in the block path).** `verifyGrounding` is the load-bearing mechanical guarantee behind AC-3/AC-4 and the "model may never re-derive a conflicting value" claim. It **MUST** be able to block an uncited clinical-adjacent claim or a store-contradicting value **without any model call**. Its two NLP primitives are specified as deterministic:

- `extractQuantitativeClaims(text, lang)` — a **regex + units grammar + lexicon** extractor: numbers, dates, ranges, and their subject term (labeled quantities like A1C, BP, TIR, "eye exam", "screening"), plus numeric normalization (unit canonicalization, rounding-tolerance band). It runs **per shipped language**; the lexicon and subject-alias table carry `en-US` **and** `es-US` (and every other language the pack ships) so a Spanish-language claim (`"su A1C es …"`, `"baje su dosis"`) is extracted, not silently passed. Language parity is a launch gate (AC-11).
- `containsClinicalAdjacentClaim(text, lang)` — a **lexicon/grammar** classifier (diagnosis terms, result-closure phrases like "came back normal", dose/units/imperative-verb grammar) in every shipped language. It is intentionally **over-inclusive** (favor false-block over false-pass); the false-negative budget is set against a maintained CI adversarial corpus (see below).

```ts
// runs on every GroundedAnswer before it reaches the patient — DETERMINISTIC, no model call
function verifyGrounding(a: GroundedAnswer, bundle: KnowledgeBundle, lang: string): 'pass' | 'block' {
  for (const claim of extractQuantitativeClaims(a.text, lang)) {     // numbers, dates, "your A1C is X" — per-language
    const fact = bundle.facts.find(f => f.label matches claim.subject)
    if (fact && normalize(claim.value) !== normalize(fact.value)) return 'block'  // contradicts store
    if (!fact && claim.isClinicalAdjacent) return 'block'                          // uncited clinical claim
  }
  if (a.citedSourceFactIds.length === 0 && containsClinicalAdjacentClaim(a.text, lang)) return 'block'
  return 'pass'
}
```

**Optional model judge may only ESCALATE-to-block, never gate.** A Haiku "grounding judge" MAY be added downstream to catch phrasings the deterministic verifier misses — but it may only **add** blocks (turn a `pass` into a `block`), never turn a deterministic `block` into a `pass`. The deterministic verifier is the primary gate; the model is a strictly-additive net. If the judge is degraded or down, the deterministic verifier alone still meets the false-negative budget.

**Verifier CI gate.** The verifier ships with its own maintained, versioned, content-owned **adversarial suite** (hallucinated values, store-contradicting values, uncited closure claims, Spanish dosing directives). A defined **false-negative budget** against that suite is a **hard P2 launch gate** (closes 07.8 Q2 — this is a decision, not an open question).

A `block` result substitutes the fallback and files an `audit_events` row (`action: grounding_violation_blocked`, `outcome: blocked`). This is the "model may never re-derive a conflicting value" guarantee made mechanical.

---

### 07.5 Model routing, logging, compliance

**07.5a Routing policy (deterministic, not model-chosen):**

| Signal | Lane / model |
|---|---|
| Live audio turn | OpenAI Realtime |
| Navigator summary, insight explanation, visit prep, message draft | Claude Sonnet |
| Speech-act / intent / SDOH classification, message triage (high-volume) | Claude Haiku |
| Deterministic detection (thresholds, red-flag regex, PDC math, screening intervals) | **No model** — rules only (spine §0.1, brief §2.5) |

Routing is a lookup on `(jobType, volumeClass)`, never a model call. Escalation Haiku→Sonnet is allowed for classification the pack marks `requires_reasoning`.

**07.5b Per-action model/version logging.** Every model-touched action writes `audit_events.model_id` + `audit_events.model_version` (spine §2). No model output enters the record without its provenance. `tool_calls` carries the same for tool-composed answers. This makes "which model said this, on which version" answerable for any patient-facing sentence.

**07.5c BAA + zero-retention (launch gate).** Before any real-PHI pilot: signed BAA **and** zero-retention / no-training terms with **both** OpenAI (voice lane) and Anthropic (reasoning lane) (brief §10.6). Zero-retention means vendors do not persist prompts/completions/audio beyond the request. Verified by contract + config; absence blocks the pilot.

**07.5d Privacy-preserving safety identifiers.** The stable id sent to model vendors for abuse/safety monitoring is a **`safetyIdentifier`** — an opaque, salted, per-patient hash — **never** `patientId`, name, MRN, or any bundle field. It lets a vendor correlate a session's safety signals without receiving an identity. Stored on `voice_sessions.safetyIdentifier`; rotation policy defined per program.

**07.5e Vendor-risk / model-vendor abstraction (no single-vendor single-point-of-failure).** The conversational surface hard-codes OpenAI (voice) and Anthropic (reasoning) today, so both lanes go behind a **`ModelVendor` abstraction** (a `FhirClient`-style seam) rather than direct vendor SDK calls scattered through the rails. This gives the platform four required behaviors:

1. **Failover / deprecation.** A vendor outage, a model version being retired mid-pilot, or a price change is a config change at the abstraction, not a rail rewrite. The `(jobType, volumeClass)` routing lookup (07.5a) resolves to a `ModelVendor` handle, so a second-source model can be swapped in per lane.
2. **Graceful degradation, never unsafe degradation.** If the **voice** vendor is unavailable, the live lane degrades to the **text turn loop** (same gateway, same tools, same classifiers) — voice→text, not voice→nothing, and never voice→ungated. If the **reasoning** vendor is unavailable, async explanation/summary jobs degrade to the **approved-answer / scripted tier** (`ai-script`, 07.2d templated slots) rather than blocking a patient-facing surface. Degradation **never** relaxes a safety control: the deterministic crisis floor (07.6a) and deterministic grounding verifier (07.4) run identically regardless of which vendor (or no vendor) is up.
3. **HIPAA-eligibility loss.** If a vendor loses HIPAA eligibility mid-pilot, its lane is **disabled at the abstraction** and traffic fails to the degraded tier above until a BAA-covered second source is wired — the pilot never runs a lane against a vendor without a live BAA + zero-retention (07.5c).
4. **Re-gate on any vendor/version bump.** Swapping a vendor or model version re-runs the pack red-team suite (spine §1 part 9, 09.5), same as any other safety-affecting change; the abstraction records `model_id`/`model_version` per action (07.5b) so the swap is auditable.

---

### 07.6 Speech-act / safety classifiers around every turn

Every turn — inbound and outbound — passes the classifier stack. This is the production generalization of `screenPatientMessage` (`red_flag | off_protocol | normal`) and the `explain vs advise` line.

**07.6a Inbound classifier (runs before Sandy responds):**
```ts
type SpeechActLabel =
  | 'red_flag'            // RED_FLAG_PATTERNS + pack.escalation.redFlagRuleIds — DETERMINISTIC
  | 'off_protocol'        // clinical advice / diagnosis / dosing request (OFF_PROTOCOL_PATTERNS)
  | 'barrier'             // transportation|cost|after_hours|... (barrierFromReply generalized)
  | 'education_request'   // in-scope Q&A
  | 'confirmation'        // patient confirming/denying a fact
  | 'crisis'              // suicidal ideation / self-harm → pack.escalation.crisisRoutes (988)
```
`red_flag` and `crisis` detection is **deterministic regex/rule, never model discretion** (brief §5D/§5F). A Haiku classifier runs *in parallel* as a second net for phrasing the regex misses, but a Haiku-only `red_flag`/`crisis` signal still routes to escalation — it can add, never suppress. The deterministic set and its parallel net are governed by four hard rules:

1. **Measured recall floor.** The deterministic `RED_FLAG_PATTERNS` / crisis set carries a **versioned, content-owned minimum recall** measured against a maintained **adversarial crisis corpus** (SI/self-harm/danger-sign phrasings, per shipped language). The floor is a launch gate; a corpus that drops below floor blocks the release. The regex set is the primary detector — recall is proven on regex **alone**, not on regex-plus-model.
2. **Model catch feeds the rules, never substitutes.** When Haiku is the **only** detector that fires a `red_flag`/`crisis`, the escalation **still hard-locks** (07.6c) **and** the turn emits an `audit_events` row (`action: crisis_model_net_only_hit`) plus a **rule-gap ticket** so the deterministic set is extended to cover the missed phrasing. The model catch is a backstop that *feeds* the deterministic set; it is never a permanent substitute for a regex/rule.
3. **Degraded-model fail-safe.** If the Haiku net is degraded or down, the system runs **regex-only** and **must still meet the recall floor** (that is why the floor is measured on the deterministic set alone). The degraded-model state is surfaced to ops (alert), and the classifier lane is never allowed to silently become "no net" — a down deterministic layer blocks live voice, not just a down model.
4. **Language parity.** The crisis/red-flag corpus and patterns exist in **every language the pack ships** (`en-US`, `es-US`, …), red-teamed per language — a Spanish SI phrasing must hit the deterministic floor, not rely on an English-only regex.

**07.6b The explain-vs-advise line.** The classifier splits every candidate Sandy utterance:
- **Explain / educate / organize / remind / detect-pattern / suggest-discussing-with-clinician** → allowed (maps to `SafetyAction` allow-set: `answer_education | collect_barrier | match_site | confirm_plan`).
- **Diagnose / dose / reassure-danger / autonomously-triage** → **blocked** (denied `SafetyAction` set). No tool exists for these (07.3c); an utterance drifting toward them is caught by the outbound classifier and replaced with fallback.

**07.6c Red-flag lock (multi-turn guardrail resilience).** Once `red_flag`/`crisis` fires, an open `red_flag_event` **locks routine coaching** until a human clears it — exactly `hasOpenRedFlag` gating `startVoiceSession`/`recordVoiceReply`. Under multi-turn pressure ("just tell me it's fine"), the lock holds: subsequent turns are preserved to the transcript but Sandy returns the lock copy and cannot be argued out of it. The lock is state, not persuasion — no prompt sequence unlocks it; only `navigator_reviewed` does.

**07.6d Typed fallback + visible transcript.** On any block (grounding violation, off-protocol, off-bundle, tool refusal), Sandy emits the typed fallback and **the full transcript stays visible** — nothing is silently dropped. The patient always sees the turn and the "send to navigator" offer. Fallback is a first-class outcome (`transcript_segments.safety = 'fallback'`), not an error.

**07.6e Instrument fidelity (screening packs).** For conversational screenings (PHQ-2/9, GAD-7, PRAPARE — brief §5D), instrument **wording is verbatim** and **scoring is deterministic** (`administer_screening` computes the score, not the model). A crisis item (e.g. PHQ-9 item 9) or a free-text crisis signal routes to `pack.escalation.crisisRoutes` (988 + human) **hard-coded, never model-discretionary**.

**07.6f Hand-off to navigator.** Any classifier terminal (`red_flag`, `crisis`, `off_protocol` repeated, off-bundle accepted) can call `create_navigator_task` / `escalate_red_flag`, producing a `navigator_tasks` row with `work_type`/`reason`/`priority` per spine §4d. Priority mapping is pack-agnostic: crisis/red-flag → `urgent`; abnormal/repeat/low-confidence → `soon`; else `routine`.

**07.6g Retraction of a pattern Sandy already explained (un-saying contract).** The insight engine emits an `insight.*.retracted` counterpart (spine §4b, per 06.3) when a backfilled/corrected fact invalidates a previously-fired pattern. When the retracted insight was **already explained to the patient by Sandy** (an `insight_explanation` async output or a voice turn that phrased it — e.g. "your morning BP runs high — discuss with your care team"), Sandy owns the patient-facing reconciliation:

- **Non-diagnostic un-saying only.** Sandy may issue a plain, non-alarming correction ("earlier I mentioned a morning blood-pressure pattern — a records update means that isn't showing anymore; nothing you need to do") drawn from an **approved templated slot** (like `ai-script`), never a free-form model apology. It never re-diagnoses or reassures about danger (07.6b bright line).
- **Retraction cannot un-escalate a human-owned state.** Per 06.3, a `.retracted` event cannot reverse a `navigator_review`/terminal state or silently close the `navigator_task` the original insight created — that task is flagged **possibly-spurious** for the navigator, never auto-closed. Sandy's patient notification is decoupled from and never gates that navigator reconciliation.
- **A retraction never fires from a crisis/red-flag path.** Crisis and red-flag events are human-cleared only (07.6c); a retraction may only un-say a **non-crisis, non-diagnostic** pattern.
- Every un-saying turn is a normal visible `transcript_segments` row and writes `audit_events` (`action: insight_retraction_communicated`).

---

### 07.7 Acceptance criteria

1. **Backend-created sessions only.** No OpenAI credential reaches the client; every voice session is minted server-side with a short-TTL ephemeral secret and pack-scoped tools. A session cannot invoke a tool absent from `pack.conversationTools`.
2. **No model mutates protocol state.** Every state change traces to a gateway-emitted `protocol_event`; no async job writes `protocol_events`/`care_gaps`/`results`. Verified by audit: every `protocol_event` has a matching `tool_calls` or rule origin.
3. **Every clinical-adjacent answer cites ≥1 `source_fact`.** `verifyGrounding` blocks any uncited clinical claim and any claim contradicting a confirmed fact; blocked answers produce fallback + `audit(grounding_violation_blocked)`. The verifier is **deterministic and blocks without any model call**; a model judge, if present, may only add blocks. The verifier passes its own versioned adversarial suite within its false-negative budget (P2 launch gate).
4. **Verified-fact-store-first.** Given a confirmed fact, Sandy's answer reproduces its value verbatim; a deliberately conflicting model completion is blocked in test.
5. **Suppressed categories never reach the model.** Part 2 SUD / adolescent facts are excluded from every `KnowledgeBundle`; a red-team probe cannot surface them.
6. **Red-flag / crisis lock is model-proof, with a measured deterministic floor.** After a `red_flag`/`crisis` event, N adversarial persuasion turns do not unlock coaching; only `navigator_reviewed` clears it. Detection is deterministic; the deterministic set meets a versioned recall floor **on regex/rule alone** against a per-language adversarial corpus; a model-net-only hit still hard-locks and emits a rule-gap ticket; a degraded/absent model net does not lower the floor, and a down deterministic layer blocks live voice rather than silently running with no net.
7. **BAA + zero-retention verified** with OpenAI and Anthropic before real-PHI pilot; `model_id`/`model_version` logged on every model-touched action; `safetyIdentifier` (never `patientId`) is the only stable id sent to vendors. Both lanes sit behind the `ModelVendor` abstraction (07.5e) so an outage/deprecation/HIPAA-eligibility loss degrades to text/scripted tier without relaxing any safety control, and a vendor/version swap re-runs the red-team suite.
8. **Fallback is visible and typed.** No block silently drops a turn; transcript remains complete; navigator offer always present.
9. **Pack-parameterized tools, zero rail change.** A new pack authorizing the same catalog runs voice + grounding with only manifest config (P6 platform test).
10. **Instrument fidelity.** Screening wording verbatim, scoring deterministic, crisis routing hard-coded — proven by the pack's red-team suite (spine §1 part 9).
11. **Safety controls have per-language parity.** The crisis/red-flag corpus, the grounding verifier's claim extractor/classifier, and approved-content copy-lint exist and are red-teamed in **every language the pack ships** (`en-US`, `es-US`, …) — a Spanish dosing directive or SI phrasing is caught, not passed by an English-only rule.
12. **Approved-content education is grounded and PHI-separate.** Generic education answers come from the versioned approved-content corpus (01.3-owned), cite `ac_…` ids in a visibly distinct provenance strip, name no patient value, and fall to the navigator offer when no unit matches — never from parametric knowledge, never from the `KnowledgeBundle`.
13. **Retraction un-saying is templated and decoupled.** A patient-facing insight that is later retracted is un-said only via an approved templated slot (non-diagnostic), never auto-un-escalates a navigator-owned or crisis/red-flag state, and writes `audit(insight_retraction_communicated)`.

---

### 07.8 Open questions

1. **Realtime tool-call reliability under barge-in.** If a patient interrupts mid-tool-call, is the proposed tool call committed or abandoned? Need a defined transaction boundary so a half-spoken `confirm_plan` never emits `appointment_confirmed`.
2. ~~**Grounding-verifier NLP scope.**~~ **RESOLVED (07.4):** the verifier is **deterministic** (regex + units grammar + per-language lexicon + numeric-diff) as the sole block layer; a Haiku judge may only ESCALATE-to-block, never gate; it ships a versioned adversarial suite with a defined false-negative budget as a **P2 launch gate**. Remaining detail: the exact numeric value of the false-negative budget and the corpus-refresh cadence, owned with the content-registry review cycle.
3. **Bundle size vs latency.** Large longitudinal bundles (post-KHIE) may exceed a comfortable retrieval/context budget for sub-800ms voice. Do we need per-pack bundle scoping (only facts relevant to active packs) as the default rather than the whole record?
4. **Safety-identifier rotation.** How often does `safetyIdentifier` rotate, and does rotation blind vendor abuse-detection across sessions? Trade-off between privacy and cross-session safety monitoring is unresolved.
5. ~~**Off-bundle education from approved content.**~~ **RESOLVED (07.2d):** generic non-patient education is answered from a distinct, versioned **`ApprovedContentScope`** (RxNorm monographs + approved education modules), owned by the content registry (01.3), citing `ac_…` ids in a visibly distinct provenance strip, naming no patient value, and falling to the navigator offer when no unit matches — never parametric, never from the `KnowledgeBundle`. Remaining detail: the corpus store/embedding choice and its refresh SLA relative to RxNorm updates.
6. **Haiku classifier disagreement policy.** When the deterministic regex says `normal` but Haiku says `red_flag`, we escalate (fail-safe). Confirmed direction, but the false-positive rate on escalation (alert fatigue, brief §9.3) needs a measured cap.
7. **Voice transcript as a source_fact.** When a patient *states* a fact by voice ("I already had the screening"), does the transcript segment become a `source_fact` (`patient_reported`) automatically, or only after `record_already_completed`? The provenance chain for spoken claims needs a canonical rule.


---

## 08. Screenings, SDOH Detection & Proactive Campaigns

This section specifies four capability families — conversational mental-health screening, SDOH detection, the campaign/cohort engine, and the outreach scheduler — plus how the shipped in-app alert center becomes their patient-facing substrate. Every one of them is a **Protocol Pack** (spine §1), not bespoke code: they ride the identical rails retinopathy proved (site matching, barrier intake, navigator queue, event-sourced protocol state, audit). The governing law from the spine §0 holds without exception here: **deterministic rules decide state; models only explain, personalize, and converse; humans own every exception.** Instrument scoring and crisis routing are hard-coded reducers — never model-discretionary.

Grounds on the prototype: `src/lib/safety.ts` (`screenPatientMessage`, red-flag lock), `src/lib/retinopathy-protocol.ts` (reducer + guards), `src/lib/site-matching.ts` (verbatim reuse), `src/lib/health-alerts.ts` (`HealthAlert`, `markAlertDone`, `snoozeAlert`), `src/lib/longitudinal-health.ts` (`HealthInsight`). Spine additions this section registers are enumerated in 08.9.

---

### 08.1 Spine extensions registered by this section

Per spine §7, new shared vocabulary is added here before use. This section registers:

**New `BarrierType` members** (spine §2; SDOH additions already partially present — `food | housing | social_isolation`; this section adds two and maps all SDOH members to Z-codes):
```
+ utilities        // Z59.1x  inadequate/unsafe housing utilities
+ interpersonal_safety  // Z63.x / T74  (assistive-only; routes to navigator, never auto-reported in SMS)
```

**New `NavigatorQueueReason` members** (spine §4d):
```
+ sdoh_referral_needed        // Z-code flag → community resource + human close-the-loop
+ positive_screen_followup    // PHQ-9 / GAD-7 above threshold, non-crisis
+ crisis_escalation           // SI item ≥1 or free-text crisis red flag  (priority forced urgent)
```

**New `ProtocolEventType` members** (spine §4a — past-tense lifecycle events):
```
+ screening_administered      // an instrument was delivered (PHQ-2/9, GAD-7, PRAPARE)
+ screening_scored            // deterministic score computed → state
+ sdoh_flag_raised            // Z-code flag emitted from intake or passive tagging
+ resource_referral_made      // community resource (findhelp/211) offered/handed off
+ crisis_route_triggered      // 988 / crisis route fired (hard-coded)
+ campaign_enrolled           // patient entered a campaign cohort
```

**New insight events** (spine §4b `insight.*` namespace; `insight.screening.interval_due` already exists):
```
+ insight.sdoh.passive_signal_detected   // Haiku tagged a transportation/food/housing/cost mention in a barrier
```

**Retraction family (spine §4b — registered by §06, consumed here).** Every `insight.*` event has a `.retracted` counterpart (spine §4b registers the family; §06.3 owns the emission/guard rules). This section OWNS the **alert-retraction UX**: when an `insight.*.retracted` event arrives for an insight that already produced a `HealthAlert` (08.6) or drove outreach, the alert center reconciles it deterministically (08.6.3). A retraction is a `system` actor event; the model never "un-says" a pattern of its own volition.

**New `ToolName` members** (spine §6.4 — imperative Sandy gateway verbs; each validates, checks pack permission, emits a `protocol_event`, returns structured output — never mutates state directly):
```
+ administer_screening   // (already in spine locked list) delivers next instrument item
+ score_screening        // triggers the deterministic scoring reducer for a completed instrument
+ raise_sdoh_flag        // emits sdoh_flag_raised with zCode + source_fact provenance
+ match_community_resource  // ranks/returns findhelp/211-class resources (reuses site-matching rail)
```

**New `MeasureId`s** used by campaign packs (spine §1): `depression_screen`, `anxiety_screen`, `sdoh_screen`, `flu_vax`, `covid_vax`, `rsv_vax`, `pneumo_vax`, `mammography`, `colorectal`, `a1c_test`, `nephropathy_test`.

No new `ProtocolState` values are needed — screenings and campaigns map onto the generalized 12 (spine §3). No new shared tables; two new **detail tables** local to this section are defined in 08.2/08.3 (`screening_administrations`, `sdoh_flags`) that hang off `protocol_events` via `source_fact_ids`.

---

### 08.2 Conversational mental-health screening (PHQ-2 → PHQ-9, GAD-7)

Shipped as the `phq_gad` Protocol Pack. Screening is **conversational in delivery, deterministic in scoring**. Sandy reads instrument items **verbatim** from a locked content table; the patient's answer is coerced to a 0–3 ordinal; the reducer sums and routes. Sandy never computes, interprets, or reassures a score.

#### 08.2.1 Instrument content — VERBATIM, locked (`screening_items`)

Wording is the standard public-domain PHQ/GAD text and MUST NOT be paraphrased by any model. Stem preamble for PHQ items: *"Over the last 2 weeks, how often have you been bothered by any of the following problems?"* For GAD-7: *"Over the last 2 weeks, how often have you been bothered by the following problems?"* Response scale for all items (verbatim options, ordinal value):

| Option text (verbatim) | value |
|---|---|
| Not at all | 0 |
| Several days | 1 |
| More than half the days | 2 |
| Nearly every day | 3 |

```ts
interface ScreeningItem {
  instrument: 'phq2' | 'phq9' | 'gad7'
  itemNo: number            // 1-based within the instrument
  text: string              // VERBATIM item wording; content-ops locked, model-immutable
  isCrisisItem: boolean     // true only for PHQ-9 item 9
}
```

- **PHQ-2** = PHQ-9 items 1–2 (little interest/pleasure; feeling down/depressed/hopeless).
- **PHQ-9 item 9 (VERBATIM):** *"Thoughts that you would be better off dead, or of hurting yourself in some way"* — `isCrisisItem: true`.
- **GAD-7** items 1–7 (feeling nervous/anxious/on edge; not being able to stop or control worrying; worrying too much about different things; trouble relaxing; being so restless that it is hard to sit still; becoming easily annoyed or irritable; feeling afraid as if something awful might happen).

Functional-impairment follow-up (verbatim, unscored, stored): *"If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?"* — options `Not difficult at all | Somewhat difficult | Very difficult | Extremely difficult`.

#### 08.2.2 Deterministic scoring reducer

```ts
type PhqSeverity = 'none_minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe'
type GadSeverity = 'minimal' | 'mild' | 'moderate' | 'severe'

interface ScreeningAdministration {          // → table screening_administrations
  id: string                                  // scr_<slug>
  patientId: string
  protocolInstanceId: string
  instrument: 'phq2' | 'phq9' | 'gad7'
  answers: number[]                           // ordinal 0-3, index-aligned to itemNo
  totalScore: number                          // deterministic sum
  severity: PhqSeverity | GadSeverity
  crisisItemPositive: boolean                 // PHQ-9 item 9 answer >= 1
  freeTextCrisisDetected: boolean             // screenPatientMessage() red_flag on any free-text turn
  administeredAt: string
  sourceFactIds: string[]                     // one source_fact per answered item (provenance)
  completed: boolean
}
```

**Scoring rules (pure functions, no model):**
- `phq2Positive = sum(phq2) >= 3` → escalate to full PHQ-9 (administer remaining items 3–9).
- PHQ-9 severity bands (total 0–27): `0–4 none_minimal | 5–9 mild | 10–14 moderate | 15–19 moderately_severe | 20–27 severe`.
- GAD-7 severity bands (total 0–21): `0–4 minimal | 5–9 mild | 10–14 moderate | 15–21 severe`.
- `phq2Positive === false` closes the depression screen at `closed_resolved` (measure `depression_screen` satisfied, negative). No PHQ-9 items are asked.

#### 08.2.3 Crisis routing — HARD-CODED, never model-discretionary

Two independent triggers, each evaluated by a deterministic rule the instant its input exists (not at end-of-instrument):

1. **Structured trigger:** PHQ-9 item 9 answer `>= 1` → `crisisItemPositive = true`.
2. **Free-text trigger:** any patient free-text turn during a screening runs `screenPatientMessage()` (`src/lib/safety.ts`); category `red_flag` → `freeTextCrisisDetected = true`. Crisis regex extends the existing `RED_FLAG_PATTERNS` with SI/self-harm patterns (suicidal ideation, self-harm, "better off dead", "kill myself", "end it").

**Deterministic-first, model-as-backstop (regulatory control — the deterministic set is the floor, never a model at the sole discretion of the crisis decision):**
- **Measured recall floor.** `RED_FLAG_PATTERNS` (the deterministic set) MUST meet a **content-owned, versioned minimum recall** against a maintained adversarial SI/self-harm corpus (English AND every language the pack ships — see 08.4.5). The corpus and recall floor are content-ops artifacts, red-teamed per language, and gate the P7 exit; a regression below the floor blocks release.
- **Haiku parallel net is additive-only.** A Haiku classifier runs in parallel as a **second net** that can only ADD a crisis hit, never suppress one. When the Haiku net is the ONLY detector that fires (deterministic regex missed it): (a) the escalation still **hard-locks** exactly as a regex hit would; AND (b) a `rule_gap` audit event + content-ops ticket is emitted so the missed phrasing is added to `RED_FLAG_PATTERNS`. The model catch is a backstop that FEEDS the deterministic set — it is never a permanent substitute for a deterministic pattern.
- **Fail-safe when the model net is degraded/down.** If the Haiku net is unavailable or degraded, screening continues on the deterministic set alone (which must independently meet the recall floor), and the **degraded-net state is surfaced to ops** as an alert. The system never blocks screening on model availability, and never silently drops to a weaker detector without an ops signal.

Either trigger fires the crisis route **immediately**, before any further item:
```
crisis_route_triggered  (ProtocolEventType; actor: system)
  → state = navigator_review
  → CrisisRoute { trigger: 'suicidal_ideation', action: 'route_988' }  (pack escalation map, spine §1 part 6)
  → navigator_tasks row: work_type=clinical_escalation, reason=crisis_escalation, priority=urgent (FORCED)
  → Sandy presents locked crisis copy: 988 Suicide & Crisis Lifeline (call/text 988), and a warm human hand-off offer.
  → audit_events: action='crisis_route', outcome='allowed', model_id logged if a model touched the turn.
```
Sandy's role at crisis is **read locked copy and stop** — it MUST NOT reassure, minimize, continue the instrument, or "assess" risk. `isAutonomousActionAllowed('reassure_red_flag')` returns false (existing prototype boundary) and applies here verbatim. A model may only render the pre-approved 988 copy; the decision to show it is the rule's.

#### 08.2.4 Result routing (non-crisis)

| Condition | Event → State | Navigator work |
|---|---|---|
| PHQ-2 negative | `screening_scored` → `closed_resolved` | none |
| PHQ-9 `moderate`+ (≥10), no crisis | `screening_scored` → `signal_collected` then `referral_needed` | `positive_screen_followup`, priority `soon`, work_type `referral_management` → PCP/behavioral-health referral (`referrals` table) |
| PHQ-9 `mild` (5–9) | `screening_scored` → `signal_collected` | `positive_screen_followup`, priority `routine` (navigator confirms follow-up interval) |
| GAD-7 `moderate`+ (≥10) | `screening_scored` → `referral_needed` | `positive_screen_followup`, priority `soon` |
| any crisis trigger | `crisis_route_triggered` → `navigator_review` | `crisis_escalation`, priority `urgent` (see 08.2.3) |

Results are written to the patient's record as FHIR `Observation` (LOINC: PHQ-9 total `44261-6`, GAD-7 total `70274-6`) via a `source_fact` with `fhir_ref` (spine §5). The `results` table is not used for screenings (it is gap-result-shaped); screening outcomes live in `screening_administrations` + the FHIR Observation. Behavioral-health data respects the spine §5 segmentation rule (adolescent-confidential / Part 2 default-suppressed from AI context).

**Acceptance criteria (08.2):**
- AC-08.2-a: Instrument text rendered to the patient is byte-identical to `screening_items`; a red-team test diffs rendered turns against the table and fails on any deviation.
- AC-08.2-b: Scoring is a pure function; property test: for all answer vectors, `severity` and routing are reproducible and independent of model output.
- AC-08.2-c: SI item `>= 1` OR free-text crisis fires `crisis_route_triggered` within the same turn, forces priority `urgent`, and blocks any further instrument item. Drill (P7 exit): crisis-path fires deterministically 100/100 runs.
- AC-08.2-d: No model call can change `totalScore`, `severity`, or the crisis decision — verified by injecting adversarial model output into a scoring test and asserting no state divergence.
- AC-08.2-e: `RED_FLAG_PATTERNS` meets its versioned recall floor against the adversarial corpus in EVERY shipped language; a below-floor regression fails CI. A Haiku-net-only crisis hit still hard-locks and emits a `rule_gap` audit + content-ops ticket (verified by feeding a phrasing the regex misses and asserting lock + ticket). With the Haiku net forced down, the deterministic set still meets the floor and a degraded-net ops alert is raised.

---

### 08.3 SDOH detection — two-input model, assistive-only forever

Shipped as the `sdoh` Protocol Pack. **Assistive-only is a hard invariant (spine §4c):** SDOH flags open doors to help; they NEVER gate, deprioritize, delay, or deny clinical care. No SDOH flag may lower a `NavigatorQueuePriority`, remove a patient from a cohort, or suppress an outreach the patient is otherwise eligible for. This is enforced structurally: SDOH flags write only to `sdoh_flags` + generate `barrier_resolution`/`referral_management` navigator work; there is no code path from an `sdoh_flag` to a priority reduction or cohort exit.

#### 08.3.1 Two inputs

**Input A — PRAPARE-aligned conversational intake.** Sandy asks a subset of PRAPARE-aligned questions verbatim from `screening_items` (instrument `prapare`), covering: housing stability, food security, transportation, utilities, employment/income stress, social isolation, interpersonal safety. Delivery is conversational; mapping answer → domain is deterministic (a fixed lookup, not model inference).

**Input B — passive Haiku classification of already-collected barriers.** Barriers already captured through the retinopathy/companion rails (`barriers` table, `reportBarrier`) carry free-text `detail`. A **Haiku classifier** (high-volume lane, spine platform brief §68) tags each barrier `detail` into zero-or-more SDOH domains. This is classification only — Haiku emits a *candidate* signal, never a state change:
```
insight.sdoh.passive_signal_detected  (insight event; actor: system)
  → creates a candidate sdoh_flags row with confidence='needs_review'
  → does NOT auto-refer; a deterministic rule + navigator confirmation gates the referral.
```
The classifier output is advisory input to a deterministic rule; per governing law, the model detects a pattern, the rule decides.

#### 08.3.2 Z-code mapping and flag shape

```ts
type SdohDomain =
  | 'housing' | 'food' | 'transportation' | 'utilities'
  | 'financial_strain' | 'social_isolation' | 'interpersonal_safety' | 'employment'

interface SdohFlag {                        // → table sdoh_flags
  id: string                                // sdoh_<slug>
  patientId: string
  protocolInstanceId: string
  domain: SdohDomain
  zCode: string                             // ICD-10-CM Z-code, see mapping
  source: 'prapare_intake' | 'passive_barrier_tag'
  confidence: SourceConfidence              // patient_reported (intake) | needs_review (passive)
  barrierId?: string                        // set when derived from a barriers row
  sourceFactIds: string[]                   // provenance (spine §0.2) — never empty
  status: 'raised' | 'resource_offered' | 'navigator_owned' | 'resolved' | 'declined'
  createdAt: string
}
```

| SdohDomain | Z-code | BarrierType mapping |
|---|---|---|
| housing | Z59.0 (homelessness) / Z59.1 (inadequate housing) | `housing` |
| food | Z59.4 (lack of adequate food) | `food` |
| transportation | Z59.82 (transportation insecurity) | `transportation` |
| utilities | Z59.1x (utilities) | `utilities` |
| financial_strain | Z59.86 (financial insecurity) | `cost` |
| social_isolation | Z60.2 (social isolation) | `social_isolation` |
| interpersonal_safety | Z63.x / T74 | `interpersonal_safety` |
| employment | Z56.x | (no barrier; navigator only) |

#### 08.3.3 Referral flow (reuses site-matching rail)

`match_community_resource` reuses `src/lib/site-matching.ts` ranking verbatim, over a **community-resource directory** (findhelp / 211-class) instead of screening sites. The resource record is structurally the shared `screening_sites`/`site_matches` shape generalized (spine §2 notes those keep their names) with `type` extended to resource categories; matching stays deterministic (`rankSites`, `explainMatch`, `bestScore`), so the "why this resource" provenance requirement (spine §6.7) is satisfied by the existing `explainMatch`.

**Ingestion/registry ownership seam.** This section owns only the **matching behavior** over the resource directory; it does NOT own the directory's ingestion. The community-resource feed is registered as a `data_sources` row with its own `SourceKind` (e.g. `community_resource`) and `trust_tier` by **§05** (the source registry), which also owns the adapter, refresh cadence, and stale-resource decay detection. This section consumes the already-landed resource records; the source→resource-record adapter and its trust-tier assignment are §05's. (Open question 08.10-Q3 tracks the specific feed choice; the ownership split is fixed here.)

```
sdoh_flag_raised → (navigator confirms if passive) → resource_referral_made
  → state: signal_collected → action_matched
  → navigator_tasks: work_type=referral_management, reason=sdoh_referral_needed, priority=routine
  → interpersonal_safety domain: priority forced soon, routed to navigator BEFORE any auto-resource offer (safety).
```
Interpersonal-safety flags are **never** surfaced in SMS/lock-screen and never trigger an automated resource message — they route silently to a human (see 08.4 minimize-disclosure).

**Acceptance criteria (08.3):**
- AC-08.3-a: No code path exists from an `sdoh_flags` row to a `NavigatorQueuePriority` decrease, a cohort exit, or an outreach suppression. Static test asserts `sdoh_flags` is never read by cohort/priority/eligibility evaluators.
- AC-08.3-b: Every SDOH flag carries a Z-code from the mapping table and non-empty `sourceFactIds`.
- AC-08.3-c: Passive Haiku tags land as `confidence='needs_review'` and cannot generate `resource_referral_made` without a deterministic rule/navigator gate.
- AC-08.3-d: `interpersonal_safety` flags never appear in an outbound SMS/lock-screen body (disclosure test).

---

### 08.4 Outreach scheduler

The scheduler is the pacing/eligibility engine that turns a cohort into paced conversations. It writes `outreach_attempts` (spine §2) and drives the escalating-channel ladder. It is entirely deterministic.

#### 08.4.1 Eligibility gate (all must hold)

```ts
interface OutreachEligibility {
  consentActive: boolean          // consents.status === 'active' for the pack scope
  notOptedOut: boolean            // no active opt-out for this channel (08.4.4)
  withinRateCaps: boolean         // 08.4.2
  quietHoursOk: boolean           // local time 08:00–20:00 patient TZ; no send outside
  notInCrisisLock: boolean        // no open crisis/red-flag lock on this instance
  instanceOpen: boolean           // protocol_instances.closed_at is null
}
```
`eligible = consentActive && notOptedOut && withinRateCaps && quietHoursOk && notInCrisisLock && instanceOpen`. Crisis lock (existing red-flag lock, `startAutonomousOutreach` guard) **halts all proactive outreach** for that patient until navigator clears it.

#### 08.4.2 Pacing / rate caps (deterministic, configurable per pack)

| Cap | Default | Scope |
|---|---|---|
| Max messages per patient per day | 1 | across all packs (consolidation) |
| Max messages per patient per week | 3 | across all packs |
| Min hours between attempts (same instance) | 48 | per protocol_instance |
| Max campaign sends per patient per campaign | 4 | per campaign, then → nonresponse close |
| Global county send rate | pack-configured | ops throttle |

Cross-pack daily cap is enforced first (alert-fatigue mitigation, platform brief §211). If two packs both want to send, the higher-priority pack wins the slot; the other reschedules.

**Cross-pack arbitration data model (ownership).** The daily/weekly caps and slot-arbitration are enforced against a **patient-level outreach-pacing primitive** shared across all of a patient's `protocol_instances` — a co-morbid patient (retinopathy + HTN + glucose + adherence + a due screening) has one pacing budget, not one per pack. That primitive (the shared per-patient pacing/arbitration record and the tie-break rule for which instance wins a contested slot) is a **spine-level addition** (flagged in 01.10-Q3; it is cross-cutting, so it lives in the spine, not in any one pack). **This section owns the scheduler mechanics** that read that primitive: the deterministic slot selection (`NavigatorQueuePriority` desc, then earliest `scheduled_at`), the reschedule of losers, and the cap enforcement above. Barrier de-duplication (a shared barrier resolved once across instances rather than re-surfaced per pack) resolves against the same patient-level record. The console-side merged-vs-N-cards presentation is §10's (10.11-Q7); the send-side pacing is here.

#### 08.4.3 Escalating channel ladder — "why it fired" mandatory

Channels escalate on non-response: `in_app → sms → offer_human`. Never start with SMS if the app is installed/active.
```
Attempt 1: in_app  (alert center card, 08.6) — full context allowed
Attempt 2 (after min-interval, no response): sms  — minimized disclosure
Attempt 3 (no response): offer_human — navigator_tasks: work_type=outreach_followup, reason=nonresponse
```
**Every outbound message states why it fired** (spine §6.7 applied to outreach). In-app card and SMS both carry a `reason_line` derived from the triggering event, e.g. *"Your care team's records show your diabetic eye exam is due"* / *"Flu shots are recommended for people with diabetes — here's help finding one nearby."* The reason traces to `source_fact_ids` on the triggering `protocol_event`.

#### 08.4.4 Minimize disclosure + opt-out

- **SMS/lock-screen minimize disclosure:** SMS bodies MUST NOT contain diagnoses, condition names beyond the minimum, screening-result content, medication names, or any behavioral-health/SDOH detail. Template: `"{first_name}, this is Sandy from {program}. {generic_reason}. Reply STOP to opt out, HELP for help."` Behavioral-health, SDOH, and crisis content are **in-app only, behind auth** — never SMS.
- **`reasonLine`/`generic_reason` is template-slotted, never model-personalized (regulatory control).** The patient-facing reason on ANY outbound channel is drawn from an **approved reason-template library** (the same `ai-script`/approved-answer tier as education copy) and **deterministically slotted** — a model may render an in-app card's phrasing but MUST NOT compose the SMS/push `reasonLine` free-form, because a model-personalized line can leak a condition name into an SMS body or lock screen. Each template is tagged with the categories it is safe for; `interpersonal_safety`, behavioral-health, SUD, reproductive, and HIV categories are **hard-excluded from every outbound channel by category** (not merely by token match) — they never leave the authenticated in-app surface.
- **Disclosure-linter is deterministic and language-complete.** Every outbound SMS/push body passes a deterministic disclosure-linter (no dx/med/result/BH/SDOH tokens) **in every language the pack ships** (see 08.4.5). Copy-lint is the *belt*, not the primary control: the primary control is that BH/SUD/safety content has no outbound-channel code path at all (category hard-exclusion above); the linter is the secondary net. The linter corpus is red-teamed per language, so a Spanish dosing/condition leak cannot pass an English-only lint.
- **Opt-out handling:** inbound `STOP` (any casing/synonyms: STOP, END, UNSUBSCRIBE, QUIT, CANCEL) → immediate channel opt-out, `outreach_attempts.outcome='opted_out'`, and a `consents`-scoped channel suppression. Opt-out is per-channel; opting out of SMS does not revoke in-app care-plan visibility. `START` re-subscribes. Every opt-out is audited.
- **HELP handling:** inbound `HELP` returns the approved help/contact template (program name + navigator contact path); it is a deterministic keyword response, not a model turn.

```ts
interface OutreachAttemptExt {          // extends spine outreach_attempts
  channel: 'sms' | 'voice' | 'in_app' | 'push'
  reasonLine: string                    // "why it fired", patient-facing
  disclosureLevel: 'full' | 'minimized' // in_app=full, sms/push=minimized
  triggeringEventId: string             // protocol_event that caused this send
  optOutHonored: boolean
}
```

#### 08.4.5 Localization / translation pipeline (content-ops, owned here)

Every patient-facing string in a pack — verbatim-locked instruments (PHQ-9, GAD-7, PRAPARE), education modules, consent plain-language summaries, SMS/push templates, `reasonLine` templates, crisis copy, and read-aloud/TTS — ships in EN + ES (and any additional BCP-47 language declared in the pack's `education.languages`). This subsection owns HOW those translations are produced and kept from drifting; the packager (§01) enforces the gate.

- **Lockstep versioning.** A translation is an artifact of the pack version. A content change in any language bumps the pack version; a language may not be published for a pack version until all its locked strings have a validated translation. No language drifts ahead of or behind the pack version it belongs to.
- **Verbatim instruments are translated from the licensed source translation, not re-translated.** For byte-identical-locked instruments (AC-08.2-a), the ES text is the **officially validated instrument translation** (e.g. the licensed Spanish PHQ-9/GAD-7, the PRAPARE Spanish), stored verbatim in `screening_items` keyed by language. AC-08.2-a's byte-identical assertion runs **per language** against that language's locked source — translation never "paraphrases" a locked instrument; it swaps in the authoritative translated instrument.
- **Clinical + linguistic validation gate.** Non-instrument content (education, consent, reason/help templates) is authored EN-first, then translated and **dual-validated** (clinical accuracy + linguistic/plain-language review at the target reading level) before the language is marked publishable for that pack version. Validation is a content-ops artifact recorded against the pack version.
- **Safety-corpus parity.** The crisis/red-flag adversarial corpus (08.2.3) and the disclosure-linter corpus (08.4.4) MUST exist and be red-teamed in every language the pack ships — a language cannot be published without its safety corpora meeting the recall floor / disclosure gate.
- **Read-aloud/TTS coverage.** `education.readAloud` requires a TTS voice covering each shipped language; a language without TTS coverage cannot claim `readAloud: true` for that pack.

**Acceptance criteria (08.4.5):**
- AC-08.4.5-a: Publishing a pack version fails if any string in a declared language is missing a validated translation, or if any language's translation version does not match the pack version (lockstep test).
- AC-08.4.5-b: AC-08.2-a byte-identical diff runs per language against that language's licensed instrument source and fails on deviation.
- AC-08.4.5-c: A language cannot be marked publishable without its crisis corpus meeting the recall floor and its disclosure-linter corpus passing, red-teamed in that language.

**Acceptance criteria (08.4):**
- AC-08.4-a: No send occurs when any eligibility field is false (property test over the gate).
- AC-08.4-b: Rate caps enforced; adversarial burst test cannot exceed daily/weekly caps across packs.
- AC-08.4-c: Every `outreach_attempts` row has a non-empty `reasonLine` traceable to `triggeringEventId.source_fact_ids`; the SMS/push `reasonLine` is a slotted approved template (test asserts no free-form model string reaches an outbound body).
- AC-08.4-d: SMS/push bodies pass the deterministic disclosure-linter (no dx/med/result/BH/SDOH tokens) in EVERY shipped language; BH/SUD/reproductive/HIV/`interpersonal_safety` categories never reach any outbound channel (category-level exclusion test, per language). STOP opts out within one message cycle and is audited; HELP returns the approved template.

---

### 08.5 Campaign / cohort engine

The campaign engine is **population → cohort rules → paced outreach → conversation**, reusing retinopathy's site-matching + barrier + navigator rails verbatim. A campaign is a Protocol Pack whose `cohort` block selects a population and whose lifecycle is the generalized state machine. **Zero new rail code** (the P6 platform test, spine §1).

#### 08.5.1 Cohort evaluation

```ts
interface CampaignRun {
  id: string                       // camp_<slug>
  packId: PackId                   // e.g. 'flu_campaign', 'mammography_recall'
  packVersion: string
  cohortSnapshotAt: string
  eligiblePatientIds: string[]     // evaluated from ProtocolPack.cohort (spine §1)
  enrolledCount: number
  pacingProfile: { perDayCap: number; startAt: string; channelLadder: string[] }
  status: 'draft' | 'running' | 'paused' | 'completed'
}
```
Cohort selection is a deterministic query over `care_gaps` + FHIR-projected `source_facts` (dx codes, age, gap evidence, registry status, ADT events). Registry status (immunization registry, spine §5 `Immunization`) drives vaccination cohorts. Entering the cohort emits `campaign_enrolled` → creates a `protocol_instance` at state `identified`.

#### 08.5.2 Campaign packs shipped (all configuration, no rail code)

| PackId | Cohort rule (summary) | MeasureId | Rails reused |
|---|---|---|---|
| `flu_campaign` | age/condition + not-yet-vaccinated this season (registry) | `flu_vax` | site-match, barrier, navigator, outreach |
| `covid_campaign` | ACIP-eligible + interval due | `covid_vax` | same |
| `rsv_campaign` | age/condition eligibility | `rsv_vax` | same |
| `pneumo_campaign` | age/condition eligibility | `pneumo_vax` | same |
| `mammography_recall` | female 40–74, no mammogram in interval | `mammography` | same |
| `colorectal_recall` | age 45–75, no CRC screen in interval | `colorectal` | same |
| `a1c_recall` | diabetic, no A1C in interval | `a1c_test` | same |
| `nephropathy_recall` | diabetic, no urine-albumin test in interval | `nephropathy_test` | same |

Vaccination hesitancy questions are answered from the pack's **approved education content** (spine §1 part 2) via the scripted/approved-answer tier (`src/lib/ai-script.ts` generalized) — Sandy never improvises vaccine claims. Generic education that is not patient-specific (e.g. "what is metformin for", "is the flu shot safe") is answered from the **approved-content retrieval scope** that §07 owns — a corpus distinct from the patient `KnowledgeBundle`, grounded and cited to approved monographs/education assets (asset registry owned by §01.3). This section consumes that retrieval scope; it does not define it. Sandy MUST NOT fall back to parametric/free-form answering of a clinical-adjacent education question — if the approved corpus has no answer, it declines and offers a human. Site matching finds nearby vaccination/screening sites; barriers (transportation/cost/after-hours) flow to the identical navigator queue; abnormal downstream results (e.g. mammography callback) route as `referral_needed` exactly as retinopathy abnormal results do.

#### 08.5.3 Campaign state mapping (generalized §3)

```
campaign_enrolled → identified
patient_consented → patient_contactable
outreach_sent / sandy_explained_gap → engaged
barrier_reported → signal_collected
site_matched → action_matched
appointment_confirmed → scheduled
screening_administered / result_imported → completed
result normal → closed_resolved   |   abnormal → referral_needed   |   ungradable → repeat_needed
nonresponse after cap → navigator_review (reason: nonresponse) or instance closed per pack policy
```
Guards are inherited unchanged (monotonic `PROTOCOL_STATE_ORDER`, terminal states, `navigator_review` exit set — spine §3).

**Acceptance criteria (08.5):**
- AC-08.5-a: Adding any campaign pack requires only manifest + content + cohort rule — no changes to site-matching, barrier, navigator, outreach, or reducer code (P6 platform test; CI asserts diff touches only `packs/` + content).
- AC-08.5-b: Cohort eligibility is a pure query; re-running on a fixed snapshot yields identical `eligiblePatientIds`.
- AC-08.5-c: A vaccination-campaign barrier lands in `navigator_tasks` with identical shape to a retinopathy barrier (rail-reuse test).

---

### 08.6 In-app alert center as reminder substrate

The shipped alert center (`src/lib/health-alerts.ts`, `HealthAlertCenter.tsx`) is the patient-facing substrate for all reminders (screening, campaign, insight, medication). Production keeps its shape and behaviors — `status: due | upcoming | completed`, `markAlertDone`, `snoozeAlert`, per-alert `safety` copy, `channel` — and connects it to the event stream.

#### 08.6.1 Production `HealthAlert` (extends shipped shape)

```ts
interface HealthAlert {                 // production, superset of prototype
  id: string
  type: 'medication' | 'blood_pressure' | 'symptom_log'
       | 'screening_due' | 'campaign_invite' | 'insight_followup'   // + new sources
  title: string
  detail: string
  status: 'due' | 'upcoming' | 'completed' | 'retracted' | 'possibly_spurious'  // last two: insight-retraction reconciliation (08.6.3)
  nextDueLabel: string
  channel: 'In-app reminder'
  safety: string                        // locked safety copy (existing pattern)
  reasonLine: string                    // "why it fired" (08.4.3)
  sourceEventId: string                 // the protocol_event/insight event that created it
  sourceFactIds: string[]               // provenance
  completedAt?: string
  snoozedUntil?: string
}
```

#### 08.6.2 Connection to events & campaigns

- An **insight event** (spine §4b, e.g. `insight.screening.interval_due`, `insight.med.refill_gap`, `insight.bp.morning_surge`) whose pack escalation map says "remind patient" **creates an alert** (`type: insight_followup`) rather than (or before) a navigator task. This is the production wiring for the prototype's currently-static `HealthInsight` content (`longitudinal-health.ts`) — insights become live alerts sourced from the deterministic insight engine, never hand-authored.
- A **campaign** outreach attempt on channel `in_app` (08.4.3 attempt 1) **renders as** a `campaign_invite` alert.
- A **screening recall** renders as `screening_due`.
- `markAlertDone` emits an event on the underlying instance where meaningful (e.g. medication-taken log, or `already_completed_claimed` → reconciliation queue if the patient marks a screening done outside the system). `snoozeAlert` records a snooze; **snooze analytics are a health metric of the alert system itself** (platform brief §211) — high snooze rate on an alert type flags alert fatigue for content-ops review.
- Alerts are consolidated under the cross-pack daily cap (08.4.2): at most the top-priority due alert is promoted to an outbound channel per day; the rest remain visible in-app without a push.

#### 08.6.3 Insight retraction → alert reconciliation (owned here)

When an `insight.*.retracted` event (spine §4b family; §06.3 owns emission and its guard rules — e.g. it can never reverse a terminal or `navigator_review` state) arrives for an insight that already produced a `HealthAlert` (or already drove outreach), this section owns the deterministic alert-side reconciliation. It is a hard-coded reducer keyed on the retracted `sourceEventId`; the model never decides a retraction:

- **Alert not yet acted on** (patient has not opened / completed / snoozed): the `insight_followup` alert is **withdrawn** — status set to `retracted` and removed from the active list, audited (`action='alert_retracted'`).
- **Alert already surfaced to the patient** (opened, or escalated to SMS/push): the alert is **not silently deleted** — it is marked `possibly_spurious` and, per the retraction→patient-notification contract, a locked, non-diagnostic "un-say" note is shown in-app (e.g. *"An earlier reminder about a pattern in your readings no longer applies — no action is needed."*). Copy is approved/locked, never model-composed, and never sent over SMS.
- **A navigator_task the insight created** is handled by §06.3's retraction→navigator_task contract (flag-as-possibly-spurious, never silent-close); the alert center's job is only the patient-facing surface. This section defers the navigator-task disposition to §06 and owns only the alert + patient-notification side.
- Retraction of an insight tied to a crisis or a terminal/`navigator_review` state does NOT withdraw anything patient-facing on its own — the human owns that exception (spine §0).

**Acceptance criteria (08.6):**
- AC-08.6-a: Every alert carries `reasonLine`, `sourceEventId`, and non-empty `sourceFactIds`; no alert is hand-authored at runtime.
- AC-08.6-b: An insight event with a "remind" escalation deterministically produces exactly one alert.
- AC-08.6-c: `markAlertDone`/`snoozeAlert` preserve the shipped pure-transform behavior and are audited; snooze rate is exposed as a metric.
- AC-08.6-d: SMS/lock-screen escalation of an alert obeys 08.4.4 minimize-disclosure (alert `detail` is in-app only).
- AC-08.6-e: An `insight.*.retracted` event withdraws an unacted alert and, for an already-surfaced alert, marks it `possibly_spurious` and shows the locked non-diagnostic note — never a silent delete, never a SMS, never a reversal of a crisis/terminal/`navigator_review` state (retraction-reconciliation test).

---

### 08.7 Everything is a Protocol Pack (cross-ref §01)

Each capability is expressed as a `ProtocolPack` manifest (spine §1), not a bespoke feature. Sketch of the 9 declared parts for `phq_gad`, `sdoh`, and a campaign pack:

| Manifest part | `phq_gad` | `sdoh` | `flu_campaign` |
|---|---|---|---|
| 1. Cohort | dx/age or PCP-referred; behavioral-health gap | universal or care-management enrollees | age/condition + registry not-vaccinated |
| 2. Education | plain-language mental-health module (grade 6, read-aloud) | resource-navigation education | vaccine approved-content + hesitancy answers |
| 3. Device bindings | none | none | none |
| 4. Insight rules | none (instrument-driven) | `insight.sdoh.passive_signal_detected` | `insight.screening.interval_due` |
| 5. Conversation tools | `administer_screening`, `score_screening`, `escalate_red_flag`, `summarize_for_navigator` | `raise_sdoh_flag`, `match_community_resource`, `record_barrier`, `create_navigator_task` | `explain_gap`, `match_screening_sites`, `record_barrier`, `confirm_plan` |
| 6. Escalation map | SI/free-text crisis → `route_988` (hard-coded); moderate+ → PCP referral | interpersonal_safety → human-only; else routine resource | abnormal downstream → referral; else routine |
| 7. Navigator work types | `clinical_escalation`, `referral_management` | `referral_management`, `barrier_resolution` | `barrier_resolution`, `outreach_followup`, `referral_management` |
| 8. Outcome metrics | `depression_screen`, `anxiety_screen` completion; positive-screen follow-up rate | `sdoh_screen` completion; resource-referral rate | `flu_vax` rate; barrier-resolution rate |
| 9. Red-team suite | crisis-path drill, verbatim-wording diff, scoring-immutability | assistive-only-invariant, disclosure, passive-tag-gate | hesitancy-answer-fidelity, disclosure, rail-reuse |

Adding any of these needs **zero rail code** — if it does, the rail is fixed (spine §1). Section 01 owns the pack lifecycle/versioning; this section owns the pack *contents* for screenings, SDOH, and campaigns.

---

### 08.8 End-to-end sequence (PHQ-2 → crisis path, illustrative)

```
1. campaign_enrolled (phq_gad cohort)           → identified
2. outreach eligible (08.4 gate) → in_app alert  (screening_due, reasonLine cites source_fact)
3. patient opens, consents                       → patient_contactable → engaged
4. administer_screening: PHQ item 1,2 (verbatim) → screening_administered
5. patient free-text turn: "sometimes I think everyone would be better off without me"
   → screenPatientMessage() → red_flag
   → RULE fires crisis_route_triggered (NOT the model)  → navigator_review
   → CrisisRoute route_988; locked 988 copy rendered; instrument HALTS
   → navigator_tasks: clinical_escalation / crisis_escalation / URGENT
   → audit_events: crisis_route, allowed, model_id+version logged
6. navigator owns exception; instance stays in navigator_review until human clears.
```
No model output altered state at any step — the model rendered items and detected a pattern; deterministic rules made every state and routing decision; a human owns the exception.

---

### 08.9 Summary of defined artifacts (for cross-section reconciliation)

- **New tables:** `screening_items` (locked instrument content), `screening_administrations`, `sdoh_flags`. (Community-resource directory reuses generalized `screening_sites`/`site_matches`.)
- **New TS types:** `ScreeningItem`, `ScreeningAdministration`, `PhqSeverity`, `GadSeverity`, `SdohFlag`, `SdohDomain`, `OutreachEligibility`, `OutreachAttemptExt`, `CampaignRun`, production `HealthAlert` (superset).
- **Registered spine extensions (08.1):** `BarrierType` += `utilities`, `interpersonal_safety`; `NavigatorQueueReason` += `sdoh_referral_needed`, `positive_screen_followup`, `crisis_escalation`; `ProtocolEventType` += `screening_administered`, `screening_scored`, `sdoh_flag_raised`, `resource_referral_made`, `crisis_route_triggered`, `campaign_enrolled`; `insight.sdoh.passive_signal_detected`; `ToolName` += `score_screening`, `raise_sdoh_flag`, `match_community_resource` (`administer_screening` already locked); new `MeasureId`s (08.1).
- **Consumed spine seams (owned elsewhere, referenced here):** the `insight.*.retracted` family (spine §4b registers it, §06.3 emits it; alert-retraction UX owned here, 08.6.3); the patient-level cross-pack outreach-pacing/arbitration primitive (spine-level per 01.10-Q3; scheduler mechanics owned here, 08.4.2); a `community_resource` `SourceKind`/adapter/trust-tier (§05 owns; matching owned here, 08.3.3); the §07 approved-content retrieval scope for generic education (consumed at 08.5.2).
- **Content-ops artifacts owned here:** the crisis/red-flag adversarial corpus + versioned recall floor per language (08.2.3); the disclosure-linter corpus per language (08.4.4); the approved reason/help template library (08.4.4); the localization/translation pipeline and its lockstep-versioned per-language validated strings (08.4.5).

---

### 08.10 Open questions

1. **PRAPARE licensing/version pinning** — which PRAPARE item subset and version do we ship verbatim, and who is the content-ops owner for periodic re-verification against the source instrument?
2. **Adolescent-confidential screening** — for minors, what is the consent/disclosure model for PHQ-9 results given the spine §5 default-suppression rule (parent visibility vs. confidential behavioral-health)? Needs legal + state-specific policy.
3. **Community-resource directory source** — findhelp API vs. 211 feed vs. curated county directory. (Ownership is now fixed: §05 registers the `community_resource` `SourceKind`/adapter/trust-tier and owns refresh cadence + stale-resource decay detection; this section owns matching — 08.3.3. Open part is only the specific feed choice and its trust-tier, coordinated with §05.)
4. **Crisis route localization** — 988 is US; does the pack need county-level crisis-line overrides, and how is the locked copy versioned per locale without opening a model-editable path?
5. **Cross-pack alert priority arbitration** — when a crisis alert, a campaign invite, and a med reminder all come due same-day, is the current "highest-priority wins the outbound slot" rule sufficient, or do we need per-patient preference weighting?
6. **Passive-tag precision threshold** — what Haiku classification confidence floor gates a candidate `sdoh_flags` row from ever reaching a navigator, to avoid queue noise while never dropping a real signal?
7. **Screening re-administration cadence** — interval rules for re-screening (e.g. annual PHQ-9) as `insight.screening.interval_due`, and whether a prior positive shortens the interval (deterministic rule vs. clinician-set).


---

## 09. Safety, Regulatory & Compliance

Governs the platform-wide guardrails that let RHTP ship AI-assisted care orchestration without becoming a regulated medical device, without breaching HIPAA / 42 CFR Part 2, and without producing inequitable outcomes. Conforms to the canonical spine (v1): rules decide, models explain, humans own exceptions. This section defines the compliance types, gates, and monitors; it consumes the shared tables (`audit_events`, `consents`, `source_facts`, `protocol_events`, `metric_snapshots`) and does not redefine them.

The load-bearing claim of this section: **every clinical-adjacent output the platform emits traces to a deterministic rule and cites `source_fact_ids`** (spine §0.1, §6.7). That single property is what makes the FDA posture, the audit posture, and the equity posture simultaneously provable. Compliance here is not documentation — it is executable gates in the tool gateway and the CI launch pipeline.

---

### 09.1 Non-device CDS bright lines (FDA)

The platform operates as **non-device Clinical Decision Support** under the 21st Century Cures Act §3060 four-prong exemption (and FDA's 2022 CDS guidance), plus **general-wellness** framing for device-derived coaching. Staying non-device is a design invariant, not a legal opinion after the fact.

#### 09.1.1 The four-prong test, encoded

To qualify as non-device CDS, a software function must satisfy **all four** prongs. We encode each as a checkable property of the tool gateway.

| Prong (Cures Act §3060) | Plain statement | How the platform provably satisfies it |
|---|---|---|
| (i) not acquiring/processing a signal from an IVD or imaging device | no image/signal interpretation for diagnosis | Retinal images and device streams are captured/transmitted only; grading is a human/downstream clinician result imported as a `result_imported` event. Insight rules run on **summaries** (time-in-range, PDC), never raw diagnostic signal interpretation. |
| (ii) displays/analyzes medical information | operates on records, not raw sensor diagnostics | Insight engine reads `source_facts` (which point at FHIR `Observation`/`DiagnosticReport`), not raw device diagnostics. |
| (iii) provides recommendations (options), not a specific directive | offers options + "discuss with clinician", never a single command | Every patient-facing suggestion is phrased as an option and routed to a clinician conversation. No tool emits a directive dose/treatment. |
| (iv) enables the user to independently review the basis | the "why this fired" requirement | **Every** insight event and suggestion renders its `source_fact_ids` provenance chain + the rule id in `WhyItMattersScreen` / `ProvenanceStrip`. The independent-review prong is satisfied by construction. |

Prong (iv) is the one most software fails; the spine already guarantees it (§6.7). This section makes it a **hard gate**: an output with an empty provenance chain is a blocked action (see 09.1.4).

#### 09.1.2 Allowed vs prohibited operations (the bright line)

```ts
// Platform-wide capability boundary. Extends prototype src/lib/safety.ts SafetyAction.
type CdsCapability =
  // ALLOWED — non-device CDS + wellness
  | 'educate'                 // approved plain-language content
  | 'organize'                // assemble care plan, agenda, visit prep
  | 'remind'                  // due/snooze/done nudges
  | 'detect_pattern'          // deterministic insight rule fires, EXPLAINED not acted
  | 'suggest_discuss'         // "discuss X with your care team" + shown basis
  | 'collect_barrier'         // capture SDOH / logistic barrier
  | 'match_resource'          // screening site / community resource matching
  | 'confirm_plan'            // patient confirms a plan step
  // PROHIBITED — device / practice-of-medicine territory (blocked at gateway)
  | 'recommend_dose'          // ANY dosing rec, insulin especially — hard denied
  | 'diagnose'                // diagnostic claim, esp. from device data
  | 'triage_autonomously'     // autonomous acuity/routing decision without human
  | 'reassure_red_flag'       // tell a patient a danger sign is fine
  | 'change_medication'       // start/stop/titrate a medication
```

```ts
const ALLOWED_CDS_CAPABILITIES: ReadonlySet<CdsCapability> = new Set([
  'educate','organize','remind','detect_pattern','suggest_discuss',
  'collect_barrier','match_resource','confirm_plan',
])
// isCdsCapabilityAllowed generalizes prototype isAutonomousActionAllowed()
function isCdsCapabilityAllowed(c: CdsCapability): boolean {
  return ALLOWED_CDS_CAPABILITIES.has(c)
}
```

**The three lines never crossed without a regulatory strategy** (device clearance / De Novo), called out explicitly because scope-gravity pulls toward them (platform brief §9.8):

1. **Dosing recommendations — especially insulin.** No tool computes, suggests, or ranks a dose. A CGM nocturnal-hyperglycemia pattern produces `insight.glucose.nocturnal_hyperglycemia` → education + `suggest_discuss`, never "reduce your evening dose." Encoded: no `recommend_dose` capability is reachable by any `ToolName`.
2. **Diagnostic claims from device data.** Device-derived insight events MUST use pattern language ("your morning readings tend to run higher"), never diagnostic language ("you have hypertension"). Enforced by the copy-lint rule set (09.1.3) + red-team suite `unsafe_reassurance`/`diagnostic_claim` cases.
3. **Autonomous triage.** Red flags and abnormal results **always** produce a `navigator_tasks` row (human owns the exception) — the platform never decides acuity and routes a patient to care/no-care on its own. The red-flag lock (`escalate_red_flag`) interrupts to a human; it does not itself dispatch an ambulance or clear the patient.

#### 09.1.3 Copy-lint: language boundary on generated text

Model-generated patient-facing text passes a deterministic post-filter before render (analogous to prototype `screenPatientMessage`, generalized). Copy-lint is explicitly the **secondary control — a belt**. The **primary control is the capability gate** (09.1.2 + 09.5): a tool that could emit a dose/diagnosis/triage simply does not exist in any pack's `conversationTools`, so the prohibited output has no producer. Copy-lint catches only what slips through generated *explanatory* text; it is never relied on as the sole guard for a prohibited capability.

```ts
interface CopyLintRule { id: string; pattern: RegExp; verdict: 'block' | 'rewrite'; reason: string; lang: string }

// A dose directive is detected by a dose/units/imperative-verb GRAMMAR, not by an
// enumerated drug-name list (an enumerated list silently misses un-listed drugs).
// One rule set per language the pack ships (see AC-09.1-e). English shown; es-US parallel required.
const COPY_LINT_EN: CopyLintRule[] = [
  { id: 'dose_directive',   lang: 'en', pattern: /\b(increase|decrease|reduce|raise|lower|take|start|stop|skip|adjust|titrate|cut|double|halve)\b.{0,30}\b(dose|doses|units?|mg|mcg|ml|pill|pills|tablet|injection|insulin|medication|meds?)\b/i, verdict: 'block', reason: 'dosing directive (grammar: imperative + dose/units)' },
  { id: 'diagnostic_claim', lang: 'en', pattern: /\byou (have|are having|likely have|probably have)\b.{0,40}\b(diabetes|hypertension|retinopathy|depression|a stroke|a heart attack)\b/i, verdict: 'block', reason: 'diagnostic claim' },
  { id: 'red_flag_reassure', lang: 'en', pattern: /\b(that'?s (fine|normal|nothing)|no need to worry|you'?ll be fine)\b/i, verdict: 'block', reason: 'reassurance on possible danger sign' },
  { id: 'autonomous_triage', lang: 'en', pattern: /\b(you don'?t need (to see|a doctor|care)|no need to (go|be seen))\b/i, verdict: 'block', reason: 'autonomous triage' },
]
// COPY_LINT_ES etc. — a dose/units/imperative-verb grammar in each shipped language.
// e.g. es: /\b(sub[ae]|baj[ae]|aument[ea]|reduc[ea]|tom[ae]|deje de|salte)\b.{0,30}\b(dosis|unidades?|mg|pastilla|insulina|medicamento)\b/i
```

`block` → the output is suppressed, the approved-answer fallback (`ai-script.ts` library, generalized) is served, and an `audit_events` row is written with `action:'copy_lint_block'`, `outcome:'blocked'`.

**Language parity is mandatory.** Copy-lint (and the 07 grounding verifier) MUST have an equivalent, independently red-teamed rule set in **every language the pack ships** (packs ship `en-US` + `es-US` today). An English-only lint would pass a Spanish dosing directive (`"baje su dosis de insulina"`) to a Spanish-speaking patient. A pack cannot launch a language whose copy-lint corpus has not been red-teamed (AC-09.1-e).

#### 09.1.4 The insight engine as the provable guardrail

The deterministic insight engine (platform brief §5B, spine §4b) is what keeps the FDA posture *auditable rather than asserted*. Invariants:

- **No LLM in the insight lane.** An `insight.*` event is emitted only by a registered `InsightRuleRef` — a pure function `(observations, thresholds) → ProtocolEventEnvelope | null`. If a proposed insight cannot be expressed as such a rule, it does not ship.
- **Every insight carries `sourceFactIds`** (the observations that fired it) — never empty (spine §3 envelope). An insight with no basis is a build-time error.
- **Insights explain; they never act.** An insight event may drive state or emit a `navigator_tasks` row per the pack's escalation map, but the *patient-facing text* is `educate` + `suggest_discuss` only.

**Acceptance criteria (09.1):**
- AC-09.1-a: No `ToolName` in any shipped `ProtocolPack.conversationTools` resolves to a prohibited `CdsCapability`. CI test enumerates all pack manifests and asserts the intersection with `{recommend_dose, diagnose, triage_autonomously, reassure_red_flag, change_medication}` is empty.
- AC-09.1-b: Every `insight.*` event type in a pack has a registered pure `InsightRuleRef`; a unit test asserts each rule returns events with non-empty `sourceFactIds`.
- AC-09.1-c: The red-team `diagnostic_claim` and `dose_directive` suites (09.5) pass at 100% for every pack as a launch gate.
- AC-09.1-d: Copy-lint runs on 100% of model-generated patient-facing strings; a coverage test fails the build if any render path bypasses it.
- AC-09.1-e: Every language a pack ships has its own copy-lint rule set (dose/units/imperative grammar, not a drug-name enumeration) and its own red-team corpus; a pack that ships `es-US` with no red-teamed Spanish copy-lint fails the launch check. Copy-lint is asserted secondary — the capability-gate test (AC-09.1-a) is the primary control and passes independently of copy-lint.

---

### 09.2 HIPAA / business-associate posture

As provider/HIE/claims data flows, the platform is a **Business Associate** (and a subcontractor-BA to any covered-entity partner). Posture = BAA chain + minimum-necessary + encryption/KMS + the append-only audit rail that already exists in the P1 backend.

#### 09.2.1 BAA chain (every vendor touching PHI)

```ts
interface BaaRecord {
  vendorId: string
  vendorRole: 'cloud' | 'model_reasoning' | 'model_voice' | 'sms' | 'aggregator' | 'fhir_managed' | 'community_resource'
  baaExecuted: boolean
  zeroRetention: boolean          // model vendors: no training/retention on our PHI
  effectiveDate: string
  dataScope: PhiScope             // what categories the vendor may touch
  active: boolean
}
type PhiScope = 'full_record' | 'conversation_only' | 'summary_only' | 'phone_number_only' | 'no_phi'
```

Required chain before any real-PHI pilot (platform brief §10.6):

| Vendor role | Example | BAA + terms required | Min-necessary scope |
|---|---|---|---|
| Cloud / hosting | AWS or Azure (HIPAA-eligible) | BAA | `full_record` (encrypted at rest) |
| FHIR store (if managed) | Azure Health Data Services / HealthLake | BAA | `full_record` |
| Model — reasoning | Anthropic (Claude) | BAA **+ zero-retention** | `conversation_only` / `summary_only` |
| Model — voice | OpenAI (Realtime) | BAA **+ zero-retention** | `conversation_only` |
| SMS / 10DLC | Twilio-class | BAA | `phone_number_only` — **never clinical detail in body** |
| Aggregator (if used) | Validic / Terra | BAA | device `Observation` scope only |
| Community resources | findhelp / 211 | BAA or de-identified referral | SDOH referral minimum |

**Gate:** a request that would send PHI to a vendor whose `BaaRecord.active && baaExecuted` is false is **blocked** at the egress boundary and audited (`action:'phi_egress_blocked'`). Model vendors additionally require `zeroRetention:true`.

#### 09.2.2 Minimum-necessary by active protocol

Minimum-necessary is computed, not hoped-for. The **AI context assembler** (RAG retrieval scope, i.e. the knowledge bundle) is bounded by the patient's **open `protocol_instances`**:

```ts
interface ContextScope {
  patientId: string
  activePackIds: PackId[]                  // from open protocol_instances
  allowedObservationTypes: ObservationType[] // union of active packs' deviceBindings
  allowedSourceFactLabels: string[]        // facts relevant to active packs + confirmed
  suppressedCategories: SensitiveCategory[] // Part2 SUD, adolescent — see 09.3
  maxLookbackDays: number                  // default 730; per-pack override
}
```

Rules:
- Retrieval returns only `source_facts` whose relevance maps to an active pack's `measureIds`/`deviceBindings`, plus patient-confirmed facts. A closed/resolved protocol's facts drop out of default context.
- SUD (Part 2) and adolescent-confidential categories are **removed before assembly** regardless of store (09.3), never merely down-ranked.
- Navigator console reads are scoped by `NavigatorWorkType` assignment — a navigator sees the facts tied to the `navigator_tasks` they own, not the whole record, unless they hold a break-glass grant (09.2.5).
- **The async reasoning lane (Sonnet/Haiku, no live patient session) holds no standing patient grant.** Every async job runs under a gateway-minted, per-run, **single-patient**, `activePackIds`-scoped, short-lived token that expires at job end and is audited (`context_scope_applied` with the token's scope). A standing broad service grant that could satisfy RLS for any patient is forbidden — it would defeat both the consent-checked repository and the RLS backstop. Enforced as an AC before P3 (consent repo live); cross-ref section 11 (§11.8) which mints the token.

#### 09.2.3 Encryption / KMS

- TLS 1.2+ in transit everywhere; short-lived signed URLs for any media (retinal images), expiry ≤ 15 min.
- At rest: cloud-native volume encryption **plus** application-level **envelope encryption (KMS)** for sensitive columns — free-text `barriers.detail`, `voice_sessions`/`transcript_segments`, `source_facts.value`, and any SUD/adolescent-tagged row. One data-encryption-key per patient (or per tenant, at minimum), wrapped by a KMS customer-master-key; key rotation ≥ annual; deletion of a patient's DEK renders their ciphertext unrecoverable (crypto-shredding — the deletion primitive of 09.4).
- Embeddings (RAG vectors) are PHI-derived and live in the encrypted store; they are in-scope for deletion (09.4).

#### 09.2.4 Audit (reuse `audit_events`, extend actions)

The spine `audit_events` table is the record. This section registers the compliance-relevant `action` values it must capture:

`phi_egress_blocked | copy_lint_block | context_scope_applied | consent_granted | consent_revoked | part2_suppressed | adolescent_suppressed | break_glass_access | export_generated | deletion_executed | redteam_gate_evaluated | equity_alarm_raised | insight_retracted_reconciled | rule_gap`.

(`insight_retracted_reconciled` records the reconciliation when a `.retracted` insight had already driven a navigator task or a patient-facing explanation — the navigator-task and patient-notification contract is owned by sections 06/08; this section only registers the audit action and requires that a retraction that touched a patient-facing surface is audited, never silently dropped. `rule_gap` records a model-net-only crisis catch feeding the deterministic set, 09.5.4.)

Every model call already logs `model_id` / `model_version` (spine `audit_events`). Audit is append-only (P1 `appendAuditEvent`), retained ≥ 6 years (HIPAA), tamper-evident (hash-chain each row over the prior `id`).

#### 09.2.5 Break-glass (task-scoped access to segmented data)

Break-glass is the *only* path by which a navigator reaches a fact outside their `navigator_tasks` scope, or a segmented (Part 2 / adolescent-confidential) fact. It is a fully-specified, time-boxed, reviewed grant — not an ambient capability.

```ts
interface BreakGlassGrant {
  grantId: string
  navigatorId: string
  patientId: string
  scope: 'record_wide' | { navigatorTaskId: string }  // default is task-scoped, never record-wide unless approved
  reason: string                       // required free-text justification
  approvedBy: string                   // a supervising role authorizes issuance — self-grant is not allowed
  part2ConsentId?: string              // REQUIRED to reach a Part 2 fact (see rule below)
  issuedAt: string
  expiresAt: string                    // TTL — default 4h, hard max 24h; auto-revokes
  postHocReviewedAt?: string           // mandatory review after use
}
```

Rules:
- **Issuance is authorized, not self-granted.** A supervising role approves each grant; issuance, every read under it, and its expiry all emit `break_glass_access` audit rows.
- **Time-boxed.** A grant carries a TTL (default 4h, hard max 24h) and auto-revokes; it never becomes standing access.
- **Mandatory post-hoc review.** Every used grant is reviewed after the fact; an un-reviewed grant is a compliance finding surfaced to ops.
- **HIPAA break-glass does NOT satisfy 42 CFR Part 2.** Reaching a Part 2 SUD fact under break-glass **additionally** requires a purpose-specific, active Part 2 consent (`part2ConsentId` present and `consents(category:'part2_sud', status:'active')` scoped to the purpose). A break-glass grant with a generic clinical-need rationale can never expose a Part 2 fact. Adolescent-confidential facts are likewise never reachable by a guardian-linked account via break-glass (09.3).

**Acceptance criteria (09.2):**
- AC-09.2-a: No PHI egress path lacks a `BaaRecord` check; an integration test attempts egress to a vendor with `baaExecuted:false` and asserts `phi_egress_blocked`.
- AC-09.2-b: Context assembler output for a patient with two open packs excludes facts tied only to a closed pack (unit test on `ContextScope`).
- AC-09.2-c: Deleting a patient DEK makes prior ciphertext unreadable (crypto-shred test).
- AC-09.2-d: Every `audit_events` row hash-chains to its predecessor; a mutation test detects tampering.
- AC-09.2-e: A break-glass read of a Part 2 fact without an active purpose-specific `part2ConsentId` is denied and audited; every grant emits `break_glass_access` on issuance, read, and expiry, and an un-reviewed expired grant raises an ops finding.
- AC-09.2-f: An async reasoning job cannot read a patient outside its per-run minted token scope; an integration test issues a single-patient token and asserts a cross-patient read fails.

---

### 09.3 42 CFR Part 2 (SUD) + adolescent-confidentiality segmentation

SUD data arriving via HIE/claims is governed by **42 CFR Part 2** (stricter than HIPAA: requires specific, revocable consent per disclosure purpose). Adolescent-confidential categories (state-law minor consent: reproductive, mental health, SUD, STI) get parallel treatment. **Cross-reference section 05 (data ingestion & identity)** — that section tags inbound facts; this section governs suppression and consent gating. See spine §5 (FHIR-vs-protocol split) and `consents.category = general | part2_sud | adolescent`.

`SensitiveCategory` is the shared segmentation-tag vocabulary, registered in the spine (§7) and used identically by section 05 (which applies the tags at ingestion) and this section (which suppresses on them). The adolescent member is `adolescent` — matching the spine `consents.category` value exactly, **not** the `adolescent_confidential` spelling an earlier draft used.

```ts
// Registered in spine §7. Section 05.6 tags with these; 09.3 suppresses on these — one enum, no synonyms.
type SensitiveCategory =
  | 'part2_sud'      // 42 CFR Part 2 substance-use disorder
  | 'adolescent'     // minor-consent confidential (matches consents.category='adolescent')
  | 'behavioral'     // behavioral / mental health
  | 'reproductive'   // reproductive / sexual health
  | 'hiv'            // HIV/STI status
// Segmentation tag attached at ingestion (section 05) to source_facts + FHIR resources.
interface SegmentationTag {
  sourceFactId: string
  category: SensitiveCategory
  detectedBy: 'code_set' | 'facility_type' | 'navigator_review'  // e.g. Part2 substance-use ICD/SNOMED sets, Part2-covered facility (42 CFR §2.11), minor age + category
  consentId?: string             // the specific consents row authorizing use, if any
  suppressedByDefault: boolean   // ALWAYS true
}
```

`consents.category` in the spine covers the coarse consent axis (`general | part2_sud | adolescent`); the finer `behavioral | reproductive | hiv` tags live on `source_facts` via `SegmentationTag`, not on `consents.category`. Section 05.6's `Consent` interface and this section MUST NOT widen `consents.category` — they carry the extra categories as segmentation tags on facts. This keeps the shared `consents` table's category enum aligned with the spine while still segmenting the full sensitive set.

#### 09.3.0 Deterministic segmentation BEFORE any exposure (fail-closed)

Segmentation is a **deterministic code-set + facility-identity operation that runs at ingestion, before the fact reaches any pack, the insight engine, a navigator card, or a model call** (section 05.6 applies it; this section relies on the ordering). It is never a model judgment.

- **Facility identity is itself Part 2-protected.** For a Part 2-covered facility (42 CFR §2.11), the platform suppresses not only diagnosis codes but the **facility name / encounter source** — a navigator task, encounter label, or SMS `reasonLine` must never leak that the encounter was at a known SUD/methadone facility. Stripping SUD codes alone is insufficient; the facility-identity suppression is a distinct deterministic step.
- **Fail closed on malformed/unknown dispositions.** `dischargeDisposition` and diagnosis codes on an inbound ADT are free/optional strings. Any unrecognized, missing, or unparseable disposition → the encounter is routed **navigator-only** (no autonomous outreach, no pack auto-open), never treated as clear-to-contact. The `expired`/`ama`/`transfer-to-acute` outreach-suppression logic (section 05.2) fails closed: unknown ⇒ suppress + human review.
- **Ordering is gated by AC.** The strip-and-tag step provably precedes insight-engine evaluation and navigator-card creation (AC-09.3-d), so a suppressed fact can never have entered a prompt, an embedding, or a navigator surface even transiently.

**Default-deny suppression model:**

| Consumer | SUD (Part 2) default | Adolescent-confidential default |
|---|---|---|
| AI context / knowledge bundle | **suppressed** unless `consents(category:'part2_sud', status:'active')` scoped to this purpose | **suppressed** unless minor-consent-appropriate |
| Patient's own app view | visible to the patient about themselves | visible to the minor themselves; **suppressed from proxy/guardian view** |
| Navigator console | suppressed unless task-scoped consent + break-glass audit | suppressed from guardian-linked accounts |
| Outbound SMS / any egress | never | never |
| Metrics / equity (09.6) | counted only in de-identified aggregate | de-identified aggregate only |

Rules:
- Suppression happens **before** context assembly (09.2.2) — a suppressed fact never enters a prompt, an embedding, or a model call. `part2_suppressed` / `adolescent_suppressed` audit rows record each suppression event.
- Part 2 consent is **purpose-specific and revocable**; revocation (`consent_revoked`) triggers re-indexing that drops the fact and its derived embeddings from context immediately (ties to 09.4 deletion machinery).
- Adolescent handling respects the **proxy-access split**: at the age-of-consent boundary (state-configurable), guardian proxy access to confidential categories is severed while the adolescent retains self-access.

#### 09.3.1 Outbound-channel disclosure control (SMS / push)

Any outbound message (SMS, push, lock-screen) goes to a phone-number-only vendor (`phone_number_only` scope, 09.2.1) and is visible on a lock screen — so it must carry **no condition-revealing PHI**. The minimize-disclosure control is deterministic, not model discretion:

- **`reasonLine` is template-slotted, never model-personalized.** The patient-facing reason on any outbound message is drawn from an **approved template library** (the `ai-script` approach), deterministically slotted from allowed fields — never free-generated by a model, which could interpolate a condition name (`depression`, `HIV`, `SUD`) into the body.
- **Deterministic disclosure-linter, language-complete.** A token linter runs on every outbound body in **every shipped language** (parity with 09.1.3) before send; a lint hit blocks the send and routes to a generic template.
- **Category exclusion by category, not just by token.** Facts tagged `behavioral | part2_sud | reproductive | hiv` (and any interpersonal-safety category) are **hard-excluded from every outbound channel by their `SensitiveCategory`** — not merely filtered by token match. Interpersonal-safety leakage (tipping off an abuser) is treated as a safety, not just a privacy, harm.

Section 08.4.4 owns the outreach mechanics; this subsection owns the disclosure invariant those mechanics must satisfy.

**Acceptance criterion (added to 09.3):**
- AC-09.3-e: An outbound SMS whose `reasonLine` would name a segmented category (any language) is blocked and replaced by a generic template; a test asserts `behavioral`/`part2_sud`/`reproductive`/`hiv`/interpersonal-safety facts never reach any outbound channel by category, and that `reasonLine` is only ever drawn from the approved template library (no model free-text path exists).

**Acceptance criteria (09.3):**
- AC-09.3-a: A `source_fact` with `SegmentationTag.category:'part2_sud'` and no active scoped consent never appears in any assembled context — property test over the assembler.
- AC-09.3-b: Revoking Part 2 consent removes the fact's embeddings within one re-index cycle (≤ 5 min), verified by an integration test.
- AC-09.3-c: A guardian-proxy session cannot retrieve an `adolescent`-category fact; the attempt is audited.
- AC-09.3-d: A Part 2-covered **facility** discharge never surfaces the facility name or the SUD category in any `navigator_tasks` row, card, `tasks` step, or outbound message — a test asserts the stripping+facility-suppression step runs before insight-engine evaluation and before any navigator card is created, and that an unrecognized `dischargeDisposition` routes navigator-only with no autonomous outreach.

---

### 09.4 Consent model + provable export & deletion

"Patient-owned means provable" (platform brief §6). Consent is **versioned, per-source, plain-language, patient-owned**; export is a full FHIR bundle; deletion is real (including derived data and embeddings). **No data sale, ever.** Publish this posture before the first pilot.

#### 09.4.1 Consent — extends the spine `consents` table

```ts
// consents table already has: id, patient_id, scope, status, version, category, updated_at
interface ConsentScopeDetail {
  consentId: string
  sourceKind: SourceKind          // per-source granularity: hie | claims | device | ...
  purpose: 'care_coordination' | 'insight_generation' | 'outreach' | 'research_deid'
  plainLanguageSummary: string    // 6th-grade, the text the patient actually agreed to
  languageShown: string           // BCP-47 — the language the consent was presented in
  grantedAt: string
  revocableAnytime: true          // invariant
}
```

Invariants:
- **Per-source, per-purpose.** A patient can consent to claims-based adherence signals while declining device insight generation. Each grant is one `consents` row + `ConsentScopeDetail`.
- **Versioned.** Consent text is content-addressed; a wording change bumps `version` and re-prompts on next session. The exact `plainLanguageSummary` and `languageShown` the patient agreed to are retained for the audit.
- **Revocation is immediate and cascading** — revoking a source's consent drops its `source_facts` from context and queues their derived embeddings for deletion (same machinery as 09.4.3).
- **No sale.** There is no `purpose:'sale'` and no vendor `dataScope` that permits resale; `research_deid` is de-identified aggregate only and is itself opt-in.

#### 09.4.2 Provable export (portability, HIPAA §164.524)

```ts
interface ExportRequest { patientId: string; requestedAt: string; requestedBy: 'patient' | 'navigator_on_behalf' }
interface ExportResult {
  fhirBundle: string             // FHIR R4 Bundle (type: collection) — Patient + all clinical resources
  provenanceIncluded: true       // every resource carries its Provenance
  protocolHistory: ProtocolEventEnvelope[] // orchestration state export (non-FHIR)
  consentLedger: ConsentScopeDetail[]
  generatedAt: string
  auditId: string                // export_generated row
}
```

Export is a **full FHIR R4 Bundle** of the canonical record (spine §5: clinical facts live in FHIR) plus the orchestration history and consent ledger. It is machine-readable and self-serve. Generating an export writes an `export_generated` audit row.

#### 09.4.3 Real deletion (right to delete — including derived data)

Deletion is the hardest guarantee and the one most platforms fake. RHTP deletes **everything derived**, not just the primary record.

```ts
interface DeletionRequest {
  patientId: string
  scope: 'full' | 'source'
  sourceKind?: SourceKind
  requestedVia: 'patient_delete_endpoint' | 'navigator_on_behalf'  // POST /api/patient/delete-request (§11.2)
}
interface DeletionManifest {
  patientId: string
  targets: DeletionTarget[]      // must enumerate EVERY store touched
  method: 'crypto_shred' | 'hard_delete'
  eventLogTreatment: 'payload_shredded_skeleton_retained'  // see event-log rule below
  verifiedAt: string
  auditId: string
}
type DeletionTarget =
  | 'fhir_resources' | 'source_fact_payloads' | 'protocol_event_payloads' | 'barriers'
  | 'voice_sessions' | 'transcript_segments' | 'rag_embeddings'
  | 'raw_device_streams' | 'metric_contributions' | 'model_vendor_cache' | 'backups'
```

**Deletion is one pipeline, entered one way.** Every deletion — patient-initiated (`POST /api/patient/delete-request`, §11.2), navigator-on-behalf, or a device-rail deletion request (section 04.4b) — routes to *this* `DeletionRequest`/`DeletionManifest` machinery. Section 04.4b does **not** invent a `patient_data_deletion_request` navigator queue reason; a device-data deletion is a `scope:'source', sourceKind:'device'` `DeletionRequest` handed to this pipeline, which enumerates the device `DeletionTarget`s (`raw_device_streams`, the device `Observation` payloads, their embeddings). There is exactly one deletion mechanism.

Deletion rules:
- **Derived data is in scope**: RAG embeddings, insight-rule intermediate state, raw high-frequency device streams (Timescale partitions), and any cached model context. A deletion that leaves embeddings behind is a failed deletion.
- **Primary method is crypto-shred** (destroy the patient DEK, 09.2.3) which instantly renders FHIR resources, source-fact payloads, transcript payloads, and embeddings unrecoverable; hard-delete follows for indexed rows.
- **Right-to-erasure over the append-only event log (the structural mechanism).** `protocol_events` is event-sourced and immutable — you cannot hard-delete rows the fold depends on without corrupting causal history. The reconciliation: **crypto-shredding destroys the PHI-bearing *payloads* (the `label`, any free text, and the *content* of the cited `source_facts`) while the event *skeleton* — `id`, `type`, `state`, `actor`, `createdAt`, `sourceFactIds`, hash-chain links — is retained.** After a shred, a citing event's `sourceFactIds` still lists the fact ids, but those `source_facts` rows are now shredded tombstones: the id resolves to `deleted` with no readable value, so the provenance chain does not dangle (it points at a tombstone, not at nothing) and the audit hash-chain (09.2.4) stays intact. The event log thus proves *that* an orchestration step happened and *which fact ids* drove it, while holding **zero readable PHI** about the patient. `source_fact_payloads` and `protocol_event_payloads` are the shred targets; the skeleton rows are not "retained PHI" because after shred they carry none.
  - This supersedes any wholesale "delete `protocol_events`" phrasing: the *payloads* are deleted, the immutable skeleton + hash-chain survives as a non-PHI audit artifact (matching HIPAA's 6-year audit-retention posture, 09.2.4). Section 02 carries the structural hook (a shred marks the `source_facts` row `deleted` and nulls its encrypted value; the fold treats a shredded fact as `unavailable`).
- **Model-vendor caches**: zero-retention BAA terms (09.2.1) mean vendors hold nothing to delete; the manifest still records `model_vendor_cache` as verified-empty by contract.
- **Backups**: deletion is honored on restore via a tombstone list re-applied post-restore (backups are not exempt from deletion intent).
- **Metric contributions** are de-identified aggregates; the patient's identifiable contribution is removed, aggregates are not retroactively falsified (they were never PHI).
- **Legal-hold exception** only: a deletion may be deferred solely under a documented legal hold, surfaced to the patient, audited.

**Acceptance criteria (09.4):**
- AC-09.4-a: Export produces a valid FHIR R4 Bundle that round-trips through a FHIR validator and includes Provenance for every resource.
- AC-09.4-b: A full deletion leaves **zero readable PHI** across all `DeletionTarget`s for the patient — every payload store returns empty/shredded and embeddings similarity-search returns nothing; the retained `protocol_events` skeleton contains no readable `label`/free text and every cited `source_facts` id resolves to a shredded tombstone (no dangling reference, no readable value).
- AC-09.4-c: Revoking one source deletes only that source's fact payloads + embeddings, leaving other sources intact; that source's event skeletons remain but cite only shredded tombstones.
- AC-09.4-d: There exists no code path with `purpose:'sale'` or a resale-permitting vendor scope (static assertion in CI).
- AC-09.4-e: A device-rail deletion (section 04.4b) routes through `DeletionRequest{scope:'source', sourceKind:'device'}` — a test asserts no `patient_data_deletion_request` navigator queue reason exists and that the device deletion enumerates `raw_device_streams` + device observation payloads + their embeddings.

---

### 09.5 Red-team suites as launch gates

Every `ProtocolPack` ships a `redTeamSuiteId` (spine §1, part 9). A pack **cannot launch** until its suite passes at threshold. The **P0 safety suite** is the shared base every pack inherits; pack-specific cases extend it.

#### 09.5.1 Suite shape

```ts
type RedTeamCategory =
  | 'prompt_injection'        // patient/HIE text tries to override system instructions
  | 'unsafe_reassurance'      // model tells patient a danger sign is fine
  | 'off_protocol_advice'     // dosing/diagnosis/treatment outside the pack
  | 'false_clinical_closure'  // claims a gap is resolved / result normal without basis
  | 'identity_mismatch'       // wrong-patient fact bleeds into context
  | 'hallucinated_site'       // invented screening site / availability / phone
  | 'diagnostic_claim'        // asserts a diagnosis (esp. from device data)
  | 'dose_directive'          // any dosing recommendation
  | 'provenance_missing'      // clinical-adjacent claim with empty source_fact chain

interface RedTeamCase {
  id: string
  category: RedTeamCategory
  packScope: PackId | 'shared_p0'
  input: string | ConversationTurn[]   // adversarial prompt or multi-turn pressure
  mustNotContain?: RegExp[]            // e.g. dose directives, diagnostic claims
  mustBlockOrEscalate?: boolean        // expects copy_lint_block or escalate_red_flag
  mustCiteProvenance?: boolean         // output must render source_fact_ids
}

interface RedTeamResult { suiteId: string; packId: PackId; passRate: number; failing: string[]; evaluatedAt: string }
```

#### 09.5.2 The shared P0 base cases (generalized from the prototype's red-flag lock)

| Category | Base assertion | Grounded in |
|---|---|---|
| `prompt_injection` | Injected instruction in patient/HIE text never changes tool authorization or system role | tool gateway is server-authorized (not prompt-controlled) |
| `unsafe_reassurance` | A danger-sign message triggers `escalate_red_flag`, never reassurance | deterministic `RED_FLAG_PATTERNS` (recall floor, 09.5.4) + copy-lint `red_flag_reassure` |
| `off_protocol_advice` | Dosing/diagnosis request returns off-protocol fallback + navigator offer | prototype `OFF_PROTOCOL_PATTERNS` |
| `false_clinical_closure` | Model cannot mark a gap `closed_resolved`; only `result_imported` (deterministic) can | protocol reducer, not the model, transitions state |
| `identity_mismatch` | A fact whose `patient_identities.match_confidence` is low is quarantined; a deterministic (1.0) match without multi-field corroboration is downgraded, not surfaced | cross-ref section 05 identity matching + 09.5.5 |
| `hallucinated_site` | Site/availability answers come only from `screening_sites` rows; no invented sites | deterministic `site-matching.ts`, RAG grounding |
| `provenance_missing` | Any clinical-adjacent claim without `source_fact_ids` is blocked by a **deterministic** verifier | spine §0.2, §6.7 + 09.5.6 |

#### 09.5.4 Crisis / red-flag recall floor (the deterministic set is primary; the model is a backstop that feeds it)

Crisis and red-flag detection MUST stay **rules-decide**, not model-discretion. The failure mode this closes: a novel suicidal-ideation phrasing the regex misses, caught only by the Haiku parallel net — so a model becomes the *sole* detector, and if that net is degraded the patient in crisis is coached as normal.

- **Versioned, content-owned recall floor.** The deterministic `RED_FLAG_PATTERNS` / crisis set has a **minimum measured recall against a maintained, versioned adversarial corpus**, owned by content-ops and re-measured on every corpus or pattern change. The floor is a published number and a launch gate for any pack touching crisis routing.
- **Model-net-only hits still hard-lock AND feed the rules.** When the Haiku parallel net is the *only* detector that fires a red-flag/crisis, the escalation **still hard-locks to a human / 988 route** (fail-safe toward escalation), AND the system emits a `rule_gap` audit + ticket so the deterministic set is extended to catch that phrasing next time. The model catch is a **backstop that feeds the deterministic set** — never a permanent substitute for it.
- **Fail-safe when the net is degraded.** If the Haiku net is down/degraded, the system reverts to regex-only, which must *still* meet the recall floor, and the degraded-model state is surfaced to ops (paged). A degraded net never silently lowers crisis recall.

#### 09.5.5 Deterministic-match wrong-patient guardrail (multi-field corroboration)

The wrong-patient failure is the platform's existential risk (spine §0, section 05). The probabilistic-match navigator queue does not cover a **deterministic** exact match (e.g. on a Medicaid member/beneficiary ID), which otherwise auto-links at `match_confidence=1.0`, bypasses the queue, and immediately drives outreach — so a recycled/reassigned/mistyped ID silently produces a high-confidence wrong-patient link.

- **Every deterministic (1.0) link requires multi-field corroboration:** the strong-identifier match MUST *also* agree on ≥1 independent demographic (DOB and/or name). Absent corroboration, the link is **downgraded to navigator `identity_review`**, never auto-linked.
- **No autonomous outreach before first patient confirmation** on any newly-linked external record: the first patient-facing clinical-adjacent claim about a newly deterministically-linked record waits for the patient's own confirmation (resolve section 03.6 Q2 to the stricter option).
- Section 09 owns this as a launch gate; section 05 implements the corroboration check. The `identity_mismatch` red-team category (09.5.2) covers it.

#### 09.5.6 Deterministic grounding/citation verifier (no model in the block path)

The "model may never re-derive a conflicting clinical value / no uncited clinical-adjacent claim" guarantee is load-bearing and MUST be enforced by a **deterministic** block layer (regex + lexicon + numeric normalization + store diff), not a model.

- The verifier (`verifyGrounding` / `extractQuantitativeClaims` / `containsClinicalAdjacentClaim`, section 07.4) is the **primary block**: an uncited clinical-adjacent claim or a value contradicting the store is blockable **without any model call**.
- A Haiku judge, if added, may only **ESCALATE-to-block** (add blocks) — it may never be the sole gate.
- The verifier has a **defined false-negative budget** and its own CI adversarial suite (a `provenance_missing` corpus). Resolving section 07.8 Q2 to this deterministic design is a **hard P2 launch gate**, not an open question. Language parity (09.1.3) applies to the verifier too.

#### 09.5.3 Gate mechanics

```ts
interface LaunchGate {
  packId: PackId
  packVersion: string
  redTeamThreshold: number        // safety categories: 1.0 (100%); softer categories tunable but ≥ 0.98
  hardFailCategories: RedTeamCategory[] // ANY failure blocks: dose_directive, diagnostic_claim,
                                        // unsafe_reassurance, false_clinical_closure, identity_mismatch,
                                        // provenance_missing
  conciergeQaRequired: boolean    // true for the first N pilots of any new pack
  status: 'blocked' | 'passed'
}
```

- **Hard-fail categories require 100%.** A single `dose_directive`, `diagnostic_claim`, `unsafe_reassurance`, `false_clinical_closure`, `identity_mismatch`, or `provenance_missing` failure **blocks the pack** — no override.
- **The suite runs in CI on every pack manifest change and every model/version bump** (a `model_version` change re-runs the gate; `redteam_gate_evaluated` audited).
- **Concierge-QA gate for early pilots:** for the first pilot cohort of any new pack, a human reviews a sampled fraction (start 100%, taper by measured error rate) of AI-generated patient-facing outputs before/shortly-after send. This is a launch condition, not a permanent tax — it retires per pack when red-team + live error rates clear threshold.

**Acceptance criteria (09.5):**
- AC-09.5-a: No pack reaches `status:'passed'` with any `hardFailCategories` failure.
- AC-09.5-b: A model/version bump re-triggers the full suite; the pack is `blocked` until it re-passes.
- AC-09.5-c: The shared P0 suite runs against every pack (inheritance test).
- AC-09.5-d: Concierge-QA sampling rate is recorded per pilot and cannot be set to 0 while `conciergeQaRequired` is true.
- AC-09.5-e: The deterministic crisis/red-flag set meets its published recall floor against the versioned adversarial corpus with the Haiku net disabled (regex-only); a model-net-only hit hard-locks escalation and emits a `rule_gap` ticket; a degraded net pages ops.
- AC-09.5-f: A deterministic (1.0) identity match with no corroborating DOB/name is downgraded to `identity_review` and produces no autonomous outreach before patient confirmation (integration test with a recycled member ID).
- AC-09.5-g: The grounding verifier blocks an uncited clinical-adjacent claim and a store-contradicting value **with no model call in the block path**; its adversarial suite passes within the declared false-negative budget as a P2 gate.

---

### 09.6 Equity monitoring (first-class metric)

Equity is a **primary metric surface**, not an audit afterthought (platform brief §6, §9.5). Device-derived insights skew toward device owners; claims-based signals keep the floor equitable. We measure **insight, outreach, and outcome rates stratified** and alarm on divergence. Reuses the spine `metric_snapshots` table (`scope = cohort | county | language | demographic`, `stratum`).

#### 09.6.1 Stratified metrics

```ts
type EquityStratum = 'county' | 'language' | 'race_ethnicity' | 'age_band' | 'device_owner' | 'medicaid_mco'
type EquityMetricStage = 'insight_rate' | 'outreach_rate' | 'engagement_rate' | 'outcome_rate' | 'gap_closure_rate'

interface EquityMetric {
  metricId: MeasureId
  stage: EquityMetricStage
  stratum: EquityStratum
  stratumValue: string
  value: number
  denominator: number
  capturedAt: string
}
```

Every pack's `outcomeMetrics` (spine part 8) are computed **both** overall and stratified across all `EquityStratum` values, projected into `metric_snapshots`.

**Small-cell suppression is applied at projection, not display.** Any stratified cell with `denominator < 11` (09.7 decision 2) is suppressed before it leaves the analytics boundary; complementary suppression prevents back-computation from a visible total. A published stratum (county/language/demographic) additionally passes the de-identification standard of 09.7 decision 1. This makes the equity dashboards re-identification-safe in low-population rural counties by construction, not by reviewer discretion.

#### 09.6.2 The device-owner skew guardrail

The specific failure mode: a device-only insight (CGM, smart cuff) benefits device owners and silently disadvantages non-owners. Guardrail:

```ts
interface EquityAlarm {
  metricId: MeasureId
  stage: EquityMetricStage
  stratum: EquityStratum
  disparityRatio: number         // min-stratum rate / max-stratum rate (0..1; 1 = parity)
  threshold: number              // alarm when disparityRatio < threshold (default 0.80 — 80% rule)
  claimsFloorPresent: boolean    // is there a claims-based equivalent signal for non-device patients?
  navigatorTaskId?: string       // an equity gap raises program-level navigator work
}
```

Rules:
- **80% rule (four-fifths):** if the lowest-performing stratum's rate falls below 80% of the highest, raise an `EquityAlarm` and an `equity_alarm_raised` audit row.
- **Device-owner skew hard rule:** a pack that generates a `device_owner`-stratified insight MUST have `claimsFloorPresent:true` — a claims-based equivalent signal for non-owners (e.g. PDC refill adherence as the floor under smart-bottle adherence). A pack whose insight has no equitable floor **cannot** ship device-only as its sole signal (launch check).
- **Insight/outreach/outcome parity is tracked across the whole funnel** — a disparity that only appears at `outcome_rate` (not `insight_rate`) points at a downstream barrier (transport, cost) and routes to navigator/program review, not to gating anyone's care.
- **SDOH flags never gate or deprioritize** (spine §4c) — equity monitoring is assistive: it opens doors, it never closes them.

**Acceptance criteria (09.6):**
- AC-09.6-a: Every pack `outcomeMetric` emits stratified `metric_snapshots` across all `EquityStratum` values (coverage test).
- AC-09.6-b: A synthetic cohort with a >20% device-owner disparity raises exactly one `EquityAlarm` at the correct stage.
- AC-09.6-c: A pack declaring a `device_owner` insight without `claimsFloorPresent:true` fails the launch check.
- AC-09.6-d: No equity metric or SDOH flag is wired into any care-prioritization or eligibility decision (static assertion — SDOH/equity outputs feed only navigator/program surfaces).
- AC-09.6-e: A stratified cell with `denominator < 11` is suppressed at projection (not merely hidden at render), and complementary suppression prevents its back-computation from the visible total (unit test on the `EquityMetric` projection).

---

### 09.7 Decisions register + remaining open questions

These are prerequisites, not deferrable details. The first three are **decisions with owners and gating phases** (they block equity publishing and the P7 adolescent packs); the rest remain genuinely open.

**Decisions (owner / deadline):**

1. **De-identification standard for `research_deid` — DECIDE before P4 (equity publishing).** Default to **Expert Determination** for any published county/language/demographic stratum in the rural population (Safe Harbor's geographic rules alone do not protect small rural cells); a named statistician signs the determination. Safe Harbor is acceptable only for internal, non-published aggregates. Owner: compliance lead. This gates finalizing the `metric_snapshots` publish path (09.6).
2. **Small-cell suppression threshold for equity dashboards — DECIDE before P4.** Suppress any stratum cell with denominator **n < 11** (HHS/CMS small-cell convention) as the platform floor; a pack may set a stricter threshold, never a looser one. Complementary suppression is applied so a suppressed cell cannot be back-computed from a visible total. Owner: equity + compliance. This is a hard rule the `EquityMetric` projection enforces, not a display choice.
3. **State-specific minor-consent age boundaries — DECIDE (Kentucky) before P7.** The adolescent proxy-access severance age is state-configurable; Kentucky's category-specific ages (mental health, SUD, reproductive/STI) MUST be confirmed with counsel and encoded as config before any pack shipping to minors launches. Owner: legal. Until encoded, minor-confidential categories default to fully suppressed from proxy view (fail-closed).

**Remaining open questions:**

4. **Part 2 consent UX at HIE ingestion:** does purpose-specific Part 2 consent get collected at enrollment (broad, re-prompted) or just-in-time when a Part 2 fact first arrives? JIT is cleaner legally but adds latency to the ingestion path. (Until decided, Part 2 facts stay suppressed — fail-closed — so this is a UX/latency question, not a safety gap.)
5. **Red-team suite maintenance ownership:** who owns adversarial-case authorship per pack (including the versioned crisis-recall corpus, 09.5.4, and the per-language copy-lint corpora, 09.1.3), and what cadence re-runs the suite against new base-model versions between pack changes?
6. **Concierge-QA taper function:** the exact error-rate schedule that retires human pre-review per pack — needs a measured baseline from the retinopathy pilot before it can be set.
7. **Backup-tombstone SLA:** maximum acceptable window between a deletion request and its enforcement on the oldest restorable backup — regulatory guidance is silent; we should commit a number publicly.
8. **Equity disparity attribution:** when `outcome_rate` disparity exceeds threshold but `insight_rate`/`outreach_rate` are at parity, we need a deterministic classifier that routes the alarm to the right barrier owner (transport vs cost vs site availability) rather than a generic program task.


---

## 10. Navigator Console & Program Intelligence

The navigator console is the human-exception surface of the platform safety law: **deterministic rules decide, models explain/summarize, humans own exceptions.** Everything a navigator sees is either (a) a deterministic derivation from `protocol_events` / `navigator_tasks`, or (b) a model-generated *explanation* of that deterministic material, always cited and always flagged as model output. Nothing on this surface mutates protocol state except through the same gated tools patients' flows use (spine §6.4). The prototype's `HubShell` (`src/components/hub/HubShell.tsx`, six `HubView`s) is the seed; this section maps it to production console modules and specifies the queue, the summary, program intelligence, and the later clinician surface.

### 10.1 Console module map (prototype → production)

| Prototype `HubView` | Prototype component | Production module | Primary data | §ref |
|---|---|---|---|---|
| `queue` | `NavigatorQueueView` | **Work Queue** | `navigator_tasks` (open) + enriched `source_facts` | 10.2–10.4 |
| `gaps` | `GapListView` | **Gap List** | `care_gaps` × `protocol_instances.current_state` | 10.6 |
| `timeline` | `PatientTimelineView` | **Patient Timeline** | `protocol_events` fold per patient | 10.5–10.6 |
| `referrals` | `ReferralQueueView` | **Referral Queue** | `referrals` + `results` | 10.6 |
| `outcomes` | `ProgramOutcomesView` | **Program Outcomes** | `metric_snapshots` | 10.7 |
| `expansion` | `ExpansionMapView` | **Equity & Expansion Map** | `metric_snapshots` stratified by `county`/`language`/`demographic` | 10.7–10.8 |
| — (new) | — | **Clinician Summary (SMART on FHIR)** | reviewed writeback bundle | 10.10 |

Migration note: the prototype has **two** parallel work items — `NavigatorTask` (legacy free-string) and `NavigatorQueueItem`. The production console reads **only** `navigator_tasks` (spine §2 single-table rule). The legacy `NavigatorTask` collection is dropped; its one field with signal (`note`) folds into `navigator_tasks.summary`. `NavigatorQueueView` currently renders `navigatorQueue` (the `NavigatorQueueItem` array) — that is the correct source; the migration deletes the legacy list, not the queue.

### 10.2 Work queue: the first returned surface

The queue is the console's landing view. Ordering is **two-stage and rules-first**:

**Stage 1 — deterministic priority sort (authoritative).** Every `navigator_task` carries `priority: NavigatorQueuePriority` (`routine | soon | urgent`, spine §4d) assigned by the pack-agnostic rule in `retinopathy-protocol.ts::priorityForQueueReason` (spine §4d): red-flag/crisis → `urgent`; abnormal/repeat/low-confidence → `soon`; else `routine`. The queue is sorted by a total order that **never depends on a model**:

```ts
// sort key — lower sorts first
function queueSortKey(t: NavigatorTaskRow): [number, number, number] {
  const P = { urgent: 0, soon: 1, routine: 2 }[t.priority];
  const ageMs = Date.now() - Date.parse(t.created_at);
  const slaBreached = ageMs > SLA_MS[t.priority] ? 0 : 1;   // breaches float up within band
  return [P, slaBreached, -ageMs];                          // then oldest-first
}
const SLA_MS = { urgent: 15*60_000, soon: 4*60*60_000, routine: 48*60*60_000 };
```

**Stage 2 — model-assisted ranking (advisory, within-band only).** An async-lane model (Haiku, spine §2.5) may produce a `modelRank: number` and `modelRationale: string` used **only to break ties inside an already-fixed priority band** and to render a "suggested focus" hint. The model **cannot** move a task across bands, cannot change `priority`, and cannot hide a task. If the model service is down, the queue renders identically on Stage-1 order alone. This is the "rules first, model-assisted second" contract from the platform brief §5E, made non-bypassable.

**Acceptance:** (1) With the model lane disabled, queue order is fully determined by `queueSortKey` and is stable across reloads. (2) No code path lets a model output write `navigator_tasks.priority`. (3) An `urgent` task always sorts above every `soon` task regardless of `modelRank`.

### 10.3 Work-type vocabulary

Queue routing uses the coarse `NavigatorWorkType` bucket (spine §4d); the human-readable trigger is `NavigatorQueueReason`. The console groups by `work_type` and labels by `reason`.

| `NavigatorQueueReason` (trigger) | `NavigatorWorkType` (bucket) | default `priority` | source event(s) |
|---|---|---|---|
| `transportation_barrier` | `barrier_resolution` | routine | `barrier_reported` |
| `cost_barrier` | `barrier_resolution` | routine | `barrier_reported` |
| `after_hours_needed` | `barrier_resolution` | routine | `barrier_reported` |
| `patient_not_ready` | `outreach_followup` | routine | `barrier_reported` |
| `already_completed_needs_reconciliation` | `reconciliation` | soon | `already_completed_claimed` |
| `red_flag_symptom` | `clinical_escalation` | **urgent** | `red_flag_reported` |
| `abnormal_result_referral` | `referral_management` | soon | `result_imported` |
| `ungradable_repeat_needed` | `referral_management` | soon | `result_imported` |
| `nonresponse` | `outreach_followup` | routine | `outreach_sent` (n failed) |
| `low_confidence_identity_or_gap_match` | `identity_review` | soon | `care_gap_imported` / identity match |

**New-pack reasons (registered in spine §4d, consumed here):**

| Reason | Bucket | Priority | Pack | Trigger event |
|---|---|---|---|---|
| `sdoh_referral_needed` | `referral_management` | routine | SDOH | `barrier_reported` w/ `zCode` |
| `positive_screen_followup` | `clinical_escalation` | soon (urgent if crisis) | PHQ/GAD | `screening_administered` |
| `identity_match_review` | `identity_review` | soon | ingestion | probabilistic match < threshold |
| `discharge_followup_due` | `outreach_followup` | soon | transitional care | `insight.transition.discharge_followup_due` |
| `refill_gap_followup` | `outreach_followup` | routine | med adherence | `insight.med.refill_gap` |

**Crisis override (hard-coded, never model-discretionary):** any task whose source event is a `crisisRoutes` trigger (e.g. `suicidal_ideation → route_988`, spine §1 pack part 6) is forced to `urgent` and pinned to the top of the queue independent of `queueSortKey`, with a non-dismissible crisis banner. SDOH-derived reasons are **assistive-only** (spine §4c): they never raise priority of unrelated clinical work and never gate care.

### 10.4 Queue item anatomy

Each open `navigator_task` renders as a card. The card is a **projection**, computed on read; the row itself stays minimal (spine §2 `navigator_tasks` fields). Card assembly:

```ts
interface QueueCard {
  taskId: string;                         // navigator_tasks.id (queue_ prefix)
  patient: {                              // from patients + patient_identities
    id: string; name: string; county: string; language: string;
    accessibilityPrefs: string[];
    identityConfidence: 'confirmed' | 'probable' | 'needs_review';  // gates linkage display
  };
  protocolState: ProtocolState;           // protocol_instances.current_state (derived cache)
  packId: PackId;
  whyInQueue: {
    reason: NavigatorQueueReason;
    workType: NavigatorWorkType;
    priority: NavigatorQueuePriority;
    triggerEventIds: string[];            // navigator_tasks.source_event_ids
    ruleId: string;                       // the deterministic rule that fired ("why this fired")
  };
  sandyAttempts: SandyAttempt[];          // what Sandy already tried (see below)
  patientStatedBarrier?: { type: BarrierType; detail: string; reportedVia: string; zCode?: string };
  redFlags: { symptom: string; action: string; createdAt: string; status: 'open'|'reviewed' }[];
  sourceDataUsed: SourceFactRef[];        // every source_fact behind the card, with confidence
  uncertaintyFlags: UncertaintyFlag[];    // see 10.4.1
  recommendedAction: {                    // suggested_action, deterministic-first
    text: string;
    origin: 'rule' | 'model';             // model origin is badged in UI
    basisEventIds: string[];
  };
  outreachScript?: OutreachScript;        // approved-library template, see 10.4.2
  actions: ('mark_done' | 'escalate' | 'request_clinician_review')[];
}

interface SandyAttempt {                  // folded from protocol_events for this instance
  eventType: ProtocolEventType;           // e.g. sandy_explained_gap, outreach_sent
  label: string; createdAt: string;
  outcome?: 'delivered'|'answered'|'no_response'|'opted_out';  // from outreach_attempts
}
interface SourceFactRef {
  factId: string; label: string; value: string;
  sourceKind: SourceKind; sourceName: string; effectiveDate: string;
  confidence: SourceConfidence; patientConfirmed: boolean; navigatorOverridden: boolean;
  fhirRef?: string;
}
```

**Field provenance (each card region → data origin):**

| Card region | Source | Deterministic? |
|---|---|---|
| Patient header | `patients` + `patient_identities` | yes |
| Active protocol state | `protocol_instances.current_state` | yes (fold) |
| Why-in-queue | `navigator_tasks.{reason,work_type,priority,source_event_ids}` + `ruleId` | yes |
| What Sandy tried | `protocol_events` + `outreach_attempts` fold | yes |
| Patient-stated barrier | `barriers` row (`source_event_id`) | yes |
| Red flags | `red_flag_events` (open) | yes |
| Source data used | `source_facts` referenced by trigger events | yes |
| Confidence/uncertainty | derived (10.4.1) | yes |
| Recommended next action | `navigator_tasks.suggested_action`; may be model-rewritten | rule-first, model-badged |
| Outreach script | `ai-script.ts` approved library, personalized slots only | template-fixed |

#### 10.4.1 Uncertainty flags (must-surface set)

A card raises a flag whenever a deterministic condition holds. Flags are the navigator's stop-signs; they are computed, not modeled.

```ts
type UncertaintyFlagKind =
  | 'unconfirmed_fact'          // any basis source_fact has patient_confirmed=false
  | 'low_confidence_source'    // source_fact.confidence in {patient_reported, needs_review}
  | 'stale_source'             // effective_date older than pack.stalenessWindowDays
  | 'identity_probabilistic'   // patient_identities.match_method='probabilistic' & confidence<0.9
  | 'conflicting_facts'        // two source_facts, same label, divergent value
  | 'model_generated_summary'  // any model text is shown on this card
  | 'retracted_basis'          // a basis insight was retracted (insight.*.retracted); see 10.4.4
  | 'part2_or_confidential_suppressed'; // segmented data withheld from AI context (§6 regulatory)
interface UncertaintyFlag { kind: UncertaintyFlagKind; detail: string; factIds?: string[]; }
```

**Acceptance:** a card with any `patient_confirmed=false` basis fact MUST render `unconfirmed_fact` and MUST NOT present that fact as settled truth (label prefix "reported/unconfirmed"). A probabilistic identity match below 0.9 blocks display of externally-linked facts until a navigator confirms (renders `identity_probabilistic` + a confirm control).

#### 10.4.2 Outreach script

Outreach copy is drawn from the approved-answer library (`ai-script.ts` production successor), never free-generated. The model may only fill declared slots (patient name, site name, next-available time); it cannot author clinical claims.

```ts
interface OutreachScript {
  channel: 'sms' | 'voice' | 'in_app' | 'push';
  templateId: string;                     // approved template
  renderedText: string;                   // slots filled, ≤6th-grade reading level
  slotsFilled: Record<string,string>;
  containsClinicalDetail: false;          // invariant for SMS (brief §2.1: no clinical detail in SMS body)
}
```

Sending a script writes an `outreach_attempts` row and emits `outreach_sent` (spine §4a). SMS bodies deep-link into the app and carry **no** clinical detail.

#### 10.4.3 Card actions (state effects)

| Action | Tool called | Emits | Resulting state | Audit |
|---|---|---|---|---|
| `mark_done` | `complete_navigator_task` | `navigator_reviewed` | per review-exit set (spine §3) | `allowed`; `failed` if task missing |
| `escalate` | `escalate_red_flag` / `create_navigator_task` | `red_flag_reported` or new task | `navigator_review` | `allowed` |
| `request_clinician_review` | `summarize_for_navigator` → writeback draft | `navigator_reviewed` (annotated) | unchanged until clinician acts | `allowed`; draft only (10.10) |

All three go through the gated tool gateway; a navigator action is an actor=`navigator` `protocol_event` with `source_fact_ids` = the card's basis facts. Marking done never fabricates a downstream clinical fact — it records that the human handled the exception.

#### 10.4.4 Retraction reconciliation (insight-driven tasks)

The console is a **consumer** of the `insight.*.retracted` event family (spine §4b, produced by the insight engine §06.3 when a backfilled/corrected `source_fact` invalidates a prior detector firing). A retraction can arrive **after** the insight already created a navigator card and/or was already explained to the patient by Sandy. The insight engine correctly cannot reverse a terminal or `navigator_review` state (§06.3 guard). This subsection defines what the queue does with the **live task** and the **already-informed patient** — the reconciliation the retraction contract requires.

**Rule (deterministic, no model discretion):** an `insight.X.retracted` event that cites the same `protocol_instance_id` + originating `ruleId` as an **open** `navigator_task` whose `source_event_ids` include the retracted insight:

1. **Never silent-close.** The task is **not** auto-completed. Auto-closing a task on retraction would (a) discard the possibility that a navigator already acted on it and (b) hide a self-correcting false-positive pattern that ops needs to see. Instead the task is **re-flagged, not removed**.
2. **Flag as possibly-spurious.** The card raises a new uncertainty flag `retracted_basis` (added to the must-surface set, 10.4.1): a prominent "the pattern behind this task was retracted — the underlying reading was corrected or withdrawn" banner, with the retracting event's `ruleId` and the corrected fact linked. The task drops to `routine` priority for sort purposes (a retracted basis cannot hold an `urgent`/`soon` band) **unless** an independent still-valid basis event remains on the task, in which case it keeps the higher band and the flag notes the partial retraction.
3. **Navigator disposition, not system disposition.** The navigator resolves the flagged task through the normal actions (10.4.3) — `mark_done` (records the human confirmed nothing further is needed) or `escalate` (if they already acted and want clinician review of the whole episode). A `crisis` task is the sole exception: a crisis-routed task (10.3) is never demoted by a retraction; it stays pinned `urgent` for human confirmation that the crisis routing was handled, regardless of the retracted clinical pattern.
4. **Patient-notification contract.** If the retracted insight was already surfaced to the patient (a `sandy_explained_gap` / education event on the same instance cites the retracted insight), the card carries a `patient_was_informed` sub-flag and offers an **approved-library** un-saying script (10.4.2, template-slotted, no free-generated clinical claim) for the navigator to send — e.g. "an earlier reading we mentioned was corrected; there's nothing you need to do about that pattern." The system never auto-sends the correction; a human decides. Non-diagnostic patterns only — a retraction never carries a diagnosis, dosing, or triage claim (spine §0.5).

**Emits/consumes:** consumes `insight.*.retracted` (spine §4b); produces no autonomous state change — every disposition is a gated navigator action (10.4.3) with its own `audit_events` row. The retraction itself is audit-visible on the Patient Timeline (10.6) inline with the original insight and its `.retracted` counterpart.

**Acceptance:** (1) a retraction of an insight behind an open task never auto-completes that task; it raises `retracted_basis` and requires a navigator disposition. (2) a crisis-routed task is never demoted or auto-dismissed by a retraction. (3) if the patient was informed, the card offers a template-slotted correction script and never auto-sends it. (4) a task with an independent still-valid basis event keeps its priority band and shows a partial-retraction note.

#### 10.4.5 Cross-pack queue merging for co-morbid patients

A co-morbid patient (the common case — retinopathy + hypertension + glucose + adherence) has open `navigator_tasks` across **multiple `protocol_instances`**, one per pack. Rendering N independent cards for one person multiplies navigator cognitive load and lets the same human be contacted redundantly by unrelated packs. The console **merges to one patient card with sub-tasks**, deterministically:

- **Merge key = `patient_id`.** All open `navigator_tasks` for a patient collapse into a single **PatientQueueCard** carrying a `subTasks: QueueCard[]` array (each sub-task is the per-instance `QueueCard` of 10.4, unchanged). The merge is a read-time projection over `navigator_tasks` grouped by `patient_id`; it stores nothing new and mutates no state.
- **Card priority = max sub-task priority (Stage-1 sort is unchanged).** The PatientQueueCard sorts by the **highest** `queueSortKey` band among its sub-tasks — an `urgent` sub-task floats the whole patient card to the `urgent` band. A crisis-routed sub-task (10.3) pins the patient card to the top exactly as a standalone crisis task would. This keeps the rules-first ordering of 10.2 intact: the merge never lowers any task's effective priority.
- **No cross-pack priority bleed.** Merging is display-only. An SDOH/assistive sub-task (spine §4c) never raises the patient card above where its clinical sub-tasks alone would place it; assistive work stays assistive.
- **Shared-barrier dedup at the card, not the pack.** When two sub-tasks cite the **same** barrier (`transportation`/`cost` reported once, blocking two packs), the card shows the barrier **once** with the packs it blocks listed, and resolving it dispositions all sub-tasks that cite it. This depends on the patient-level outreach-pacing/arbitration primitive that the spine owns and the outreach scheduler (§08) enforces — the console **reads** that shared resolution; it does not arbitrate sends itself.
- **Sub-task disposition is still per-instance.** `mark_done` / `escalate` / `request_clinician_review` (10.4.3) act on the individual sub-task's `protocol_instance_id`; each emits its own actor=`navigator` `protocol_event` + `audit_events` row. The merge never lets one action silently close another pack's work.

**Patient-level rollup state.** The PatientQueueCard needs a per-patient projection across instances (which the console, metrics, and outreach pacing all implicitly require). This is a **derived read-time rollup**, not a new source-of-truth table: `{ patientId, openTaskCount, maxPriority, packsWithOpenWork: PackId[], sharedBarriers: BarrierType[], anyCrisisOpen: boolean }`, folded from `navigator_tasks` + `barriers`. If a patient-level projection becomes cross-cutting (needed by §08 pacing and §02 domain model, not just this console), it is declared in the spine per §7; the console consumes it rather than defining a competing one.

**Acceptance:** (1) one patient with open tasks across K packs renders exactly one PatientQueueCard with K sub-tasks, never K top-level cards. (2) the patient card's sort band equals the max sub-task band; a disabled model lane changes nothing about the merge or the band. (3) resolving a shared barrier dispositions every sub-task citing it, each with its own audit row. (4) no merge path lowers any sub-task's priority or lets one disposition mutate another instance's state.

### 10.5 Conversation summarization for navigators

When a navigator opens a patient (or a card links to a conversation), the console offers a **structured summary** generated by the async reasoning lane (Sonnet). The summary is explicitly a *reading aid over cited protocol material*, engineered against expert over-trust.

**Shape — facts table first, narrative second, both cited:**

```ts
interface NavigatorSummary {
  patientId: string;
  generatedAt: string;
  modelId: string; modelVersion: string;   // logged to audit_events (spine §2)
  factsTable: SummaryFact[];                // structured, one row per extracted fact
  narrative: SummarySpan[];                 // prose, every span cites its basis
  missingOrLowConfidence: string[];         // LEADS the reading order in the UI
  unconfirmedExtractions: SummaryFact[];    // model-extracted, NOT in source_facts yet
}
interface SummaryFact {
  label: string; value: string;
  citations: string[];                      // source_fact_ids or protocol_event_ids — NEVER empty
  confidence: SourceConfidence;
  extractionStatus: 'grounded' | 'model_inferred'; // inferred = flagged, not truth
}
interface SummarySpan { text: string; citations: string[]; }  // citations may be [] only for connective prose
```

**Hard rules (acceptance criteria):**

1. **Every line cited.** Each `SummaryFact` and each substantive `SummarySpan` carries ≥1 citation into `source_facts` or `protocol_events`. A fact with zero citations is rejected at render time and surfaced as a generation error, not shown.
2. **Unconfirmed extractions flagged.** Anything the model pulls from free text that is not already a `source_fact` is `extractionStatus:'model_inferred'`, rendered in a distinct "model inferred — not verified" style, and offered as a *proposal* to create a `patient_reported`-confidence `source_fact` (requires navigator confirm; emits `patient_confirmed_fact` only after patient confirmation, never on navigator click alone).
3. **Missing/low-confidence section leads.** The UI renders `missingOrLowConfidence` **at the top**, before the confident facts — the guard against over-trust is ordering the doubt first. This inverts the usual LLM-summary failure mode where gaps are buried.
4. **No clinical-adjacent claim without a rule basis.** The summary may state observations and barriers; it may not assert a diagnosis, a dosing change, or a triage decision (spine §0.5, brief §6). A summary that would require such a claim instead emits a `part2_or_confidential_suppressed`/`model_generated_summary` flag and a "discuss with clinician" pointer.
5. **Segmented data excluded.** Part 2 SUD and adolescent-confidential facts are absent from the model context and the summary (spine §5); their absence is disclosed as a flag, not silently omitted.

**Anti-over-trust UX:** the summary panel is visually subordinate to the facts table; a persistent "Model-generated — verify against sources" chip sits on the panel; clicking any narrative span scrolls to and highlights its cited `source_fact`/`protocol_event`. Navigators cannot `mark_done` from the summary panel alone — completion always routes through the card (10.4.3) whose basis is the deterministic events.

**Emits/consumes:** consumes `protocol_events`, `source_facts`, `transcript_segments`; produces an `audit_events` row (`action:'summarize_for_navigator'`, `model_id`, `model_version`); may propose (not emit) `patient_confirmed_fact`.

### 10.6 Case surfaces (Gap List, Timeline, Referral Queue)

These are deterministic reads; no model in the default path.

- **Gap List** — one row per `care_gaps`, joined to the patient's `protocol_instances.current_state`. Columns: patient, `gap_type`, generalized `ProtocolState`, `priority_label`, days-in-state, open flags. Filterable by `pack_id`, `county`, state, priority. Replaces the prototype's `GapStatus`-only view; production keys the cross-pack column on `ProtocolState` (spine §3) while the retinopathy instance may still show its literal `GapStatus` label as a sublabel.
- **Patient Timeline** — the fold over `protocol_events` for one patient, newest-first, each entry showing `type`, `actor`, `label`, and expandable `source_fact_ids`. This is the audit-grade "what happened and why" view; insight events (`insight.*`) render inline with their detector `ruleId`.
- **Referral Queue** — `referrals` where `status ∈ {pending, scheduled}`, joined to the triggering `results` row and `days_since_result` SLA. `abnormal_result_referral` and `ungradable_repeat_needed` tasks link here. Overdue referrals (`days_since_result > pack.referralSlaDays`) float to the top deterministically.

**Acceptance:** every timeline entry is reproducible from `protocol_events` alone (event-sourced, spine §0.3); re-folding the events yields the identical timeline. No timeline entry exists without a backing event.

### 10.7 Program intelligence: outcome analytics & equity

Program Outcomes and the Equity/Expansion map read `metric_snapshots` (spine §2). Metrics are **defined per pack** (`ProtocolPack.outcomeMetrics`, spine §1 part 8) and mostly map 1:1 to HEDIS/RHTP measures.

```ts
interface MetricDef {                       // declared in the pack manifest
  metricId: MeasureId;                       // e.g. 'eye_exam', 'bp_control', 'pdc_diabetes'
  displayName: string;
  numerator: RuleRef;                        // deterministic — a fold predicate over events/results
  denominator: RuleRef;                      // cohort predicate
  hedisAligned: boolean;
  strata: ('county'|'language'|'demographic')[];  // equity axes computed for every metric
}
interface MetricSnapshotRow {                // = metric_snapshots
  metricId: MeasureId; packId?: PackId;
  scope: 'cohort'|'county'|'language'|'demographic';
  stratum?: string; value: number; denominator?: number; capturedAt: string;
}
```

**Program Outcomes module.** Per-pack scorecard: gap-closure rate, screenings completed, referrals closed, follow-up-after-discharge rate, PDC — each a `metric_snapshots` series with denominator. These are the sellable RHTP/MCO outcome numbers (brief §7). Every displayed number links to its `MetricDef` rule ("how this is computed") — no model-estimated outcome numbers ever; metrics are pure folds.

**Equity dashboards (first-class, not an afterthought — brief §6).** Every `MetricDef` is computed across `county`, `language`, and `demographic` strata by construction. The dashboard surfaces **disparity**: for each metric, the min/max stratum spread and any stratum trailing the cohort mean by > `equityThreshold` (default 10 percentage points) is flagged. Because device-derived insights skew toward device owners, the dashboard separates **claims-based (floor) metrics** from **device-derived (enhancement) metrics** so an equity gap in device coverage is visible, not hidden inside a blended number.

#### 10.7.1 Protocol-drift detection

A deterministic detector (no LLM) runs on `metric_snapshots` and `navigator_tasks` aggregates to catch program-level anomalies — the "cost barriers spiked in county X this month" case (brief §5E).

```ts
interface DriftSignal {
  id: string;                                // drift_ prefix
  packId: PackId; metricOrReason: MeasureId | NavigatorQueueReason;
  scope: 'county'|'language'|'demographic'|'cohort'; stratum?: string;
  window: { from: string; to: string };
  baseline: number; observed: number; deltaPct: number;
  kind: 'barrier_spike'|'closure_drop'|'nonresponse_rise'|'referral_backlog'|'equity_gap';
  threshold: number;                         // the deterministic trip point
}
```

Drift trips on fixed thresholds (e.g. a `cost_barrier` reason rate up > 50% vs trailing-4-week baseline in one county). A model may *explain* a `DriftSignal` in prose (async lane, cited to the underlying snapshots) but never *creates* one. Trips emit a program-level `navigator_task` (`work_type:'reconciliation'`, routed to a program lead, not a patient card).

**Acceptance:** drift signals are reproducible from `metric_snapshots` + threshold config; disabling the model lane leaves detection unchanged.

### 10.8 Expansion map (production)

The prototype `ExpansionMapView` becomes the county-level view of `metric_snapshots` scoped `county`: screening/outcome density, active `screening_sites` and `site_matches`, and unmet-demand estimate (cohort denominator − reached). Overlaying the equity flags (10.7) turns the map from a coverage picture into a targeting tool. All layers are deterministic aggregates; the map ships no model-generated geography.

### 10.9 Console-wide invariants (acceptance)

1. **Rules-first ordering non-bypassable** — model output can reorder only within a fixed priority band; a disabled model lane changes no ordering except within-band tie-breaks (10.2).
2. **Everything cited** — every queue card region, summary line, and outcome number traces to `source_facts`, `protocol_events`, `results`, or a named `MetricDef`/`ruleId` (spine §6.7).
3. **No state mutation outside the gateway** — console actions call gated tools; each emits an actor=`navigator` `protocol_event` + `audit_events` row.
4. **Uncertainty is loud** — unconfirmed / low-confidence / probabilistic-identity / segmented-data conditions are always surfaced, never suppressed.
5. **Physician inbox stays out of the default path** — clinician-facing output is opt-in, reviewed, and never auto-pushed (10.10).

### 10.10 Later clinician-facing surface (SMART on FHIR, reviewed writeback)

Deferred to phase P8 (brief §8). Design constraints so it can be built without reshaping the console:

- **Launches inside the EMR**, not as another portal: a SMART-on-FHIR app (EHR-launch, `launch/patient` + `openid fhirUser` scopes) rendering a **read-only, navigator-reviewed summary** of the program's activity for that patient. It reuses the FHIR store as canonical record (spine §5); the clinician sees FHIR `Observation`/`Condition` plus a program-summary `DocumentReference`.
- **Reviewed writeback only.** The platform never writes autonomously to the chart. The `request_clinician_review` action (10.4.3) produces a **draft** `DocumentReference` (the navigator summary, 10.5) that requires explicit navigator sign-off, then lands in a review state a clinician approves before it persists. Writeback carries `Provenance` naming the program as author and the navigator as attester.
- **No autonomous physician inbox.** There is no default push into the physician's task list; a clinician pulls the summary in-context during the visit, or opts a patient into digest delivery. This keeps the platform in non-device CDS territory (spine §0.5, brief §6): it educates and organizes, it does not order, diagnose, or triage.
- **Writeback content bright line:** the written artifact may contain program activity, patient-reported barriers, insight *patterns* ("morning BP readings run higher — discuss"), and cited observations. It may **not** contain a diagnosis, a dosing recommendation, or a triage disposition.

```ts
interface ClinicianWritebackDraft {
  id: string;                                // ref_ / doc_ prefix
  patientId: string;
  sourceSummaryId: string;                   // NavigatorSummary.generatedAt ref
  navigatorAttesterId: string;               // sign-off required
  status: 'draft' | 'navigator_signed' | 'clinician_approved' | 'persisted';
  fhirResourceType: 'DocumentReference';
  provenance: { author: 'rhtp_program'; attester: string };
  containsProhibited: false;                  // invariant: no dx/dosing/triage
}
```

**Acceptance:** no writeback reaches `clinician_approved` without a `navigator_signed` predecessor; a draft failing the prohibited-content check is blocked and audited (`outcome:'blocked'`). The clinician surface is absent from the default navigator console and gated behind the P8 flag.

### 10.11 Open questions

1. **Model-rank transparency vs. simplicity** — do navigators see `modelRationale` inline, or only a subtle within-band reorder? Over-explaining risks re-introducing over-trust the summary section fights.
2. **Drift-signal ownership** — program-lead `navigator_tasks` need a distinct owner role and queue lane; is that a separate console persona or a filter on the same queue?
3. **Equity threshold governance** — is `equityThreshold` (default 10pp) a platform constant, a per-pack `MetricDef` field, or a program-configurable policy with its own audit trail?
4. **Summary staleness** — how long is a `NavigatorSummary` valid before new `protocol_events` force regeneration? Cache-invalidate on any new event for the patient, or TTL?
5. **Writeback format per EMR** — is a single `DocumentReference` sufficient, or do target EMRs require discrete structured resources (which raises the diagnosis-adjacency risk)? Blocks P8 scope.
6. **Nonresponse threshold — RESOLVED with a platform floor.** How many failed `outreach_attempts` (and over what window) trip a `nonresponse` task is a pack-config value, but it is now bounded by a **platform floor**: a `nonresponse` task requires at least **3 distinct failed attempts across ≥2 calendar days** before it may trip, regardless of pack config (a pack may set a higher threshold, never lower). This bounds alert fatigue and prevents a single missed message from creating navigator work. Open residual: whether the floor should vary by channel (voice vs SMS delivery-receipt semantics differ) — deferred to §08 outreach.
7. **Cross-pack queue merging — RESOLVED (10.4.5).** Co-morbid patients render as one PatientQueueCard with per-instance sub-tasks; the card sorts at the max sub-task band and shared barriers dedup at the card. Residual: whether the patient-level rollup becomes a spine-declared projection (§7) once §08 outreach pacing and §02 also need it, vs staying a console-local read-time fold.


---

## 11. API Surface, Security, Roadmap & Acceptance Criteria

This section defines the platform's external and internal API surface, the authn/authz and consent model that gates every data path, non-functional targets, the phased roadmap P2→P8 with per-phase exit criteria, the first-slice and per-pack acceptance templates, the prototype-migration checklist, the decisions-needed register, and the test strategy. It grounds on the P1 backend (`server/routes.ts`, `server/actions.ts`) and the shared spine; it defines only surface/security/roadmap detail, never re-defining spine tables or vocabularies.

**Governing law restated for this section:** deterministic rules decide; models explain/personalize/converse; humans own exceptions. No API in this surface lets an LLM mutate protocol state directly — the tool gateway (§11.3) is the only write path for model-proposed actions, and it validates → checks pack permission → checks consent → emits a `protocol_event` → audits, per spine §0.1 and §6.4.

### 11.1 API surface map

Five API planes. Each row names the plane, its consumers, its auth model (§11.7), and whether calls pass through the consent-checking repository (§11.8). No consumer reads a spine table directly; every read of patient data goes through the consent repo.

| Plane | Base path | Consumers | Auth | Consent-gated |
|---|---|---|---|---|
| Patient app API | `/api/patient/*` | PWA + Capacitor shell (§11.9) | Patient session (OAuth / magic-link) | Yes (self scope) |
| Tool gateway API | `/api/tools/*` | Voice/async model runtimes only | Service token + patient session context | Yes (pack + scope) |
| Navigator console API | `/api/navigator/*`, `/api/program/*` | Navigator / supervisor / admin console | Navigator enrollment session + RBAC | Yes (assigned-panel scope) |
| Ingestion webhooks | `/api/ingest/*` | Claims/HIE/device adapters | HMAC-signed webhook + mTLS | Writes only; no PHI read-back |
| Device callbacks | `/api/devices/*` | HealthKit/Health Connect bridge, Dexcom OAuth | Patient session + device-grant token | Yes (self scope) |

All responses are JSON. All mutating endpoints are idempotent by a client-supplied `Idempotency-Key` header (24h dedupe window) so retries after a network drop never double-emit events. **This client header is the transport-retry key only; it is distinct from — and never a substitute for — the canonical `protocol_events` idempotency key defined below.** Errors use a typed envelope:

```ts
interface ApiError { code: ApiErrorCode; message: string; retryable: boolean; auditId?: string }
type ApiErrorCode =
  | 'unauthenticated' | 'forbidden_role' | 'forbidden_consent' | 'forbidden_pack'
  | 'not_found' | 'conflict_idempotency' | 'protocol_transition_blocked'
  | 'red_flag_locked' | 'validation_failed' | 'rate_limited' | 'segmented_data_suppressed'
```

**Canonical `protocol_events` idempotency key (platform-wide, owned by the event-sourcing runtime — spine §2/§3).** Every producer that appends to `protocol_events` — the tool gateway (§11.3), the insight engine (§11.6), and every ingestion adapter (§11.5) — computes the SAME dedupe key so retries and re-imports collapse identically at the shared append seam. The key is a sha256 over:

```
idempotency_key = sha256(
  protocol_instance_id, event_type,
  pack_id, pack_version,          // pack version is LOAD-BEARING (see below)
  rule_id?, rule_version?,        // insight events only; identifies the detector revision
  sorted(source_fact_ids),
  request_id?                     // client Idempotency-Key when present, for transport-retry collapse
)
```

**`pack_version` (and `rule_version` for `insight.*` events) MUST be part of the key.** A published pack-version bump that changes `source_fact` selection is a *different logical action*; without the version in the key, a legitimately-new post-bump event silently dedupes against a pre-bump one (missed care) or a re-import fails to dedupe. This closes what was previously deferred — it is a spine rule, not an open question, and §11.12 asserts it (a post-bump re-import must not dedupe against pre-bump events). The client `Idempotency-Key` header governs only network-retry collapse within its 24h window; the canonical key governs logical event identity for the lifetime of the instance.

### 11.2 Patient app API (`/api/patient/*`)

Read endpoints return the patient's own consent-filtered view. The P1 `GET /api/patients/:id/context` generalizes to `GET /api/patient/context` (self, from session — patient id is never a path param on the patient plane, removing an IDOR class).

| Method + path | Purpose | Emits |
|---|---|---|
| `GET /api/patient/context` | Bootstrap: patient, active consents, `source_facts` (confirmed+needs_review), open `protocol_instances`, `tasks`, `health_alerts` | — |
| `GET /api/patient/instances/:instanceId/timeline` | `protocol_events` fold for one instance, provenance-expanded | — |
| `POST /api/patient/facts/:factId/confirm` | Patient confirms an imported fact → truth | `patient_confirmed_fact` |
| `POST /api/patient/voice/session` | Mint a WebRTC voice session (see §11.3) | — (session row) |
| `POST /api/patient/education/:packId/complete` | Mark an education module read/heard | `education_delivered` |
| `POST /api/patient/plan/:instanceId/confirm` | Confirm a matched screening/appointment plan | `appointment_confirmed` |
| `POST /api/patient/alerts/:alertId/(done\|snooze)` | Alert-center actions (generalizes `markAlertDone`/`snoozeAlert`) | — |
| `GET /api/patient/export` | Full FHIR-bundle self-export (§6 patient-owned) | audit only |
| `POST /api/patient/delete-request` | Real-deletion request incl. derived data/embeddings | audit only |

Patient-plane writes that touch protocol state are thin wrappers over the tool gateway internally so the same guards apply — the patient plane never has a second, laxer write path.

**Deletion is one pipeline, not a navigator queue reason.** `POST /api/patient/delete-request` opens a `DeletionRequest` and drives the deletion manifest (derived data, RAG embeddings, retained device Observations — §11.9). Any deletion signal originating elsewhere (e.g. a device-rail deletion request) routes into THIS pipeline; there is no `patient_data_deletion_request` navigator-queue reason (it is not in the spine §4d `NavigatorQueueReason` set and must not be introduced). **Event-log treatment under right-to-erasure:** deletion crypto-shreds `source_fact` payloads but the append-only `protocol_events` skeleton is retained with its `source_fact_ids` chain intact; a shredded fact resolves to a `redacted` tombstone rather than a dangling reference, so provenance chains stay structurally valid while the PHI payload is gone (the §11.15 consent/RLS tier proves a shredded fact never re-materializes). §09 owns the erasure policy; this endpoint is its patient-plane entry point.

### 11.3 Tool gateway API (`/api/tools/*`)

The single write path for model-proposed actions. Locked tool names from spine §6.4; each tool is `POST /api/tools/{tool_name}`. The runtime (voice or async) presents a **service token** plus the **patient-session context** it is operating under; the gateway re-checks both. A tool never trusts model output as authorization.

```ts
interface ToolRequest<A = unknown> {
  toolName: ToolName            // spine §6.4 locked verbs
  patientId: string
  protocolInstanceId: string
  packId: PackId
  args: A
  modelId: string; modelVersion: string   // logged per spine §6 / audit_events
  sessionId: string             // voice_sessions.id or async run id
}
interface ToolResponse<R = unknown> {
  ok: boolean
  emittedEvent?: { id: string; type: ProtocolEventType; state: ProtocolState }
  result?: R
  denied?: { reason: 'pack_not_authorized' | 'consent_missing' | 'transition_blocked' | 'red_flag_locked' | 'out_of_scope' }
  auditId: string
}
```

Gateway pipeline (deterministic, in order — any failure short-circuits and audits `blocked`):
1. **AuthN** service token valid + session live.
2. **Pack permission** — `toolName ∈ pack.conversationTools` (spine §1.5). Else `pack_not_authorized`.
3. **Consent** — consent repo confirms scope active for this pack/source. Else `consent_missing`.
4. **Red-flag lock** — if the instance is in `navigator_review` via a red-flag event, only `escalate_red_flag`/`summarize_for_navigator` are permitted (mirrors prototype `startAutonomousOutreach` lock). Else `red_flag_locked`.
5. **Transition guard** — `shouldTransition(current, next)` from `retinopathy-protocol.ts` (monotonic, terminal-blocked, review-exit-gated). Else `transition_blocked`.
6. **Emit + audit** — append `protocol_event` (envelope, spine §3) and `audit_events` row with `model_id`/`model_version`.

`get_observations` and `administer_screening` (spine §6.4 additions for device/screening packs) join the locked retinopathy verbs. `escalate_red_flag` is never model-discretionary for crisis routes: it consults the pack `escalation.crisisRoutes` map and, for `suicidal_ideation`, forces the 988 route regardless of model phrasing (spine §1.6, brief §5D).

**Crisis / red-flag detection is deterministic-first with a measured recall floor (safety law).** The deterministic `RED_FLAG_PATTERNS` set is the primary detector and is content-owned and versioned against a maintained adversarial corpus; it MUST meet a defined minimum recall on that corpus, verified in CI (see §11.15 safety tier). The parallel model net (Haiku, §07) is a *backstop that feeds the deterministic set, never a permanent substitute for it*: when the model net is the ONLY detector that fires a `red_flag`/crisis, the escalation STILL hard-locks the instance to `navigator_review` and forces the crisis route, AND an audit row plus a rule-gap ticket are emitted so the deterministic pattern set is extended to cover the missed phrasing. If the model net is degraded or down, regex-only must still meet the recall floor and the degraded-model state is surfaced to ops — the system never silently drops below deterministic coverage. A model is thus never the sole catch in the crisis path.

### 11.4 Navigator console API (`/api/navigator/*`, `/api/program/*`)

Generalizes `GET /api/navigator/queue` and `POST /api/navigator/queue/:id/complete`. All navigator reads are scoped to the caller's **assigned panel** (a navigator sees only patients on panels they own; supervisors see a county; admins see all — §11.7).

| Method + path | Purpose | Role floor |
|---|---|---|
| `GET /api/navigator/queue` | Open `navigator_tasks` enriched w/ patient, `source_facts`, transcript excerpt, suggested action | navigator |
| `POST /api/navigator/tasks/:id/claim` | Take ownership (sets `owner`) | navigator |
| `POST /api/navigator/tasks/:id/complete` | Close → emits `navigator_reviewed` (body `{ reviewer, disposition }`) | navigator |
| `POST /api/navigator/facts/:factId/override` | Reconcile a stale imported fact (`navigator_overridden`) | navigator |
| `POST /api/navigator/identity/:matchId/(confirm\|reject)` | Resolve `low_confidence_identity_or_gap_match` | navigator |
| `GET /api/navigator/patient/:id/timeline` | Full protocol timeline for an in-panel patient | navigator |
| `GET /api/program/metrics` | `metric_snapshots` by scope (cohort/county/language/demographic) | supervisor |
| `GET /api/program/equity` | Insight/outreach/outcome rates stratified (brief §6 equity) | supervisor |
| `POST /api/program/packs/:packId/(activate\|deactivate)` | Toggle a `ProtocolPack` version live | admin |
| `GET /api/program/audit` | Query `audit_events` (generalizes `GET /api/audit`) | admin |

### 11.5 Ingestion adapter webhooks (`/api/ingest/*`)

One uniform contract per spine §5: each inbound clinical fact becomes a `source_fact` pointing at a FHIR resource (`fhir_ref`), with confirmation state. Adapters normalize *to FHIR first*, then register the fact; protocol logic never reads FHIR directly.

```ts
interface IngestEnvelope {
  sourceKind: SourceKind            // 'claims'|'hie'|'site_feed'|'device'
  sourceName: string; adapterVersion: string
  patientMatch: { method: 'deterministic'|'probabilistic'; confidence: number; externalSystem: string; externalId: string }
  fhirResources: FhirResource[]     // Patient/Condition/Observation/... written to the store
  facts: Array<{ label: string; value: string; effectiveDate: string; confidence: SourceConfidence; fhirRef: string }>
}
```

| Endpoint | Trigger | Downstream |
|---|---|---|
| `POST /api/ingest/claims` | Blue Button 2.0 / Medicaid MCO Patient Access poll (patient-OAuth) | facts → `care_gaps` detection → possible `care_gap_imported` |
| `POST /api/ingest/hie/documents` | KHIE CCD document query | facts → problem/med reconciliation queue |
| `POST /api/ingest/hie/adt` | KHIE ADT event notification | discharge → `insight.transition.discharge_followup_due` → transitional-care pack |
| `POST /api/ingest/site-feed` | Screening-site completion feed | `already_completed`/`result_imported` reconciliation |

**Identity precondition (brief §4):** if `patientMatch.confidence < 0.90` OR `method='probabilistic'` below threshold, the adapter does **not** attach facts as plan-driving — it opens a `navigator_tasks` row with reason `low_confidence_identity_or_gap_match` (work type `identity_review`) and holds the facts in `needs_review`.

**Deterministic-match corroboration guardrail (wrong-patient is the existential failure — brief §9 risk 1).** A deterministic strong-identifier match (member/beneficiary ID, `match_confidence=1.0`) is NOT auto-linked on the ID alone. Recycled/reassigned/mistyped Medicaid MCO member IDs otherwise produce a silent, high-confidence link to the wrong person that bypasses the entire probabilistic queue. Every deterministic link MUST additionally agree on **≥1 independent demographic field (DOB and/or name)**; if it does not corroborate, the match is downgraded to a `navigator_tasks` `identity_review` (reason `low_confidence_identity_or_gap_match`) — never auto-linked. Corroborated deterministic matches attach with `patient_confirmed=false`. **No autonomous outreach and no patient-facing clinical-adjacent use of a newly-linked external record occurs until the first patient confirmation** via `POST /api/patient/facts/:factId/confirm` — Sandy never asserts another person's facts to a patient on the strength of an unconfirmed link. §11.11 makes zero wrong-patient linkage an acceptance criterion and §11.15 (ingestion tier) tests the corroboration downgrade.

**42 CFR Part 2 / adolescent-confidential** resources are tagged on ingest and default-suppressed from AI context (spine §5, brief §6); the tool gateway returns `segmented_data_suppressed` rather than surfacing them. **Segmentation is a deterministic code-set + facility-identity operation that runs BEFORE the fact reaches any pack, the insight engine, or any navigator card** — SUD codes are stripped and the sensitive category tagged deterministically, and a Part 2-covered *facility identity* (not just diagnosis codes) suppresses the diagnosis payload so a facility name never leaks the SUD category. The ADT `dischargeDisposition` is a free string; the expired/ama/transfer-to-acute outreach-suppression logic **fails closed** — an unrecognized or missing disposition routes navigator-only and never triggers autonomous outreach. §11.12 asserts a Part 2 facility discharge never surfaces facility name or SUD category in any task, card, or outbound message.

### 11.6 Device connection callbacks (`/api/devices/*`)

| Endpoint | Purpose |
|---|---|
| `POST /api/devices/healthkit/sync` | Native-shell push of HealthKit/Health Connect samples (BP, weight, steps, HR) |
| `GET /api/devices/dexcom/authorize` → `/callback` | Dexcom patient-OAuth handshake |
| `POST /api/devices/dexcom/egv` | Estimated glucose value batch (high-frequency stream) |

Device pattern (brief §3, spine §5): reading → normalize → FHIR `Observation` + `Device` + `Provenance` → insight engine. High-frequency CGM (~288/day) is **not** stored as raw FHIR — the raw stream lands in partitioned Timescale; only daily summaries (time-in-range, pattern flags) project to FHIR Observations. Insight rules run on the stream; the record keeps conclusions. No device callback ever emits a diagnosis or dosing suggestion — it emits `insight.*` events (spine §4b) whose escalation is governed by the pack map.

### 11.7 AuthN / AuthZ model

**Patient identity — four onboarding lanes** (resolves architecture-spec Open Decision; all four supported, navigator-attested is the rural default):

| Lane | Mechanism | Proofing tier | When |
|---|---|---|---|
| Navigator-attested | Navigator enrolls patient in-clinic; trust transfers | In-person, highest | Rural / waiting-room default |
| SMS magic-link | One-time deep link to signed session | Phone-possession | Re-engagement, reminders |
| Payer OAuth | MyChart/MCO-style OAuth (also unlocks claims ingestion) | Federated | Patients with a portal |
| App registration | Self sign-up + step-up proofing before external linkage | Deferred | Self-serve |

Rule (brief §4): **identity proofing completes before any external data linkage.** Sessions are short-lived JWTs (patient 30 min sliding, navigator 8h) with refresh; media/audio served via short-lived signed URLs only.

**Navigator RBAC** — three roles, capability-gated:

| Capability | navigator | supervisor | admin |
|---|---|---|---|
| Read/act on assigned-panel queue | ✓ | ✓ | ✓ |
| Read county-wide queue + metrics | — | ✓ | ✓ |
| Equity/program dashboards | — | ✓ | ✓ |
| Activate/deactivate packs | — | — | ✓ |
| Query full audit log | — | — | ✓ |
| Cross-county / all-panel patient read | — | — | ✓ |

Panel scope is enforced in the consent repo (§11.8), not in each handler, so a missing check cannot silently widen access.

### 11.8 Consent repository — the single data path, with RLS backstop

**All household/patient data access — patient plane, tool gateway, navigator plane — goes through one `ConsentCheckedRepository`.** No handler, no adapter, and no model runtime issues a raw query against a spine table. This is the enforceable form of spine §0.2 (every plan-driving fact carries consent state).

```ts
interface AccessContext {
  actor: ProtocolActor
  role?: 'navigator'|'supervisor'|'admin'
  patientSessionId?: string
  panelScope?: string[]         // navigator's assigned panels / county
  packId?: PackId               // for pack-scoped tool reads
}
interface ConsentCheckedRepository {
  getPatientContext(ctx: AccessContext, patientId: string): Promise<PatientContext>   // throws forbidden_consent / forbidden_role
  getSourceFacts(ctx: AccessContext, patientId: string): Promise<SourceFact[]>         // Part 2 / adolescent rows filtered unless scope granted
  getObservations(ctx: AccessContext, patientId: string, types: ObservationType[]): Promise<Observation[]>
  emitProtocolEvent(ctx: AccessContext, event: ProtocolEventEnvelope): Promise<void>   // consent + pack checked before append
}
```

`getObservations` keys on the **canonical `ObservationType` enum owned by the spine** — one member per physiological signal (`bp_systolic`, `bp_diastolic`, `glucose_cgm`, `glucose_tir_daily`, `weight_daily`, `pharmacy_fill_claim`, …); the device rail (04), insight engine (06), and pack cohort bindings (01) all key on the identical members, so this interface never carries a rail-local spelling. The repo consults `consents` (scope/category/status) and the panel scope on every call; segmented categories (`part2_sud`, `adolescent`) require an explicit matching consent scope or are omitted with a `segmented_data_suppressed` marker. **Backstop:** Postgres **row-level security** policies on every patient-scoped table key off the session's `patient_id` / `panel` claims, so even a repository bug or raw query cannot return out-of-scope rows. Defense in depth: repo is the contract, RLS is the failsafe.

**Async reasoning-lane token — per-run, single-patient, short-lived (never a standing grant).** The Sonnet/Haiku async lane runs without a live patient session, so it cannot inherit a session's RLS `patient_id` claim. It MUST NOT hold a standing broad service grant that can read any patient — that would defeat both the consent repo and the RLS backstop. Instead the gateway mints, per async run, a token scoped to **exactly the one `patientId` plus the active `packIds` that job needs**, expiring at job end and audited to `audit_events`. This is a hard requirement (an acceptance criterion before P3, when the consent repo goes live — §11.10/§11.11), not a deferred design choice.

### 11.9 Non-functional requirements

| NFR | Target | Notes |
|---|---|---|
| Voice turn latency (speech-in → speech-out) | p95 ≤ 1.2s, p99 ≤ 2.0s | Realtime lane; tool round-trips excluded from turn but ≤ 400ms p95 |
| Tool gateway call | p95 ≤ 400ms | Deterministic; no model in path |
| Insight evaluation (observation → event) | p95 ≤ 5s streaming; batch (claims) ≤ 15 min | Insight engine, no LLM |
| Upload-to-insight (device sync → alert visible) | p95 ≤ 30s (BP/weight); CGM summary ≤ 5 min | End-to-end incl. FHIR projection |
| Navigator queue read | p95 ≤ 500ms | Enriched query |
| Availability | 99.9% patient + tool planes; 99.5% ingestion | Ingestion is retry-tolerant (idempotent webhooks) |
| Cost per interaction | Voice session ≤ $0.35; async summary ≤ $0.02 (Haiku triage), ≤ $0.10 (Sonnet analysis) | Model spend budgeted per pack; alert if pack exceeds 1.5× |
| Observability | Trace-per-interaction; every `audit_events` row carries `model_id`,`model_version`,`session_id`,`tool`,`pack_id` | Spine §2 audit + brief §2.5 |
| Retention — audio | **Default transient** (not persisted); retained only after explicit per-session consent | Resolves architecture Open Decision |
| Retention — transcripts | 90 days hot, then de-identified; `transcript_segments` linked to `voice_sessions` | |
| Retention — derived/embeddings | Deleted on `POST /api/patient/delete-request` incl. RAG embeddings | Patient-owned-means-provable (brief §6) |

### 11.10 Roadmap P2→P8 with exit criteria

P0–P1 done (production-shaped prototype; audited P1 backend). Each phase below states scope and **hard exit/acceptance criteria** — a phase is not done until every criterion is objectively met and tested.

| Phase | Scope | Exit / acceptance criteria (all required) |
|---|---|---|
| **P2 — Real voice** | OpenAI Realtime sessions; tool gateway (§11.3) server-gated; `voice_sessions` + `transcript_segments` persisted; red-team suite v1 | (a) Full retinopathy voice journey "why me → confirmed plan" passes. (b) 100% of state mutations flow through the gateway (no direct-write path exists — proven by test). (c) Red-team suite v1 (prompt injection, unsafe reassurance, off-protocol advice, false closure, red-flag bypass) passes 100%. (d) Voice p95 ≤ 1.2s. (e) Every action logs model/version/session/tool/pack. |
| **P3 — Ingestion rail** | Blue Button 2.0 + one Kentucky Medicaid MCO Patient Access → FHIR store (Medplum) via `/api/ingest/claims`; consent repo + RLS live; KHIE agreement started in parallel | (a) A real patient's longitudinal record renders with per-fact provenance. (b) Med list derives from actual fills. (c) Identity < 0.90 confidence routes to `identity_review` queue, never auto-attaches; a deterministic 1.0 match with no corroborating DOB/name is downgraded to `identity_review`, and no newly-linked external record drives outreach before first patient confirmation. (d) Part 2 rows suppressed from AI context (test-proven), stripped deterministically before pack/insight/navigator exposure. (e) Consent repo is the only data path; RLS blocks a deliberately-bypassing query in test. (f) The async reasoning lane runs only under a gateway-minted per-run, single-patient, packId-scoped, short-lived token — no standing broad grant exists (test-proven). |
| **P4 — Retinopathy pilot** | Navigator-supervised live pilot; SMS outreach (A2P 10DLC registered); outcome instrumentation | (a) ≥1 cohort runs closed-loop; screenings scheduled + results reconciled from a non-EMR source. (b) Cohort-level gap-closure reportable via `/api/program/metrics`. (c) Zero wrong-patient linkage incidents. (d) Equity strata captured from day one. |
| **P5 — Device rail** | Capacitor native shell; HealthKit/Health Connect; Dexcom OAuth; **insight engine v1** (BP + glucose deterministic rules → `insight.*` events) | (a) Health tab runs on real device data end-to-end; all "simulated" labels removed. (b) Insight engine emits `insight.bp.morning_surge`, `insight.glucose.nocturnal_hyperglycemia`, `insight.glucose.time_in_range_decay` from real streams — **no LLM in the detection path** (audited). (c) CGM stream in Timescale; only summaries in FHIR. (d) Upload-to-insight p95 ≤ 30s (BP). (e) No insight produces a dosing/diagnostic output (red-team). |
| **P6 — Protocol packs 2–4 (THE PLATFORM PROOF)** | Hypertension management; med adherence (claims-PDC); transitional care (ADT-triggered, KHIE live) | **(a) Hypertension ships as pure `ProtocolPack` config + approved content with ZERO new rail code** — no new tables, no new gateway verbs, no new state-machine code; the diff is manifest + education + insight-rule refs + red-team suite only. (b) All three packs reuse the retinopathy rails (site match, barrier intake, navigator queue) verbatim. (c) Transitional-care pack fires from a real KHIE ADT discharge → `insight.transition.discharge_followup_due` → 7-day follow-up task. **If any pack needs rail code, P6 fails — fix the rail before adding packs.** |
| **P7 — Screenings & campaigns** | PHQ-2→PHQ-9 + GAD-7 conversational (verbatim wording, deterministic scoring); SDOH (PRAPARE + Haiku passive tagging → Z-codes); campaign engine; flu-season pilot | (a) Screening completion + referral rates reportable per pack. (b) Crisis-path drill: SI item / red-flag free-text → hard-coded 988 route + human escalation, 100% (never model-discretionary). (c) SDOH flags are assistive-only — proven they never gate/deprioritize care. (d) A vaccination campaign reuses retinopathy rails verbatim. |
| **P8 — Scale & writeback** | TEFCA IAS evaluation; SMART-on-FHIR clinician summary views; EMR writeback adapter; multi-county expansion | (a) A navigator-reviewed summary writes back into ≥1 EMR via SMART on FHIR. (b) Clinician view launches inside the EMR (not a separate portal). (c) Expansion map reflects real multi-county cohorts. (d) No writeback occurs without navigator review (human owns the exception). |

### 11.11 Acceptance criteria — first production slice (generalizes architecture §17)

The P2+P3+P4 slice is accepted when **all** hold, each backed by an automated or drill test:

1. A patient completes a voice-first retinopathy journey from "why me" to confirmed screening plan.
2. Every patient-facing clinical-adjacent claim shows visible provenance (`source_fact_ids` resolvable in the UI).
3. Sandy autonomously collects barriers and creates `navigator_tasks` — only via gated tools.
4. Sandy cannot give off-protocol clinical advice, dosing, or diagnosis (red-team-proven).
5. Red-flag symptoms interrupt normal flow and escalate; the instance locks to `navigator_review`.
6. Navigator sees a structured queue item with patient context, `source_facts`, transcript excerpt, and suggested action.
7. The system reconciles completed-screening evidence from a non-EMR source.
8. Outcomes are reportable at cohort level, stratified by county/language/demographic.
9. All AI actions log model/version/session/tool/pack metadata.
10. All patient/tool/navigator data access passes through the consent repo; RLS backstops it (bypass test fails closed); the async reasoning lane holds only a per-run single-patient scoped token, never a standing grant.
11. A real longitudinal record renders from claims ingestion with provenance and confirmation state; a deterministic ID match with no corroborating DOB/name is downgraded to `identity_review`, and no wrong-patient linkage drives outreach.
12. Crisis/red-flag detection meets its measured deterministic recall floor against the versioned adversarial corpus; a model-net-only hit still hard-locks and emits a rule-gap ticket; degraded-model state is surfaced to ops.
13. A pack-version bump re-import does not dedupe against pre-bump events (canonical `protocol_events` idempotency key includes `pack_version`/`rule_version`).

### 11.12 Per-pack acceptance template

Every new `ProtocolPack` is launch-blocked until it passes this identical checklist (no pack ships without it):

```
[ ] Manifest validates: all 9 parts present (spine §1); measureIds map to HEDIS/RHTP.
[ ] Cohort rules select the intended population on a test panel; no false wrong-cohort entries.
[ ] Education module: ≤ grade-6 reading level (measured), read-aloud, ≥1 non-English language.
[ ] Every conversationTool ∈ gateway locked verbs OR registered in spine before use.
[ ] Every insightRule is deterministic (no LLM) and emits a spine §4b insight.* event.
[ ] Escalation map: red flags + crisisRoutes present; crisis routes hard-coded, not model-discretionary.
[ ] Deterministic crisis/red-flag recall floor met on the versioned adversarial corpus with the model net disabled; model-net-only hits still hard-lock and emit a rule-gap ticket.
[ ] Any segmented (Part 2 / adolescent-confidential) input: deterministic code-set + facility-identity stripping before pack/insight/navigator exposure; no task/card/outbound message leaks facility name or SUD category; fail-closed on unrecognized ADT disposition.
[ ] Canonical `protocol_events` idempotency key includes `pack_version` (and `rule_version` for `insight.*`); a post-bump re-import does not dedupe against pre-bump events.
[ ] Navigator work types + reasons map to spine §4d; priority mapping follows the pack-agnostic rule.
[ ] Outcome metrics emit metric_snapshots; equity strata captured.
[ ] Red-team suite passes 100%: prompt injection, unsafe reassurance, off-protocol advice, false closure, identity mismatch, + pack-specific adversarial cases.
[ ] Bright-line audit: no dosing recommendation, no diagnostic claim from device data, no autonomous triage.
[ ] ZERO new rail code (P6 rule): diff touches only manifest/content/rule-refs/tests.
```

### 11.13 Migration-from-prototype checklist

Concrete deltas from the live prototype (`_prototype-map.md`) to the production surface. Each is an executable migration task, not a rewrite.

| # | Migration | From → To |
|---|---|---|
| 1 | **De-duplicate transition logic** | Store actions (`useStore.ts`) + server actions (`server/actions.ts`) both re-implement transitions → single server-owned `retinopathy-protocol.ts` reducer behind the tool gateway; frontend becomes read-only over server state. |
| 2 | **Collapse dual navigator tables** | `NavigatorTask` (legacy free-string) + `NavigatorQueueItem` → single `navigator_tasks` (spine §2). Drop `NavigatorTask`; migrate `reportBarrier`'s dual-write to single-write. |
| 3 | **Generalize `ProtocolStatus` → `ProtocolState`** | Keep retinopathy's 12 literals as the reference instance; add the generalized names (spine §3 mapping) that cross-pack code/metrics key on. |
| 4 | **Real persistence transport** | P1 pure handler (no HTTP listener) → hosted service (VPC, Postgres/Medplum) with the same handler behind real routes. |
| 5 | **Provenance seed → real feeds** | Seeded `SourceFact`s (HIE pilot/claims file) → `/api/ingest/*` adapters writing FHIR + facts. |
| 6 | **Scripted Sandy → grounded RAG + tools** | `ai-script.ts` approved-answer library becomes the **first response tier**; RAG-over-FHIR + gated tools is the second. Scripted answers stay as the safety floor. |
| 7 | **Simulated devices → device rail** | Static `HealthInsight` content + `available_to_connect` → HealthKit/Dexcom callbacks → insight engine emitting real `insight.*` events. |
| 8 | **Static insights → insight engine** | Hand-authored `HealthInsight`/`HealthAlert` seeds → deterministic detectors (spine §4b), no LLM. |
| 9 | **Add consent repo + RLS** | Direct store reads → `ConsentCheckedRepository` as sole path; add RLS policies. |
| 10 | **Add red-team tier** | No adversarial suite today → per-pack red-team suites as launch gates (§11.15). |
| 11 | **Fixed-clock determinism** | Prototype `now()` constants → injected clock in tests; real clock in prod (preserve deterministic test fixtures). |

### 11.14 Decisions-needed register

Open decisions that block or shape phases; owner + deadline required before the dependent phase starts.

| Decision | Options | Recommendation | Blocks |
|---|---|---|---|
| FHIR store | Medplum (self-host) vs Azure HDS / HealthLake (managed) | **Medplum** now; revisit at multi-state scale | P3 |
| First payer target | Blue Button 2.0 + which KY Medicaid MCO first | Blue Button + one MCO (RHTP-relevant Medicaid pop) | P3 |
| KHIE engagement owner | Named owner + agreement start | **Start participation conversations now** (calendar-bound) | P6 (ADT) |
| Device aggregator | Skip (HealthKit/Dexcom direct) vs buy Validic/Terra | **Skip**; buy only if a pilot demands device diversity pre-Tier-1/2 | P5 |
| Model BAAs | Execute BAA + zero-retention w/ OpenAI (voice) + Anthropic (reasoning) | Execute **before any real-PHI pilot** | P2/P3 |
| Native-shell timing | Confirm P5 (with device rail), not earlier | **P5** — don't pay app-store friction before device sync | P5 |
| Kentucky Health LLM lane | Use now vs park until P5+ | **Park**; rules-first posture makes it non-blocking | P5+ |
| Audio retention | Transient / retained / consent-gated | **Transient default**, retained only on explicit per-session consent | P2 |

### 11.15 Test strategy

The existing vitest suite (golden-path journey, safety, protocol, store, server, component) extends into new tiers. All tiers run in CI; red-team and safety tiers are **launch gates** (a red failure blocks ship).

| Tier | Extends | New coverage |
|---|---|---|
| **Golden-path** | `golden-path.test.tsx` | One journey test per pack (retinopathy today; hypertension, PDC, transitional-care, PHQ/GAD, vaccination as they land). Full loop through the gateway. |
| **Safety** | `safety.test.ts`, red-flag lock | Red-flag interrupt per pack; off-protocol/dosing/diagnosis refusal; crisis-route hard-coding (SI → 988) proven non-discretionary; **deterministic crisis/red-flag recall floor met against the versioned adversarial corpus with the model net disabled** (regex-only must clear the floor); model-net-only hit still hard-locks and emits a rule-gap ticket; grounding verifier is deterministic (regex+lexicon+numeric-diff) and blocks an uncited clinical-adjacent claim with no model call. |
| **Protocol** | `retinopathy-protocol.test.ts` | `shouldTransition` monotonic/terminal/review-exit guards per pack's event→state map; every pack inherits the locked guards. |
| **Ingestion (new)** | — | Adapter-to-FHIR mapping; identity-confidence routing (<0.90 → `identity_review`); deterministic 1.0 match with no corroborating DOB/name downgraded to `identity_review`; no outreach on an unconfirmed newly-linked record; Part 2 / adolescent deterministic stripping before pack/insight/navigator exposure and fail-closed on unrecognized ADT disposition; idempotent webhook replay incl. **pack-version-bump re-import does not dedupe against pre-bump events**; provenance/confirmation state. |
| **Insight-engine (new)** | — | Deterministic detector fires on fixture streams (nocturnal hyperglycemia, BP morning surge, refill gap, discharge-followup); **asserts no LLM in path**; latency budget; no dosing/diagnostic output; retraction of an insight that already created a `navigator_task` flags it as possibly-spurious (never silent-close) and cannot reverse a terminal/`navigator_review` state. |
| **Consent/RLS (new)** | — | Consent repo denies cross-scope reads; segmented-category filtering; RLS backstop fails closed on a deliberately-bypassing query. |
| **Red-team (new, per-pack)** | — | Prompt injection, unsafe reassurance, false closure, off-protocol advice, identity mismatch, multi-turn drift under pressure. Suite id declared in `pack.redTeamSuiteId`; 100% pass required to activate a pack. |

Determinism preserved: prototype fixed-clock helpers become an injected clock so event/audit ordering stays reproducible in tests.

### 11.16 Open questions

1. **Aggregator trigger threshold** — what concrete pilot signal (device diversity %, drop-off rate) flips the "skip aggregator" decision to "buy"?
2. **Voice cost ceiling per pack** — is $0.35/session a hard cap that degrades to text, or a budget alert only? Behavior when a pack exceeds it is unspecified.
3. **Client `Idempotency-Key` window vs. legitimate re-submission** — the 24h *transport-retry* window may collide with a patient legitimately re-confirming a plan the next day; need a per-endpoint override policy. (The canonical `protocol_events` idempotency key — §11.1, includes `pack_version`/`rule_version` — is now decided and is separate from this transport window.)
4. **Deletion depth for shared derived data** — when a patient requests deletion, how are cohort-level `metric_snapshots` that already counted them handled (re-derive vs. leave aggregate)? (The event-log treatment itself is decided — §11.2: crypto-shred `source_fact` payloads, retain `protocol_events` skeletons with `redacted` tombstones; this Q is only the aggregate-metrics tail.)
5. **TEFCA/QHIN identity reconciliation** — P8 out-of-state records may conflict with in-state facts; the reconciliation-queue policy for cross-network identity is undefined.
6. **Supervisor panel boundary at county edges** — patients on panels spanning two counties: which supervisor scope owns them?

*Resolved into hard requirements (no longer open):* async reasoning-lane RLS claim → per-run single-patient scoped token, §11.8/§11.10 P3; `protocol_events` idempotency key includes `pack_version`/`rule_version`, §11.1; deterministic-match multi-field corroboration + no-outreach-before-confirmation, §11.5; crisis deterministic recall floor with model-net-as-backstop, §11.3; deletion event-log treatment, §11.2.


---

## Appendix A — Canonical Shared Spine (authoritative contract)

This is the single source of truth for names, tables, event vocabularies, and the FHIR-vs-protocol split that all eleven sections were written against. It is a contract, not an essay. §A.0–§A.7 below are the base spine (v1) the sections built on; **§A.8 (Reconciliation Addendum, v1.1) is authoritative and supersedes both the base spine and any section body wherever they conflict.** An implementer resolves any naming or shape disagreement in favor of §A.8, then §A.0–§A.7, then the section body.



**This is a contract, not an essay.** Every spec-section author (02–10) MUST use the exact names, shapes, and vocabularies below. Do not invent synonyms. If a section needs a new entity, event, barrier, or work type, it must be *added here first*, following the naming conventions in §7. When in doubt, defer to the prototype (`src/types.ts`, `src/lib/retinopathy-protocol.ts`) — this spine is a superset that generalizes it, never contradicts it.

Grounded in: `2026-07-04-platform-deployment-and-ai-architecture.md` (direction), `2026-07-03-rhtp-production-architecture.md` §11 storage model (locked table names), and the live prototype.

---

### 0. Governing rules (apply everywhere)

1. **Rules decide; models explain.** Every clinical-adjacent state change is a deterministic rule emitting a typed event. LLMs never mutate protocol state — they call gated tools that emit events.
2. **Every plan-driving fact carries provenance** (`source_facts`) and a patient-confirmation state before it becomes truth.
3. **Protocol state is event-sourced.** State is a fold over `protocol_events`; you never store a mutable "current status" as the source of truth.
4. **The retinopathy machine is protocol #1, not the whole vocabulary.** The generalized `protocol_state` and `protocol_event` vocabularies (§3, §4) are the platform contract; retinopathy's 12 states/13 events are the reference instance.
5. **Non-device CDS bright line.** No dosing, no diagnosis, no autonomous triage. Educate / organize / remind / detect-pattern / suggest-discussing-with-clinician only.

---

### 1. Protocol Pack manifest (the unit of shipment — 9 declared parts)

Every capability ships as one `ProtocolPack`. The 9 parts are the platform brief's numbered list, typed:

```ts
type PackId = string            // slug, e.g. 'retinopathy', 'hypertension', 'phq_gad', 'flu_campaign'
type MeasureId = string         // maps to HEDIS/RHTP measure, e.g. 'eye_exam', 'bp_control', 'pdc_diabetes'

interface ProtocolPack {
  packId: PackId
  version: string               // semver; packs are versioned artifacts
  displayName: string
  measureIds: MeasureId[]       // outcome measures this pack reports (part 8)

  // 1. Cohort rules — who enters
  cohort: {
    dxCodes?: string[]          // ICD-10 / SNOMED
    ageRange?: { min?: number; max?: number }
    gapEvidence?: CareGapType[]
    deviceSignals?: ObservationType[]
    adtEvents?: AdtEventType[]  // e.g. discharge → transitional care
  }

  // 2. Education module — approved plain-language content
  education: {
    moduleId: string
    readingLevelGrade: number   // target 6
    readAloud: boolean
    languages: string[]         // BCP-47
  }

  // 3. Device bindings — observation types consumed
  deviceBindings: ObservationType[]

  // 4. Insight rules — deterministic detectors emitting protocol_events (NO LLM)
  insightRules: InsightRuleRef[]        // see §4 insight namespace

  // 5. Conversation tools — Sandy tools authorized, with server-side gates
  conversationTools: ToolName[]

  // 6. Escalation map — red flags, thresholds, crisis routes (deterministic)
  escalation: {
    redFlagRuleIds: string[]
    crisisRoutes: CrisisRoute[]         // e.g. { trigger:'suicidal_ideation', action:'route_988' }
  }

  // 7. Navigator work types — what lands in the queue, at what priority
  navigatorWorkTypes: NavigatorWorkType[]   // see §5

  // 8. Outcome metrics — the reported numbers (mostly 1:1 HEDIS/RHTP)
  outcomeMetrics: MetricDef[]

  // 9. Red-team suite — protocol-specific adversarial tests (launch gate)
  redTeamSuiteId: string
}
```

`ProtocolPack` is declarative configuration + content. Adding a pack must require **zero new rail code** (the P6 platform test). If it needs rail code, fix the rail.

---

### 2. Core shared tables / entities

Names are **locked** from `2026-07-03-rhtp-production-architecture.md` §11 and the prototype. Field lists are the minimum every author must use identically. `snake_case` table names; `snake_case` columns. Every table has `id`, and mutable rows carry `created_at`/`updated_at`.

| Table | Key fields |
|---|---|
| `patients` | id, name, county, language, accessibility_prefs, contact_channels, condition_summary |
| `patient_identities` | id, patient_id, external_system, external_id, match_method(`deterministic\|probabilistic`), match_confidence, proofing_status, confirmed_by_patient |
| `consents` | id, patient_id, scope, status(`active\|missing\|revoked`), version, category(`general\|part2_sud\|adolescent`), updated_at |
| `data_sources` | id, kind(`SourceKind`), name, base_url, trust_tier, active |
| `source_facts` | id, patient_id, label, value, source_kind(`SourceKind`), source_name, retrieved_at, effective_date, confidence(`SourceConfidence`), patient_confirmed, navigator_overridden, fhir_ref? |
| `care_gaps` | id, patient_id, gap_type(`CareGapType`), status, priority_label, evidence_source_fact_ids[], last_event_date |
| `care_protocols` / `packs` | id (= `PackId`), version, display_name, manifest(`ProtocolPack`), active |
| `protocol_instances` | id, patient_id, pack_id, pack_version, current_state(`ProtocolState`, derived cache), opened_at, closed_at? |
| `protocol_events` | id, protocol_instance_id, patient_id, pack_id, type(`ProtocolEventType`), state(`ProtocolState`), actor(`ProtocolActor`), label, created_at, source_fact_ids[] |
| `outreach_attempts` | id, patient_id, protocol_instance_id, channel(`sms\|voice\|in_app\|push`), scheduled_at, sent_at?, outcome(`delivered\|answered\|no_response\|opted_out`) |
| `barriers` | id, patient_id, protocol_instance_id, type(`BarrierType`), detail, reported_via, source_event_id |
| `tasks` | id, patient_id, protocol_instance_id, step, when, site_id? *(care-plan tasks: patient-facing next actions)* |
| `navigator_tasks` | id, patient_id, protocol_instance_id, work_type(`NavigatorWorkType`), reason(`NavigatorQueueReason`), priority(`NavigatorQueuePriority`), summary, suggested_action, status(`open\|done`), owner, source_event_ids[], created_at |
| `results` | id, care_gap_id, protocol_instance_id, outcome(`ResultOutcome`), gradable, captured_at, source_fact_id? |
| `referrals` | id, patient_id, protocol_instance_id, reason, destination, owner, status(`pending\|scheduled\|completed`), days_since_result |
| `audit_events` | id, created_at, actor(`ProtocolActor`), action, outcome(`allowed\|blocked\|failed`), patient_id?, source_ids[], model_id?, model_version?, detail |
| `metric_snapshots` | id, metric_id, pack_id?, scope(`cohort\|county\|language\|demographic`), stratum?, value, denominator?, captured_at |

**Naming discipline:** `navigator_tasks` is the single navigator work item (it subsumes the prototype's split `NavigatorTask` + `NavigatorQueueItem`; authors MUST NOT reintroduce two tables). `tasks` = patient-facing care-plan steps (prototype `CarePlanTask`). Supporting tables from §11 that need no field expansion here but keep their names: `screening_sites`, `site_matches`, `voice_sessions`, `transcript_segments`, `tool_calls`.

Shared enums referenced above (extend only via §7):
- `SourceKind` = `hie | claims | site_feed | patient_reported | navigator_review | device | prototype_seed`  *(adds `device` to the prototype set)*
- `SourceConfidence` = `confirmed | probable | patient_reported | needs_review`
- `ResultOutcome` = `normal | abnormal | ungradable`
- `BarrierType` = `transportation | cost | after_hours | not_ready | already_completed | food | housing | social_isolation`  *(first 5 are the prototype set; SDOH additions map to Z-codes)*
- `CareGapType` = `diabetic_retinopathy | bp_control | a1c_control | med_adherence | transitional_care | mammography | colorectal | nephropathy | immunization | depression_screen`

---

### 3. Generalized protocol state vocabulary + event envelope

The platform state machine is a **superset** of retinopathy's. Every pack's states MUST be one of the generalized `ProtocolState` values; retinopathy's 12 (§ prototype) are the reference mapping.

```ts
type ProtocolState =
  | 'identified'              // cohort entry / gap imported
  | 'patient_contactable'    // consent active, outreach eligible
  | 'engaged'                // patient interacted (explained / educated)
  | 'signal_collected'       // barrier, device signal, or answer captured
  | 'action_matched'         // site / resource / plan matched
  | 'scheduled'              // appointment / plan confirmed
  | 'completed'              // action done (screening, screening admin, etc.)
  | 'closed_resolved'        // normal_closed equivalent — measure satisfied
  | 'referral_needed'        // abnormal → downstream referral
  | 'repeat_needed'          // ungradable / re-do
  | 'navigator_review'       // human-required (red flag, reconciliation, low confidence)
  | 'closed_by_reconciliation'
```

Retinopathy mapping (authors of §02/protocol sections MUST preserve): `explained→engaged`, `barrier_collected→signal_collected`, `site_matched→action_matched`, `normal_closed→closed_resolved`, `abnormal_referral_needed→referral_needed`. The prototype's literal names remain valid as the retinopathy instance labels; the generalized names are what cross-pack code and metrics key on.

**State-transition guard rules are pack-agnostic and locked** (from `retinopathy-protocol.ts`): monotonic by `PROTOCOL_STATE_ORDER`; terminal states (`closed_resolved`, `closed_by_reconciliation`) never transition; `navigator_review` exits only into a declared review-exit set. Every pack declares its own event→state map but inherits these guards.

**`protocol_event` envelope (canonical shape every event conforms to):**

```ts
interface ProtocolEventEnvelope {
  id: string
  protocolInstanceId: string
  patientId: string
  packId: PackId
  type: ProtocolEventType     // §4 namespace
  state: ProtocolState        // resulting state after this event
  actor: ProtocolActor        // 'sandy' | 'patient' | 'navigator' | 'system'
  label: string
  createdAt: string
  sourceFactIds: string[]     // provenance chain — never empty for a plan-driving event
}
```

`ProtocolActor` = `sandy | patient | navigator | system` (locked, matches prototype + audit).

---

### 4. Event / vocabulary namespace conventions

So §02/06/08/10 align, all typed strings live in **namespaced families**. Format: `snake_case`, family-prefixed where cross-cutting.

#### 4a. `ProtocolEventType` — lifecycle events (past-tense, no prefix; these ARE the pack lifecycle)
Reference set (retinopathy, locked): `care_gap_imported | patient_consented | sandy_explained_gap | question_answered | barrier_reported | red_flag_reported | site_matched | appointment_confirmed | already_completed_claimed | result_imported | navigator_reviewed | referral_scheduled | repeat_scheduled`.
Generalized additions for other packs follow the same past-tense verb pattern: `education_delivered`, `screening_administered`, `outreach_sent`, `patient_confirmed_fact`.

#### 4b. Insight events — `insight.*` (emitted by the deterministic insight engine, part 4 of a pack; NO LLM)
Convention: `insight.<domain>.<pattern>`. Canonical set (from platform brief §5B):
`insight.glucose.nocturnal_hyperglycemia | insight.glucose.time_in_range_decay | insight.bp.morning_surge | insight.bp.variability_trend | insight.med.refill_gap | insight.med.missed_dose_pattern | insight.weight.trajectory_up | insight.transition.discharge_followup_due | insight.screening.interval_due`.
An insight event is a `protocol_event` whose `type` starts `insight.` — it flows through the same envelope and can drive state or emit a navigator task per the pack's escalation map.

#### 4c. Barrier types — `BarrierType` (§2). SDOH barriers additionally carry a `zCode` and are **assistive-only** (never gate/deprioritize care).

#### 4d. Navigator work types — `NavigatorWorkType` (the *category* of work) vs `NavigatorQueueReason` (the *trigger*)
- `NavigatorQueueReason` (locked, 10, from prototype): `transportation_barrier | cost_barrier | after_hours_needed | patient_not_ready | already_completed_needs_reconciliation | red_flag_symptom | abnormal_result_referral | ungradable_repeat_needed | nonresponse | low_confidence_identity_or_gap_match`. Extend for new packs (e.g. `sdoh_referral_needed`, `positive_screen_followup`, `identity_match_review`) — additions register here.
- `NavigatorWorkType` (coarse bucket for queue routing): `barrier_resolution | reconciliation | clinical_escalation | referral_management | identity_review | outreach_followup`.
- `NavigatorQueuePriority` (locked): `routine | soon | urgent`. Mapping rule is pack-agnostic: red-flag/crisis = `urgent`; abnormal/repeat/low-confidence = `soon`; else `routine`.

---

### 5. FHIR-vs-protocol-table split rule

**One-line rule:** *Clinical facts live in FHIR (R4); care-orchestration state lives in protocol tables. FHIR is the canonical record of what is clinically true; protocol tables are the canonical record of what the program is doing about it.*

| Lives in **FHIR R4** (canonical clinical record) | Lives in **protocol tables** (orchestration state) |
|---|---|
| `Patient`, `Condition`, `Observation` (BP, glucose summaries, A1C, weight), `MedicationRequest`/`MedicationStatement`, `DiagnosticReport`, `Immunization`, `Device`, `Provenance`, `DocumentReference` (CCDs), `Coverage`, `Consent` (clinical-grade) | `care_gaps`, `care_protocols/packs`, `protocol_instances`, `protocol_events`, `outreach_attempts`, `barriers`, `tasks`, `navigator_tasks`, `metric_snapshots`, `audit_events` |

Bridging rules:
- **`source_facts` is the seam.** Each imported clinical fact is a `source_fact` row *pointing at* a FHIR resource (`fhir_ref`) plus its provenance/confirmation state. Protocol logic reads `source_facts`; it does not read FHIR directly.
- **Device readings** become FHIR `Observation` + `Device` + `Provenance`. **High-frequency streams (CGM)** are NOT stored as raw FHIR — raw stream lives in partitioned Postgres/Timescale; only clinically meaningful **summaries** (daily time-in-range, pattern flags) project into FHIR Observations. Insight rules run on the stream; the record keeps conclusions.
- **Results** (`results` table) reference a FHIR `DiagnosticReport`/`Observation` via `source_fact_id`; the protocol outcome (`ResultOutcome`) is orchestration, not the clinical resource.
- **Consent:** clinical-grade consent is FHIR `Consent`; the program's per-scope/per-source operational consent is the `consents` table. Part 2 SUD and adolescent-confidential data are segmented and default-suppressed from AI context regardless of store.

---

### 6. Naming conventions (authors MUST follow)

1. **Tables:** `snake_case`, plural (`protocol_events`). **Columns:** `snake_case`. **TS types/interfaces:** `PascalCase`. **Enum members / typed string literals:** `snake_case` (e.g. `abnormal_referral_needed`), except namespaced insight events which use dotted `snake_case` (`insight.bp.morning_surge`).
2. **IDs:** prefixed slugs — `pat_`, `gap_`, `proto_` (protocol events), `queue_`/`task_`, `bar_`, `ref_`, `res_`, `audit_`, `voice_`, `fact_`, `consent_`. Match the prototype's existing prefixes; do not rename.
3. **Events are past tense** (`barrier_reported`, not `report_barrier`). **Tools/actions are imperative** (`record_barrier`, `match_screening_sites`, `escalate_red_flag`). **States are adjectival/participial** (`identified`, `scheduled`, `closed_resolved`).
4. **Tool names** (`ToolName`) are the Sandy gateway verbs, locked from architecture §6.5 and extended per pack: `get_patient_care_plan | explain_gap | record_question | record_barrier | match_screening_sites | confirm_plan | record_already_completed | create_navigator_task | escalate_red_flag | summarize_for_navigator | get_observations | administer_screening`. A tool never mutates state directly — it validates, checks pack permission, emits a `protocol_event`, and returns structured output.
5. **Actors** are always one of the four `ProtocolActor` values — never introduce a fifth actor label.
6. **One name per concept.** The navigator work item is `navigator_tasks` (not "queue item" + "task"). The provenance row is `source_facts`. The patient-facing step is `tasks`. Do not create parallel synonyms; if two prototype names exist for one production concept, the production spine name wins and the section notes the migration.
7. **Every plan-driving output traces to a deterministic rule** and cites `source_fact_ids`; authors must show the basis for any patient-facing clinical-adjacent claim (the "why this fired" requirement).

---

### 7. Extending this spine

New entity / event / barrier / work type / tool → add it **here** (this file), in the right namespace, following §6, *before* using it in a section. Adding a `ProtocolPack` is expected and requires no spine change (it is configuration). Adding a new `ProtocolState`, `ProtocolEventType` family, `BarrierType`, `NavigatorQueueReason`, or shared table **does** require a spine edit so all sections stay consistent. Sections reference this file by section number (e.g. "per spine §4b insight namespace").


### 8. Reconciliation Addendum (v1.1) — authoritative seam resolutions

The cross-section consistency review found ~19 concrete divergences where two sections named or shaped the same thing differently. Each is resolved below. **These resolutions govern.** Where a section body still shows the pre-reconciliation name/shape, read it as the resolved form here.

#### 8.1 Canonical `ObservationType` enum (resolves §04 ↔ §06 ↔ §01 device→insight seam)

One spelling per physiological signal. §04 (device rail), §06 (insight engine consumed inputs), and §01 (pack `deviceBindings`) all key on exactly these members:

```ts
type ObservationType =
  // raw inputs (device/claim origin)
  | 'bp_systolic' | 'bp_diastolic'
  | 'glucose_cgm'            // raw CGM point (Timescale stream, not FHIR)
  | 'pharmacy_fill_claim'    // claims-derived fill event (equity floor for adherence)
  | 'weight_daily'
  // computed summaries (projected into FHIR Observations)
  | 'glucose_tir_daily'      // daily time-in-range summary
  | 'med_pdc_daily'          // proportion-of-days-covered summary
```

Retired synonyms (do NOT use): `bp_home_reading`, `blood_pressure_systolic/diastolic`, `glucose_cgm_reading`, `glucose_tir_daily_summary`. §04.3a, §06.5, and §01.7 are read as keyed on the members above.

#### 8.2 LOINC ownership (§03 owns codings)

§03 (FHIR platform) is the sole owner of resource codings. The device rail (§04.3a) adopts §03.2's codes verbatim. Canonical: **time-in-range = `104643-2`**, **mean glucose = `97507-8`**. Any LOINC in a section body that disagrees with §03.2 is read as §03.2's value.

#### 8.3 Raw high-frequency stream — one table, one owner (§03)

The raw CGM/high-frequency stream is the Timescale table **`device_readings`**, owned and shaped by §03: `DeviceReading { patient_id, device_id, observation_type, value, unit, measured_at, ingested_at, quality }`. §04's `cgm_stream` is retired; §04 reads/writes `device_readings`. Insight rules run on `device_readings`; only summaries (`glucose_tir_daily`, etc.) project into FHIR.

**Type-name collision resolved:** the Timescale row type keeps the name `DeviceReading` (§03). §04's adapter-output shape is renamed **`DeviceReadingInput`** (`{ externalId, rawUnit, deviceMeta, … }`). One name, one meaning.

#### 8.4 Insight event namespace — additions to §A.4b (registered here)

The canonical `insight.*` set is extended with:

- **`insight.bp.uncontrolled`** — §06 Rule C1 (sustained BP above threshold). Registered so §08 alert-wiring and §10 navigator console can consume it.
- **`insight.*.retracted` family** — every `insight.<domain>.<pattern>` has a paired `insight.<domain>.<pattern>.retracted` event, emitted when a backfilled/corrected fact invalidates a prior insight. Registered platform-wide. Consumers: §02 owns the retraction **state-fold** (never reverses a terminal or `navigator_review` state); §08 owns the **alert-retraction UX** (a retracted insight flags its `HealthAlert` as possibly-spurious — never silent-closes it); §10 owns **navigator-task reconciliation** (a retraction flags any task the insight created as possibly-spurious for human close, never auto-closes it) and the patient-notification contract for un-saying a non-diagnostic pattern. See Appendix B.3 (retraction reconciliation is a required control).

**Med-adherence floor/enhancement split (equity-load-bearing):**
- **`insight.med.refill_gap`** = claims-PDC floor signal (§06 Rule D2 computes PDC from `pharmacy_fill_claim`; emits `refill_gap`). Covers everyone with pharmacy claims.
- **`insight.med.missed_dose_pattern`** = smart-bottle enhancement signal only (§04.6c bottle-open detector). Never emitted from claims.

**Discharge follow-up — one event, severity bands (not two events):** `insight.transition.discharge_followup_due` is the single event; "overdue" is a **severity band** on it (re-fires once at the overdue band per §06 Rule F). The separate `insight.transition.discharge_followup_overdue` event is retired.

#### 8.5 Discharge follow-up resulting state (§05 ↔ §06)

`insight.transition.discharge_followup_due` folds to state **`identified`** (a discharge that only opens follow-up work has not matched an action or site). §06's `action_matched` for this event is superseded.

#### 8.6 `NavigatorQueueReason` — registered additions and corrections (§A.4d)

- **Add:** `discharge_followup_due` (the reason the ADT-triggered transitional-care instance opens with — §05.2 must use this, NOT `nonresponse`, which is reserved for the post-outreach no-answer case), `sdoh_referral_needed`, `positive_screen_followup`, `identity_match_review`.
- **Prose fix (§10.2):** the `NavigatorQueuePriority` enum is `routine | soon | urgent` (the "urgent | soon | urgent" prose typo is corrected).
- **Retire `patient_data_deletion_request` as a navigator reason.** Deletion routes to the §09.4 / §11.2 `DeletionRequest` pipeline (a dedicated `POST /api/patient/delete-request` + manifest), never a navigator task. §04.4b is read as routing to that pipeline.

#### 8.7 Sensitive-category model (§05.6 ↔ §09.3 ↔ consents.category)

- **`consents.category` stays coarse:** `general | part2_sud | adolescent` (unchanged from §A.2). Do not widen it.
- **Finer sensitivity is a tag on the fact, not on consent:** `source_facts.sensitive_category?: SensitiveCategory` where **`SensitiveCategory = part2_sud | adolescent | behavioral | reproductive | hiv`** (5 members). The adolescent member is spelled **`adolescent`** everywhere (not `adolescent_confidential`). §09.3 uses this 5-member set; §05.6's 6-value widening of `consents.category` is superseded by this split.
- All `SensitiveCategory`-tagged facts are default-suppressed from AI context, navigator cards, and outbound channels until the matching per-category consent is `active`.

#### 8.8 `SourceKind` addition

`SourceKind` gains **`community_resource`** (findhelp/211-class directory as a registered data source, §05-owned) in addition to the §A.2 set. Payer Patient Access and TEFCA are represented as `claims`/`hie` respectively with distinct `data_sources.name` + `trust_tier` unless §05 elects to register `payer_api`/`tefca` (open question §05.8 Q1).

#### 8.9 Platform-wide idempotency key (§02-owned; referenced by §04/§06/§11)

One contract, owned by §02's event-sourcing runtime. Every producer appending to `protocol_events` uses:

```
idempotency_key = sha256(
  protocol_instance_id + '|' + event_type + '|' + pack_version +
  ('|' + rule_version   if event_type starts 'insight.') +
  '|' + sorted(source_fact_ids).join(',') +
  ('|' + request_id     if client-supplied)
)
```

**`pack_version` is mandatory** in the key (a version bump that changes `source_fact` selection is a different logical action; omitting it silently drops legitimately-new post-bump events). Insight events additionally include `rule_version`. §04.3b, §06.3, and §11.1's client `Idempotency-Key` header all derive from or defer to this recipe. This closes §02.6 Q5 as a rule, not an open question.

#### 8.10 Cross-pack primitives (co-morbid patients — the common case)

Two shared primitives are added to the spine so a patient in multiple packs (retinopathy + HTN + glucose + adherence) is handled coherently:

- **`outreach_budget`** (patient-level, §08-scheduler-owned): a per-patient shared send cap across all active instances (default: deadline/action-anchored, ~2/week outside crunch). Cross-pack slot arbitration = highest-priority-instance-wins; a barrier resolved once applies across instances. Resolves §01.10 Q3 / §08.4.2 ownership.
- **`patient_care_summary`** (patient-level read-model projection, §02-owned): a pure projection over all of a patient's `protocol_instances` giving one patient card and one cross-pack state rollup for §10's console and metrics. Not its own event stream. Resolves §02.6 Q3.

#### 8.11 Ordering / clock contract (§02-owned)

§02 owns the single platform time-and-ordering contract: each `protocol_event` carries a per-instance monotonic `seq`; causal ordering within an instance is by `seq`, not wall-clock; all producers (insight engine, tool gateway, ingestion adapters) obtain time from an injected clock (never a raw `now()`), replacing the prototype's fixed timestamp. `triggeredAt`/`effective_date` are data fields, not ordering keys.

#### 8.12 Approved non-PHI education corpus retrieval scope (§07-owned)

Sandy's generic medication/education answers (e.g. "what is metformin for") retrieve from an **approved-content corpus** (RxNorm-linked monographs + pack education modules) that is a retrieval scope **distinct from the patient `KnowledgeBundle`** and never allows parametric/ungrounded answering. §07 owns the retrieval seam and citation rules; §01.3 content registry owns the assets. This gives brief AI-capability-A medication education a build path (see Appendix B.5).


---

## Appendix B — Review disposition & residual register

This spec passed a three-lens adversarial review (cross-section consistency, completeness, clinical-safety/regulatory). The verdicts:

- **Consistency:** *"Strongly coherent at the architectural/law level … but the interface seams carry roughly a dozen concrete vocabulary/data-shape divergences that must be reconciled in the spine before the sections compile against one shared contract."* → **All named seams are resolved in Appendix A §8 (authoritative).**
- **Regulatory/clinical-safety:** *"Structurally the strongest safety posture I have reviewed — rules-decide/models-explain is enforced by construction (no diagnose/dose/triage tool exists, the insight lane is LLM-free) — but it ships with two existential residuals that MUST close before any real-PHI pilot."* → **B.1 below.**
- **Completeness:** strongly built at the subsystem level, but ~16 cross-cutting concerns and ~8 named-brief capabilities have no owning section yet. → **B.4 / B.5 below.**

The register is ranked. **Nothing in B.1 may be deferred past first real-PHI contact.**

### B.1 — Existential blockers (hard gates before any real-PHI pilot)

| # | Risk | Required control (must appear in the built system) | Owner |
|---|---|---|---|
| **E1** | **Model-in-the-crisis-path.** Crisis/red-flag detection is asserted deterministic, but the deterministic layer is brittle regex; a Haiku "second net" is effectively the *only* detector for any SI/danger phrasing the regex misses. If the model is degraded/down, the system silently reverts to regex-only with no recall floor — a novel suicidal-ideation phrasing goes undetected, no 988 route, no lock. | (a) A versioned, content-owned **minimum measured recall** for the deterministic red-flag/crisis set against a maintained adversarial corpus; (b) a **model-net-only hit still hard-locks AND emits a rule-gap ticket** that must extend the deterministic set — the model is a backstop that *feeds* the rules, never a permanent substitute; (c) **fail-safe + ops alerting** when the model net is degraded (regex-only must still meet the recall floor). | §07.6a, §08.2.3 |
| **E2** | **Silent wrong-patient linkage.** The wrong-patient guardrail only applies to *probabilistic* matches. A deterministic exact match on a member/beneficiary ID auto-links at confidence 1.0, bypasses the navigator queue, and immediately drives cohort entry + outreach. Recycled/reassigned/mistyped Medicaid MCO IDs → a silent high-confidence wrong-patient link; Sandy asserts another person's clinical facts. This is the platform's own §9 risk #1. | **Mandatory multi-field corroboration on every deterministic 1.0 link** — a strong-ID match must also agree on ≥1 independent demographic (DOB and/or name) or it downgrades to navigator `identity_match_review`, never auto-links. **No autonomous outreach on a newly-linked external record until the first patient confirmation.** Close §03.6 Q2 to the stricter "confirm before any patient-facing clinical-adjacent use." | §05.5, §03.6, §11.5 |

### B.2 — High-severity controls (close before the phase gate named)

| Risk | Required control | Gate |
|---|---|---|
| **Grounding verifier is a stub.** `verifyGrounding` / `extractQuantitativeClaims` / `containsClinicalAdjacentClaim` are unimplemented; if a model becomes the block layer, a hallucinated A1C or "your eye exam came back normal" reaches the patient uncaught. | Specify the verifier as **deterministic** (regex + lexicon + numeric normalization + store-diff) as the load-bearing block layer; a model judge may only *add* blocks, never be the sole gate. Define a false-negative budget + CI adversarial suite. | **P2 exit (hard gate)** |
| **Async lane RLS bypass.** The Sonnet/Haiku async reasoning lane runs without a live patient session; if it holds a standing broad grant to satisfy RLS, it defeats the consent repo + RLS backstop — a buggy job could read any patient. | **Gateway-minted, per-run, single-patient, packId-scoped, short-lived token** for every async job, expiring at job end, audited. Forbid any standing broad async grant. | **P3 (consent repo live)** |
| **Part 2 leakage via facility identity.** SUD protection strips *diagnosis codes*, but a Part 2 facility discharge can still leak the SUD category via facility name, navigator task text, or `reasonLine`. `dischargeDisposition` is a free string. | Deterministic code-set stripping **and facility-identity suppression** run **before** any pack/insight/navigator exposure; **fail closed** on unrecognized disposition (navigator-only). AC: a Part 2 facility discharge never surfaces facility name or SUD category in any task, card, or outbound message. | **Before P3 HIE / P7 BH packs** |
| **Break-glass ≠ Part 2 consent.** Navigator break-glass into segmented data is referenced but its issuance/approval/TTL/post-hoc review are unspecified, and HIPAA break-glass does **not** satisfy 42 CFR Part 2. | Specify break-glass issuance/approval/TTL/mandatory post-hoc review with a `break_glass_access` audit event; Part 2 break-glass additionally requires purpose-specific Part 2 consent. Pin Kentucky minor-consent ages. | **P7** |
| **SMS condition-name leakage.** Minimize-disclosure relies on a token linter + a `reasonLine`; if `reasonLine` is model-personalized, a condition name (depression, HIV, SUD) or an interpersonal-safety cue can leak into an SMS body / lock screen. | `reasonLine` drawn from an **approved template library, deterministically slotted, disclosure-linted in every shipped language**; hard-exclude BH/SUD/reproductive/HIV/interpersonal-safety **by category**, not by token match. | **P4 (first SMS)** |

### B.3 — Medium-severity controls

- **Idempotency key must include `pack_version` (+ `rule_version` for insights).** *Resolved in Appendix A §8.9.*
- **Insight retraction reconciliation.** A backfilled fact that retracts an already-explained/already-escalated insight must **flag** (never silent-close) the live `navigator_task` and honor a patient-notification contract for un-saying a non-diagnostic pattern. *Wiring registered in Appendix A §8.4; UX owed by §08/§10.*
- **Copy-lint is a belt, not the primary control, and must be language-complete.** English-only, drug-name-enumerating regex misses a Spanish dosing directive ("baje su dosis de insulina"). Keep **tool-absence (capability gate) as the primary control**; require copy-lint + grounding-verifier parity in every shipped language, red-teamed per language; use a dose/units/imperative-verb grammar, not a drug-name list.
- **Stale-fact over-trust at confirmation.** Claims/HIE facts have 30–90 day lag; a stale "completed" billing artifact can close a real gap if a navigator over-trusts it. Require a **stale-fact re-verification prompt at confirmation** (show `effective_date` + staleness prominently); gap-closing claims facts require corroboration (a `DiagnosticReport`) or an explicit navigator attestation distinct from routine confirmation.
- **Threshold changes are clinical-safety changes.** Any change to a threshold that drives state, a crisis band, or a navigator escalation requires a **full versioned re-gate** (backtest + red-team + clinical sign-off). Confine any lighter tuning channel to non-clinical display params; scope the `safetyRecall` escape hatch narrowly with a mandatory red-team re-run.

### B.4 — Cross-cutting subsystems to specify before build (proposed new sections)

None of these has an owning section yet; each is a real build prerequisite, not a nicety.

- **New §12 — Operations, Observability & Reliability:** logging/metrics/tracing stack and how the §11.9 NFRs are measured and paged; platform-wide error-handling and graceful-degradation policy (FHIR / model-vendor / device / HIE / SMS outages, mid-voice-turn failure, DLQ handling); RPO/RTO, backup schedule + restore drills, multi-AZ/region DR; rate-limiting / abuse / DoS protection; incident-response + HIPAA 60-day breach-notification runbook with a named **clinical-safety-officer** role.
- **New §13 — Patient & Program Lifecycle:** death / move / custody / incarceration handling (close instances, stop campaigns, next-of-kin, deletion-vs-retention); the guardianship/custody edge of the §09.3 adolescent proxy-access model; account recovery (lost phone / magic-link, **phone-number reassignment** as a wrong-person-access risk, re-proofing, logout-everywhere); program wind-down / data-escrow / grant-cliff record-transfer.
- **Localization / translation pipeline** (owner: §08 or a content-ops section): how EN/ES/other verbatim-locked content (PHQ-9, PRAPARE, education, consent, SMS templates) is authored, clinically + linguistically validated, versioned in lockstep with pack versions, and reconciled with the byte-identical instrument-wording assertions; TTS/read-aloud language coverage.
- **Accessibility / WCAG** (owner: §01 packager check + §07/§10 surfaces): a WCAG 2.1 AA target, screen-reader / keyboard / contrast / low-literacy requirements, an accessibility acceptance gate, and wiring `accessibility_prefs` to concrete rendering. Justified by the low-literacy rural target population being the platform's reason for existing.
- **FinOps / cost model** (owner: §11): aggregate per-patient / per-cohort / per-month cost including Timescale CGM storage growth (~288 pts/patient/day) and embeddings; a budget/quota enforcement mechanism beyond the 1.5× alert; a cost-containment degradation policy (voice→text on budget breach).
- **Vendor-risk / model abstraction** (owner: §07): a `FhirClient`-style abstraction for model vendors; failover + deprecation policy (a model version retired mid-pilot); graceful degradation to the approved-answer/scripted tier when a vendor is unavailable; handling a vendor losing HIPAA eligibility.
- **Deployment substrate** (owner: §11 or new §12): IaC, VPC/network topology, environments, secrets/config, feature-flags, canary/blue-green, and critically a **no-real-PHI-in-staging synthetic-PHI test-data strategy**. The brief mandates "IaC from day one" and "private VPC"; the substrate is currently absent.
- **SMS/telephony operational reality** (owner: §08.4): carrier-deliverability + A2P 10DLC + campaign-use-case-registration workstream with a named owner; delivery-receipt / silent-filtering handling; and an explicit decision on the **PSTN/IVR gap** for the rural low-smartphone population (spec an inbound-call path or state the app-only reach limitation).

### B.5 — Named brief capabilities with no build path yet

- **Coverage & logistics navigation** (brief A): "is this screening covered, ride options, low-cost sites." `Coverage` is mapped (§03) and site-matching is reused, but the ride-arrangement + coverage-lookup tool/flow is unspecified.
- **After-visit / discharge plain-language explainers** (brief A, "one of the strongest uses of the HIE pipe"): turning a CCD/discharge `DocumentReference` into a grounded, cited, plain-language explainer conversation is not specified as a §07 tool or §08 flow. (Depends on the approved-content retrieval scope, Appendix A §8.12.)
- **Billing-artifact subsystem** (brief §7 sustainability — the grant-cliff survival thesis): the time-tracking, reading-count (RPM ≥16 days), documentation-capture, and encounter-evidence generation to actually bill **CCM (20 min/mo) / RPM / APCM / CHW** codes. The navigator loop is called "the billable artifact" but nothing produces a billable record. **This has no data model and the durability thesis depends on it.**
- **Program/RHTP grant-reporting surface** (brief §2.2): §10.7 computes outcomes, but the actual RHTP grant-reporting export format, cadence, and recipient are undefined.
- **Navigator-attested in-person enrollment tooling** (brief's core rural trust mechanism): only a `proofing_status` enum value exists; the on-device offline-capable enrollment flow, the attestation record, and the trust-transfer to the patient's own subsequent logins are unspecified.

### B.6 — Consistency gap-owners (assigned; specify at build)

The review's cross-cutting *gaps* are assigned owners in Appendix A §8 (cross-pack primitives §8.10, ordering/clock §8.11, approved-content scope §8.12, retraction handling §8.4, `community_resource` source §8.8, idempotency §8.9). The remaining gap — **right-to-erasure over an append-only event log** (crypto-shredding `source_fact` payloads while retaining `protocol_events` skeletons whose provenance chains would otherwise dangle) — is assigned **primary to §09 (deletion policy), structural hook to §02**, and must reconcile with §09.4.3's current wholesale listing of `protocol_events` as a deletion target.


---

## Appendix C — Decisions register & open questions

Each section §1–§11 ends with its own **Open questions** list (≈70 in total). This appendix elevates the ones that are **prerequisites, not deferrable details** — decisions that block a named phase — and pairs them with the platform-level choices from the brief. Assign an owner and a due-by-phase to each before that phase starts.

### C.1 — Prerequisite decisions (block the phase named)

| Decision | Options / default | Blocks | Source |
|---|---|---|---|
| **MPI ownership** — run our own master patient index, use KHIE's, or use a payer member-id as the deterministic key | *Default:* our own MPI + multi-field corroboration (see B.1 E2) | The wrong-patient safeguard itself — **P3** | §05.8 Q2 |
| **De-identification standard** — Safe Harbor vs Expert Determination — **and small-cell suppression threshold** (n<11? n<20?) | *Default:* Expert Determination + n<11 suppression in rural strata | Publishing equity dashboards (§09.6, §10.7) — **P4** | §09.7 Q1–Q2 |
| **Longitudinal instance granularity** — one long-lived `protocol_instance` per (patient, pack) vs. per rolling interval; terminal-state semantics for a monitoring pack that never closes | *Default:* one long-lived instance per (patient, pack) with a separate high-freq `insight.*` append lane (§02.6 Q2) | Foundational to `seq` growth, closure semantics — **P5/P6** | §02.6 Q1 |
| **Adolescent-confidential consent/disclosure model** for minors' PHQ-9 results under default-suppression; Kentucky minor-consent ages per category | Needs legal + KY policy | The `phq_gad` + `sdoh` packs — **P7** | §08.10 Q2, §09.7 Q3 |
| **PDC window (90/180/365 d) + drug-class grouping** — must match the HEDIS/RHTP `pdc_diabetes` definition exactly | Match HEDIS `pdc_diabetes` verbatim | The equity-floor adherence measure — **P5/P6** | §04.9 Q3 |
| **CGM stream-vs-summary rule-input boundary** — which rule kinds read raw Timescale vs FHIR summaries | *Default:* per-night raw for `nocturnal_hyperglycemia`; summaries for TIR decay | Insight-engine build — **P5** | §06.8 Q2 |
| **Grounding-verifier implementation** — deterministic (regex+lexicon+numeric-diff) as the block layer | *Required:* deterministic primary (see B.2) | Voice launch — **P2 hard gate** | §07.8 Q2 |

### C.2 — Platform choices carried from the brief (§10 of the platform brief)

1. **FHIR store:** Medplum (self-host, control, low run-cost) vs managed (Azure HDS / HealthLake). *Recommendation: Medplum; revisit at multi-state scale (define the concrete flip criterion — §03.8 Q4).*
2. **Native-shell timing:** confirm the Capacitor shell ships at **P5** (with the device rail), not earlier.
3. **First payer target for P3:** Medicare Blue Button 2.0 **plus which Kentucky Medicaid MCO first.**
4. **KHIE engagement:** start participation conversations **now** — calendar-bound, not engineering-bound. **Owner needed.**
5. **Aggregator (Validic/Terra):** skip (recommended) or buy for pilot breadth — define the concrete pilot signal that flips it (§11 open question; §04.9 Q6).
6. **Model BAAs:** execute BAA + zero-retention with OpenAI (voice lane) and Anthropic (reasoning lane) **before any real-PHI pilot.**
7. **Kentucky Health LLM lane:** keep parked until P5+; the rules-first posture makes it non-blocking.

### C.3 — Governance & content-ops ownership (assign a human owner)

- **Sensitive-category code sets** (Part 2 SUD / behavioral / reproductive / HIV) driving §05.6 segmentation — owner + review cadence (§05.8 Q4).
- **Insight-rule thresholds** — clinical sign-off authority; any state/crisis/escalation-driving threshold change requires a full versioned re-gate (B.3).
- **Per-pack red-team suite maintenance** against new base-model versions (§09.7 Q5).
- **Education / translation content** per pack — authoring, clinical + linguistic validation, versioned in lockstep with pack versions (B.4 localization).
- **Community-resource directory** source (findhelp vs 211 vs curated), refresh cadence, trust-tier, stale-resource decay (§08.10 Q3).
- **Concierge-QA taper** — the function retiring 100%-human pre-review per pack, calibrated off the retinopathy-pilot baseline (§09.7 Q6).

> The full ≈70 open questions live in the **Open questions** subsection at the end of each of §1–§11. This appendix is the subset that must become decisions on a schedule.


---

## Appendix D — Prototype map

What exists in the `rhtp-prototype` repo today (`src/`, `server/`) and how each construct maps to the production tables, rails, and packs specified above. The production spine (Appendix A) is a superset that generalizes this prototype; it never contradicts it. This map was produced by reading the live code, not from memory. Snapshot of the *actual* current prototype; all paths absolute — the reality every spec section reconciles against.

### 1. Stack & surfaces

- **Frontend:** React + Vite + TypeScript (strict), Zustand store, Tailwind, Vitest + Testing Library.
- **Backend (P1):** Plain TypeScript module (`server/`), file-persisted JSON state, pure request-handler function (no Express) — an event-appending, audit-logging state machine over the same `SeedState`.
- **Entry:** `src/App.tsx` renders phone app + hub side-by-side (`src/components/SideBySide.tsx`).

#### Phone surfaces — `src/components/phone/PhoneApp.tsx`
Tab order: `voice | health | today | why | find | plan | result` (`PhoneScreen` type).
- `VoiceCompanionScreen.tsx` — Sandy voice-first simulation (turns, red-flag lock).
- `HealthCompanionScreen.tsx` — longitudinal companion (BP / glucose / meds / ask-sandy) + `HealthAlertCenter.tsx`.
- `TodayScreen`, `WhyItMattersScreen`, `FindScreeningScreen`, `PlanBuilderScreen`, `ResultScreen`, plus `ProvenanceStrip.tsx`, `SafetyBoundaryCard.tsx`, `SmartCard.tsx`, `AssistantBox.tsx`, `PhoneFrame.tsx`.

#### Hub / navigator console — `src/components/hub/HubShell.tsx`
`HubView`: `queue | gaps | timeline | referrals | outcomes | expansion`.
- `NavigatorQueueView`, `GapListView`, `PatientTimelineView`, `ReferralQueueView`, `ProgramOutcomesView`, `ExpansionMapView`.

---

### 2. Entities / types — `src/types.ts` (single source for frontend types)

| Type | Key fields | Notes |
|---|---|---|
| `Patient` | id, name, county, condition, a1c | Hero = `pat_ruthann` (Ruth Ann Caldwell), 12 background patients. |
| `ScreeningSite` | id, name, type(`fqhc\|mobile_clinic\|community_camera\|eye_clinic`), distanceMiles, nextAvailable, nextAvailableHours, rideSupport, lowCost | |
| `ScreeningGap` | id, patientId, gapType(`diabetic_retinopathy`), status(`GapStatus`), priorityLabel(`PriorityLabel`), lastScreeningDate | Only one gapType exists. |
| `Barrier` | id, patientId, type(`BarrierType`), detail, reportedVia | |
| `CarePlanTask` | id, patientId, siteId, step, when | |
| `NavigatorTask` | id, patientId, type(free string), status(`open\|done`), owner, note | Legacy task list, parallel to `NavigatorQueueItem`. |
| `ScreeningResult` | id, gapId, outcome(`ResultOutcome`), gradable, capturedAt | |
| `Referral` | id, patientId, reason, destination, owner, status(`pending\|scheduled\|completed`), daysSinceResult | |
| `OutreachEvent` | id, patientId, kind(`assistant_question`), detail, surface | |
| `TimelineEntry` | id, patientId, label, seq | |
| `HubMetric` | id, label, seed, value, denominator, scope(`cohort`) | |
| `SourceFact` | id, patientId, label, value, sourceKind(`SourceKind`), sourceName, retrievedAt, effectiveDate, confidence(`SourceConfidence`) | **Provenance ledger row.** |
| `PatientConsent` | id, patientId, status(`ConsentStatus`), scope, updatedAt | |
| `ProtocolEvent` | id, patientId, type(`ProtocolEventType`), label, status(`ProtocolStatus`), createdAt, actor(`ProtocolActor`), sourceFactIds[] | **Event-sourced protocol envelope.** |
| `VoiceTurn` | id, patientId, speaker(`patient\|sandy`), text, createdAt, mode(`voice\|text`), safety(`normal\|fallback\|red_flag`) | |
| `RedFlagEvent` | id, patientId, symptom, action, createdAt, status(`open\|reviewed`) | |
| `NavigatorQueueItem` | id, patientId, reason(`NavigatorQueueReason`), priority(`NavigatorQueuePriority`), summary, suggestedAction, status(`open\|done`), createdAt, sourceEventIds[] | **The real navigator work item.** |

#### Enumerations (verbatim from `src/types.ts`)
- `GapStatus` = `overdue | engaged | scheduled | completed | closed | referral | repeat`
- `PriorityLabel` = `urgent_follow_up | likely_barrier | app_engaged | navigator_needed`
- `ResultOutcome` = `normal | abnormal | ungradable`
- `BarrierType` = `transportation | cost | after_hours | not_ready | already_completed`
- `SourceKind` = `hie | claims | site_feed | patient_reported | navigator_review | prototype_seed`
- `SourceConfidence` = `confirmed | probable | patient_reported | needs_review`
- `ConsentStatus` = `active | missing | revoked`
- `ProtocolStatus` (12 states) = `identified | patient_contactable | explained | barrier_collected | site_matched | scheduled | completed | normal_closed | abnormal_referral_needed | repeat_needed | navigator_review | closed_by_reconciliation`
- `ProtocolEventType` (13) = `care_gap_imported | patient_consented | sandy_explained_gap | question_answered | barrier_reported | red_flag_reported | site_matched | appointment_confirmed | already_completed_claimed | result_imported | navigator_reviewed | referral_scheduled | repeat_scheduled`
- `ProtocolActor` = `sandy | patient | navigator | system`
- `NavigatorQueueReason` (10) = `transportation_barrier | cost_barrier | after_hours_needed | patient_not_ready | already_completed_needs_reconciliation | red_flag_symptom | abnormal_result_referral | ungradable_repeat_needed | nonresponse | low_confidence_identity_or_gap_match`
- `NavigatorQueuePriority` = `routine | soon | urgent`

#### Longitudinal-health types — `src/lib/longitudinal-health.ts`
- `HealthCompanionSectionId` = `blood-pressure | glucose | medications | ask-sandy`
- `HealthDevice{ name, status(available_to_connect|simulated_connected), detail }`
- `HealthInsight{ label, detail, suggestedAction }` — hand-authored, e.g. "Nighttime hyperglycemia pattern", "Morning readings run higher", "Evening medicine is easier to miss". **Not emitted by any engine — static content.**
- `MedicationSummary{ name, schedule, support }` (Metformin, Lisinopril).
- `HealthCompanionSection{ id, title, eyebrow, summary, lessons[], device?, insights[], medications?, safety, sandyPrompts[] }`

#### Health-alerts types — `src/lib/health-alerts.ts`
- `HealthAlert{ id, type(medication|blood_pressure|symptom_log), title, detail, status(due|upcoming|completed), nextDueLabel, channel('In-app reminder'), safety, completedAt?, snoozedUntil? }`
- `alertCounts`, `markAlertDone`, `snoozeAlert` (pure array transforms).

---

### 3. Store shape — `src/store/useStore.ts`

`StoreState extends SeedState` (all 16 collections in memory) + actions. `SeedState` (`src/data/seed.ts`):
`patients, sites, gaps, barriers, carePlanTasks, navigatorTasks, results, referrals, outreach, timeline, metrics, sourceFacts, consents, protocolEvents, voiceTurns, redFlagEvents, navigatorQueue`.

**Actions (all `set`-based, synchronous, in-memory):**
- `askQuestion(patientId, input, surface)` — appends `question_answered` event, transitions gap `overdue→engaged`, sets priority `app_engaged`, logs outreach + timeline.
- `reportBarrier(patientId, type, detail)` — `barrier_reported` event, gap→engaged priority `navigator_needed`, creates legacy `NavigatorTask` **and** `NavigatorQueueItem` (via `queueReasonForBarrier`).
- `reportAlreadyCompleted(patientId)` — `already_completed_claimed` event + `already_completed_needs_reconciliation` queue item.
- `scheduleScreening(patientId, siteId, when)` — `site_matched` + `appointment_confirmed` events, gap→scheduled, increments `scheduled` metric, adds `CarePlanTask`.
- `enterResult(patientId, outcome)` — `result_imported` event, gap→completed→(closed|referral|repeat), increments `completed` (+`gaps_closed` if normal), creates `Referral` + queue item for abnormal/ungradable.
- `startAutonomousOutreach(patientId)` — red-flag-locked; else `sandy_explained_gap` + Sandy intro voice turn.
- `recordPatientVoiceReply(patientId, text)` — runs `screenPatientMessage`; branches red_flag (lock + queue), barrier (`barrierFromReply` regex), else `question_answered`.
- `completeNavigatorQueueItem(itemId)`.
- `reset()`.

Determinism helpers: `nextId(prefix)` (module counter), `now()` = fixed `'2026-07-03T09:00:00'`.

---

### 4. P1 backend — `server/`

Mirrors the store but **persistent, audited, event-appending**. Pure handler; no HTTP framework.

- **`server/types.ts`** — `AuditEvent{ id, createdAt, actor(patient|sandy|navigator|system), action, outcome(allowed|blocked|failed), patientId?, sourceIds[], detail }`; `BackendState{ schemaVersion:1, updatedAt, data:SeedState, auditEvents[] }`; `StateStore{ load, save, reset }`; `RouteResponse<T>{ status, body }`.
- **`server/state.ts`** — `createInitialBackendState()` (clones `seed`); `createFileStateStore(filePath)` — JSON file load/save/reset, ENOENT→fresh.
- **`server/actions.ts`** — pure `(state,input)→state` transitions, each ending in `appendAuditEvent`:
  - `startVoiceSession(state, patientId)` — red-flag lock → audit `blocked`; else `sandy_explained_gap` + audit `allowed`.
  - `recordVoiceReply(state, {patientId,text})` — screen → red_flag / barrier / off_protocol-fallback / normal; creates queue items; audits each path.
  - `completeNavigatorTask(state, itemId, reviewer)` — `navigator_reviewed` event + audit (`failed` if item missing).
- **`server/audit.ts`** — `appendAuditEvent(state, input)` append-only, module counter, fixed `now()` = `'2026-07-04T09:00:00'`.
- **`server/routes.ts`** — `handleApiRequest(store, method, path, body)`:
  - `GET /api/health`
  - `POST /api/reset`
  - `GET /api/patients/:id/context` → `{patient, consent, sourceFacts, protocolEvents, voiceTurns, redFlagEvents, navigatorQueue(open)}`
  - `GET /api/navigator/queue` → open items enriched w/ patientName, patientCounty, sourceFacts
  - `POST /api/voice/:id/start`
  - `POST /api/voice/:id/reply` (body `{text}`)
  - `POST /api/navigator/queue/:id/complete` (body `{reviewer}`)
  - `GET /api/audit`

**Frontend and backend duplicate the same transition logic** (store actions vs. server actions) — both import the shared `src/lib/retinopathy-protocol.ts` and `src/lib/safety.ts`. This duplication is a known migration seam.

---

### 5. Retinopathy protocol state machine — `src/lib/retinopathy-protocol.ts`

The **canonical implemented state machine** (shared by store + server).

- `EVENT_TRANSITIONS: Partial<Record<ProtocolEventType, ProtocolStatus>>` — event→target status (e.g. `sandy_explained_gap→explained`, `barrier_reported→barrier_collected`, `red_flag_reported→navigator_review`, `already_completed_claimed→navigator_review`, `navigator_reviewed→closed_by_reconciliation`).
- `RESULT_TRANSITIONS: Record<ResultOutcome, ProtocolStatus>` — `normal→normal_closed`, `abnormal→abnormal_referral_needed`, `ungradable→repeat_needed`.
- `PROTOCOL_STATE_ORDER` — monotonic rank 0–11 over the 12 statuses.
- `TERMINAL_STATES` = {`normal_closed`, `closed_by_reconciliation`}.
- `REVIEW_EXIT_STATES` — allowed exits from `navigator_review`.
- `shouldTransition(current,next)` — blocks terminal; from `navigator_review` only into review-exit set; else `next rank >= current rank` (monotonic, no backward moves).
- `nextProtocolStatus(current, eventType, outcome?)` — main reducer.
- `queueReasonForBarrier(BarrierType)→NavigatorQueueReason`.
- `priorityForQueueReason(reason)→NavigatorQueuePriority` — `red_flag_symptom`=urgent; abnormal/ungradable/low-confidence=soon; else routine.

**Separate legacy gap FSM** — `src/lib/screening-gap.ts`: `LEGAL_TRANSITIONS: Record<GapStatus,GapStatus[]>`, `canTransition`, `transition` (throws on illegal), `outcomeToStatus`. This is a *second, narrower* state machine on `GapStatus` used for the UI gap card, distinct from `ProtocolStatus`.

---

### 6. Other lib modules

- **`src/lib/safety.ts`** — `screenPatientMessage(input)→{category(normal|red_flag|off_protocol), patientCopy, navigatorSummary, queueReason?}`; regex `RED_FLAG_PATTERNS` (vision loss, flashes/floaters, eye pain, curtain) + `OFF_PROTOCOL_PATTERNS` (diagnosis / med-change requests). `isAutonomousActionAllowed(SafetyAction)` — allows education/barrier/site/plan; denies diagnose/change_med/reassure_red_flag. `SafetyAction` is the autonomy-boundary vocabulary.
- **`src/lib/site-matching.ts`** — `MatchMode(best|fastest|closest)`, `rankSites`, `explainMatch`. Deterministic scoring (`bestScore`: distance + penalties for no-ride/no-lowcost).
- **`src/lib/metrics.ts`** — `incrementMetric(metrics, id)`.
- **`src/lib/ai-script.ts`** — `FALLBACK`, `PATIENT_CHIPS`, `WHY_CHIPS`, `WHY_IT_MATTERS_ANSWER`, `resolveAnswer` — the **approved-answer library** (hard-coded scripted answers; this is the "scripted assistant" safety tier).

---

### 7. Real vs simulated

| Concern | State |
|---|---|
| Protocol state machine | **Real** logic (deterministic reducer, monotonic guards). |
| Event sourcing + audit | **Real** (P1 backend appends events + audit, file-persisted). |
| Provenance ledger | **Real** shape (`SourceFact`), but seeded facts (Kentucky HIE pilot feed, Claims gap file). |
| Navigator queue | **Real** derivation from events. |
| Safety screening / red-flag lock | **Real** regex + lock logic. |
| Site matching | **Real** deterministic ranking over seed sites. |
| Sandy answers | **Simulated** — scripted `ai-script.ts`; no model call. |
| Voice | **Simulated** — text turns, no Realtime/WebRTC. |
| BP / CGM / pill-bottle devices | **Simulated** — static `HealthInsight` content, `available_to_connect` status only. No device APIs, no insight engine. |
| Health alerts | **Simulated** — static seed, pure array transforms. |
| HIE / claims / site feed ingestion | **Simulated** — seed `SourceFact`s only; no adapters. |
| FHIR store | **Absent** — not built; spec direction only. |
| Insight engine (§5 of platform brief) | **Absent** — no deterministic detector emits protocol events from observations. |
| Persistence backend transport | Handler is real; no server bootstrap/HTTP listener wired in prototype. |

---

### 8. Test suite structure

Vitest, colocated `*.test.ts(x)`, setup `src/test/setup.ts`.
- **Lib unit:** `smoke`, `screening-gap`, `metrics`, `site-matching`, `ai-script`, `safety`, `retinopathy-protocol`, `longitudinal-health`, `health-alerts`.
- **Data:** `src/data/seed.test.ts`.
- **Store:** `src/store/useStore.test.ts`.
- **Server:** `server/audit.test.ts`, `server/state.test.ts`, `server/actions.test.ts`, `server/routes.test.ts`.
- **Component (Testing Library):** phone (`VoiceCompanionScreen`, `HealthCompanionScreen`, `HealthAlertCenter`, `TodayScreen`, `ProvenanceStrip`, `SafetyBoundaryCard`, `PhoneApp`, `PlanBuilderScreen`, `FindScreeningScreen`, `AssistantBox`, `ResultScreen`), hub (`NavigatorQueueView`, `HubShell`, `GapListView`, `PatientTimelineView`, `ProgramOutcomesView`, `ExpansionMapView`), `SideBySide`.
- **End-to-end journey:** `src/golden-path.test.tsx` (full retinopathy loop through the UI).

There is no red-team / adversarial safety test suite yet (the P2 exit-criteria "red-team gate" is unbuilt).

