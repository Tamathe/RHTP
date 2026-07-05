# Static Preview Smoke Result

**Date:** 2026-07-04
**Command:** `npm run preview:gate`
**Proof rung:** local static preview verified, no real PHI

```text
RHTP stakeholder no-PHI demo gate
Cases: 6/6
- stakeholder_demo_has_no_demo_blockers: pass (no open demo blockers)
- stakeholder_demo_real_phi_flag_is_off: pass (RHTP_REAL_PHI=unset)
- stakeholder_demo_target_is_no_phi: pass (ready_local_and_static_preview; phi=false)
- stakeholder_demo_phases_allow_only_real_phi_blockers: pass (demo-ready phases have no demo blockers)
- stakeholder_demo_health_info_gates_are_real_phi_only: pass (open E/H gates are real-PHI only)
- stakeholder_demo_prototype_scope_defers_health_info_gates: pass (deferred outside stakeholder prototype: E2, H2, H3, H4, H5)
```

```text
npm run build
tsc --noEmit && vite build
1609 modules transformed.
dist/index.html
dist/assets/index-CrCHOhV6.css
dist/assets/index-ByrDHA5R.js
built successfully.
```

```text
RHTP static preview smoke gate
URL: http://127.0.0.1:4174/
Cases: 5/5
- static_preview_http_200: pass (status=200)
- static_preview_serves_vite_app_shell: pass (root and module assets present)
- static_preview_spa_rewrite_configured: pass (/(.*) -> /index.html)
- static_preview_real_phi_flag_is_off: pass (RHTP_REAL_PHI=unset)
- static_preview_has_no_demo_blockers: pass (no open demo blockers)
```

## Interpretation

- The static bundle builds and serves locally through Vite preview.
- The app shell is reachable at `/` and returns HTTP 200.
- The Vercel SPA rewrite still points `/(.*)` to `/index.html`.
- The preview lane remains no-PHI: `RHTP_REAL_PHI` is off or unset, and E/H health-information gates remain outside the stakeholder prototype.
- This does not prove a public deployment URL, deployment id, or live Vercel alias.

## Residual

External preview deployment still needs a deployment URL, deployment id, and smoke result recorded against the deployed URL. Real-PHI pilot infrastructure is not in prototype scope.
