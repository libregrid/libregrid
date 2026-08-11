# Phase 6 — Set Filter, Multi Filter & Filters Tool Panel

**Status:** ⬜ Not started
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

- [ ] Bean implementing `iSetFilter`; register as the `agSetColumnFilter` user component
- [ ] **Virtualised** value list (must handle 50k+ distinct values)
- [ ] Mini filter (search box) with `applyMiniFilterWhileTyping`, `debounceMs`
- [ ] Select-all / deselect-all, respecting an active mini filter
- [ ] Tree list mode: `treeList`, `treeListFormatter`, `treeListPathGetter`
- [ ] Value sources: from row data, static `values`, and async callback
- [ ] Params: `applyMiniFilterWhileTyping`, `buttons`, `caseSensitive`, `cellHeight`, `cellRenderer`, `closeOnApply`, `comparator`, `debounceMs`, `defaultToNothingSelected`, `excelMode` (`'mac'|'windows'`), `keyCreator`, `readOnly`, `refreshValuesOnOpen`, `showTooltips`, `suppressClearModelOnRefreshValues`, `suppressMiniFilter`, `suppressSelectAll`, `suppressSorting`, `textFormatter`, `treeList`, `valueFormatter`, `values`
- [ ] Filter model round-trip via `getFilterModel` / `setFilterModel`

### 6B — `@libregrid/multi-filter`

- [ ] Bean implementing `iMultiFilter` / `iMultiFilterService`; `agMultiColumnFilter` component
- [ ] `IMultiFilterParams`: `filters`, `readOnly`
- [ ] `IMultiFilterDef`: `display` (`'inline'|'accordion'|'subMenu'`), `title`, `filter`, `filterParams`, `floatingFilterComponent`, `floatingFilterComponentParams`, `filterValueGetter`
- [ ] Model shape `{ filterType: 'multi'; filterModels: any[] | null }`
- [ ] All three display modes rendered in Material

### 6C — `@libregrid/filters-tool-panel`

- [ ] Implement `iNewFiltersToolPanel` (v34 redesign) **and** satisfy legacy `iFiltersToolPanel`
- [ ] Params: `suppressExpandAll`, `suppressFilterSearch`, `suppressSyncLayoutWithGrid`
- [ ] ColDef `suppressFiltersToolPanel`
- [ ] API: `expandFilterGroups`, `collapseFilterGroups`, `expandFilters`, `collapseFilters`, `setFilterLayout`
- [ ] Global Apply / Clear / Reset / Cancel buttons
- [ ] Filter-type configuration UI (Simple, Selection, Combo)
- [ ] Register with the Phase 1 side-bar host

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

- [ ] Set filter over **50k distinct values** stays responsive (open, type, select-all)
- [ ] Filter models round-trip exactly via `getFilterModel` / `setFilterModel` for all filter types
- [ ] Multi filter works in all three display modes
- [ ] Tree list mode renders hierarchical values with correct parent/child selection
- [ ] Filters tool panel implements the **new** interface while satisfying the legacy one
- [ ] Apply / Clear / Reset / Cancel behave per the parity checklists
- [ ] `filterChanged` fires once per user action, not once per value
- [ ] Three parity checklists fully marked ✅/🟡/❌ with rationale
- [ ] Full Definition of Done (`standards.md` §9) satisfied
