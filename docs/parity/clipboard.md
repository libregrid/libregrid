# Parity — Clipboard

**Source:** https://www.ag-grid.com/angular-data-grid/clipboard/ · transcribed 2026-08-11
**Phase:** 4 · **Package:** `@libregrid/clipboard`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option                          | Status | Notes                                        |
| ------------------------------- | ------ | -------------------------------------------- |
| `copyHeadersToClipboard`        | ✅     | Includes processed headers.                  |
| `suppressCutToClipboard`        | ✅     | Prevents both copy and clear on cut.         |
| `suppressClipboardPaste`        | ✅     | Prevents browser/API paste mutation.         |
| `clipboardDelimiter`            | ✅     | TSV default plus custom delimiter coverage.  |
| `enableCellTextSelection`       | ✅     | Consumed by Community's cell renderer.       |
| `ensureDomOrder`                | ✅     | Consumed by Community's row renderer.        |
| `readOnlyEdit`                  | ✅     | Emits `cellEditRequest` without mutation.    |
| `cellSelection`                 | ✅     | Provided by `@libregrid/cell-selection`.     |
| `rowSelection.copySelectedRows` | ✅     | `copySelectedRowsToClipboard` API supported. |

## Callbacks

| Callback                         | Status | Notes                                                                                     |
| -------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `sendToClipboard`                | ✅     | Receives serialised text.                                                                 |
| `processCellForClipboard`        | ✅     | Applied to copied values.                                                                 |
| `processHeaderForClipboard`      | ✅     | Applied to copied headers.                                                                |
| `processGroupHeaderForClipboard` | 🟡     | Invoked for group-header copy mode; grouped header-row serialisation is not yet distinct. |
| `processCellFromClipboard`       | ✅     | Applied before mutation/request.                                                          |
| `processDataFromClipboard`       | ✅     | Can replace parsed clipboard matrix.                                                      |

## ColDef Properties

| Property        | Status | Notes                                                     |
| --------------- | ------ | --------------------------------------------------------- |
| `suppressPaste` | ✅     | Boolean and callback forms are checked per target column. |

## API Methods

| Method                         | Status | Notes                                           |
| ------------------------------ | ------ | ----------------------------------------------- |
| `copySelectedRowsToClipboard`  | ✅     | Registered on Grid API.                         |
| `copySelectedRangeToClipboard` | ✅     | Registered on Grid API.                         |
| `cutToClipboard`               | ✅     | Registered on Grid API.                         |
| `pasteFromClipboard`           | ✅     | Reads browser clipboard when permission allows. |

## Events

| Event              | Status | Notes                                 |
| ------------------ | ------ | ------------------------------------- |
| `cutStart`         | ✅     | Unit covered.                         |
| `cutEnd`           | ✅     | Unit covered.                         |
| `pasteStart`       | ✅     | Unit covered.                         |
| `pasteEnd`         | ✅     | Unit covered.                         |
| `cellValueChanged` | ✅     | Mutation uses RowNode `setDataValue`. |
| `cellEditRequest`  | ✅     | Read-only edit path unit covered.     |

## Behaviour

| Requirement                                      | Status | Notes                                                                                                          |
| ------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------- |
| TSV round-trips through Excel with correct shape | 🟡     | Quoting/delimiter/newline unit coverage is green; desktop Excel verification remains a manual completion gate. |
| Values containing tabs survive round trip        | ✅     | Unit covered.                                                                                                  |
| Values containing newlines survive round trip    | ✅     | Unit covered.                                                                                                  |
| Values containing quotes survive round trip      | ✅     | Unit covered.                                                                                                  |
| Paste larger than target range                   | ✅     | Clips at available displayed rows/columns.                                                                     |
| Paste into a grouped grid ignores group rows     | ✅     | Group rows are skipped.                                                                                        |
| Multi-range copy                                 | ✅     | Non-contiguous ranges are TSV blocks separated by one blank row.                                               |
| Verified against LibreOffice Calc                | 🟡     | Requires desktop manual check.                                                                                 |
| Verified against Google Sheets                   | 🟡     | Requires authenticated browser manual check.                                                                   |
