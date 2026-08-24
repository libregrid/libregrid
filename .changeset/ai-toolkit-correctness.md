---
'@libregrid/ai-toolkit': patch
'@libregrid/all': patch
---

AI Toolkit correctness fixes.

- `NeedleWasmProvider` now NUL-terminates every string it copies into engine
  memory. `_malloc` returns dirty memory, so unterminated strings let the
  engine read past the end of the system turn, tool catalogue and prompt.
- Free the `needle_init` string pointers, and check the `needle_complete`
  return code instead of reporting engine failures as parse errors.
- `runToolkit` gates the escalation fallback on the same confidence threshold
  as the primary provider, so escalation can no longer apply an
  under-confident answer.
- `toolCallToStatePatch` takes the current filter model and merges into it.
  `setState` replaces the filter model, so filtering one column previously
  cleared every other column's filter. `applyToolCall` now shares this single
  mapping instead of recomputing its own.
- `setFilters` is offered and validated only on filterable columns, and
  column filterability comes from Community's `isFilterAllowed()` rather than
  `colDef.filter !== false` (which reported unconfigured columns as
  filterable).
- Weights are stored in Cache Storage without teeing the ~14 MB body through
  `response.clone()`, stale artifact caches are swept, concurrent
  `ensureEngine()` calls share one load, and a failed weight fetch no longer
  re-injects the WASM glue on retry.
- New `scriptIntegrity` option sets SRI on the emscripten glue tag.
