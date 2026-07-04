# P2 Safety Gate Result

**Date:** 2026-07-04
**Command:** `npm run safety:gate`
**Result:** Pass

## Output

```text
RHTP P2 safety gate
Crisis rule recall: 1.00 (floor 0.95)
Crisis positives: 8/8
Crisis false negatives: 0
Grounding checks: 5/5
Model-backstop rule-gap check: pass
```

## Interpretation

- H1 deterministic grounding verifier is locally implemented and passing.
- E1 deterministic recall floor, adversarial corpus, model-backstop-only hard-lock behavior, rule-gap ticket workflow, and degraded-model ops alert state are locally implemented and passing.
- P2 real voice remains off. Server Realtime client-secret plumbing, browser WebRTC attach code, and transcript persistence now exist behind off-by-default flags, but live tool gateway, latency proof, and full voice-journey red-team proof are not complete.
