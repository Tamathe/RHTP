# P7 Screenings and Campaigns Gate Result

**Date:** 2026-07-04
**Command:** `npm run p7:gate`
**Proof rung:** local no-PHI screenings, SDOH, and campaigns boundary proof
**Result:** pass

## Output Summary

```text
RHTP P7 screenings and campaigns gate
Cases: 5/5
- p7_locked_screening_items_byte_identical: pass (phq2=2;phq9=9;gad7=7)
- p7_scoring_is_deterministic: pass (phq9=10/moderate;gad7=10/moderate)
- p7_crisis_route_is_rule_based: pass (crisis_route_triggered;priority=urgent;action=route_988)
- p7_sdoh_flags_are_assistive_only: pass (passive=needs_review;autoRefer=false;safetySms=false)
- p7_campaign_reuses_barrier_task_shape: pass (eligible=pat_1;task=transportation_barrier/routine)
```

## Interpretation

P7 is locally verified for the stakeholder demo. The local gate proves locked PHQ/GAD item text, deterministic scoring, rule-based crisis routing, assistive-only SDOH flags with Z-code provenance, SMS exclusion for interpersonal-safety content, and campaign barrier reuse of the navigator task rail.

This does not authorize production PHQ/GAD, SDOH, crisis outreach, SMS, or campaign use with real patient data. Keep `RHTP_REAL_PHI` off or unset for stakeholder demos.
