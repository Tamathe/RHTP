# Measurement Dashboard Dictionary v1

**Status:** L1 operational draft.  
**Purpose:** Define the first program metrics before pilot so the app, navigator workflow, and reporting stay aligned.

## Measurement Principles

- Metrics should come from protocol events, source facts, navigator queue items, and outcome records.
- Every metric needs a denominator.
- County and equity cuts are first-class, not afterthoughts.
- Measure the safety system as well as clinical outcomes.

## Pilot Dashboard Sections

### Cohort Funnel

| Metric | Numerator | Denominator | Cut By |
|---|---|---|---|
| Eligible patients imported | Patients with active retinopathy gap instance | Data feed total | County, source |
| Consent active | Patients with active consent | Eligible patients | County, language |
| Patients contacted | Patients with outreach attempt | Consent active | County, channel |
| Patients engaged | Patients with question, barrier, or plan event | Patients contacted | County, channel |
| Plans confirmed | Patients with appointment confirmed | Patients engaged | County, site |
| Screenings completed | Patients with completed result | Plans confirmed | County, site |
| Gaps closed | Patients with normal close or reconciled close | Eligible patients | County, source |

### Navigator Work

| Metric | Numerator | Denominator | Cut By |
|---|---|---|---|
| Navigator tasks created | Opened queue items | Patients engaged | Reason, county |
| Task resolution rate | Done queue items | Opened queue items | Reason, navigator |
| Time to first navigator action | Median time from queue open to action | Opened queue items | Reason, county |
| Barrier rate | Patients with barrier reported | Patients engaged | Barrier type, county |
| SDOH resource requests | Resource connection queue items | Patients engaged | Need type, county |

### Safety

| Metric | Numerator | Denominator | Cut By |
|---|---|---|---|
| Red-flag escalations | Red-flag queue items | Voice/session turns | County, category |
| Off-protocol fallbacks | Fallback responses | Patient questions | Category |
| Unsafe action blocks | Blocked tool/action attempts | Tool/action attempts | Tool, protocol |
| Identity/data-quality tasks | Low-confidence queue items | Imported patients | Source |
| Already-completed reconciliation | Reconciliation queue items | Patient completion claims | Source |

### Outcome And Equity

| Metric | Numerator | Denominator | Cut By |
|---|---|---|---|
| Gap closure rate | Closed gaps | Eligible gaps | County, language, source |
| Abnormal referral follow-up | Referral scheduled/completed | Abnormal results | County, site |
| Repeat completion | Repeat completed | Ungradable results | County, site |
| Transportation barrier resolution | Resolved transportation tasks | Transportation tasks | County |
| Food/resource connection rate | Confirmed resource connections | Resource requests | Need type, county |

## Dashboard Acceptance Criteria

- Program director can see whether the wedge is working.
- Navigator lead can see workload and bottlenecks.
- Clinical sponsor can see safety exceptions.
- Community partner lead can see resource needs by county.
- Compliance can audit source and consent posture.

## Reporting Caveats

- Prototype seed data is not outcome evidence.
- Patient-reported completion is not a closed gap until reconciled.
- Resource request is not resource connection.
- A resolved navigator task is not always a clinical outcome.
