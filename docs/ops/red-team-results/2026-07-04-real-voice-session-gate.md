# P2 Real Voice Session Gate Result

**Date:** 2026-07-04
**Command:** `npm run test -- server/realtime-voice.test.ts server/routes.test.ts server/actions.test.ts`
**Result:** Pass

## Output

```text
Test Files  3 passed (3)
Tests  20 passed (20)
```

## Interpretation

- `RHTP_REAL_VOICE=0` blocks the Realtime session route.
- `RHTP_REAL_VOICE=1` without `OPENAI_API_KEY` fails closed and records a critical ops alert.
- With the flag and server key present, the backend mints a short-lived OpenAI Realtime client secret using server-side credentials, returns only the client secret, and records an audit receipt without persisting the secret.
- The session config is intentionally minimal: no patient name, A1C, or source-fact values are sent in this local demo gate.
- This does not complete P2 real voice exit. Browser WebRTC attach, transcript persistence, Sandy tool gateway, latency proof, and full voice-journey red-team proof remain pending.
