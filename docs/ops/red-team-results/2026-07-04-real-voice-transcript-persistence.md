# P2 Real Voice Transcript Persistence Result

**Date:** 2026-07-04
**Command:** `npm run test -- server/actions.test.ts server/routes.test.ts src/lib/realtime-voice-browser.test.ts server/realtime-voice.test.ts server/state.test.ts`
**Result:** Pass

## Output

```text
Test Files  5 passed (5)
Tests  30 passed (30)
```

## Interpretation

- A successful Realtime session mint creates a durable `voice_sessions` row with patient id, protocol instance id, pack id, model id, safety identifier, and active status.
- Patient context exposes voice sessions and transcript segments for local demo visibility.
- Completed Realtime transcript events persist to `transcript_segments` through a backend route linked to the voice session.
- The browser connector persists completed patient and Sandy transcript events, not partial deltas.
- Existing local JSON state is normalized so older demo state files without the new arrays still load.
- This still does not complete P2 real voice exit. The Sandy tool gateway, full live retinopathy voice journey red-team, and latency proof remain pending.
