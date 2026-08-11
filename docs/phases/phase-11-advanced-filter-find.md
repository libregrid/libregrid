# Phase 11 — Advanced Filter, Find & Rich Select

**Status:** ⬜ Not started
**Depends on:** Phase 1 (popups/menus), Phase 6 (filter model conventions)
**Blocks:** nothing

**Packages:** `@libregrid/advanced-filter` (`AdvancedFilter`), `@libregrid/find` (`Find`), `@libregrid/rich-select` (`RichSelect`)
**Parity:** [`../parity/advanced-filter.md`](../parity/advanced-filter.md), [`../parity/find.md`](../parity/find.md)

---

## Context

Three independent features grouped because each is moderately sized and none blocks anything else.

**Advanced Filter** is the most substantial: a expression-based filter with its own text syntax and a visual builder. It needs a real parser — tokeniser, expression tree, validation with useful error positions, and serialisation to/from `AdvancedFilterModel` (a union of `JoinAdvancedFilterModel` and `ColumnAdvancedFilterModel`). The builder UI edits the same model the text editor produces; keeping those two views in sync through one canonical model is the design constraint that matters.

**Find** searches rendered cell content across the grid, with match navigation. It's mostly bookkeeping, but the interesting parts are `getFindText` callbacks (cells whose displayed text differs from their value) and counting matches inside *collapsed* detail rows via `getFindMatches` — the grid must report matches it isn't currently rendering.

**Rich Select** is a Material autocomplete-backed cell editor — the smallest item, and a good place to establish the pattern for Material-based cell editors.

---

## Todo

### 11A — `@libregrid/advanced-filter`

- [ ] Bean implementing `iAdvancedFilterService`; bean `advFilterExpSvc` (expression service)
- [ ] Expression **parser**: tokeniser, AST, validation with error positions
- [ ] `AdvancedFilterModel` = `JoinAdvancedFilterModel` | `ColumnAdvancedFilterModel`; serialise both ways
- [ ] Text expression editor with autocomplete for column names and operators
- [ ] **Builder UI** (`iAdvancedFilterBuilderParams`) — pill-based visual editor
- [ ] Bean `advSettingsMenuFactory`
- [ ] Options: `enableAdvancedFilter`, `includeHiddenColumnsInAdvancedFilter`, `advancedFilterParams`, `advancedFilterParent`, `advancedFilterBuilderParams`
- [ ] `IAdvancedFilterParams`: `buttons`, `suppressBuilderButton`
- [ ] `IAdvancedFilterBuilderParams`: `buttons`, `addSelectWidth`, `minWidth`, `pillSelectMaxWidth`, `pillSelectMinWidth`, `showMoveButtons`, `suppressFullScreenButton`
- [ ] API: `getAdvancedFilterModel`, `setAdvancedFilterModel`, `showAdvancedFilterBuilder`, `hideAdvancedFilterBuilder`
- [ ] Events: `advancedFilterBuilderVisibleChanged`, `filterChanged`
- [ ] `advancedFilterParent` — render outside the grid

### 11B — `@libregrid/find`

- [ ] Bean implementing `iFind`
- [ ] Options: `findSearchValue`, `findOptions` (`currentPageOnly`, `caseSensitive`, `searchDetail`)
- [ ] API: `findNext`, `findPrevious`, `findGoTo(matchNumber[, force])`, `findClearActive`, `findGetTotalMatches`, `findGetActiveMatch`, `findGetNumMatches`, `findGetParts`, `findRefresh`
- [ ] Event `findChanged`
- [ ] ColDef callback `getFindText`; group-row-renderer `getFindText`
- [ ] `getFindMatches` for detail cells and full-width rows (collapsed content)
- [ ] Match highlighting + active-match distinction; scroll-to-match

### 11C — `@libregrid/rich-select`

- [ ] `agRichSelectCellEditor` implementing `iRichCellEditorParams`
- [ ] Searchable, virtualised list; custom cell renderer support; multi-select variant
- [ ] Material autocomplete implementation

---

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Parser: valid expressions of every operator; malformed input yields errors with correct positions; operator precedence and parenthesisation; round-trip text → model → text is stable. Find: match counting with `caseSensitive`, `currentPageOnly`; `findGetParts` segmentation of a cell value |
| **Integration** | Advanced filter expressions actually filter rows correctly. `setAdvancedFilterModel` restores state and re-filters. Builder edits produce the same model as the equivalent text. `advancedFilterParent` renders outside the grid. Find navigates matches in order and wraps. `findRefresh` picks up external data changes. Rich select commits values and fires `cellValueChanged` |
| **E2E** | Type an expression with autocomplete; open the builder; add/remove/reorder pills; apply. Find: type a term, step next/previous, confirm scroll-to and highlight. Rich select: open, search, keyboard-select |
| **a11y** | Builder pills keyboard-operable; find results announced via `aria-live`; rich select follows combobox roles; axe 0 violations light + dark |

**Specific edge cases to cover:**
- Expression referencing a hidden column with `includeHiddenColumnsInAdvancedFilter` on/off
- Deeply nested join expressions
- Column names containing spaces or quotes
- Find with zero matches, and with the search term cleared
- Find across collapsed detail rows (`searchDetail: true`)
- Rich select with thousands of options (virtualisation)

---

## Acceptance criteria

- [ ] Advanced filter expressions **parse, evaluate and serialise** correctly
- [ ] Malformed expressions produce clear errors with accurate positions
- [ ] Builder UI round-trips a model identically to the text editor
- [ ] `getAdvancedFilterModel` / `setAdvancedFilterModel` round-trip exactly
- [ ] Find highlights and navigates matches, including wrap-around
- [ ] Find reports matches inside collapsed detail rows via `getFindMatches`
- [ ] `getFindText` honoured for cells whose display text differs from their value
- [ ] Rich select virtualises large option lists and is keyboard-operable
- [ ] Both parity checklists fully marked ✅/🟡/❌ with rationale
- [ ] Full Definition of Done (`standards.md` §9) satisfied
