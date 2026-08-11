# Parity — Status Bar

**Source:** https://www.ag-grid.com/angular-data-grid/status-bar/ · transcribed 2026-08-11
**Phase:** 4 · **Package:** `@libregrid/status-bar`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `statusBar` | ⬜ | |
| `statusBar.statusPanels` | ⬜ | Array of `StatusPanelDef` |

## StatusPanelDef

| Property | Status | Notes |
|---|---|---|
| `statusPanel` | ⬜ | Component name or class |
| `align` | ⬜ | `'left' \| 'center' \| 'right'` |
| `key` | ⬜ | Lookup key for `getStatusPanel` |
| `statusPanelParams` | ⬜ | |

## Provided Status Panel Components

| Component | Status | Notes |
|---|---|---|
| `agTotalRowCountComponent` | ⬜ | |
| `agTotalAndFilteredRowCountComponent` | ⬜ | |
| `agFilteredRowCountComponent` | ⬜ | |
| `agSelectedRowCountComponent` | ⬜ | |
| `agAggregationComponent` | ⬜ | Aggregates the current cell selection |

## Params Interfaces

| Interface / property | Status | Notes |
|---|---|---|
| `IProvidedStatusPanelParams.valueFormatter` | ⬜ | |
| `IStatusPanelParams.key` | ⬜ | |
| `IStatusPanelParams.api` | ⬜ | |
| `IStatusPanelParams.context` | ⬜ | |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `getStatusPanel(key)` | ⬜ | |

## Custom Status Panel Contract

| Method | Status | Notes |
|---|---|---|
| `agInit(params)` | ⬜ | Mandatory |
| `refresh(params)` | ⬜ | Optional |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Counts update live under filtering | ⬜ | |
| Aggregation panel tracks cell selection | ⬜ | Depends on `@libregrid/cell-selection` |
| `aria-live` announcements for count changes | ⬜ | |
