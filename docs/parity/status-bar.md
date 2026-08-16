# Parity — Status Bar

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/status-bar/ · transcribed 2026-08-11
**Phase:** 4 · **Package:** `@libregrid/status-bar`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option                   | Status | Notes                                                            |
| ------------------------ | ------ | ---------------------------------------------------------------- |
| `statusBar`              | ✅     | Configured panel definitions are instantiated by `statusBarSvc` and rendered into the `.lgr-status-bar` shell below the grid. |
| `statusBar.statusPanels` | ✅     | Array of provided or custom `StatusPanelDef`s.                   |

## StatusPanelDef

| Property            | Status | Notes                                                                     |
| ------------------- | ------ | ------------------------------------------------------------------------- |
| `statusPanel`       | ✅     | Provided name or custom class.                                            |
| `align`             | ✅     | Panels render into left / center / right buckets (default right).          |
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
| `IProvidedStatusPanelParams.valueFormatter` | ✅     | Applied to every numeric value; falls back to locale number formatting.   |
| `IAggregationStatusPanelParams.aggFuncs`      | ✅     | Aggregation panel honors configured funcs (default count/sum/min/max/avg). |
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
| Status bar shell renders below the grid     | ✅     | `StatusBarComponent` registers the `AG-STATUS-BAR` selector; hides when no option. |
| Label/value pair structure                  | ✅     | Panels emit `lgr-status-name-value` pairs; values get 500-weight tabular numerals. |
| Counts update live under filtering          | ✅     | Service refreshes on `filterChanged`/`modelUpdated`.                                |
| Aggregation panel tracks cell selection     | ✅     | Service refreshes on `rangeSelectionChanged`; panel hides without a selection.      |
| `refresh` false/absent destroys and recreates | ✅   | Custom panel contract honored; the panel is rebuilt from its definition.            |
| `aria-live` announcements for count changes | ✅     | Each provided panel uses polite live output; the shell has `role=status`.           |
