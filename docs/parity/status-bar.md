# Parity — Status Bar

**Source:** https://www.ag-grid.com/angular-data-grid/status-bar/ · transcribed 2026-08-11
**Phase:** 4 · **Package:** `@libregrid/status-bar`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option                   | Status | Notes                                                            |
| ------------------------ | ------ | ---------------------------------------------------------------- |
| `statusBar`              | ✅     | Configured panel definitions are instantiated by `statusBarSvc`. |
| `statusBar.statusPanels` | ✅     | Array of provided or custom `StatusPanelDef`s.                   |

## StatusPanelDef

| Property            | Status | Notes                                                                     |
| ------------------- | ------ | ------------------------------------------------------------------------- |
| `statusPanel`       | ✅     | Provided name or custom class.                                            |
| `align`             | 🟡     | Retained by the definition; a multi-panel layout host is not yet shipped. |
| `key`               | ✅     | Used by `getStatusPanel`.                                                 |
| `statusPanelParams` | ✅     | Merged into init parameters.                                              |

## Provided Status Panel Components

| Component                             | Status | Notes                                |
| ------------------------------------- | ------ | ------------------------------------ |
| `agTotalRowCountComponent`            | ✅     | Unit and real-grid config coverage.  |
| `agTotalAndFilteredRowCountComponent` | ✅     | Unit coverage.                       |
| `agFilteredRowCountComponent`         | ✅     | Unit coverage.                       |
| `agSelectedRowCountComponent`         | ✅     | Unit coverage.                       |
| `agAggregationComponent`              | ✅     | Selection aggregation unit coverage. |

## Params Interfaces

| Interface / property                        | Status | Notes                                                                             |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| `IProvidedStatusPanelParams.valueFormatter` | 🟡     | Built-in text formatting is available; custom value formatter is not applied yet. |
| `IStatusPanelParams.key`                    | ✅     | Supplied during init/refresh.                                                     |
| `IStatusPanelParams.api`                    | ✅     | Supplied during init/refresh.                                                     |
| `IStatusPanelParams.context`                | ✅     | Supplied during init/refresh.                                                     |

## API Methods

| Method                | Status | Notes                                                      |
| --------------------- | ------ | ---------------------------------------------------------- |
| `getStatusPanel(key)` | ✅     | Real-grid config test includes provided and custom panels. |

## Custom Status Panel Contract

| Method            | Status | Notes                                                              |
| ----------------- | ------ | ------------------------------------------------------------------ |
| `agInit(params)`  | ✅     | Called on configured custom panel.                                 |
| `refresh(params)` | ✅     | Called on grid model, filter, selection, range, and value changes. |

## Behaviour

| Requirement                                 | Status | Notes                                                                               |
| ------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| Counts update live under filtering          | ✅     | Service refreshes on `filterChanged`/`modelUpdated`.                                |
| Aggregation panel tracks cell selection     | ✅     | Service refreshes on `rangeSelectionChanged`.                                       |
| `aria-live` announcements for count changes | ✅     | Each provided panel uses polite live output; Material demo shell has `role=status`. |
