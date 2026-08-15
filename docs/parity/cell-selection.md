# Parity — Cell Selection

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/cell-selection/ · transcribed 2026-08-11
**Phase:** 4 · **Package:** `@libregrid/cell-selection`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option                  | Type                                      | Status | Notes                                                     |
| ----------------------- | ----------------------------------------- | ------ | --------------------------------------------------------- |
| `cellSelection`         | `boolean \| CellSelectionOptions`         | ✅     | Boolean enables selection; object enables nested options. |
| `suppressMultiRanges`   | `boolean`                                 | ✅     | Ctrl/Cmd append is disabled when set.                     |
| `enableHeaderHighlight` | `boolean`                                 | ✅     | Selected columns receive header highlighting.             |
| `enableColumnSelection` | `boolean`                                 | ✅     | Header interaction selects the displayed column.          |
| `handle`                | `RangeHandleOptions \| FillHandleOptions` | 🟡     | `handle.mode: 'range' \| 'fill'` is implemented; direction/reduction options are deferred. |

## Interfaces

| Interface              | Status | Notes                                                                                     |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `CellSelectionOptions` | ✅     | Supports the documented Phase 4 selection toggles.                                        |
| `RangeHandleOptions`   | 🟡     | Resize handle is implemented; advanced direction options are deferred.                    |
| `FillHandleOptions`    | 🟡     | Fill mode and series generation are implemented; advanced reduction options are deferred. |

## Events

| Event                      | Status | Notes                                                                            |
| -------------------------- | ------ | -------------------------------------------------------------------------------- |
| `cellSelectionDeleteStart` | ✅     | Emitted around Delete/Backspace clearing.                                        |
| `cellSelectionDeleteEnd`   | ✅     | Emitted after selected cells are cleared.                                        |
| `cellSelectionChanged`     | 🟡     | Uses Community-compatible `rangeSelectionChanged`; no separate event is emitted. |

## API Methods

| Method                | Status | Notes                          |
| --------------------- | ------ | ------------------------------ |
| `getCellRanges`       | ✅     | Registered on Grid API.        |
| `addCellRange`        | ✅     | Registered on Grid API.        |
| `clearRangeSelection` | ✅     | Alias of `clearCellSelection`. |

## Behaviour

| Requirement                                   | Status | Notes                                                                                                   |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| Drag to select a range                        | ✅     | Browser E2E covered.                                                                                    |
| Ctrl/Cmd+drag for multiple ranges             | ✅     | Browser E2E covered.                                                                                    |
| Shift+click / Shift+arrow extension           | ✅     | Service integration covered.                                                                            |
| Range handle resize                           | ✅     | `handle.mode: 'range'`.                                                                                 |
| **Fill handle — copy values**                 | ✅     | Non-series values repeat.                                                                               |
| **Fill handle — continue numeric series**     | ✅     | Real-grid unit coverage.                                                                                |
| **Fill handle — continue date series**        | ✅     | Unit coverage includes dates and weekdays.                                                              |
| Fill handle falls back to copy for non-series | ✅     | Unit coverage.                                                                                          |
| Delete/Backspace clears range                 | ✅     | Fires the delete start/end events.                                                                      |
| Ranges spanning pinned columns                | 🟡     | Range model accepts all displayed columns; pinned-container visual regression coverage is still needed. |

> The docs page listed no API methods. The public API was verified against `_CellSelectionGridApi` during Phase 4.
