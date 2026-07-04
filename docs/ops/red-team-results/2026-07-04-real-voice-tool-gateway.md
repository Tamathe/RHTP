# P2 Real Voice Tool Gateway Result

**Date:** 2026-07-04
**Command:** `npm test -- server/realtime-voice.test.ts server/actions.test.ts server/routes.test.ts src/lib/realtime-voice-browser.test.ts`
**Result:** Pass

## Output

```text
Test Files  4 passed (4)
Tests  33 passed (33)
```

## Interpretation

- The Realtime session mint now exposes only the retinopathy pack's authorized Sandy tools: `answer_education`, `collect_barrier`, `match_site`, and `confirm_plan`.
- Sandy tool calls are recorded in `tool_calls` with patient, protocol instance, pack, tool, session, model id, model version, decision, and emitted event id when allowed.
- Authorized education calls emit a deterministic `question_answered` protocol event and audit row with model/version/session/tool/pack provenance.
- Unauthorized tool names such as `change_medication` are blocked, audited, and do not emit protocol events.
- Open red-flag locks block routine Sandy tool calls and preserve the refusal as a typed gateway result.
- The browser Realtime connector forwards documented function-call events to the server gateway, then returns `function_call_output` followed by `response.create` to the Realtime model.
- This still does not complete P2 real voice exit. The full live retinopathy voice journey red-team and voice latency proof remain pending, and both real-voice flags remain off.
