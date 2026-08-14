# Parity — Multi Filter

**Source:** https://www.ag-grid.com/angular-data-grid/filter-multi/ · transcribed 2026-08-11
**Phase:** 6 · **Package:** `@libregrid/multi-filter`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## IMultiFilterParams

| Property | Type | Default | Status | Notes |
|---|---|---|---|---|
| `filters` | `IMultiFilterDef[]` | — | ✅ | |
| `readOnly` | `boolean` | `false` | ✅ | Display-only UI inputs |

## IMultiFilterDef

| Property | Type | Default | Status | Notes |
|---|---|---|---|---|
| `display` | `'inline' \| 'accordion' \| 'subMenu'` | `'inline'` | ✅ | All three modes required |
| `title` | `string` | — | ✅ | Used in sub-menu / accordion |
| `filter` | `IFilterType \| ColumnFilter` | — | 🟡 | Set Filter and custom legacy children; Community handler models are supported, but custom reactive display components remain external |
| `filterParams` | `any` | — | ✅ | |
| `floatingFilterComponent` | `IFloatingFilterType` | — | 🟡 | Community owns floating-filter mounting; the serialised child model is available to it |
| `floatingFilterComponentParams` | `any` | — | 🟡 | Passed through definition; custom reactive display is external |
| `filterValueGetter` | `string \| ValueGetterFunc` | — | 🟡 | Grid handler supplies the parent value getter; per-child override awaits the reactive child-display seam |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `filter: 'agMultiColumnFilter'` | ✅ | |
| `filterParams` | ✅ | `IMultiFilterParams` |

## Filter Model

```ts
{ filterType: 'multi'; filterModels: any[] | null }
```

| Requirement | Status | Notes |
|---|---|---|
| `filterModels` length matches child filter count | ✅ | |
| Inactive child filters serialise as `null` | ✅ | |
| Model round-trips via `getFilterModel` / `setFilterModel` | ✅ | |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Child filters combine with AND | ✅ | Handler integration test |
| `'inline'` display | ✅ | |
| `'accordion'` display | ✅ | |
| `'subMenu'` display | ✅ | |
| Works with `@libregrid/set-filter` as a child | ✅ | |
| Works with Community filters as children | 🟡 | Handler evaluates text, number, date models; reactive child-display components remain Community-owned |
| Floating filter integration | 🟡 | Parent model serialises correctly; custom floating displays are outside this framework-neutral package |
