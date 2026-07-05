# Grant Reporting Gate Result

**Date:** 2026-07-05
**Command:** `npm run grant:gate`
**Proof rung:** local no-PHI grant reporting demo evidence

```text
RHTP grant reporting gate
Cases: 5/5
- grant_report_is_synthetic_no_phi: pass (synthetic=true;patientData=false)
- grant_report_has_recipient_cadence_and_period: pass (recipient=RHTP stakeholder review;cadence=monthly;period=2026-07)
- grant_report_metric_lines_have_sources: pass (metricLines=4)
- grant_report_links_equity_and_billing_evidence: pass (equity=1;billing=4)
- grant_report_delivery_stays_blocked: pass (blockers=prototype_no_real_reporting_export,no_recipient_delivery)
```

## Interpretation

- The report packet is synthetic and includes no patient data.
- The packet defines a monthly reporting cadence, reporting period, and stakeholder-review recipient.
- Metric lines resolve to seeded metric snapshots.
- Equity alarm and billing evidence references resolve to local synthetic evidence.
- Report export and recipient delivery remain blocked.

## Residual

This does not prove real grant recipient delivery, payer reporting, public export, production analytics, or real patient data use.
