# Parity — Multi Filter

**Source:** https://www.ag-grid.com/angular-data-grid/filter-multi/ · transcribed 2026-08-11
**Phase:** 6 · **Package:** `@libregrid/multi-filter`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## IMultiFilterParams

| Property | Type | Default | Status | Notes |
|---|---|---|---|---|
| `filters` | `IMultiFilterDef[]` | — | ⬜ | |
| `readOnly` | `boolean` | `false` | ⬜ | Display-only UI inputs |

## IMultiFilterDef

| Property | Type | Default | Status | Notes |
|---|---|---|---|---|
| `display` | `'inline' \| 'accordion' \| 'subMenu'` | `'inline'` | ⬜ | All three modes required |
| `title` | `string` | — | ⬜ | Used in sub-menu / accordion |
| `filter` | `IFilterType \| ColumnFilter` | — | ⬜ | Child filter component |
| `filterParams` | `any` | — | ⬜ | |
| `floatingFilterComponent` | `IFloatingFilterType` | — | ⬜ | |
| `floatingFilterComponentParams` | `any` | — | ⬜ | |
| `filterValueGetter` | `string \| ValueGetterFunc` | — | ⬜ | |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `filter: 'agMultiColumnFilter'` | ⬜ | |
| `filterParams` | ⬜ | `IMultiFilterParams` |

## Filter Model

```ts
{ filterType: 'multi'; filterModels: any[] | null }
```

| Requirement | Status | Notes |
|---|---|---|
| `filterModels` length matches child filter count | ⬜ | |
| Inactive child filters serialise as `null` | ⬜ | |
| Model round-trips via `getFilterModel` / `setFilterModel` | ⬜ | |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Child filters combine with AND | ⬜ | |
| `'inline'` display | ⬜ | |
| `'accordion'` display | ⬜ | |
| `'subMenu'` display | ⬜ | |
| Works with `@libregrid/set-filter` as a child | ⬜ | |
| Works with Community filters as children | ⬜ | text, number, date |
| Floating filter integration | ⬜ | |
