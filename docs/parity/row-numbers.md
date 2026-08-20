# Parity — Row Numbers

> Parity-audited 2026-08-18 — Phase 14 (A5).

**Source:** https://www.ag-grid.com/javascript-data-grid/row-numbers/ · transcribed 2026-08-18
**Phase:** 14 (A5) · **Package:** `@libregrid/row-numbers`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option                                   | Status | Notes                                                                                                                                                                                                                                   |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rowNumbers`                             | ✅     | `boolean \| RowNumbersOptions`; live changes rebuild the column (`addManagedPropertyListener` + `colModel.refreshAll`).                                                                                                                 |
| `rowNumbers.enableRowResizer`            | ✅     | Drag handle on each row-number cell's bottom edge; dispatches `rowResizeStarted`/`rowResizeEnded`; not created when `getRowHeight` is set (does not work with auto row height per the spec).                                            |
| `rowNumbers.suppressCellSelectionIntegration` | ✅   | Disables the full-row selection when a row number is clicked.                                                                                                                                                                             |
| `rowNumbers` colDef overrides            | ✅     | `RowNumbersOptions` is a ColDef subset (`width`, `minWidth`, `resizable`, `valueGetter`/`valueFormatter`, `headerComponent*`, `cellRenderer*`, `tooltip*`, `context`, `onCell*` callbacks, …) merged over the defaults; `colId` and `chartDataType` stay fixed. |

## The row-number column

| Aspect       | Status | Notes                                                                                                                                                                                                                          |
| ------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Position     | ✅     | Always first — `lockPosition: 'left'` ( `'right'` when `enableRtl` ).                                                                                                                                                           |
| Identity     | ✅     | `colKind: 'row-number'`, colId `ROW_NUMBERS_COLUMN_ID` (`'ag-Grid-RowNumbersColumn'`) via the `_BaseSingleColService` pattern — Community's `ColumnModel.refresh()` calls `rowNumbersSvc.refreshCols()` and merges the result. |
| Defaults     | ✅     | `width`/`minWidth` 60, `resizable: false`, not sortable, not movable, not editable, no fill handle, no auto-size, no header-menu button.                                                                                       |
| Row value    | ✅     | Default: the 1-based visible row index (`node.rowIndex + 1`); overridable via `rowNumbers.valueGetter`.                                                                                                                         |
| Charts       | ✅     | `chartDataType: 'excluded'`.                                                                                                                                                                                                    |

## Behaviour

| Requirement                             | Status | Notes                                                                                                                                                                                                                                                                               |
| --------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clicking a row number selects the row   | ✅     | A left mouse (or touch) press selects every currently visible cell in the row. Contract: the row-numbers cell handler calls `rangeSvc.handleCellMouseDown(mouseEvent, cell)` — which sets the range service's `mouseDownHandled` flag and a provisional range — then `rangeSvc.setCellRange({ rowStartIndex, rowEndIndex, rowStartPinned, rowEndPinned, columns: gridApi.getAllDisplayedColumns() })`. Gated on `cellSelection` being enabled and `suppressCellSelectionIntegration`; the press is consumed on `pointerdown` so Community skips its default single-cell handling, and the cell-selection feature's `startDrag` hard-skips `ROW_NUMBERS_COLUMN_ID` so a row-number press can never start a single-cell drag. Integration-tested. |
| Row resizer                             | ✅     | Drag the handle → `node.setRowHeight` + `api.onRowHeightChanged`, `rowResizeStarted`/`rowResizeEnded` events, 10px minimum row height. Toggling the effective resizer state (`enableRowResizer` on/off, or `getRowHeight` set/cleared) while the column exists forces `gridApi.redrawRows()` (full row destroy/recreate — heavy but one-time) so handles are created or torn down on already-rendered rows. Integration-tested.                                                                                                                         |
| Keyboard on row-number cells            | ✅     | `handleKeyDownOnCell` passes through (the public spec is silent on key handling).                                                                                                                                                                                                  |
| CSV / Excel export                      | ✅     | The column is excluded by default; `exportDataAsCsv`/`exportDataAsExcel` with `exportRowNumbers: true` prepend a synthetic 1-based number column — handled by `@libregrid/excel-export`'s shared sheet extractor (tested in `excelCreator58.integration.spec.ts`).                     |

## Module

| Item               | Status | Notes                                                                                                                                                                                                                              |
| ------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RowNumbersModule` | ✅     | `moduleName: 'RowNumbers'`, `enterprise: true`; registers the reserved `rowNumbersSvc` bean plus the `lgr-row-number-*` styles (G4). Community's header init, CellCtrl mouse/key hooks and `createRowNumbersRowResizerFeature` call paths stay intact. |

## Notes

- **Default row value:** the public spec does not state an explicit default value getter; `node.rowIndex + 1` is the natural reading of "each cell of this column will work as a row header" and is overridable via `rowNumbers.valueGetter`.
- `setupForHeader` is a no-op hook kept so Community's header-init call path stays intact (the stock header component renders nothing for this column).
