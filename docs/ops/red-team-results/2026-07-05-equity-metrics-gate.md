# Equity Metrics Gate Result

**Date:** 2026-07-05
**Command:** `npm run equity:gate`
**Proof rung:** local no-PHI equity metrics demo evidence

```text
RHTP equity metrics gate
Cases: 6/6
- equity_snapshots_are_synthetic_aggregate_rows: pass
- outcome_metrics_have_stratified_snapshots: pass
- small_cells_suppressed_at_projection: pass
- device_owner_disparity_raises_program_alarm: pass
- device_metric_requires_claims_floor: pass
- equity_outputs_are_program_review_only: pass
```

## Interpretation

- The Program outcomes surface can show synthetic aggregate metric snapshots.
- Small-cell rows are suppressed by the projection before display.
- A deterministic device-owner disparity creates a program-review alarm only.
- Device-owner metrics require a claims floor.
- This is local no-PHI proof only.

## Boundary

This does not prove real de-identification, public equity publishing, payer reporting, production analytics, research export, or real patient data use.
