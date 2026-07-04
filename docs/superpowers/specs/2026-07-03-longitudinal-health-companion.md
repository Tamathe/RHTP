# Longitudinal Health Companion Spec

## Purpose

Expand the patient app from a retinopathy wedge into a chronic-care companion that can teach, coach, connect simulated devices, surface trends, track medications, and route concerns back to Sandy or a navigator.

## Product Shape

The first implementation adds a `Health` tab inside the phone app. It acts as a patient-owned command center for:

- Blood pressure education and digital cuff connection.
- Glucose education, CGM connection, and pattern insight.
- Medication tracking, smart pill bottle connection, and appointment support.
- Sandy chat prompts grounded in the patient knowledge bundle.

## Safety Boundary

The companion may educate, explain trends, suggest follow-up, collect barriers, remind, and create navigator work in later phases. It may not diagnose symptoms, change medication dosing, reassure danger signs, or imply that simulated device data is a real clinical integration.

## Minimum Trusted Knowledge Bundle

The first prototype bundle includes:

- Current conditions: type 2 diabetes, retinopathy screening gap, elevated A1C.
- Existing source facts from HIE, claims, and site feed.
- Simulated BP device status and BP pattern.
- Simulated CGM status and nighttime hyperglycemia pattern.
- Medication list and adherence cues.
- Safety copy that directs urgent or medication-change questions to a clinician.

## UI Requirements

- Add a `Health` tab to the phone app.
- Use compact segmented controls for `Blood pressure`, `Glucose`, `Meds`, and `Ask Sandy`.
- Blood pressure page teaches why BP matters and how to lower it, and offers a simulated digital cuff connection.
- Glucose page teaches CGM pattern insight and shows the nighttime hyperglycemia follow-up suggestion.
- Medication page shows meds, smart pill bottle connection, adherence support, and appointment support.
- Ask Sandy page shows patient-specific knowledge sources and safe example prompts.

## Deferred

- Real wearable/device APIs.
- Real CGM integration.
- Medication reconciliation from an EMR.
- Real model calls.
- Automated medication advice.
- Closing clinical loops without navigator or clinician review.
