# Parity — Server-Side Row Model

**Sources:** https://www.ag-grid.com/angular-data-grid/server-side-model/ · `/server-side-model-configuration/` · `/server-side-model-datasource/` · `/server-side-model-selection/` · `/server-side-model-updating-transactions/` · reviewed 2026-08-13
**Phases:** 7 (core) and 9 (grouping/pivot/filter) · **Package:** `@libregrid/server-side-row-model`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

> **Phase-7 boundary:** flat data only. Requests in this phase include empty grouping/value/pivot arrays, `pivotMode: false`, and `filterModel: null`; only range and server-side sort are active. Grouping, filtering and pivot request semantics remain Phase 9.

## Grid Options

| Option | Phase | Status | Notes |
|---|---|---|---|
| `rowModelType: 'serverSide'` | 7 | ✅ | Registered by the `ServerSideRowModel` companion |
| `serverSideDatasource` | 7 | ✅ | Full or lazy root-store datasource; replacement destroys and invalidates the prior store |
| `cacheBlockSize` | 7 | ✅ | Fixed lazy range size; defaults to 100 |
| `maxBlocksInCache` | 7 | ✅ | Opts into lazy blocks and LRU eviction, while protecting blocks in the visible range |
| `blockLoadDebounceMillis` | 7 | ✅ | Coalesces pending lazy-block starts |
| `serverSideInitialRowCount` | 7 | ✅ | Initial scrollbar sizing before the server supplies a count |
| `getRowId` | 7 | ✅ | Required for durable transactions and selection; object-identity fallback is intentionally degraded |
| `rowBuffer` | 7 | ✅ | Consumed by Community row rendering; the model supplies requested indices lazily |
| `debug` | 7 | ✅ | Consumed by Community diagnostics; SSRM emits no eager registration side effects |
| `maxConcurrentDatasourceRequests` | 7 | ✅ | Defaults to 2 and caps the lazy-store scheduler |
| `asyncTransactionWaitMillis` | 7 | ✅ | Batches async transactions before applying them |
| `ssrmExpandAllAffectsAllRows` | 9 | ⬜ | |

## API Methods

| Method | Phase | Status | Notes |
|---|---|---|---|
| `setGridOption` | 7 | ✅ | Community option API swaps `serverSideDatasource` through the row-model property listener |
| `applyServerSideRowData` | 7 | ✅ | Applies a route-free full or currently addressed lazy range immediately |
| `applyServerSideTransaction` | 7 | ✅ | Full root-store add/remove/update transactions; partial stores return the documented wrong-store status |
| `applyServerSideTransactionAsync` | 7 | ✅ | Batches through `asyncTransactionWaitMillis`; explicit flush supported |
| `getCacheBlockState` | 7 | ✅ | Returns lazy block IDs and `waiting` / `loading` / `loaded` / `failed` state |
| `refreshServerSide` | 7 | ✅ | Refreshes either root-store type and invalidates stale callbacks |
| `retryServerSideLoads` | 7 | ✅ | Retries failed full loads or failed lazy blocks |
| `getServerSideGroupLevelState` | 7 | 🟡 | Returns the flat root-store state; group levels remain Phase 9 |
| `ensureIndexVisible` | 7 | ✅ | Community scrolling API requests the newly visible lazy indices |

## Interfaces

| Interface | Phase | Status | Notes |
|---|---|---|---|
| `IServerSideDatasource.getRows(params)` | 7 | ✅ | Supports full loads and lazy range requests |
| `IServerSideDatasource.destroy()` | 7 | ✅ | Invoked when a datasource is replaced or grid is destroyed |
| `IServerSideGetRowsParams.request` | 7 | ✅ | Flat Phase-7 request shape |
| `IServerSideGetRowsParams.success(result)` | 7 | ✅ | Materialises nodes, count, and durable selection state |
| `IServerSideGetRowsParams.fail()` | 7 | ✅ | Leaves the failed full store or block retryable |
| `IServerSideGetRowsRequest.startRow` | 7 | ✅ | Undefined for full root stores; lazy start index otherwise |
| `IServerSideGetRowsRequest.endRow` | 7 | ✅ | Undefined for full root stores; lazy exclusive end index otherwise |
| `IServerSideGetRowsRequest.sortModel` | 7 | ✅ | The active Phase-7 server operation; a sort refreshes the root store |
| `IServerSideGetRowsRequest.filterModel` | 9 | ⬜ | |
| `IServerSideGetRowsRequest.rowGroupCols` | 9 | ⬜ | |
| `IServerSideGetRowsRequest.groupKeys` | 9 | ⬜ | Identifies the node whose children are requested |
| `IServerSideGetRowsRequest.valueCols` | 9 | ⬜ | |
| `IServerSideGetRowsRequest.pivotCols` | 9 | ⬜ | |
| `IServerSideGetRowsRequest.pivotMode` | 9 | ⬜ | |
| `GetRowIdFunc` / `GetRowIdParams` | 7 | ✅ | Used for node identity, transactions, and selection persistence |
| `IServerSideStore` (full) | 7 | ✅ | Flat root-store implementation |
| `IServerSideStore` (partial/lazy) | 7 | ✅ | Range blocks with scheduler and LRU lifecycle |
| `iServerSideSelection` | 7 | ✅ | Flat ID-backed state persists independently of nodes |

## Behaviour

| Requirement | Phase | Status | Notes |
|---|---|---|---|
| Infinite scroll with block load/evict | 7 | ✅ | Range blocks load lazily, use LRU eviction, and retain visible blocks |
| Stale/out-of-order response discard | 7 | ✅ | Root generation and per-block generation reject stale, evicted, refreshed, and destroyed callbacks |
| Server-side sorting | 7 | ✅ | Sort changes refresh both store modes with the current sort model |
| Loading cell renderer for in-flight blocks | 7 | ✅ | Built-in accessible loading cell renderer is registered with the SSRM module |
| Server-side grouping (lazy child stores) | 9 | ⬜ | |
| Server-supplied aggregates (no client re-agg) | 9 | ⬜ | |
| Server-side pivoting | 9 | ⬜ | |
| Server-side filtering | 9 | ⬜ | |
| Expand-all / collapse-all | 9 | ⬜ | |
| Group-level selection semantics | 9 | ⬜ | |
