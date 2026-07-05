# RHTP Deployment Runbook

**Current allowed deployment:** stakeholder demo/prototype only, using synthetic/local seed data.
**Blocked deployment:** any real-PHI pilot.

## Stakeholder No-PHI Demo

The first version is a prototype for stakeholder review. It should show what the experience looks like; it must not touch real patient data.

Before any stakeholder preview:

```bash
npm run release:gate
```

Required interpretation:

- `release:gate` must show `Validation: 3/3` and `Commands: 16/16`.
- `preview:gate` must show `Cases: 6/6` for the stakeholder demo gate and `Cases: 5/5` for the static preview smoke gate.
- `RHTP_REAL_PHI` stays off.
- Do not enter real patient names, identifiers, phone numbers, clinical facts, claims, or device data.
- Use the built-in synthetic/local seed data only.
- Real-PHI blockers remain in the ledger as parked production work, but they do not block this demo lane.
- Health-info gates E2, H2, H3, H4, and H5 are deferred until a real-PHI pilot is intentionally pursued.

Generate the copyable stakeholder handoff:

```bash
npm run release:packet
```

The packet reports the current commit, push status, proof rung, demo scope, parked real-PHI blockers, public-preview receipt state, latest receipt URL/deployment/commit when recorded, and exact next commands. To write it to a file, set `RHTP_RELEASE_PACKET_PATH` before running the command.

## Local App

```bash
npm install
npm run build
npm run dev
```

Record proof in `docs/ops/rhtp-release-ledger.json` if the build or browser check is used as a milestone.

## Local Backend

```bash
npm run server:test
npm run server:dev
```

The backend is a P1 local demo backend with file-persisted seed state. It is not a HIPAA deployment substrate.

## Status Dashboard

```bash
npm run ops:status
npm run ops:status -- --blockers
npm run ops:status -- --deploy
npm run ops:status -- --flags
```

Use this before and after deploy work. The output is only as current as `docs/ops/rhtp-release-ledger.json`.
Use `--deploy` for the concise proof ladder, deploy targets, public-preview receipt state, latest receipt URL/deployment/commit when recorded, and next deploy actions.

## P2 Live Voice Drill

The local no-PHI red-team gate is:

```bash
npm run voice:redteam
```

The live Realtime drill preflight is safe by default and does not call OpenAI unless provider timing is explicitly enabled:

```bash
npm run voice:live:preflight
```

Required no-PHI live drill environment:

- `RHTP_REAL_VOICE=1`
- `NEXT_PUBLIC_RHTP_REAL_VOICE=1` or `VITE_RHTP_REAL_VOICE=1`
- `OPENAI_API_KEY`

To measure the server-side OpenAI client-secret mint only, set `RHTP_LIVE_VOICE_PROVIDER_MINT=1` before running `npm run voice:live:preflight`. This still does not prove live browser audio; the final P2 exit needs a no-PHI browser/microphone Realtime journey and p95/p99 audio latency record.

During the no-PHI browser/microphone journey, the connected Realtime session exposes `getMetricsReport()`. Record these fields in the proof note:

- `voiceTurnP95Ms`
- `voiceTurnP99Ms`
- `voiceTurnBudgetMet`
- `toolGatewayP95Ms`
- `toolGatewayBudgetMet`
- `liveAudioMeasured`

The voice latency target is p95 <= 1200 ms and p99 <= 2000 ms. Tool gateway p95 must be <= 400 ms.

## P3 Local Ingestion Boundary

The local no-PHI P3 gate is:

```bash
npm run p3:gate
```

This proves only the local boundary: registered source vocabulary, patient-access claims consent, FHIR provenance, E2 identity handling, H2 async composition, and H3 Part 2 composition. It does not call Medicare Blue Button, a Kentucky Medicaid MCO, KHIE, TEFCA, or a FHIR store.

## D4 Local PDC Adherence Boundary

The local no-PHI D4 gate is:

```bash
npm run d4:gate
```

This proves only the local policy/calculation boundary: CMS/PQA PDC-DR treatment-period math, diabetes all-class grouping, same-drug overlap carry-forward, insulin exclusion, unknown-drug review, 80 percent threshold behavior, and `pharmacy_fill_claim` -> `insight.med.refill_gap` separation. It does not call a pharmacy claims API, import official NDC/RxNorm value-set files, write `med_pdc_daily` into a production FHIR store, or prove reportable live `pdc_diabetes` outcomes.

## P5 Local Device Boundary

The local no-PHI P5 gate is:

```bash
npm run p5:gate
```

This proves only the local boundary: registered device source vocabulary, canonical unit enforcement, FHIR provenance, non-diagnostic insight text, unsafe-action blocking, and web/native gating. It does not call HealthKit, Health Connect, Dexcom, pharmacy claims APIs, Timescale, or a production FHIR store.

## P6 Local Protocol-Pack Boundary

The local no-PHI P6 gate is:

```bash
npm run p6:gate
```

This proves only the local pack-is-config boundary: retinopathy plus hypertension, PDC adherence, and transitional care are represented as typed manifests; packs 2-4 validate cleanly, reuse the shared Sandy tools and rails, avoid denied safety actions, and declare the ADT discharge trigger for transitional care. It does not call KHIE, pharmacy claims APIs, payer APIs, a production FHIR store, or an EMR.

## P8 Local Writeback Boundary

The local no-PHI P8 gate is:

```bash
npm run p8:gate
```

This proves only the local clinician-summary/writeback boundary: navigator signature is required before clinician approval, prohibited diagnosis/dosing/triage language is blocked and audited, a safe navigator-attested `DocumentReference` can be locally approved and persisted, the clinician surface is P8-flagged and EMR-launch-only, and expansion proof uses synthetic multi-county cohorts. It does not launch SMART on FHIR, write to an EMR, call TEFCA IAS, or prove live multi-county operations.

## H4 Local Break-Glass Boundary

The local no-PHI H4 gate is:

```bash
npm run h4:gate
```

This proves only the local boundary: break-glass request/approval, short TTL, expired-read blocking, post-hoc review, Part 2 purpose-consent requirement, adolescent purpose-consent requirement, guardian-proxy blocking for adolescent facts, and category-match enforcement. It does not prove production consent repository enforcement, legal/clinical owner sign-off, segmented FHIR/storage, RBAC/RLS, or real-PHI readiness.

## D2 Local Adolescent Consent Boundary

The local no-PHI D2 gate is:

```bash
npm run d2:gate
```

This proves only the local policy boundary: Kentucky PHQ/GAD self-consent floor, unaccompanied-youth QMHP verification, under-16 fail-closed behavior, substance-use self-consent handling, guardian proxy suppression for minor-consented confidential results, clinician health-benefit parent-notice override, and general SDOH guardian-proxy behavior. It does not prove production counsel approval, clinical owner approval, proxy-portal suppression, consent repository enforcement, RBAC/RLS, segmented storage, or real-PHI readiness.

## P7 Local Screenings and Campaigns Boundary

The local no-PHI P7 gate is:

```bash
npm run p7:gate
```

This proves only the local screenings/campaigns boundary: PHQ/GAD item text is locked, scoring is deterministic, crisis routing is rule-based, SDOH flags are assistive-only, interpersonal-safety content is excluded from SMS-style outbound channels, and a flu-campaign barrier reuses the navigator task rail. It does not authorize production PHQ/GAD, SDOH, crisis outreach, SMS, or campaign use with real patient data.

## Preview Deployment

The repo has `vercel.json` configured for a static Vite app rewrite. Before a stakeholder demo preview:

```bash
npm run release:gate
```

This proves the local no-PHI demo gate, production build, all local phase gates, full test suite, Vite preview HTTP 200, app-shell markers, and the `/(.*)` to `/index.html` rewrite. It deliberately does not prove public deployment.

Generate the stakeholder packet after `release:gate`:

```bash
npm run release:packet
```

Then deploy with the chosen deployment tool and record:

```bash
$env:RHTP_PREVIEW_URL = "https://..."
$env:RHTP_DEPLOYMENT_ID = "dpl_..."
$env:RHTP_RECORD_PREVIEW_RECEIPT = "1"
npm run preview:verify
```

The verifier must show `Cases: 6/6` before the preview is called deployed. With `RHTP_RECORD_PREVIEW_RECEIPT=1`, it appends a JSONL receipt to `docs/ops/RHTP-DEPLOY-RECEIPTS.jsonl`. Record the printed receipt:

```json
{
  "target": "vercel_static_preview",
  "url": "https://...",
  "deploymentId": "dpl_...",
  "commit": "...",
  "proof": ["npm run preview:verify", "GET / returned 200", "synthetic/local seed data only", "RHTP_REAL_PHI off"],
  "phi": false
}
```

## Real-PHI Deployment

Stop. Real-PHI deployment is blocked until `docs/ops/RHTP-REAL-PHI-GATES.md` is closed in the ledger.

The future real-PHI runbook must add:

- HIPAA-eligible cloud account and BAA chain.
- Private network and IaC.
- Secrets and KMS policy.
- FHIR store deployment.
- Synthetic-only staging data.
- Backup, restore drill, and incident-response proof.
- Clinical-safety sign-off.
