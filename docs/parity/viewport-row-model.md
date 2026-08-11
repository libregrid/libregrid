# Parity — Viewport Row Model

**Source:** https://www.ag-grid.com/angular-data-grid/viewport/ · **not yet transcribed**
**Phase:** 9 · **Package:** `@libregrid/viewport-row-model`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

> ⚠️ **This checklist was not transcribed from the docs.** The entries below are derived from the `iViewportRowModel` / `iViewportDatasource` interfaces declared in `ag-grid-community`. **Expand this file from the live docs page as the first task of Phase 9B** before implementing.

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `rowModelType: 'viewport'` | ⬜ | |
| `viewportDatasource` | ⬜ | |
| `viewportRowModelPageSize` | ⬜ | Verify name against docs |
| `viewportRowModelBufferSize` | ⬜ | Verify name against docs |

## IViewportDatasource

| Method | Status | Notes |
|---|---|---|
| `init(params)` | ⬜ | Grid supplies `setRowCount`, `setRowData` |
| `setViewportRange(firstRow, lastRow)` | ⬜ | Called as the user scrolls |
| `destroy()` | ⬜ | Optional cleanup |

## Params supplied to the datasource

| Callback | Status | Notes |
|---|---|---|
| `setRowCount(count)` | ⬜ | |
| `setRowData(rowData)` | ⬜ | Push updates for the visible window |
| `getRow(rowIndex)` | ⬜ | Verify against docs |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Viewport range notification on scroll | ⬜ | |
| Pushed row updates render without flicker | ⬜ | |
| Row count smaller than current scroll position | ⬜ | Must not error |
| Streaming demo route in `apps/docs` | ⬜ | |
| Datasource `destroy()` called on grid teardown | ⬜ | |
