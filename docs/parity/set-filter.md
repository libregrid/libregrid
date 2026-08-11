# Parity — Set Filter

**Source:** https://www.ag-grid.com/angular-data-grid/filter-set/ · transcribed 2026-08-11
**Phase:** 6 · **Package:** `@libregrid/set-filter`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## SetFilterParams

| Property | Type | Status | Notes |
|---|---|---|---|
| `values` | `SetFilterValues` | ⬜ | Row data, static list, or async callback |
| `applyMiniFilterWhileTyping` | `boolean` | ⬜ | |
| `buttons` | `FilterAction[]` | ⬜ | apply / clear / reset / cancel |
| `caseSensitive` | `boolean` | ⬜ | |
| `cellHeight` | `number` | ⬜ | |
| `cellRenderer` | `any` | ⬜ | |
| `closeOnApply` | `boolean` | ⬜ | |
| `comparator` | `Function` | ⬜ | Value sort order |
| `debounceMs` | `number` | ⬜ | |
| `defaultToNothingSelected` | `boolean` | ⬜ | |
| `excelMode` | `'mac' \| 'windows'` | ⬜ | Differing Apply/Cancel semantics |
| `keyCreator` | `Function` | ⬜ | |
| `readOnly` | `boolean` | ⬜ | |
| `refreshValuesOnOpen` | `boolean` | ⬜ | |
| `showTooltips` | `boolean` | ⬜ | |
| `suppressClearModelOnRefreshValues` | `boolean` | ⬜ | |
| `suppressMiniFilter` | `boolean` | ⬜ | |
| `suppressSelectAll` | `boolean` | ⬜ | |
| `suppressSorting` | `boolean` | ⬜ | |
| `textFormatter` | `Function` | ⬜ | |
| `treeList` | `boolean` | ⬜ | Hierarchical values |
| `treeListFormatter` | `Function` | ⬜ | |
| `treeListPathGetter` | `Function` | ⬜ | |
| `valueFormatter` | `Function` | ⬜ | |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `filter: 'agSetColumnFilter'` | ⬜ | |
| `filterParams` | ⬜ | `ISetFilterParams` |
| `filterValueGetter` | ⬜ | |
| `keyCreator` | ⬜ | |
| `valueFormatter` | ⬜ | |
| `comparator` | ⬜ | |

## API / Model

| Item | Status | Notes |
|---|---|---|
| `getFilterModel()` round-trip | ⬜ | **Contract** — Phase 9 serialises these |
| `setFilterModel(model)` restores exactly | ⬜ | |
| `setFilterModel(null)` clears | ⬜ | |
| `getColumnFilterInstance` | ⬜ | Not enumerated on the docs page — verify |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| **Virtualised value list** | ⬜ | **50k distinct values must stay responsive** |
| Mini filter search | ⬜ | |
| Select-all / deselect-all honouring active mini filter | ⬜ | |
| Tree list mode with parent/child selection | ⬜ | |
| Async value callback | ⬜ | Handle resolve-after-close |
| `null` / `undefined` / empty-string as distinct buckets | ⬜ | |
| Set filter on a row-grouped column | ⬜ | |
| `filterChanged` fires once per user action | ⬜ | Not once per value |
| Keyboard-navigable checkbox list | ⬜ | |

> The docs page did not enumerate API methods or the model shape. Verify against the live docs and `iSetFilter` when working Phase 6.
