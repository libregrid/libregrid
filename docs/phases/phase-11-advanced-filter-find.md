# Phase 11 — Advanced Filter, Find & Rich Select

**Status:** ✅ Complete — Advanced Filter, Find, and Rich Select implementation, validation, documentation, and Definition-of-Done checks verified 2026-08-14.
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

- [x] Bean implementing `iAdvancedFilterService`; expression service lives with the `advancedFilter` pipeline bean
- [x] Expression **parser**: tokeniser, AST, validation with error positions
- [x] `AdvancedFilterModel` = `JoinAdvancedFilterModel` | `ColumnAdvancedFilterModel`; serialise both ways
- [x] Text expression editor with autocomplete for column names and operators
- [x] **Builder UI** (`iAdvancedFilterBuilderParams`) — pill-based visual editor
- [x] Settings controls integrated into the builder surface
- [x] Options: `enableAdvancedFilter`, `includeHiddenColumnsInAdvancedFilter`, `advancedFilterParams`, `advancedFilterParent`, `advancedFilterBuilderParams`
- [x] `IAdvancedFilterParams`: `buttons`, `suppressBuilderButton`
- [x] `IAdvancedFilterBuilderParams`: `buttons`, `addSelectWidth`, `minWidth`, `pillSelectMaxWidth`, `pillSelectMinWidth`, `showMoveButtons`, `suppressFullScreenButton`
- [x] API: `getAdvancedFilterModel`, `setAdvancedFilterModel`, `showAdvancedFilterBuilder`, `hideAdvancedFilterBuilder`
- [x] Events: `advancedFilterBuilderVisibleChanged`, `filterChanged`
- [x] `advancedFilterParent` — render outside the grid

### 11B — `@libregrid/find`

- [x] Bean implementing `iFind`
- [x] Options: `findSearchValue`, `findOptions` (`currentPageOnly`, `caseSensitive`, `searchDetail`)
- [x] API: `findNext`, `findPrevious`, `findGoTo(matchNumber[, force])`, `findClearActive`, `findGetTotalMatches`, `findGetActiveMatch`, `findGetNumMatches`, `findGetParts`, `findRefresh`
- [x] Event `findChanged`
- [x] ColDef callback `getFindText`; group-row-renderer `getFindText`
- [x] `getFindMatches` for detail cells and full-width rows (collapsed content)
- [x] Match highlighting + active-match distinction; scroll-to-match

### 11C — `@libregrid/rich-select`

- [x] `agRichSelectCellEditor` implementing `iRichCellEditorParams`
- [x] Searchable, virtualised list; custom cell renderer support; multi-select variant
- [x] Material autocomplete implementation

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

- [x] Advanced filter expressions **parse, evaluate and serialise** correctly
- [x] Malformed expressions produce clear errors with accurate positions
- [x] Builder UI round-trips a model identically to the text editor
- [x] `getAdvancedFilterModel` / `setAdvancedFilterModel` round-trip exactly
- [x] Find highlights and navigates matches, including wrap-around
- [x] Find reports matches inside collapsed detail rows via `getFindMatches`
- [x] `getFindText` honoured for cells whose display text differs from their value
- [x] Rich select virtualises large option lists and is keyboard-operable
- [x] All three parity checklists fully marked ✅/🟡/❌ with rationale
- [x] Full Definition of Done (`standards.md` §9) satisfied

## Verification record — 2026-08-14

- `npx vitest run packages/advanced-filter packages/find packages/rich-select --coverage --coverage.include='packages/advanced-filter/src/**/*.ts' --coverage.include='packages/find/src/**/*.ts' --coverage.include='packages/rich-select/src/**/*.ts' --pool=forks --maxWorkers=1` — **22 passed**; focused new-code coverage is **90.71% statements / 75.61% branches / 90.81% functions / 95.70% lines**.
- The test suite includes real-grid integration coverage for all three features: advanced-filter model/API restoration, Find callbacks/navigation/pagination/detail matching, and Rich Select editing/commit.
- `npx nx run-many -t lint test build --parallel=1 --outputStyle=static`, `npx nx run conformance:matrix --outputStyle=static`, `npx nx run bench:compare --outputStyle=static`, `npm run check:contamination`, `npm run check:versions`, and `npm run check:budgets` all pass.
- `npx ng build docs --configuration development` passes. `BASE_URL=http://127.0.0.1:4201 npx playwright test --config=apps/docs-e2e/playwright.config.ts --project=chromium --grep 'Phase 11' --reporter=list` passes the builder, Find navigation/highlights, Rich Select commit, and axe checks in light and dark themes.
- A Changeset, docs route, three parity records, and `NOTICE` + README attribution files for every new package are present.
