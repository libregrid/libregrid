# Parity — Find

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/find/ · transcribed 2026-08-11
**Phase:** 11 · **Package:** `@libregrid/find`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Type | Status | Notes |
|---|---|---|---|
| `findSearchValue` | `string` | ✅ | Reactive match rebuild |
| `findOptions` | `FindOptions` | ✅ | |
| `toolbar` | — | ❌ | Not implemented — Quick Access Toolbar is a documented post-1.0 candidate (see phase-13 13A); not shipped |

## FindOptions

| Property | Status | Notes |
|---|---|---|
| `currentPageOnly` | ✅ | Uses pagination service page bounds |
| `caseSensitive` | ✅ | |
| `searchDetail` | ✅ | Open detail grids plus collapsed callbacks |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `findNext()` | ✅ | Wraps forward |
| `findPrevious()` | ✅ | Wraps backward |
| `findGoTo(matchNumber, force?)` | ✅ | First match is 1 |
| `findClearActive()` | ✅ | |
| `findGetTotalMatches()` | ✅ | |
| `findGetActiveMatch()` | ✅ | Returns match or `undefined` |
| `findGetNumMatches()` | ✅ | Matches within a given cell |
| `findGetParts()` | ✅ | Cell value segmented into match/non-match |
| `findRefresh()` | ✅ | After external data mutation |

## Events

| Event | Status | Notes |
|---|---|---|
| `findChanged` | ✅ | Search value, active match, or cell visibility changed |

## Callbacks

| Callback | Location | Status | Notes |
|---|---|---|---|
| `getFindText` | ColDef | ✅ | Custom searchable text; `null` excludes the cell |
| `getFindText` | Group row renderer | ✅ | Full-width group callbacks supported |
| `getFindMatches` | Detail cell renderer | ✅ | Count matches in **collapsed** detail rows |
| `getFindMatches` | Full-width row renderer | ✅ | Callback indexes unrendered full-width content |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Match highlighting | ✅ | `agFindCellRenderer` installed only for matching cells |
| Active match visually distinct | ✅ | Dedicated class and colour token |
| Scroll-to-match | ✅ | Body scroll feature centres active row |
| Wrap-around on next/previous | ✅ | |
| Zero matches handled | ✅ | |
| Search term cleared resets state | ✅ | |
| Results announced via `aria-live` | ✅ | Demo exposes live match count; `findChanged` enables host UI announcements |
