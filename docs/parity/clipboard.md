# Parity — Clipboard

**Source:** https://www.ag-grid.com/angular-data-grid/clipboard/ · transcribed 2026-08-11
**Phase:** 4 · **Package:** `@libregrid/clipboard`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `copyHeadersToClipboard` | ⬜ | |
| `suppressCutToClipboard` | ⬜ | |
| `suppressClipboardPaste` | ⬜ | |
| `clipboardDelimiter` | ⬜ | Default `\t` |
| `enableCellTextSelection` | ⬜ | Browser text selection instead of grid selection |
| `ensureDomOrder` | ⬜ | Required with `enableCellTextSelection` for a11y |
| `readOnlyEdit` | ⬜ | Emits `cellEditRequest` instead of mutating |
| `cellSelection` | ⬜ | Provided by `@libregrid/cell-selection` |
| `rowSelection.copySelectedRows` | ⬜ | |

## Callbacks

| Callback | Status | Notes |
|---|---|---|
| `sendToClipboard` | ⬜ | Custom clipboard handling |
| `processCellForClipboard` | ⬜ | |
| `processHeaderForClipboard` | ⬜ | |
| `processGroupHeaderForClipboard` | ⬜ | |
| `processCellFromClipboard` | ⬜ | |
| `processDataFromClipboard` | ⬜ | Full control over paste data |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `suppressPaste` | ⬜ | `boolean` or function |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `copySelectedRowsToClipboard` | ⬜ | |
| `copySelectedRangeToClipboard` | ⬜ | |
| `cutToClipboard` | ⬜ | Not enumerated on the docs page — verify |
| `pasteFromClipboard` | ⬜ | Not enumerated on the docs page — verify |

## Events

| Event | Status | Notes |
|---|---|---|
| `cutStart` | ⬜ | |
| `cutEnd` | ⬜ | |
| `pasteStart` | ⬜ | |
| `pasteEnd` | ⬜ | |
| `cellValueChanged` | ⬜ | After cut/paste/edit |
| `cellEditRequest` | ⬜ | When `readOnlyEdit = true` |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| TSV round-trips through Excel with correct shape | ⬜ | **Gate criterion** |
| Values containing tabs survive round trip | ⬜ | |
| Values containing newlines survive round trip | ⬜ | |
| Values containing quotes survive round trip | ⬜ | |
| Paste larger than target range | ⬜ | Document expand-vs-clip behaviour |
| Paste into a grouped grid ignores group rows | ⬜ | |
| Multi-range copy | ⬜ | Document behaviour for non-contiguous ranges |
| Verified against LibreOffice Calc | ⬜ | |
| Verified against Google Sheets | ⬜ | |
