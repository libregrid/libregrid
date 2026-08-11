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
