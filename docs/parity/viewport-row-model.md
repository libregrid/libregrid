# Parity — Viewport Row Model

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/javascript-data-grid/grid-options/ · reviewed 2026-08-13
**Phase:** 9 · **Package:** `@libregrid/viewport-row-model`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

> The Grid Options reference confirms the three Viewport options below; datasource lifecycle and callback names are defined by the public `IViewportDatasource` interface.

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `rowModelType: 'viewport'` | ✅ | Registered by `ViewportRowModelModule` |
| `viewportDatasource` | ✅ | Swappable managed grid option |
| `viewportRowModelPageSize` | ✅ | Page-aligns viewport requests; default 5 |
| `viewportRowModelBufferSize` | ✅ | Extends the reported visible range; default 5 |

## IViewportDatasource

| Method | Status | Notes |
|---|---|---|
| `init(params)` | ✅ | Called once for each installed datasource |
| `setViewportRange(firstRow, lastRow)` | ✅ | Called when the page-aligned buffered range changes |
| `destroy()` | ✅ | Called on replacement and grid teardown |

## Params supplied to the datasource

| Callback | Status | Notes |
|---|---|---|
| `setRowCount(count)` | ✅ | Safely trims out-of-range materialized nodes |
| `setRowData(rowData)` | ✅ | Push updates by absolute row index |
| `getRow(rowIndex)` | ✅ | Returns a materialized node or a renderer-safe stub |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Viewport range notification on scroll | ✅ | Uses current page bounds after body-scroll events |
| Pushed row updates render without flicker | ✅ | Updates existing row nodes in place |
| Row count smaller than current scroll position | ✅ | Out-of-range rows are discarded and bounds remain safe |
| Streaming demo route in `apps/docs` | ✅ | `/viewport` |
| Datasource `destroy()` called on grid teardown | ✅ | Lifecycle test covers replacement; model teardown uses the same method |
