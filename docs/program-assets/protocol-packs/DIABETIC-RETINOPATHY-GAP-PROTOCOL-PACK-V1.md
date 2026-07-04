# Diabetic Retinopathy Gap Protocol Pack v1

**Status:** L1 operational draft.  
**Clinical source anchor:** ADA Standards of Care in Diabetes 2026 retinopathy section.  
**Boundary:** This pack supports outreach, education, barrier collection, screening-site matching, navigator handoff, and loop closure. It does not diagnose eye disease or replace an ophthalmology/optometry evaluation.

## Purpose

Identify patients with diabetes who appear overdue for diabetic-retinopathy screening, explain why screening matters, help them make a screening plan, collect barriers, and return structured work to a navigator when human help is needed.

## Cohort Rules

First production cohort:

- Adult patient with diabetes evidence from trusted source.
- No documented retinal screening evidence in the configured lookback interval.
- Active patient consent for outreach and care-plan support.
- Contact path available.
- County or approximate location available for site/resource matching.

Source facts needed:

- Diabetes diagnosis evidence.
- Recent A1C if available.
- Last screening date or absence of screening evidence.
- Insurance/coverage hint if available.
- County or location approximation.
- Consent status.

## Protocol States

Use the current prototype state machine:

1. `identified`
2. `patient_contactable`
3. `explained`
4. `barrier_collected`
5. `site_matched`
6. `scheduled`
7. `completed`
8. `normal_closed`
9. `abnormal_referral_needed`
10. `repeat_needed`
11. `navigator_review`
12. `closed_by_reconciliation`

## Events

| Event | Allowed Actor | Result |
|---|---|---|
| `care_gap_imported` | system | Creates identified protocol instance |
| `patient_consented` | system / patient | Makes patient eligible for Sandy contact |
| `sandy_explained_gap` | sandy | Moves to explained |
| `question_answered` | sandy | Records approved education support |
| `barrier_reported` | patient | Creates navigator work when needed |
| `sdoh_resource_requested` | patient | Creates SDOH resource connection work |
| `red_flag_reported` | patient | Stops routine flow and escalates |
| `site_matched` | sandy / system | Shows eligible screening options |
| `appointment_confirmed` | patient | Creates care plan task |
| `already_completed_claimed` | patient | Routes to reconciliation |
| `result_imported` | system / navigator | Closes normal, routes abnormal/repeat |
| `navigator_reviewed` | navigator | Documents human review |

## Patient Education Module Requirements

The education module must be approved at a plain-language reading level and include:

- What diabetic-retinopathy screening is.
- Why people with diabetes need regular eye checks even without symptoms.
- What the app found and what source it came from.
- What a screening visit may involve.
- What happens after normal, abnormal, or ungradable results.
- What Sandy can help with.
- What Sandy cannot do.
- When symptoms should trigger urgent help.

Patient-facing claims must cite provenance:

- "Your record shows diabetes" -> diabetes source fact.
- "We do not see a screening in the last year" -> claims/HIE/source fact.
- "This site has ride support" -> site-feed source fact.

## Sandy Tool Grants

Allowed:

- Explain the screening gap using approved content.
- Answer approved education questions.
- Record questions asked.
- Record barriers.
- Match screening sites.
- Match Kentucky SDOH resources.
- Confirm a patient-selected plan.
- Create navigator tasks.
- Escalate red flags.
- Record already-completed claims for reconciliation.

Forbidden:

- Diagnose vision problems.
- Reassure away acute vision symptoms.
- Tell the patient they do not need screening.
- Close a gap based only on patient report.
- Change medication or diabetes treatment.
- Promise appointment availability, ride availability, coverage, eligibility, or resource acceptance.

## Red Flags

Routine Sandy flow must stop and route to urgent navigator/clinical guidance when the patient reports:

- Sudden vision loss.
- New curtain/shadow over vision.
- New flashes or many floaters.
- Severe eye pain.
- Eye trauma.
- Any symptom the clinical owner adds to the red-flag library.

Patient copy must be direct, non-reassuring, and action-oriented. Navigator queue priority should be urgent.

## Navigator Work Types

| Queue Reason | Priority | Navigator Action |
|---|---|---|
| `transportation_barrier` | routine | Confirm ride option and screening plan |
| `cost_barrier` | routine | Check coverage/low-cost path |
| `after_hours_needed` | routine | Find weekend/evening option |
| `patient_not_ready` | routine | Use motivational script and document preference |
| `already_completed_needs_reconciliation` | routine | Verify source record before closing |
| `sdoh_resource_connection` | routine | Confirm resource availability and eligibility |
| `red_flag_symptom` | urgent | Call patient and route to urgent clinical guidance |
| `abnormal_result_referral` | soon | Confirm referral pathway |
| `ungradable_repeat_needed` | soon | Schedule repeat screening |
| `low_confidence_identity_or_gap_match` | soon | Resolve data quality before outreach |

## Closure Criteria

The protocol may close only when one of these occurs:

- Normal screening result is imported from a trusted source.
- Navigator reconciles completed screening evidence.
- Patient opts out and the instance is documented as not actionable for outreach.

Abnormal and ungradable results do not close the loop until referral or repeat-screening steps are tracked.

## Measurement

Core metrics:

- Eligible patients imported.
- Patients reached.
- Questions answered.
- Barriers collected.
- Resource connections requested.
- Screening plans confirmed.
- Screenings completed.
- Normal results closed.
- Abnormal referrals created.
- Ungradable repeats created.
- Time from gap import to patient contact.
- Time from contact to scheduled screening.
- Time from abnormal result to referral action.
- Escalations by reason.
- Outcomes by county.

## Launch Gates

This pack cannot move beyond L1 until:

- Clinical owner validates screening cadence and red flags against current standards.
- Navigator lead tabletop-tests every queue reason.
- Compliance approves patient consent and outreach copy.
- Safety lead approves red-team suite.
- Evaluation lead approves denominator and numerator definitions.
