# RHTP Deployment Runbook

**Current allowed deployment:** demo/prototype only.
**Blocked deployment:** any real-PHI pilot.

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
npm run ops:status -- --flags
```

Use this before and after deploy work. The output is only as current as `docs/ops/rhtp-release-ledger.json`.

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

## Preview Deployment

The repo has `vercel.json` configured for a static Vite app rewrite. Before a preview or production static deploy:

```bash
npm run build
```

Then deploy with the chosen deployment tool and record:

```json
{
  "target": "vercel_static_preview",
  "url": "https://...",
  "deploymentId": "dpl_...",
  "commit": "...",
  "proof": ["GET / returned 200"],
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
