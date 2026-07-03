# Sprint: RHTP production architecture
**Started:** 2026-07-03
**Spec:** docs/superpowers/specs/2026-07-03-rhtp-production-architecture.md
**Plan:** not written

## Current Phase
Phase 3 - Documentation

## Phase 1 - Discovery
**Status:** done
**Context:** The current repo is a static Vite/React prototype showing one diabetic-retinopathy gap moving from overdue to navigator-needed/scheduled/closed-loop across a patient phone and hub dashboard. The RHTP source document frames Kentucky Health LLM, AI telehealth, proactive chronic care, medication adherence, and population health analytics as one statewide AI infrastructure portfolio.
**Constraints:** First production wedge stays diabetic-retinopathy gaps. First returned-information customer is a community health worker or navigator. Product starts patient-owned and EMR-adjacent. Data integration starts HIE/claims-first, then later plugs into EMRs. Voice is central. Autonomous outreach is allowed only within approved protocols.
**Decisions:** Use a care-plan engine with a voice interface, protocolized autonomy, navigator queue, source-provenance ledger, and HIE/claims intake.

## Phase 2 - Design
**Status:** done
**Approaches presented:** yes
**Design sections approved:** patient-owned EMR-adjacent posture, navigator receiver, retinopathy wedge, minimum trusted data bundle delegated to agent recommendation, autonomous outreach boundary, HIE/claims-first integration, voice-first experience
**Open items:** none blocking architecture spec

## Phase 3 - Documentation
**Status:** active
**Spec path:** docs/superpowers/specs/2026-07-03-rhtp-production-architecture.md
**Spec approved:** no

## Phase 4 - Handoff
**Status:** pending

## Next Action
Review the written architecture spec and decide whether to turn it into an implementation plan.
