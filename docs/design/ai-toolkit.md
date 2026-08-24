# Design — AI Toolkit (gap-plan A6)

**Status:** Planned — Phase 19, docs-only research landed 2026-08-23; implementation not started.
**Package:** new `@libregrid/ai-toolkit` (feature tier) · **Module:** `AiToolkit`
**ADR:** [0006 — local-first AI inference](../adr/0006-local-first-ai-inference.md)
**Phase:** [`phases/phase-19-ai-toolkit.md`](../phases/phase-19-ai-toolkit.md) · **Parity:** [`parity/ai-toolkit.md`](../parity/ai-toolkit.md)

---

## 1. What Ag-Grid's AI Toolkit is (verified against public docs + Community dist)

Ag-Grid v36.1.0 ships an Enterprise **AI Toolkit**: natural-language control of
grid state via LLM tool calls with structured outputs. The module's entire
public surface is one API function; the chat UI is consumer-built.

Verified facts (guardrails G1/G2 — Community dist types + ag-grid.com only):

- `EnterpriseModuleName` includes `'AiToolkit'`; `AgModuleName` includes
  `'AiToolkitModule'` (`iModule.d.ts:77,79`). The Community dist registers a
  stub — `mod("AiToolkit", { getStructuredSchema: 0 })`
  (`main.esm.mjs:13182`) — so the name and API slot are reserved in Community;
  the implementation is Enterprise-only.
- `_AiToolkitGridApi` (`gridApi.d.ts:1715`):
  `getStructuredSchema(params?: StructuredSchemaParams): any`; `GridApi`
  extends it (`gridApi.d.ts:1723`).
- `StructuredSchemaParams` (`structuredSchemaParams.d.ts`):

  ```ts
  type StructuredSchemaFeature =
    | 'aggregation' | 'filter' | 'sort' | 'pivot'
    | 'columnVisibility' | 'columnSizing' | 'rowGroup';

  interface StructuredSchemaColumnParams {
    description?: string;          // per-column hint for the LLM
    includeSetValues?: boolean;    // expose current filter/sort values
  }

  interface StructuredSchemaParams {
    exclude?: StructuredSchemaFeature[];
    columns?: Record<string, StructuredSchemaColumnParams>;
  }
  ```

- Usage pattern from the public docs (Angular example): the consumer calls
  `gridApi.getStructuredSchema()`, wraps the result as `properties.gridState`
  in a top-level response schema, sends it to an LLM (the docs' example uses
  `gpt-5-mini`), and applies the returned state via `setState`. The module has
  **no conversation state** and no built-in chat widget — each request is
  stateless. Suggested prompts from the docs: *"Show me all the gold medals
  won by the USA"*, *"Sort the competitors with the youngest first"*, *"Group
  by country and show the total number of medals won"*.
- `GridState` round-trips through Community's `GridStateModule`
  (`main.d.ts:171`); `_StateGridApi` exposes `getState(): GridState` and
  `setState(state, propertiesToIgnore?)` (`gridApi.d.ts:1033–1041`).

**Implication for LibreGrid:** the implementation layer is (a) a real
`getStructuredSchema` that builds the schema from the live column model and
current state, (b) an execution path from LLM tool calls to
`setState(state, propertiesToIgnore)`, and (c) a provider abstraction — the
docs assume a hosted LLM; our differentiator is a browser-local default
(§3).

## 2. Cactus Needle feasibility

Cactus Needle ([github.com/cactus-compute/needle](https://github.com/cactus-compute/needle),
[Cactus-Compute/needle2](https://huggingface.co/Cactus-Compute/needle2)) is a
~45M-parameter agentic LLM built for constrained, tool-calling workloads on
tiny devices. Needle 2 facts (per the model card):

- **Runs in the browser:** WebAssembly build (`needle.js` + `needle.wasm`);
  ~14 MB binary, ~28 MB RAM footprint; CQ2-bit quantization.
- **Tool calling / function calling / structured extraction** are first-class;
  tool retrieval surfaces a top-5 tool set per request — the tool list must
  stay small.
- **Small context** (~256 tokens) — the prompt budget only fits schema +
  current state, never row data.
- ~500 tok/s decode on a Raspberry Pi 5; the model card recommends
  fine-tuning on domain data for task-specific quality.

Assessment:

| Requirement | Needle fit |
|---|---|
| Constrained schema-aware tool calls (sort/filter/visibility) | ✅ exactly its design target |
| Browser-local, no network by default | ✅ WASM build |
| General conversational quality | ❌ not a general LLM — complex multi-step requests will fail |
| Large grids / many columns | ⚠️ 256-token context caps the schema size; `exclude` + per-column `description` are the mitigation |
| Distribution | ⚠️ no official npm browser package yet — artifacts ship as HF release files; a spike must pin load strategy and licenses (engine **and** weights) |

Conclusion: plausible for the v1 scope (filters, sort, column visibility,
reset) on moderate grids, with an explicit quality ceiling. The architecture
must therefore carry an optional hosted fallback for the cases the local
model cannot handle.

## 3. Architecture — local-first, remote fallback (ADR 0006)

```
consumer chat UI (consumer-built, as in the Ag-Grid docs)
        │  user prompt + gridApi.getStructuredSchema(params)
        ▼
┌────────────────────────── @libregrid/ai-toolkit ──────────────────────────┐
│ AiProvider (interface: complete(context, tools) → { toolCalls, confidence })│
│                                                                            │
│  NeedleWasmProvider   default · browser-local WASM · no network            │
│  OpenAiCompatibleProvider  optional · consumer endpoint · OFF by default   │
│                                                                            │
│  escalation: confidence < threshold → remote (if enabled) else clarify     │
└────────────────────────────────────────────────────────────────────────────┘
        │  validated tool call(s)
        ▼
applyToolCall() → GridState patch → Community GridStateModule.setState(state, propertiesToIgnore)
```

Decisions:

1. **Default provider is local** (`NeedleWasmProvider`). Assets (~14 MB) are
   lazy-loaded, never bundled into the package; consumers can self-host the
   artifacts. No network traffic by default.
2. **Remote fallback is opt-in.** `OpenAiCompatibleProvider` takes a
   consumer-supplied endpoint/key; disabled unless explicitly configured.
3. **Context policy: schema + state only.** Column schema, small
   allowed-value sets (via `includeSetValues`), and current grid state. Row
   values are never included by default — the 256-token budget cannot hold
   them anyway, and sending them to a remote endpoint would require an
   explicit consumer opt-in we do not design for in v1.
4. **Confidence gating.** Each provider returns a confidence score; below
   threshold the toolkit escalates (remote if enabled) or returns a
   clarification result instead of guessing.
5. **No conversation state in v1.** Each request is stateless, matching the
   Ag-Grid module's contract.

## 4. Module and API design

- Package `@libregrid/ai-toolkit` (feature tier; re-exported by
  `@libregrid/all`). Scaffold per [`reference/standards.md`](../reference/standards.md).
- `AiToolkitModule`:

  ```ts
  export const AiToolkitModule: _ModuleWithApi<_AiToolkitGridApi> = {
    moduleName: 'AiToolkit',      // Community's closed-union literal (iModule.d.ts:77)
    version: VERSION,
    enterprise: true,
    dependsOn: [EnterpriseCoreModule],  // + Community GridStateModule for getState/setState
    apiFunctions: { getStructuredSchema },
  };
  ```

- `getStructuredSchema(params?)` builds a JSON schema of the grid state from
  the live column model + current state, narrowed by `exclude` features and
  per-column `description` / `includeSetValues`. v1 features: **filter, sort,
  columnVisibility** (plus reset via `propertiesToIgnore` semantics).
  `aggregation`, `pivot`, `rowGroup`, `columnSizing` are excluded from v1
  (parity ❌ with rationale).
- **Tool set (≤5 — Needle retrieves top-5):** `setSort`, `setFilters`,
  `setColumnVisibility`, `resetGrid`. Each tool call validates against a
  hand-rolled validator (no `ajv` — dependency policy) and maps to a
  `GridState` patch applied through Community's state service.
- No new runtime dependencies; no CSS; no beans beyond the provider registry.

## 5. Risks and open questions

| Risk | Mitigation |
|---|---|
| Needle browser artifacts have no official npm package; load strategy unproven | Phase 19 task 19.1 spike (gate): pin artifact source, licenses (engine + weights), lazy-load subpath, memory/perf in Chromium; record in `reference/spike-results.md` |
| ~256-token context caps schema size on wide grids | Schema+state-only policy; `exclude` + per-column `description`; document the grid-size ceiling in parity |
| Local model quality ceiling (complex multi-step requests) | Confidence gating → optional remote fallback; fine-tuning on domain data documented as a recommendation, not a v1 requirement |
| ~14 MB asset download | Lazy load on first use, cacheable; consumers can self-host; never bundled |
| Remote fallback privacy surface | Off by default; explicit consumer configuration required; documented in the package README |

Guardrails: G1 (no Enterprise code — all contracts from Community dist types +
public docs) and G2 (public documentation only for behavior specs) apply.
