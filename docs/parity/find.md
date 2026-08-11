# Parity — Find

**Source:** https://www.ag-grid.com/angular-data-grid/find/ · transcribed 2026-08-11
**Phase:** 11 · **Package:** `@libregrid/find`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Type | Status | Notes |
|---|---|---|---|
| `findSearchValue` | `string` | ⬜ | |
| `findOptions` | `FindOptions` | ⬜ | |
| `toolbar` | — | ⬜ | Quick Access Toolbar — Phase 13 |

## FindOptions

| Property | Status | Notes |
|---|---|---|
| `currentPageOnly` | ⬜ | Restrict to displayed page when paginating |
| `caseSensitive` | ⬜ | |
| `searchDetail` | ⬜ | Search Detail Grids / custom detail cells |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `findNext()` | ⬜ | |
| `findPrevious()` | ⬜ | |
| `findGoTo(matchNumber, force?)` | ⬜ | First match is 1 |
| `findClearActive()` | ⬜ | |
| `findGetTotalMatches()` | ⬜ | |
| `findGetActiveMatch()` | ⬜ | Returns match or `undefined` |
| `findGetNumMatches()` | ⬜ | Matches within a given cell |
| `findGetParts()` | ⬜ | Cell value segmented into match/non-match |
| `findRefresh()` | ⬜ | After external data mutation |

## Events

| Event | Status | Notes |
|---|---|---|
| `findChanged` | ⬜ | Search value, active match, or cell visibility changed |

## Callbacks

| Callback | Location | Status | Notes |
|---|---|---|---|
| `getFindText` | ColDef | ⬜ | Custom searchable text; `null` excludes the cell |
| `getFindText` | Group row renderer | ⬜ | |
| `getFindMatches` | Detail cell renderer | ⬜ | Count matches in **collapsed** detail rows |
| `getFindMatches` | Full-width row renderer | ⬜ | |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Match highlighting | ⬜ | |
| Active match visually distinct | ⬜ | |
| Scroll-to-match | ⬜ | |
| Wrap-around on next/previous | ⬜ | |
| Zero matches handled | ⬜ | |
| Search term cleared resets state | ⬜ | |
| Results announced via `aria-live` | ⬜ | |
