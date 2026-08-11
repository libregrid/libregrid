# Parity — Cell Selection

**Source:** https://www.ag-grid.com/angular-data-grid/cell-selection/ · transcribed 2026-08-11
**Phase:** 4 · **Package:** `@libregrid/cell-selection`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Type | Status | Notes |
|---|---|---|---|
| `cellSelection` | `boolean \| CellSelectionOptions` | ⬜ | |
| `suppressMultiRanges` | `boolean` | ⬜ | Single range only |
| `enableHeaderHighlight` | `boolean` | ⬜ | Highlights headers of ranged cells |
| `enableColumnSelection` | `boolean` | ⬜ | Select a column by clicking its header |
| `handle` | `RangeHandleOptions \| FillHandleOptions` | ⬜ | |

## Interfaces

| Interface | Status | Notes |
|---|---|---|
| `CellSelectionOptions` | ⬜ | |
| `RangeHandleOptions` | ⬜ | Drag corner to resize range |
| `FillHandleOptions` | ⬜ | |

## Events

| Event | Status | Notes |
|---|---|---|
| `cellSelectionDeleteStart` | ⬜ | Cell clear started |
| `cellSelectionDeleteEnd` | ⬜ | Cell clear ended |
| `cellSelectionChanged` | ⬜ | Not enumerated on the docs page — verify |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `getCellRanges` | ⬜ | Not enumerated on the docs page — verify |
| `addCellRange` | ⬜ | Not enumerated on the docs page — verify |
| `clearRangeSelection` | ⬜ | Not enumerated on the docs page — verify |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Drag to select a range | ⬜ | |
| Ctrl/Cmd+drag for multiple ranges | ⬜ | |
| Shift+click / Shift+arrow extension | ⬜ | |
| Range handle resize | ⬜ | |
| **Fill handle — copy values** | ⬜ | |
| **Fill handle — continue numeric series** | ⬜ | |
| **Fill handle — continue date series** | ⬜ | |
| Fill handle falls back to copy for non-series | ⬜ | |
| Delete/Backspace clears range | ⬜ | Fires the delete start/end events |
| Ranges spanning pinned columns | ⬜ | |

> The docs page listed no API methods. Verify against the live docs and `_CellSelectionGridApi` when working Phase 4.
