# Trusted Data Bundle v1

**Status:** L1 operational draft.  
**Purpose:** Define the minimum patient-owned, provenance-visible record Sandy and navigators may use for the retinopathy pilot.

## Data Principles

- Minimum necessary data by active protocol.
- Every plan-driving fact has source, date, confidence, and confirmation state.
- Imported facts are not automatically treated as truth.
- Patient-reported facts are useful but must be labeled.
- Low-confidence identity or data matches create navigator work before outreach.

## Bundle Sections

### Patient Identity And Contact

Required:

- Patient ID.
- Name.
- Date of birth or identity token.
- County or approximate location.
- Preferred contact channel.
- Preferred language.
- Accessibility needs.
- Consent status and scope.

Optional for later:

- Caregiver contact.
- Preferred contact windows.
- Transportation constraints.

### Clinical Eligibility

Required for retinopathy:

- Diabetes diagnosis evidence.
- Retinal screening gap evidence.
- Last screening date or no-evidence statement.

Useful if available:

- Recent A1C value and date.
- Current eye-care provider.
- Relevant comorbid conditions.

### Operational Context

Required:

- Screening sites.
- Distance or county match.
- Next available window when known.
- Ride support flag when known.
- Low-cost/coverage support flag when known.

Useful if available:

- Insurance/coverage hints.
- Appointment preferences.
- Prior no-show or nonresponse context.

### Conversation And Care Plan

Required:

- Sandy transcript references.
- Questions asked.
- Approved answers given.
- Barriers reported.
- SDOH resource requests.
- Alerts/reminders sent.
- Patient plan confirmations.

### Provenance Fields

Every source fact needs:

- Fact ID.
- Patient ID.
- Label.
- Value.
- Source kind: HIE, claims, site feed, patient reported, navigator review, prototype seed.
- Source name.
- Retrieved/imported date.
- Effective date.
- Confidence.
- Patient confirmation status.
- Navigator correction status.

## Allowed Data Use By Surface

| Surface | May Use | Must Not Use |
|---|---|---|
| Patient app | Active protocol facts, patient-confirmed preferences, approved education, resource matches | Hidden risk scores, unconfirmed sensitive data, unrelated history |
| Sandy | Minimal active protocol bundle, approved content, tool outputs | Full chart dump, unrelated PHI, sensitive segmented data without consent |
| Navigator console | Source facts, protocol trail, transcript snippets, queue reason, suggested action | Unsupported model-only conclusions |
| Measurement dashboard | Aggregated protocol events and outcomes | Patient-identifiable details unless authorized |

## Retinopathy Bundle Acceptance Criteria

- Patient can see why the app says a screening gap exists.
- Sandy can explain the gap without seeing unrelated chart data.
- Navigator can see source facts tied to each queue item.
- Completed screening can be reconciled without trusting patient report alone.
- All AI/tool actions can be audited back to source facts and protocol events.
