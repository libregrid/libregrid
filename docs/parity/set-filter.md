# Parity — Set Filter

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/filter-set/ · transcribed 2026-08-11
**Phase:** 6 · **Package:** `@libregrid/set-filter`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## SetFilterParams

| Property | Type | Status | Notes |
|---|---|---|---|
| `values` | `SetFilterValues` | ✅ | Row data, static list, or callback-driven async values |
| `applyMiniFilterWhileTyping` | `boolean` | ✅ | Applies the UI model while mini-filter text changes |
| `buttons` | `FilterAction[]` | ✅ | apply / clear / reset / cancel |
| `caseSensitive` | `boolean` | ✅ | |
| `cellHeight` | `number` | ✅ | |
| `cellRenderer` | `any` | ✅ | Function return values and elements |
| `closeOnApply` | `boolean` | ✅ | Uses popup's public `hidePopup` callback |
| `comparator` | `Function` | ✅ | Value sort order |
| `debounceMs` | `number` | ✅ | Debounces mini-filter input |
| `defaultToNothingSelected` | `boolean` | ✅ | Excel mode correctly stages from all selected |
| `excelMode` | `'mac' \| 'windows'` | 🟡 | Both modes stage Apply/Cancel; platform-specific popup shortcuts are host-owned |
| `keyCreator` | `Function` | ✅ | Set Filter and handler value identity |
| `readOnly` | `boolean` | ✅ | |
| `refreshValuesOnOpen` | `boolean` | ✅ | |
| `showTooltips` | `boolean` | ✅ | |
| `suppressClearModelOnRefreshValues` | `boolean` | ✅ | |
| `suppressMiniFilter` | `boolean` | ✅ | |
| `suppressSelectAll` | `boolean` | ✅ | |
| `suppressSorting` | `boolean` | ✅ | |
| `textFormatter` | `Function` | ✅ | |
| `treeList` | `boolean` | ✅ | Hierarchical values |
| `treeListFormatter` | `Function` | ✅ | |
| `treeListPathGetter` | `Function` | ✅ | |
| `valueFormatter` | `Function` | ✅ | |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `filter: 'agSetColumnFilter'` | ✅ | Module registers UI and handler components |
| `filterParams` | ✅ | `ISetFilterParams` |
| `filterValueGetter` | ✅ | Resolved through Grid's `getValue` contract |
| `keyCreator` | ✅ | |
| `valueFormatter` | ✅ | |
| `comparator` | ✅ | |

## API / Model

| Item | Status | Notes |
|---|---|---|
| `getFilterModel()` round-trip | ✅ | **Contract** — Phase 9 serialises these |
| `setFilterModel(model)` restores exactly | ✅ | |
| `setFilterModel(null)` clears | ✅ | |
| `getColumnFilterInstance` | ✅ | Exposed by the Community Grid API once the component is registered |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| **Virtualised value list** | ✅ | **50k distinct values covered**; DOM renders only the scroll window |
| Mini filter search | ✅ | Text formatter and case-sensitive matching are supported; explicit case-sensitive coverage remains pending |
| Select-all / deselect-all honouring active mini filter | ✅ | Tested against an active mini filter |
| Tree list mode with parent/child selection | ✅ | Path getter, formatter, expansion, and branch selection |
| Async value callback | ✅ | Callback success replaces values; close-race coverage remains subsequent 6A work |
| `null` / `undefined` / empty-string as distinct buckets | ✅ | `undefined` uses a stable serialisable model key |
| Set filter on a row-grouped column | ✅ | Uses the standard `getValue` filtering seam |
| `filterChanged` fires once per user action | ✅ | Bulk selection is a single callback |
| Keyboard-navigable checkbox list | ✅ | Native labelled checkboxes support keyboard operation |

> The docs page did not enumerate API methods or the model shape. Verify against the live docs and `iSetFilter` when working Phase 6.
