# Phase 19 — AI Toolkit (gap-plan A6)

**Status:** Planned — docs-only research landed 2026-08-23; implementation not started.
**Depends on:** Phase 6 (`@libregrid/set-filter` / `multi-filter` — the filter models the toolkit mutates), Community `GridStateModule` (`getState`/`setState`)
**Blocks:** nothing (A1 Formulas is independent)

**Packages:** new `@libregrid/ai-toolkit` (`AiToolkit`); modified `@libregrid/all` (barrel re-export)
**Parity:** [`../parity/ai-toolkit.md`](../parity/ai-toolkit.md) · **Design:** [`../design/ai-toolkit.md`](../design/ai-toolkit.md) · **ADR:** [`../adr/0006-local-first-ai-inference.md`](../adr/0006-local-first-ai-inference.md)

---

## Context

Gap-plan A6 — natural-language control of grid state via LLM tool calls with
structured outputs. Community v36.1.0 already reserves the whole contract:
the `AiToolkit` module name, the `getStructuredSchema` API slot (stubbed in
the Community dist) and the `GridStateModule` round-trip (`getState` /
`setState`). This package is the **implementation layer**: a real
schema generator over the live column model, a tool-call execution path into
Community's state service, and a provider abstraction whose default runs
entirely in the browser (ADR 0006).

v1 scope (decided): **filter, sort, column visibility, reset.** Context
policy: **schema + current state only** — no row values by default.
Aggregation/pivot/row-group are post-v1.

## Contracts (verified against `ag-grid-community@36.1.0` dist + public docs)

- `_AiToolkitGridApi` (`gridApi.d.ts:1715`): `getStructuredSchema(params?:
  StructuredSchemaParams): any`; `GridApi` extends it (`gridApi.d.ts:1723`).
- `EnterpriseModuleName` includes `'AiToolkit'`, `AgModuleName` includes
  `'AiToolkitModule'` (`iModule.d.ts:77,79`). Community dist ships a stub —
  `mod("AiToolkit", { getStructuredSchema: 0 })` (`main.esm.mjs:13182`) — so
  the slot is reserved; the implementation is ours to provide.
- `StructuredSchemaParams` (`structuredSchemaParams.d.ts`):
  `exclude?: StructuredSchemaFeature[]` where
  `StructuredSchemaFeature = 'aggregation' | 'filter' | 'sort' | 'pivot' |
  'columnVisibility' | 'columnSizing' | 'rowGroup'`; plus per-column
  `columns?: Record<string, { description?, includeSetValues? }>`.
- `_StateGridApi` (`gridApi.d.ts:1033–1041`): `getState(): GridState`,
  `setState(state: GridState, propertiesToIgnore?: GridStateKey[])`;
  Community's `GridStateModule` (`main.d.ts:171`) is the state round-trip.
- Public docs (ag-grid.com AI Toolkit page): consumer-built chat UI pattern —
  `getStructuredSchema()` wrapped as `properties.gridState`, LLM emits state,
  applied via `setState`; **no conversation state**; suggested prompts cover
  filter/sort/group intents.

## Todo

### 19A — Spike (gate for all provider work)

- [x] 19.1 Needle browser artifacts: obtained `wasm/needle.js` +
      `wasm/needle.wasm` + `needle2.cact` from HF @ commit
      `98fbd955b0347e78059be0c253cc1ffa09b87bc7`; licenses verified
      (Apache-2.0 engine **and** weights); load strategy = runtime fetch from a
      pinned, self-hostable base URL (never bundled); measured in Node +
      headless Chromium. Outcome: **✅ GO** with four design conditions (flat
      tool args, confidence threshold 0.5, `needle_reset()` per request,
      pinned artifact commit) — see the Needle section of
      [`../reference/spike-results.md`](../reference/spike-results.md).

### 19B — `@libregrid/ai-toolkit`

- [ ] Package scaffold (`package.json`, `tsconfig.lib.json`, `project.json`, NOTICE, LICENSE, README, generated `version.ts`) per [`../reference/standards.md`](../reference/standards.md)
- [ ] `structuredSchema.ts` — build the grid-state JSON schema from the live column model + current state; `StructuredSchemaParams` narrowing (`exclude` features, per-column `description` / `includeSetValues`); v1 features filter/sort/columnVisibility
- [ ] `tools.ts` — the ≤5 tool schemas (`setSort`, `setFilters` as flat `{ column, values }` per spike finding B, `setColumnVisibility`, `resetGrid`) + hand-rolled validator (no `ajv` — dependency policy)
- [ ] `applyToolCall()` — map a validated tool call to a `GridState` patch and apply it through Community's state service (`setState(state, propertiesToIgnore)`); `resetGrid` via the `propertiesToIgnore`/clear semantics
- [ ] `AiProvider` interface + `NeedleWasmProvider` (default; lazy-loaded WASM assets; confidence score) + `OpenAiCompatibleProvider` (consumer endpoint; **off by default**)
- [ ] Escalation: confidence below threshold → remote provider if enabled, else a clarification result (no guessed state change)
- [ ] `AiToolkitModule` — `moduleName: 'AiToolkit'`, `enterprise: true`, depends on `EnterpriseCoreModule`, `apiFunctions: { getStructuredSchema }`
- [ ] Unit specs — schema builder (narrowing, per-column params), validator, provider mocks, escalation paths
- [ ] jsdom integration specs (real grid) — tool call → visible `setState` effect; schema narrowing; reset; remote-fallback opt-in wiring
- [ ] Demo route + Playwright e2e (docs app: chat pane, prompt → visible state change; axe light + dark)
- [ ] Parity checklist refresh (`../parity/ai-toolkit.md`), gap-list row, `@libregrid/all` re-export
- [ ] Coverage above repo thresholds

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Schema builder (feature exclusion, per-column description/set-values, context budget); tool-call validator; provider interface + mocks; confidence-gated escalation (local→remote, local→clarify) |
| **Integration** (jsdom, real grid) | Each tool call applied through the real state service and visible in `getState()`; `resetGrid`; schema reflects live column model; remote provider disabled by default |
| **E2E** (Playwright) | Docs route: chat pane drives sort/filter/visibility changes; axe clean light + dark |

## Notes

- No conversation state in v1 — each request is stateless, matching the
  Ag-Grid module contract.
- Row values never enter the model context by default (ADR 0006); the ~256
  token Needle budget cannot hold them regardless.
- `aggregation` / `pivot` / `rowGroup` / `columnSizing` are ❌ in parity with
  rationale (post-v1); the schema generator's `exclude` support means adding
  them later is additive.
- Needle fine-tuning on domain data is a documented recommendation, not a v1
  requirement.
