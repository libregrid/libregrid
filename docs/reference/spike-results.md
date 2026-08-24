# Seam Verification Spike — Results

**Run:** 2026-08-11 · **Against:** `ag-grid-community@36.1.0` installed from npm · Node 22.23.2 + jsdom
**Verdict: ✅ PASS — the additive-module strategy is validated end to end.**

This is the evidence behind Phase 0 Task 0.8. It was run **before** any scaffolding, deliberately, so that a failure would cost an hour rather than weeks. Phase 0 Task 0.8 should still be implemented as a permanent CI test — this file records that the answer was yes on this date, not that the check is no longer needed.

---

## 1. Runtime exports — 18/18 present

`ag-grid-community` exposes **379 runtime exports** from its single entry point. Every symbol the plan depends on resolved:

| Symbol | Type |
|---|---|
| `ModuleRegistry`, `createGrid` | function |
| `AllCommunityModule` | object |
| `BeanStub`, `Component` | function |
| `createTheme`, `themeQuartz`, `themeAlpine`, `themeBalham`, `themeMaterial`, `styleMaterial` | function/object |
| `_getClientSideRowModel`, `_getServerSideRowModel`, `_getViewportRowModel` | function |
| `_warnOnce`, `_consoleError`, `_EmptyBean`, `_ChangedRowNodes` | function |

**This confirms `main.ts:1216` (`export * from './main-internal'`) survives into the published build** — the single fact the whole strategy rests on.

`ModuleRegistry.registerModules` and the deprecated `register` are both present. `BeanStub.prototype` carries `addManagedPropertyListener`, `addManagedEventListeners`, `addDestroyFunc`, `destroy`, `warn`, `error` — exactly as documented in `api-seams.md` §5.

## 2. Type-only exports — all resolve (`tsc --strict` exit 0)

Every type in `api-seams.md` §1 type-checked, including all seven `_IRowNode*Stage` interfaces and all fifteen `_*GridApi` slice types.

Two properties were proved rather than assumed:

- **The CSRM stage slots are optional on `BeanCollection`.** `Pick<BeanCollection, 'groupStage'|'aggStage'|'pivotStage'|'filterAggStage'|'flattenStage'|'groupFilterStage'|'groupSortStage'>` accepts `{}` under `exactOptionalPropertyTypes: true`.
- **`ModuleName` is genuinely a closed union.** All 25 Enterprise literals are assignable, and a `@ts-expect-error` on an invented name (`'TotallyMadeUpModule'`) passed — meaning the compiler really does reject it. This validates the "never invent a module name" rule in `api-seams.md` §3.

## 3. Live module registration — PASS

A custom `BeanStub` subclass registered via a `Module` object into a real grid:

```
registerModules returned without throwing
postConstruct called
gos accessible
addManagedPropertyListener ok
beans.colModel reachable: true
createGrid returned api: true
grid rendered rows: 3
```

The bean-authoring pattern in `api-seams.md` §5 is correct as written: no-arg constructor, `beanName` field, setup in `postConstruct()`, `this.gos` and `this.beans` available.

## 4. ⭐ CSRM stage invocation — PASS

**The most important result.** A bean registered under `beanName = 'aggStage'` with `step = 'aggregate'` was **invoked by Community's Client-Side Row Model** with no wiring beyond registration:

```
probe.postConstruct
aggStage.execute          ← called by CSRM
```

This confirms the core mechanism behind Phases 2, 8 and 10: *registering a bean under the correct name is the entire integration.*

Also confirmed: with `rowGroup: true` set but **no** `groupStage` registered, the grid displayed 3 leaf rows and produced no group rows — Community genuinely has no grouping of its own, exactly as the plan assumes.

## 5. No license gate — confirmed

`_registerModule()` performed no license check. Registration succeeded and beans were constructed normally.

---

## Findings that changed the spec

### ❌ `VERSION` is not exported from `ag-grid-community`

The original spec's reference module showed `import { VERSION } from './version'` — that is Community's *internal* path, valid inside their repo but **not reachable from the published package**. There is no version-ish export at all.

**Fixed:** `standards.md` §5 now derives the version at build time from the installed `ag-grid-community/package.json`, which eliminates hand-maintained drift. `api-seams.md` §4 carries a warning.

### ⚠️ Version mismatch warns but does not block

Registering with `version: undefined` produced:

> `AG Grid: You are using incompatible versions of AG Grid modules… 'EnterpriseCore' is incompatible.`

…and then **registered the module and constructed its beans anyway**. The grid worked.

This is good for resilience but bad for diagnosis: version drift fails *loudly in the console yet silently in behaviour*. Documented in `standards.md` §5 — rely on the CI check, not the warning.

---

## Environment note (not an AG Grid issue)

Under Node 22, `globalThis.navigator` is a getter-only property, so the usual jsdom global-injection loop throws. Use `Object.defineProperty` for `navigator` and `try/catch` the rest. Relevant when building the Phase 0 test harness.

## Reproducing

Scripts live in the session scratchpad (`spike/`): `check-exports.mjs`, `check-types.ts`, `spike-module.mjs`, `spike-stage.mjs`. They should be reimplemented properly as Phase 0 Task 0.8 rather than copied — the harness needs to be permanent and CI-run.

---
---

# Needle 2 Browser-Inference Spike — Results (Phase 19, Task 19.1)

**Run:** 2026-08-23 · **Against:** `Cactus-Compute/needle2` @ HF commit `98fbd955b0347e78059be0c253cc1ffa09b87bc7` (2026-08-20)
**Environment:** Node 22 + headless Chromium (Playwright, `--enable-precise-memory-info`) on the repo sandbox CPU
**Verdict: ✅ GO for the v1 scope — with four conditions that changed the design (§ below).**

## 1. Artifacts and license

Browser build = three files, all fetched at runtime (never bundled):

| File | Size | Role |
|---|---|---|
| `wasm/needle.js` | 62 KB | UMD glue (`createNeedle()` → promise of an emscripten module) |
| `wasm/needle.wasm` | 333 KB | engine (locates itself relative to the script tag in browsers) |
| `needle2.cact` | 13.7 MB | model weights, loaded via `needle_load` |

**License: Apache-2.0 for engine and weights alike** — single `LICENSE` at repo root plus the model-card `license:apache-2.0` tag; no separate weights license. Compatible with MIT LibreGrid (no copyleft). The `tokenizer/` files are **not needed** — inference ran correctly without them.

Pinned CDN base (pin the commit, not `main`):
`https://huggingface.co/Cactus-Compute/needle2/resolve/98fbd955b0347e78059be0c253cc1ffa09b87bc7/`

## 2. API surface (verified, not assumed)

`createNeedle()` resolves to an emscripten module exposing the C API from `wasm/needle.h`:

```
needle_init(system_prompt: str, tools_json: str, tool_index_path: str|null) -> int   // <0 = error
needle_complete(input: str, max_new_tokens: i32, out: ptr, out_capacity: i32) -> int // out receives one JSON object
needle_reset()                                                                        // rewinds conversation, keeps tools
needle_load(cact: ptr, n: i64-as-BigInt) -> int                                       // weights; call before init
```

Gotchas found the hard way: `n` must be a **BigInt** (i64); strings go through `_malloc` + `HEAPU8.set`; the response is a single JSON object `{ type, success, function_calls, reasoning, confidence, prefill_tps, decode_tps }`.

## 3. Performance (Node and headless Chromium — near-identical)

| Stage | Node | Chromium |
|---|---|---|
| Engine ready (wasm instantiate) | 4 ms | 24 ms |
| `needle_load` (13.7 MB) | 31 ms | 29 ms |
| `needle_init` (4 tools + grid context) | 1.6 s | 2.2 s |
| Per-query latency | 0.17–0.53 s | 0.28–0.60 s |
| JS heap delta (Chromium `performance.memory`) | — | **+14 MB** |

Prefill ~200 tps, decode ~160 tps on the sandbox CPU (README claims 500 tps on a Pi 5 — consistent order of magnitude). Sub-second per query: usable for interactive grid control.

## 4. Quality — the decisive findings

Five queries × five trials each, `needle_reset()` between trials (a shared session accumulates into the 256-token window and **corrupts later answers** — always reset):

| Query | Result | Confidence | Verdict |
|---|---|---|---|
| "Hide the age column" | `setColumnVisibility {hiddenColIds:["age"]}` | 0.86 (identical ×5) | ✅ correct |
| "Reset everything" | `resetGrid {}` | 0.65 (×5) | ✅ correct |
| "Sort … youngest first" | `setSort [{colId:"age",sort:"asc"}]` (Node) / `{colId:"medal"}` (Chromium) | **0.07–0.10** | ⚠️ tool right, column sometimes wrong — but confidence flags it |
| "Show me all the gold medals won by the USA" | `setFilters {medal:"gold", …garbage…}` | 0.19–0.39 | ❌ nested args malformed |
| "Show only Chinese athletes who won silver" | `setFilters {type:"chinese", …}` | 0.16–0.46 | ❌ wrong shape, no colId structure |

**Finding A — the confidence head is well-calibrated as a gate.** Easy/correct → 0.65–0.86; hard or malformed → ≤0.46. A threshold at **0.5 cleanly separates "safe to apply" from "escalate/clarify"** in every trial. This validates ADR 0006's confidence-gated escalation as the primary safety mechanism.

**Finding B — nested filter arguments exceed the model.** The `filterModel`-per-column shape (`{country:{filterType:"set",values:["USA"]}}`) is never produced correctly; the model emits flat garbage keys instead. **Design change: v1 tool arguments must be flat and small** — `setFilters({ column, values })` single-column (multiple calls per turn allowed), with the validator mapping to `GridState.filterModel`.

**Finding C — deterministic within a session, not across instances.** Five trials in one process: byte-identical. Node vs Chromium on the same hard query: different wrong answers. Tie-breaking is instance-dependent; the confidence gate (Finding A) catches every divergence because all variants score ≤0.46.

**Finding D — context budget holds to ~20 columns.** A 20-column schema still produced a tool call (quality degraded, conf 0.29); latency grew from 0.3 s to ~1 s. v1 guidance: keep the schema under ~15 columns via `exclude` + short per-column `description`; document the ceiling in parity.

## 5. Verdict and conditions

**GO**, provided Phase 19 implements:

1. **Flat tool arguments** (Finding B) — `setFilters({column, values})`, never nested per-column objects.
2. **Confidence threshold 0.5** (Finding A) — below it: escalate to the remote provider if enabled, else return a clarification; never apply a low-confidence state change.
3. **`needle_reset()` before every request** (Finding C) — v1 is stateless per request anyway; this also bounds the 256-token window.
4. **Pinned artifact commit + self-hostable base URL** (§1) — default to the pinned HF CDN path; consumers override for offline/self-hosted deployments.

Open question for 19B: whether to expose a `maxNewTokens` option (default 256, matching the model's window).
