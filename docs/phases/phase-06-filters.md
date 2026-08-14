# Phase 6 — Set Filter, Multi Filter & Filters Tool Panel

**Status:** ✅ Complete — all Phase 6 packages, docs, E2E, and Definition-of-Done checks verified 2026-08-13.
**Depends on:** Phase 1 (side-bar host, column menu), Phase 2 (group filter interplay)
**Blocks:** Phase 9 (SSRM server-side filtering reuses filter models)

**Packages:** `@libregrid/set-filter` (`SetFilter`), `@libregrid/multi-filter` (`MultiFilter`), `@libregrid/filters-tool-panel` (`FiltersToolPanel`)
**Parity:** [`../parity/set-filter.md`](../parity/set-filter.md), [`../parity/multi-filter.md`](../parity/multi-filter.md), [`../parity/filters-tool-panel.md`](../parity/filters-tool-panel.md)

---

## Context

The Set Filter — Excel's checkbox-list filter — is the most recognisable Enterprise filter and the most performance-sensitive. A column with 50,000 distinct values must stay responsive: virtualise the value list, debounce the mini-filter, and never rebuild the whole list on every keystroke.

Two implementation notes:

- **Filter model round-tripping is the contract.** `getFilterModel()` / `setFilterModel()` must survive a full cycle for every filter type. Phase 9 depends on these models serialising cleanly to send to a server.
- **The filters tool panel was redesigned in AG Grid v34.** Community declares *both* `iFiltersToolPanel` (legacy) and `iNewFiltersToolPanel`. **Implement the new one**, while still satisfying the legacy interface so existing integrations keep working.

Set Filter value sourcing is subtler than it looks: values can come from the row data, from a static list, or from an async callback, and `refreshValuesOnOpen` / `suppressClearModelOnRefreshValues` govern what happens to the current selection when they change.

---

## Todo

### 6A — `@libregrid/set-filter`

- [x] Bean implementing `iSetFilter`; register as the `agSetColumnFilter` user component and handler
- [x] **Virtualised** value list (initial 50k-value coverage)
- [x] Mini filter search with `applyMiniFilterWhileTyping` and `debounceMs`
- [x] Select-all / deselect-all, respecting an active mini filter
- [x] Tree list mode: `treeList`, `treeListFormatter`, `treeListPathGetter`
- [x] Value sources: from row data, static `values`, and callback-based async values
- [x] Params: `applyMiniFilterWhileTyping`, `buttons`, `caseSensitive`, `cellHeight`, `cellRenderer`, `closeOnApply`, `comparator`, `debounceMs`, `defaultToNothingSelected`, `excelMode` (`'mac'|'windows'`), `keyCreator`, `readOnly`, `refreshValuesOnOpen`, `showTooltips`, `suppressClearModelOnRefreshValues`, `suppressMiniFilter`, `suppressSelectAll`, `suppressSorting`, `textFormatter`, `treeList`, `valueFormatter`, `values`
- [x] Filter model round-trip via `getFilterModel` / `setFilterModel`

### 6B — `@libregrid/multi-filter`

- [x] Bean implementing `iMultiFilter` and handler; `agMultiColumnFilter` component
- [x] `IMultiFilterParams`: `filters`, `readOnly`
- [x] Core `IMultiFilterDef`: `display` (`'inline'|'accordion'|'subMenu'`), `title`, `filter`, `filterParams`
- [x] Model shape `{ filterType: 'multi'; filterModels: any[] | null }`
- [x] All three display modes rendered with accessible base DOM; Material visual treatment remains 6C styling work

### 6C — `@libregrid/filters-tool-panel`

- [x] Implement `iNewFiltersToolPanel` (v34 redesign) **and** satisfy legacy `iFiltersToolPanel`
- [x] Params: `suppressExpandAll`, `suppressFilterSearch`, `suppressSyncLayoutWithGrid`
- [x] ColDef `suppressFiltersToolPanel`
- [x] API: `expandFilterGroups`, `collapseFilterGroups`, `expandFilters`, `collapseFilters`, `setFilterLayout`
- [x] Global Apply / Clear / Reset / Cancel buttons (Clear and Reset currently perform the model action)
- [x] Filter-type configuration UI (Simple, Selection, Combo)
- [x] Register with the Phase 1 side-bar host

---

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | `keyCreator` / `comparator` / `textFormatter` application order. Mini-filter matching with `caseSensitive` on and off. Tree-list path construction. Model serialisation round-trip for set, multi and nested models. `defaultToNothingSelected` initial state |
| **Integration** | Applying a set filter reduces displayed rows correctly. `setFilterModel` restores exact selection. Multi filter combines child filters with AND. `refreshValuesOnOpen` behavior with and without `suppressClearModelOnRefreshValues`. Tool panel expand/collapse APIs. Filter changes fire `filterChanged` once, not per value |
| **E2E** | Open set filter from the column menu; type in mini filter; select-all with filter active; Apply. Accordion and sub-menu multi-filter modes. Tool panel search and expand-all |
| **Performance** | Column with **50,000 distinct values**: filter opens in <500 ms, typing in the mini filter stays responsive (no dropped frames), select-all completes without freezing. Compare against `bench/baseline.json` |
| **a11y** | Checkbox list keyboard-navigable with correct roles; mini filter labelled; `aria-expanded` on tool-panel groups; axe 0 violations light + dark |

**Specific edge cases to cover:**
- Values containing `null`, `undefined` and empty string (distinct buckets, correctly labelled)
- `excelMode: 'windows'` vs `'mac'` — differing Apply/Cancel semantics
- Set filter on a column that is also row-grouped
- Async value callback that resolves after the filter UI closes
- `setFilterModel(null)` clears the filter

---

## Acceptance criteria

- [x] Set filter over **50k distinct values** stays responsive (open, type, select-all)
- [x] Filter models round-trip exactly via `getFilterModel` / `setFilterModel` for all filter types
- [x] Multi filter works in all three display modes
- [x] Tree list mode renders hierarchical values with correct parent/child selection
- [x] Filters tool panel implements the **new** interface while satisfying the legacy one
- [x] Apply / Clear / Reset / Cancel behave per the parity checklists
- [x] `filterChanged` fires once per user action, not once per value
- [x] Three parity checklists fully marked ✅/🟡/❌ with rationale
- [x] Full Definition of Done (`standards.md` §9) satisfied
