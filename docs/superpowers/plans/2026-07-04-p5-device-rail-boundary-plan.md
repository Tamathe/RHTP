# RHTP P5 Device Rail Boundary Plan

**Date:** 2026-07-04
**Proof rung:** local demo backend, no real PHI
**Source spec:** `docs/superpowers/specs/2026-07-04-rhtp-platform-technical-spec.md`

## Goal

Build the local P5 device rail boundary so the repo can prove the shape of device ingestion before real HealthKit, Health Connect, Dexcom, pharmacy claims, or native-shell integrations exist.

This is not real device sync. It is a local safety and provenance boundary.

## Scope

- Register the first P5 source vocabulary:
  - HealthKit and Health Connect
  - Dexcom API
  - Pharmacy claims PDC floor
- Add a local device reading rail that:
  - accepts only registered device sources
  - requires active patient consent
  - requires canonical units per observation type
  - requires FHIR references on accepted readings
  - lands accepted readings as `device` source facts
  - emits deterministic non-diagnostic insight summaries
  - blocks unsafe device actions such as dosing, medication changes, and diagnosis
- Add web/native runtime gating so HealthKit and Health Connect stay disabled in web runtime while Dexcom patient OAuth remains reachable.
- Add a P5 gate command that proves the local boundary.

## Non-Scope

- No native shell.
- No HealthKit or Health Connect APIs.
- No Dexcom API calls.
- No pharmacy PDC calculation.
- No Timescale stream storage.
- No production FHIR store.
- No real-PHI deployment.

## Acceptance

- `npm run p5:gate` reports 6/6 cases passing.
- Device source registry exposes the direct device sources.
- Canonical unit mismatches block before source facts are added.
- Accepted readings carry FHIR provenance.
- Insight text stays non-diagnostic and never recommends insulin dosing or medication changes.
- Web runtime blocks HealthKit/Health Connect native sync.
