# Parity — Server-Side Row Model

**Sources:** https://www.ag-grid.com/angular-data-grid/server-side-model/ · `/server-side-model-configuration/` · `/server-side-model-datasource/` · `/server-side-model-selection/` · `/server-side-model-updating-transactions/` · reviewed 2026-08-13
**Phases:** 7 (core) and 9 (grouping/pivot/filter/sort) · **Package:** `@libregrid/server-side-row-model`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

> **Phase-7 boundary:** flat data only. Requests in this phase include empty grouping/value/pivot arrays, `pivotMode: false`, and `filterModel: null`; only range and server-side sort are active. Grouping, filtering and pivot request semantics remain Phase 9.

## Grid Options

| Option | Phase | Status | Notes |
|---|---|---|---|
| `rowModelType: 'serverSide'` | 7 | ⬜ | |
| `serverSideDatasource` | 7 | ⬜ | |
| `cacheBlockSize` | 7 | ⬜ | |
| `maxBlocksInCache` | 7 | ⬜ | Drives eviction |
| `blockLoadDebounceMillis` | 7 | ⬜ | |
| `serverSideInitialRowCount` | 7 | ⬜ | Initial scrollbar sizing |
| `getRowId` | 7 | ⬜ | Required for transaction and selection correctness; document degraded behavior when absent |
| `rowBuffer` | 7 | ⬜ | |
| `debug` | 7 | ⬜ | Block-loading console output |
| `maxConcurrentDatasourceRequests` | 7 | ⬜ | Default 2; caps the partial-store scheduler |
| `asyncTransactionWaitMillis` | 7 | ⬜ | Batches async transactions |
| `ssrmExpandAllAffectsAllRows` | 9 | ⬜ | |

## API Methods

| Method | Phase | Status | Notes |
|---|---|---|---|
| `setGridOption` | 7 | ⬜ | e.g. swapping the datasource |
| `applyServerSideRowData` | 7 | ⬜ | Supply rows outside the datasource lifecycle |
| `applyServerSideTransaction` | 7 | ⬜ | |
| `applyServerSideTransactionAsync` | 7 | ⬜ | |
| `getCacheBlockState` | 7 | ⬜ | |
| `refreshServerSide` | 7 | ⬜ | |
| `ensureIndexVisible` | 7 | ⬜ | |

## Interfaces

| Interface | Phase | Status | Notes |
|---|---|---|---|
| `IServerSideDatasource.getRows(params)` | 7 | ⬜ | Required |
| `IServerSideDatasource.destroy()` | 7 | ⬜ | Optional cleanup |
| `IServerSideGetRowsParams.request` | 7 | ⬜ | |
| `IServerSideGetRowsParams.success(result)` | 7 | ⬜ | |
| `IServerSideGetRowsParams.fail()` | 7 | ⬜ | Must leave grid retryable |
| `IServerSideGetRowsRequest.startRow` | 7 | ⬜ | |
| `IServerSideGetRowsRequest.endRow` | 7 | ⬜ | |
| `IServerSideGetRowsRequest.sortModel` | 7 | ⬜ | Only active Phase-7 operation; sorting refreshes the root store |
| `IServerSideGetRowsRequest.filterModel` | 9 | ⬜ | |
| `IServerSideGetRowsRequest.rowGroupCols` | 9 | ⬜ | |
| `IServerSideGetRowsRequest.groupKeys` | 9 | ⬜ | Identifies the node whose children are requested |
| `IServerSideGetRowsRequest.valueCols` | 9 | ⬜ | |
| `IServerSideGetRowsRequest.pivotCols` | 9 | ⬜ | |
| `IServerSideGetRowsRequest.pivotMode` | 9 | ⬜ | |
| `GetRowIdFunc` / `GetRowIdParams` | 7 | ⬜ | `data`, `level`, `parentKeys`, `api` |
| `IServerSideStore` (full) | 7 | ⬜ | |
| `IServerSideStore` (partial/lazy) | 7 | ⬜ | |
| `iServerSideSelection` | 7 | ⬜ | Must survive block eviction |

## Behaviour

| Requirement | Phase | Status | Notes |
|---|---|---|---|
| Infinite scroll with block load/evict | 7 | ⬜ | Blocks are requested by range; `maxBlocksInCache` retains recently used blocks |
| Stale/out-of-order response discard | 7 | ⬜ | Refresh/datasource replacement must invalidate older callbacks |
| Server-side sorting | 7 | ⬜ | |
| Loading cell renderer for in-flight blocks | 7 | ⬜ | Loading rows must resolve after either `success` or retryable `fail` |
| Server-side grouping (lazy child stores) | 9 | ⬜ | |
| Server-supplied aggregates (no client re-agg) | 9 | ⬜ | |
| Server-side pivoting | 9 | ⬜ | |
| Server-side filtering | 9 | ⬜ | |
| Expand-all / collapse-all | 9 | ⬜ | |
| Group-level selection semantics | 9 | ⬜ | |
