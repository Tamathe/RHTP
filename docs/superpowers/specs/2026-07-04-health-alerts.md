# Health Alerts Spec

## Purpose

Add a patient-facing alert mechanism for routine care behaviors: taking medication, checking blood pressure, and logging symptoms.

## Product Shape

The first implementation adds an in-app Alert Center inside the existing Health tab. It is local and simulated, but production-shaped: alerts have a type, schedule, status, channel label, safety copy, and patient actions.

## Supported Alerts

- Take medication: supports adherence and missed-dose awareness.
- Check blood pressure: supports routine home monitoring.
- Log symptoms: supports patient-reported symptoms and later navigator escalation.

## Patient Actions

- `Mark done`: records that the patient completed the alert.
- `Snooze`: moves the alert out of due state and shows a later time.

## Safety Boundary

Alerts are reminders and symptom logging prompts. They do not diagnose, change medication doses, determine urgent care needs, or replace clinician instructions. Urgent symptoms and concerning medication side effects should route to Sandy, a navigator, or emergency guidance in later phases.

## Deferred

- Real SMS, email, push notifications, or browser notifications.
- Browser notification permission prompts.
- Durable backend alert persistence.
- Navigator queue creation from missed alerts or symptom logs.
- Medication dosing changes or automated triage.
