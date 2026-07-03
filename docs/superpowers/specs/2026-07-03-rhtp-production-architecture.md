# RHTP Patient-Owned Care Companion - Production Architecture

**Date:** 2026-07-03  
**Status:** Draft architecture spec for review  
**First wedge:** diabetic-retinopathy screening gaps  
**First returned-information customer:** community health worker / navigator  
**Product stance:** patient-owned, EMR-adjacent first; HIE/claims-first ingestion; later EMR integration  
**Core thesis:** this is a care-plan engine with a voice interface, not a chatbot with care features attached.

## 1. Executive Shape

The production system should become an EMR-agnostic patient care operating layer. It sits beside existing clinical systems, builds a patient-facing longitudinal care plan, conducts protocolized voice-first outreach, collects barriers and follow-up signals, and returns structured work to a navigator.

The current prototype proves the smallest useful loop: a diabetic-retinopathy gap becomes understandable and actionable for the patient, and patient action immediately updates the hub. The production architecture generalizes that loop into a durable care-plan engine:

1. Ingest a trusted care gap from HIE, claims, or care-team upload.
2. Build a patient-owned plan with source provenance for every fact.
3. Let Sandy, the voice-first companion, explain, coach, remind, and collect structured responses.
4. Execute only approved autonomous outreach steps.
5. Escalate uncertainty, barriers, red flags, and exceptions to a navigator queue.
6. Close the loop through completed screening, documented referral, repeat screening, or navigator-reviewed reconciliation.

## 2. Locked Product Decisions

- **First wedge:** diabetic-retinopathy screening gaps for patients with diabetes.
- **First care-team receiver:** community health worker or navigator, not physician inbox by default.
- **Ownership model:** patient-facing and patient-owned, with explicit consent and visible data provenance.
- **System posture:** EMR-adjacent first; plug into EMRs later after the core care-plan and outreach engine works.
- **Integration order:** HIE and claims first, then scheduling/site feeds, then EMR writeback.
- **Primary interface:** speech-to-speech voice companion, with text transcript and typed fallback.
- **Autonomy boundary:** autonomous outreach is allowed inside approved protocols; independent clinical judgment is not.
- **Architecture principle:** each care journey is a protocol running on shared rails, not a custom one-off workflow.

## 3. Recommended Technical Approach

### Recommended Approach: Protocolized Care-Plan Platform

Build a shared care-plan engine and make retinopathy the first protocol. The patient app, voice agent, navigator queue, outreach scheduler, and data connectors all read/write through the same care-plan state model.

**Why this wins:** it avoids building a retinopathy-only app while still keeping scope narrow. The rails later support medication adherence, CHF/RPM, maternal health, A1C follow-up, blood pressure management, and behavioral health without reinventing consent, source provenance, outreach, escalation, or navigator review.

### Alternative A: Retinopathy-Only Production App

This would be faster but risks becoming a dead-end pilot. It should be rejected unless the mandate is only to ship a short-lived demonstration.

### Alternative B: Full Multi-Disease Platform Immediately

This matches the long-term vision but is too broad for first production. It should be decomposed into shared rails plus one protocol.

## 4. System Boundaries

### In Scope For First Production

- Patient identity, consent, preferences, language, accessibility, and contact routing.
- HIE/claims/care-gap intake for diabetic-retinopathy screening status.
- Retinopathy protocol state machine.
- Voice-first Sandy experience.
- Text fallback and visible transcript.
- Patient education using approved scripts.
- Site matching using distance, availability, ride support, low-cost status, and patient preferences.
- Barrier intake.
- Autonomous nudges/reminders.
- Navigator queue, summary, and next-action tools.
- Red-flag escalation.
- Event log, audit log, and source-provenance ledger.

### Out Of Scope For First Production

- Autonomous diagnosis.
- Medication changes.
- Closing clinical concerns without protocol support.
- Broad symptom triage beyond the retinopathy protocol's red-flag routing.
- Direct physician inbox writeback as the default path.
- Full bidirectional EMR integration.
- Multi-disease generalization beyond designing the extension points.

## 5. Core Product Surfaces

### 5.1 Patient App

The patient app is the patient's durable care home. It should show:

- Active care plan.
- Why the care plan exists.
- What data was used.
- What Sandy can and cannot do.
- Next best action.
- Voice-first conversation entry point.
- Text transcript and typed fallback.
- Site options and plan confirmation.
- Barrier reporting.
- Screening result and next step.
- Data sharing and consent controls.

The current phone surface maps to this future surface, but production should invert the hierarchy: voice first, cards second.

### 5.2 Sandy Voice Companion

Sandy is a protocol-bound voice companion that listens, reasons, speaks, and calls tools. OpenAI's voice-agent guidance supports two viable architectures: direct speech-to-speech sessions for low-latency conversational experience, or a chained speech-to-text -> agent -> text-to-speech pipeline when the application needs stronger control over intermediate text. The first version should use speech-to-speech for the primary experience, with server-side policy gates and durable transcript capture around each tool/action boundary.

OpenAI's voice-agent docs describe speech-to-speech as the best fit for natural, low-latency conversations, and describe chained pipelines as better when the app needs explicit control over transcription, reasoning, and speech output. The docs also recommend browser voice sessions through a `RealtimeAgent`/`RealtimeSession` path for a browser assistant, with tools, handoffs, and guardrails attached to the agent definition.

Implementation posture:

- Use live voice sessions for patient conversation.
- Keep protocol/business logic out of the audio transport layer.
- Route all actions through server-side tools.
- Capture transcript, tool calls, policy checks, and resulting state changes.
- Require typed, structured tool outputs for every clinical or operational action.

Relevant official references:

- OpenAI Realtime and audio overview: https://developers.openai.com/api/docs/guides/realtime
- OpenAI voice agents guide: https://developers.openai.com/api/docs/guides/voice-agents
- OpenAI Realtime WebRTC guide: https://developers.openai.com/api/docs/guides/realtime-webrtc

### 5.3 Navigator Console

The navigator console is the first returned-information surface. It should not be a raw chat transcript viewer. It should be a work queue that turns patient conversations into structured work:

- Priority queue.
- Patient card.
- Active protocol state.
- Why this patient is in the queue.
- What Sandy already tried.
- Patient-stated barrier.
- Red flags or safety concerns.
- Source data used.
- Confidence and uncertainty flags.
- Recommended next navigator action.
- Outreach script.
- Mark done / escalate / request clinician review.

The current hub's Gap List, Timeline, Referral Queue, Outcomes, and Expansion Map become early modules of this console.

## 6. Core Services

### 6.1 Identity, Consent, And Patient Context Service

Owns patient registration, consent, contact permissions, identity matching, language, accessibility needs, and data-sharing preferences.

The system should never treat imported data as automatically patient-owned context. It should show source and consent status, and use the minimum necessary data for the active protocol.

### 6.2 Source-Provenance Ledger

Every clinical or operational fact used by Sandy must carry:

- Source system.
- Data type.
- Retrieved/imported timestamp.
- Effective date.
- Confidence or match quality.
- Whether patient confirmed it.
- Whether navigator overrode it.

This prevents the app from saying "you are overdue" without being able to show why.

### 6.3 Retinopathy Protocol Engine

The retinopathy protocol owns the canonical state machine:

- `identified`
- `patient_contactable`
- `explained`
- `barrier_collected`
- `site_matched`
- `scheduled`
- `completed`
- `normal_closed`
- `abnormal_referral_needed`
- `repeat_needed`
- `navigator_review`
- `closed_by_reconciliation`

Each transition should be caused by a typed event:

- care gap imported
- patient consented
- Sandy explained gap
- question answered
- barrier reported
- red flag reported
- site matched
- appointment confirmed
- patient says already completed
- result imported
- navigator reviewed
- referral scheduled
- repeat scheduled

### 6.4 Voice Session Orchestrator

Creates and supervises Sandy sessions. It should:

- Start sessions only for authenticated/consented users.
- Load only protocol-relevant context.
- Attach approved tools.
- Apply prompt and tool guardrails.
- Persist transcript and events.
- Trigger post-session summarization for the navigator queue.
- Emit safety escalations immediately.

For browser/mobile clients, the WebRTC docs recommend using WebRTC for client-to-realtime model connections for more consistent performance than WebSockets, while keeping API key handling on a trusted backend. The production app should follow that split: browser/mobile handles microphone/audio; backend creates session configuration and controls tools.

### 6.5 Tool And Action Gateway

Sandy should not directly mutate clinical state. It calls tools exposed by the backend:

- `get_patient_care_plan`
- `explain_retinopathy_gap`
- `record_question`
- `record_barrier`
- `match_screening_sites`
- `confirm_screening_plan`
- `record_already_completed_claim`
- `create_navigator_task`
- `escalate_red_flag`
- `summarize_for_navigator`

Each tool should validate input, check protocol permissions, write an event, and return structured output. The LLM may propose an action, but the gateway decides whether it is allowed.

### 6.6 Navigator Work Queue

Transforms events into work:

- `transportation_barrier`
- `cost_barrier`
- `after_hours_needed`
- `patient_not_ready`
- `already_completed_needs_reconciliation`
- `red_flag_symptom`
- `abnormal_result_referral`
- `ungradable_repeat_needed`
- `nonresponse`
- `low_confidence_identity_or_gap_match`

Queue priority should be rule-based first, model-assisted second.

### 6.7 Data Integration Layer

Start HIE/claims-first:

- HIE: patient matching, diagnoses, labs, screening history when available, encounters, care-team hints.
- Claims: prior retinal screening evidence, insurance/coverage hints, completed visits, attribution, utilization.
- Site feeds: screening location, availability, modality, ride support, cost support, eligibility.
- Manual upload/admin import: bridge for early pilots and missing integrations.

Later EMR integration:

- Read: current problem list, meds, allergies, lab values, care gaps, appointment history.
- Writeback: navigator-reviewed summary, patient-reported barrier, confirmed plan, completed outreach, protocol state, referral/repeat requirement.

The key is to make writeback a downstream adapter, not the center of the product.

## 7. Minimum Trusted Data Bundle

For the retinopathy wedge, the minimum bundle is:

### Patient And Consent

- Patient ID.
- Name.
- Date of birth or identity-matching token.
- Phone/contact channel.
- County/address approximation for site matching.
- Language preference.
- Accessibility preference.
- Consent status.
- Preferred contact windows.
- Caregiver involvement preference.

### Clinical Eligibility And Risk

- Diabetes diagnosis evidence.
- Recent A1C value and date, if available.
- Last retinal screening date or absence of evidence.
- Relevant pregnancy status only if needed for future protocols.
- Red-flag symptom script, not a general diagnosis engine.

### Operational Context

- Insurance/coverage hints from claims.
- Screening sites.
- Site distance.
- Availability.
- Ride support.
- Low-cost/coverage support.
- Scheduling path.
- Navigator assignment.

### Conversation And Outreach

- Questions asked.
- Scripted answers given.
- Patient-stated barriers.
- Patient preferences.
- Attempts and outcomes.
- Transcript references.
- Safety escalations.

### Provenance

- Source for each imported fact.
- Date pulled.
- Confidence/match quality.
- Patient confirmation status.
- Navigator correction status.

## 8. Autonomy And Safety Boundary

### Sandy May Do Autonomously

- Explain why retinopathy screening matters.
- Answer approved education questions.
- Remind and nudge.
- Collect barriers and preferences.
- Match sites based on approved criteria.
- Confirm a screening plan.
- Ask structured follow-up questions.
- Escalate red flags or uncertainty to a navigator.

### Sandy May Not Do Autonomously

- Diagnose.
- Reassure away red-flag symptoms.
- Change medications.
- Give unscripted clinical advice.
- Close a clinical concern without protocol support.
- Hide uncertainty from the navigator.

### Safety Controls

OpenAI's safety guidance recommends moderation/safety measures, adversarial testing, human oversight in high-stakes domains, constraining user input/output where possible, and making limitations clear to users. This system should operationalize those recommendations as product controls:

- Approved answer library for patient education.
- Protocol-bound tools with server-side authorization.
- Red-flag symptom detection and immediate escalation.
- Navigator review for exceptions.
- Audit trail for all generated outreach and actions.
- Human-visible source data and transcript snippets.
- Patient-facing limitations statement.
- Red-team test set for prompt injection, unsafe reassurance, off-protocol medical advice, hallucinated site availability, false screening closure, and identity mismatch.

Relevant official reference:

- OpenAI safety best practices: https://developers.openai.com/api/docs/guides/safety-best-practices

## 9. Data Flow

### 9.1 Care Gap Intake

1. HIE/claims/manual feed imports diabetic-retinopathy gap evidence.
2. Identity service links the gap to a consented patient record.
3. Source-provenance ledger stores why the gap exists.
4. Protocol engine creates `identified` state.
5. Outreach scheduler makes patient eligible for Sandy contact.
6. Navigator console shows the patient as queued/monitorable but not yet requiring human work.

### 9.2 Voice Outreach

1. Patient opens app or receives approved outreach.
2. Backend creates a voice session with minimal protocol context.
3. Sandy explains the gap and asks for the next step.
4. Patient asks questions or reports barriers.
5. Tool gateway records structured events.
6. Protocol engine updates state.
7. Navigator queue receives only actionable tasks, not every chat turn.

### 9.3 Barrier-To-Navigator Loop

1. Patient says they need a ride.
2. Sandy records `transportation_barrier`.
3. Protocol engine marks `barrier_collected`.
4. Tool gateway creates `navigator_task`.
5. Navigator console shows barrier, source transcript, suggested script, and site/ride context.
6. Navigator resolves or escalates.

### 9.4 Close The Loop

1. Screening result arrives via claim/HIE/site feed/manual entry.
2. Protocol engine maps result to normal close, abnormal referral, or repeat needed.
3. Sandy explains the next step using approved copy.
4. Navigator receives referral/repeat tasks when needed.
5. Outcome metrics update.
6. Later EMR adapter writes a reviewed summary, if configured.

## 10. Model And Agent Posture

Use two AI lanes:

### Live Voice Lane

- Purpose: low-latency conversation, empathy, coaching, structured collection.
- Surface: Sandy speech-to-speech session.
- Tool access: narrow, protocol-approved tools only.
- State persistence: transcript and structured events stored outside the model session.

### Reasoning / Summarization Lane

- Purpose: navigator summaries, risk explanations, protocol audit, batch review.
- Surface: server-side Responses API or agent workflow.
- Tool access: source data, protocol state, transcript snippets, navigator queue.

OpenAI's Responses API is recommended for new projects and supports agent-like applications with tools, multimodal inputs, and stateful context. Use it for backend workflows where durable state, tools, structured outputs, and auditability matter more than live audio latency.

Relevant official reference:

- OpenAI Responses API migration / new-project guidance: https://developers.openai.com/api/docs/guides/migrate-to-responses

## 11. Storage Model

Core tables/collections:

- `patients`
- `patient_identities`
- `consents`
- `data_sources`
- `source_facts`
- `care_gaps`
- `care_protocols`
- `protocol_instances`
- `protocol_events`
- `outreach_attempts`
- `voice_sessions`
- `transcript_segments`
- `tool_calls`
- `barriers`
- `screening_sites`
- `site_matches`
- `care_plan_tasks`
- `navigator_tasks`
- `screening_results`
- `referrals`
- `audit_events`
- `metric_snapshots`

The prototype's existing entities map cleanly to these production concepts: `ScreeningGap`, `Barrier`, `CarePlanTask`, `NavigatorTask`, `ScreeningResult`, `Referral`, `OutreachEvent`, `TimelineEntry`, and `HubMetric`.

## 12. Error Handling And Exceptions

### Patient-Facing Errors

- Cannot verify identity: stop and route to human support.
- Missing consent: explain data-sharing requirement and request consent.
- Missing source data: explain uncertainty and ask whether the patient wants navigator help.
- No site availability: create navigator task.
- Off-script clinical question: use fallback and offer navigator.
- Red-flag symptom: stop normal flow and escalate.

### Care-Team Errors

- HIE/claims mismatch: queue identity/data-quality task.
- Conflicting screening evidence: queue reconciliation.
- Failed voice session summary: preserve transcript and queue manual review.
- Failed site/scheduling integration: queue navigator follow-up.
- Tool validation failure: block action, log audit event, notify operator if repeated.

## 13. Metrics

First production metrics:

- Eligible patients imported.
- Patients successfully contacted.
- Questions answered.
- Barriers collected.
- Navigator tasks created.
- Screening plans confirmed.
- Screenings completed.
- Gaps closed.
- Abnormal referrals completed.
- Repeat screenings completed.
- Time from gap import to patient contact.
- Time from patient contact to scheduled screening.
- Time from abnormal result to referral action.
- Autonomous interactions completed without navigator intervention.
- Escalations by reason.
- Safety events by category.
- Patient opt-out rate.

## 14. Privacy, Security, And Governance

- HIPAA-aligned hosting and BAAs for vendors touching PHI.
- No API keys in client code.
- Backend-created voice sessions only.
- Stable privacy-preserving safety identifier for AI-provider requests when supported.
- Role-based access for navigators, supervisors, and admins.
- Consent versioning.
- Audit log for all data access and protocol actions.
- Data minimization by active protocol.
- Retention policy for audio and transcripts.
- Human review of high-stakes summaries and all clinical exceptions.
- Model/version logging for every AI action.

## 15. Migration From Current Prototype

### Current Prototype Rail

- Static seed data.
- In-memory Zustand store.
- Phone app.
- Hub dashboard.
- Scripted AI answers.
- Retinopathy gap state transitions.
- Navigator task creation.
- Outcome counters.

### Production Rail

- Replace seed data with HIE/claims/manual intake.
- Replace in-memory store with persistent event-sourced protocol state.
- Replace scripted assistant UI with voice-first Sandy session.
- Keep scripted/approved answer library as safety layer.
- Replace simple hub with navigator queue.
- Add consent/provenance/audit.
- Add protocolized tool gateway.
- Add source connectors.
- Add reviewed writeback adapters later.

## 16. First Implementation Phases

### Phase P0 - Production-Shaped Prototype

- Add voice-first UI simulation to current prototype.
- Add navigator queue as primary hub view.
- Add provenance labels to every patient-facing claim.
- Add autonomous outreach state machine.
- Add safety boundary copy and red-flag flow.

### Phase P1 - Backend Foundation

- Add persistent backend.
- Add patient/consent/source-fact/protocol-event schema.
- Add protocol engine.
- Add navigator queue API.
- Add audit/event logging.

### Phase P2 - Real Voice

- Add backend-created Realtime sessions.
- Add Sandy tool gateway.
- Capture transcript/events.
- Add structured outputs for navigator summary.
- Add safety red-team suite.

### Phase P3 - Data Intake

- Add HIE/claims/manual import adapters.
- Add source-provenance ledger.
- Add identity matching workflow.
- Add site/scheduling feed.

### Phase P4 - Pilot Operations

- Run navigator-supervised pilot.
- Measure closed-loop outcomes.
- Calibrate scripts and escalation thresholds.
- Add EMR writeback only after navigator workflow is stable.

## 17. Acceptance Criteria For The First Production Slice

- A patient can complete a voice-first retinopathy care journey from "why me" to confirmed screening plan.
- Every patient-facing clinical claim has visible provenance.
- Sandy can autonomously collect barriers and create navigator tasks.
- Sandy cannot give off-protocol clinical advice.
- Red-flag symptoms interrupt the normal flow and escalate.
- Navigator sees a structured queue item with patient context, source data, transcript excerpt, and suggested next action.
- The system can reconcile completed screening evidence from a non-EMR source.
- Outcomes are reportable at cohort level.
- All AI actions are logged with model/session/tool/protocol metadata.

## 18. Key Open Decisions For Later

- Which HIE/claims source is the first real feed.
- Whether patient identity starts with app registration, SMS magic link, MyChart-style OAuth, or navigator enrollment.
- Whether audio is retained, transient, or retained only after explicit consent.
- Whether site scheduling is API-based, navigator-mediated, or hybrid.
- Which EMR writeback target should be first once the adjacent layer is working.
- Whether the Kentucky Health LLM is used in P0/P1 or remains a later model-localization lane.

## 19. Design Self-Review

- No implementation task depends on full EMR integration.
- Navigator is the first receiver, so physician inbox noise is avoided.
- Voice is central but protocol state remains server-owned.
- Autonomy is allowed only through approved tools and protocol transitions.
- The minimum trusted data bundle is narrow enough for retinopathy but extensible.
- HIE/claims-first architecture is compatible with later EMR writeback.
- The current prototype maps to the first executable slice rather than being discarded.
