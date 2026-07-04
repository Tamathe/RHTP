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
```

## Interpretation

- H1 deterministic grounding verifier is locally implemented and passing.
- E1 deterministic recall floor and adversarial corpus are locally implemented and passing.
- E1 is not fully closed because the model-net-only hard-lock path, rule-gap ticket workflow, and degraded-model ops alerting are not production-wired.
- P2 real voice remains blocked and flags remain off.
