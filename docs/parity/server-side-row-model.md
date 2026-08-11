# Parity — Server-Side Row Model

**Sources:** https://www.ag-grid.com/angular-data-grid/server-side-model/ · `/server-side-model-configuration/` · `/server-side-model-datasource/` · transcribed 2026-08-11
**Phases:** 7 (core) and 9 (grouping/pivot/filter/sort) · **Package:** `@libregrid/server-side-row-model`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

> ⚠️ **Incomplete source.** The SSRM overview page is conceptual, not an API reference. Expand this checklist at the start of Phase 7 and Phase 9 from: `server-side-model-grouping`, `-pivoting`, `-filtering`, `-sorting`, `-selection`, `-transactions`, `-row-height`, `-refresh`.

## Grid Options

| Option | Phase | Status | Notes |
|---|---|---|---|
| `rowModelType: 'serverSide'` | 7 | ⬜ | |
| `serverSideDatasource` | 7 | ⬜ | |
| `cacheBlockSize` | 7 | ⬜ | |
| `maxBlocksInCache` | 7 | ⬜ | Drives eviction |
| `blockLoadDebounceMillis` | 7 | ⬜ | |
| `serverSideInitialRowCount` | 7 | ⬜ | Initial scrollbar sizing |
| `getRowId` | 7 | ⬜ | Effectively required for transactions + selection |
| `rowBuffer` | 7 | ⬜ | |
| `debug` | 7 | ⬜ | Block-loading console output |
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
| `IServerSideGetRowsRequest.sortModel` | 7 | ⬜ | |
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
| Infinite scroll with block load/evict | 7 | ⬜ | |
| Stale/out-of-order response discard | 7 | ⬜ | |
| Server-side sorting | 7 | ⬜ | |
| Loading cell renderer for in-flight blocks | 7 | ⬜ | |
| Server-side grouping (lazy child stores) | 9 | ⬜ | |
| Server-supplied aggregates (no client re-agg) | 9 | ⬜ | |
| Server-side pivoting | 9 | ⬜ | |
| Server-side filtering | 9 | ⬜ | |
| Expand-all / collapse-all | 9 | ⬜ | |
| Group-level selection semantics | 9 | ⬜ | |
