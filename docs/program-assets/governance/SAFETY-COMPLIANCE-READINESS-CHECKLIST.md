# Safety, Compliance, and Real-PHI Readiness Checklist

**Status:** L1 operational draft.  
**Purpose:** Name the gates that must close before the program uses real patient data or conducts autonomous outreach.

## Real-PHI Gate

Before real PHI:

- HIPAA hosting posture approved.
- BAAs executed with cloud, model, SMS, analytics, and data vendors that touch PHI.
- No secrets in client code.
- Role-based access in place.
- Audit logging in place.
- Consent versioning in place.
- Data retention policy approved.
- Incident response process approved.
- Real patient identity proofing and match-confidence workflow approved.
- Sensitive data segmentation policy approved.

## AI Safety Gate

Before real Sandy:

- Approved prompt and tool definitions.
- Server-side tool gateway.
- Model/version logging.
- Transcript/event capture.
- Red-team suite passed for the active protocol.
- Off-protocol fallback tested.
- Red-flag interrupt tested.
- Unsafe action blocking tested.
- Human handoff path tested.
- Patient-facing limitation statement approved.

## Clinical Safety Gate

Before pilot:

- Clinical sponsor signs off protocol pack.
- Screening cadence validated against current clinical standard.
- Red flags approved.
- Patient education approved.
- Abnormal and ungradable result workflows approved.
- Navigator escalation pathway approved.
- Clinical review owner assigned.

## Consent And Trust Gate

Before outreach:

- Patient consent language approved.
- Data source explanation approved.
- Opt-out flow approved.
- Caregiver sharing workflow approved.
- Privacy notice approved.
- Patient advisory review completed.

## SDOH Resource Gate

Before resource referrals:

- Source-of-truth path approved.
- Resource trust tiers approved.
- Stale-resource reporting process approved.
- Consent before sharing contact details policy approved.
- Navigator-mediated referral boundary approved.

## Measurement Gate

Before pilot:

- Metric dictionary approved.
- Denominators defined.
- County/equity cuts defined.
- Reporting cadence defined.
- Safety events reported alongside outcomes.
- Prototype seed data excluded from outcome claims.

## Do-Not-Cross Lines

The program must not:

- Diagnose.
- Recommend medication dose changes.
- Give insulin adjustment advice.
- Reassure away red flags.
- Autonomously triage emergency symptoms.
- Close a care gap without trusted evidence or navigator review.
- Use SDOH flags to deprioritize care.
- Hide the source or uncertainty behind a recommendation.
