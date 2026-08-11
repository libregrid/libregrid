# Phase 7 — Server-Side Row Model (Core)

**Status:** ⬜ Not started
**Depends on:** Phase 0. (Independent of grouping — deliberately scoped to flat data.)
**Blocks:** Phase 9 (SSRM grouping/pivot builds directly on these stores)

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

---

## Todo

- [ ] `ServerSideRowModel` implementing `iServerSideRowModel`; register `rowModelType: 'serverSide'`
- [ ] Bean `ssrmStoreFactory` — creates full vs. partial stores per level
- [ ] Beans `ssrmStoreUtils`, `ssrmBlockUtils`, `ssrmNodeManager`
- [ ] Bean `lazyBlockLoadingSvc` — block scheduling, debounce, in-flight tracking, cancellation
- [ ] **Full store** implementation
- [ ] **Partial (lazy) store** with block loading and eviction under `maxBlocksInCache`
- [ ] Infinite scrolling with correct scrollbar sizing via `serverSideInitialRowCount`
- [ ] `IServerSideDatasource` contract: `getRows(params)`, optional `destroy()`
- [ ] `IServerSideGetRowsParams`: `request`, `success(result)`, `fail()`
- [ ] `IServerSideGetRowsRequest`: `startRow`, `endRow`, plus sort model
- [ ] Server-side **sorting** (pass sort model in the request; refresh affected stores)
- [ ] Transactions: `applyServerSideTransaction`, `applyServerSideTransactionAsync`, `applyServerSideRowData`
- [ ] `iServerSideSelection` — selection stable across block load/evict
- [ ] API: `setGridOption`, `getCacheBlockState`, `refreshServerSide`, `ensureIndexVisible`
- [ ] Options: `serverSideDatasource`, `cacheBlockSize`, `maxBlocksInCache`, `blockLoadDebounceMillis`, `serverSideInitialRowCount`, `getRowId`, `rowBuffer`, `debug`
- [ ] Loading cell renderer while a block is in flight
- [ ] `fail()` handling — retry/refresh path, no corrupt state
- [ ] Mock server in `apps/docs` capable of 1M rows with configurable latency

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

- [ ] 1M-row mock server scrolls smoothly with no visual corruption
- [ ] Blocks load and evict correctly under `maxBlocksInCache`
- [ ] Stale/out-of-order responses discarded without corrupting row state
- [ ] Transactions apply without a full refresh and without visual corruption
- [ ] **Selection survives block eviction and reload**
- [ ] Server-side sorting issues correct requests and refreshes correctly
- [ ] `fail()` leaves the grid in a usable, retryable state
- [ ] `getCacheBlockState()` accurately reports block status
- [ ] Scope respected: **no** server-side grouping/pivot/filtering (Phase 9) — anything out of scope marked 🟡 in the parity checklist with a pointer to Phase 9
- [ ] Full Definition of Done (`standards.md` §9) satisfied
