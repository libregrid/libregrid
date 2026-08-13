# Phase 7 — Server-Side Row Model (Core)

**Status:** ✅ Complete — flat full and lazy SSRM stores verified
**Depends on:** Phase 0. (Independent of grouping — deliberately scoped to flat data.)
**Blocks:** Phase 9 (SSRM grouping/pivot builds directly on these stores)

**Readiness:** Phase 0 is verified complete. The master plan's approved exception permits this phase to begin before Phases 1–6. Keep the scope flat and sorted; Phase 9 remains blocked on Phases 2, 6, 7, and 8.

**Package:** `@libregrid/server-side-row-model` (`moduleName: 'ServerSideRowModel'`)
**Parity:** [`../parity/server-side-row-model.md`](../parity/server-side-row-model.md)

---

## Context

SSRM is the top reason teams buy Enterprise licences: it lets a grid work against millions of server-side rows without loading them.

**This phase is deliberately scoped to flat and sorted data only.** Server-side grouping, pivoting and filtering are Phase 9. Splitting the work this way keeps a very large feature reviewable, and gets a usable SSRM shipped earlier — you prioritised it, and the dependency on grouping is only for the *grouped* variant.

The architecture is a **store** abstraction:
- **Full store** — loads all rows at a level at once
- **Partial (lazy) store** — loads fixed-size blocks on demand, evicting old ones

Most complexity lives in block lifecycle: which blocks are loaded, which are in flight, which get evicted under `maxBlocksInCache`, and how row indices stay stable while blocks come and go. Selection surviving block eviction is the classic bug — a selected row scrolled out of view and back must still be selected, which means selection state cannot live on the row node alone.

`getRowId` is effectively **mandatory** for correct behavior with transactions and selection, even though it is technically optional. Document that prominently.

## Phase-7 design record (2026-08-13)

This design was derived from Community's published interfaces and AG Grid's public SSRM documentation only; no commercial package or source was consulted.

- The public `ServerSideRowModelModule` is the API companion and depends on an internal `ServerSideRowModel` core module. The companion exposes published SSRM API functions, while the core module supplies the `rowModel` bean.
- A root store owns the flat index space. Its **full** implementation materialises the complete level; its **partial** implementation owns fixed-size blocks with states `waiting`, `loading`, `loaded`, and `failed`. Both share row-node creation, request construction, and a monotonically increasing load generation so late responses are discarded after refresh, replacement, eviction, or destroy.
- Phase 7 requests always send flat defaults for Phase 9 fields: empty `rowGroupCols`, `valueCols`, `pivotCols`, and `groupKeys`; `pivotMode: false`; `filterModel: null`. Only `startRow`, `endRow`, and the current `sortModel` are active in this phase.
- A selection state service is keyed by stable `getRowId` IDs, not by loaded `RowNode` objects. A load, eviction, or reload reapplies that state to newly created nodes. Group-selection state, grouping stores, server filtering, and pivot values remain Phase 9.
- Store refresh/destruction invalidates outstanding callbacks before invoking a datasource replacement or retry. `fail()` leaves a block retryable; it must never leave a permanent placeholder or mutate row count.
- The initial implementation sequence is: package/module/API registration → request and node utilities → full store → partial store and scheduler → transactions/selection → docs mock-server and E2E. Each slice remains independently integration-tested against a real grid.

---

## Todo

- [x] **7.0 — Design & package scaffold** — documented module/API split, flat-request boundary, generation-based stale-response rule, and selection identity rule; create the framework-neutral package with a Phase-0 budget and generated version source.
- [x] **7.1 — Flat full root-store slice** — `ServerSideRowModel` is registered through the API companion, loads a flat datasource into real row nodes, supports `applyServerSideRowData`, preserves the public flat request shape, reloads on `refreshServerSide` and sort changes, and rejects stale callbacks by load generation. `fail()` leaves the root store retryable through `retryServerSideLoads`. Real-grid integration coverage proves initial load, externally supplied data, refresh, sorting, retry, and stale response discard. Partial blocks, transactions, selection, and the docs route remain subsequent slices.
- [x] **7.2 — Docs lazy-store demonstration** — `/server-side` registers the module at application bootstrap and demonstrates a deterministic one-million-row, 100-row-block datasource with controlled latency and sorting. Dedicated Playwright coverage asserts initial load, lazy scrolling, sorting, no AG Grid diagnostics, and zero axe violations in light and dark themes.

**Verification record (2026-08-13):** `nx run-many -t lint test build`, `nx e2e docs-e2e`, `nx run conformance:matrix`, `nx run check-contamination:test`, `nx run bench:compare`, `npm run check:budgets`, and `git diff --check` passed. The SSRM package measured 16.3 KB against its 32 KB budget; its isolated consumer fixture measured 8.5 KB.

- [x] `ServerSideRowModel` implementing `iServerSideRowModel`; register `rowModelType: 'serverSide'`
- [x] Store factory, node utilities, and block lifecycle integrated into the compact `ServerSideRowModel` root-store seam (not exposed as separate beans)
- [x] Lazy-block scheduler with debounce, bounded in-flight requests, stale callback invalidation, and destroyed-grid cleanup
- [x] **Full store** implementation
- [x] **Partial (lazy) store** with range loading, LRU eviction, and visible-range protection under `maxBlocksInCache`
- [x] Infinite scrolling with scrollbar sizing via `serverSideInitialRowCount`
- [x] `IServerSideDatasource` contract: `getRows(params)`, optional `destroy()`
- [x] `IServerSideGetRowsParams`: `request`, `success(result)`, `fail()`
- [x] `IServerSideGetRowsRequest`: `startRow`, `endRow`, plus sort model
- [x] Server-side **sorting** (pass sort model in the request; refresh affected stores)
- [x] Transactions: `applyServerSideTransaction`, `applyServerSideTransactionAsync`, `applyServerSideRowData`
- [x] `iServerSideSelection` — selection state is ID-backed and reapplied to recreated nodes
- [x] API: native `setGridOption` plus `getCacheBlockState`, `setRowCount`, `refreshServerSide`, and `ensureIndexVisible`
- [x] Options: `serverSideDatasource`, `cacheBlockSize`, `maxBlocksInCache`, `blockLoadDebounceMillis`, `maxConcurrentDatasourceRequests`, `serverSideInitialRowCount`, and `getRowId`; Community retains `rowBuffer` and `debug`
- [x] Accessible loading cell renderer while a block is in flight
- [x] `fail()` handling — retry/refresh path, no corrupt state
- [x] Mock server in `apps/docs` capable of one million rows with controlled latency

---

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Block index math: which blocks a viewport range requires; eviction ordering under `maxBlocksInCache`; debounce coalescing rapid scrolls into minimal requests. Request construction for a given sort model |
| **Integration** | Mock datasource: scrolling triggers the expected block requests, and only those. `maxBlocksInCache` evicts least-recently-used. Sorting re-requests with the correct sort model. Transactions add/remove/update rows without a full refresh. Selection survives eviction and reload. `fail()` leaves the grid usable and retryable |
| **E2E** | Scroll a 1M-row grid rapidly top→bottom→top; assert no visual corruption, no duplicate rows, no permanent loading placeholders. Sort a column mid-scroll |
| **Performance** | 1M-row mock server: sustained scroll FPS within baseline; request count for a full traverse within an expected bound (assert no request storm) |
| **a11y** | Loading cells announce busy state; axe 0 violations light + dark |

**Specific edge cases to cover:**
- Datasource returning fewer rows than `cacheBlockSize` (last block)
- Datasource returning `rowCount` mid-scroll (switching from unknown to known total)
- Rapid scroll that outruns in-flight requests — stale responses must be discarded
- `getRowId` absent — document and test degraded behavior
- Transaction applied to a block not currently loaded
- Two grids sharing one datasource instance

---

## Acceptance criteria

- [x] 1M-row mock server scrolls with no visual corruption in Playwright coverage
- [x] Blocks load and evict correctly under `maxBlocksInCache`, without evicting the visible range
- [x] Stale/out-of-order responses discarded without corrupting row state
- [x] Transactions apply without a full refresh and without visual corruption
- [x] **Selection survives block recreation after eviction or reload**
- [x] Server-side sorting issues correct requests and refreshes correctly
- [x] `fail()` leaves the grid in a usable, retryable state
- [x] `getCacheBlockState()` accurately reports block status
- [x] Scope respected: **no** server-side grouping/pivot/filtering (Phase 9) — anything out of scope marked 🟡 in the parity checklist with a pointer to Phase 9
- [x] Full Definition of Done (`standards.md` §9) satisfied
