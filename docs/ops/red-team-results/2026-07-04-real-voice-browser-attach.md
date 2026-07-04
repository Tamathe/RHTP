# P2 Real Voice Browser Attach Result

**Date:** 2026-07-04
**Command:** `npm run test -- src/lib/realtime-voice-browser.test.ts src/components/phone/VoiceCompanionScreen.test.tsx`
**Result:** Pass

## Output

```text
Test Files  2 passed (2)
Tests  10 passed (10)
```

## Interpretation

- Browser-side live voice remains hidden unless the client flag is enabled.
- The connector requests a backend-minted Realtime client secret before opening microphone access.
- The browser uses the ephemeral client secret for the OpenAI Realtime SDP exchange; it does not use or receive the server API key.
- Failed SDP exchange closes the peer connection and stops local microphone tracks.
- Failed microphone access closes the peer connection and returns a safe UI failure.
- Transcript persistence is now covered separately in `docs/ops/red-team-results/2026-07-04-real-voice-transcript-persistence.md`.
- This still does not complete P2 real voice exit. Sandy tool gateway, latency proof, and full voice-journey red-team proof remain pending.
