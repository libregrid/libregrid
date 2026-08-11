# Parity — Advanced Filter

**Source:** https://www.ag-grid.com/angular-data-grid/filter-advanced/ · transcribed 2026-08-11
**Phase:** 11 · **Package:** `@libregrid/advanced-filter`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Type | Status | Notes |
|---|---|---|---|
| `enableAdvancedFilter` | `boolean` | ⬜ | |
| `includeHiddenColumnsInAdvancedFilter` | `boolean` | ⬜ | |
| `advancedFilterParams` | `IAdvancedFilterParams` | ⬜ | |
| `advancedFilterParent` | `HTMLElement \| null` | ⬜ | Render outside the grid |
| `advancedFilterBuilderParams` | `IAdvancedFilterBuilderParams` | ⬜ | |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `getAdvancedFilterModel()` | ⬜ | |
| `setAdvancedFilterModel(model)` | ⬜ | Must round-trip exactly |
| `showAdvancedFilterBuilder()` | ⬜ | |
| `hideAdvancedFilterBuilder()` | ⬜ | |

## Events

| Event | Status | Notes |
|---|---|---|
| `advancedFilterBuilderVisibleChanged` | ⬜ | |
| `filterChanged` | ⬜ | |

## Model

| Type | Status | Notes |
|---|---|---|
| `AdvancedFilterModel` (union) | ⬜ | |
| `JoinAdvancedFilterModel` | ⬜ | AND/OR of conditions |
| `ColumnAdvancedFilterModel` | ⬜ | Single condition |

## IAdvancedFilterParams

| Property | Status | Notes |
|---|---|---|
| `buttons` | ⬜ | `'apply' \| 'clear' \| 'reset' \| 'cancel'` |
| `suppressBuilderButton` | ⬜ | |

## IAdvancedFilterBuilderParams

| Property | Status | Notes |
|---|---|---|
| `buttons` | ⬜ | |
| `addSelectWidth` | ⬜ | |
| `minWidth` | ⬜ | |
| `pillSelectMaxWidth` | ⬜ | |
| `pillSelectMinWidth` | ⬜ | |
| `showMoveButtons` | ⬜ | |
| `suppressFullScreenButton` | ⬜ | |

## Expression engine

| Requirement | Status | Notes |
|---|---|---|
| Tokeniser | ⬜ | |
| AST / expression tree | ⬜ | |
| Validation with accurate error positions | ⬜ | |
| Operator precedence + parenthesisation | ⬜ | |
| Text → model → text round-trip stable | ⬜ | |
| Autocomplete for column names and operators | ⬜ | |
| Column names containing spaces or quotes | ⬜ | |
| Deeply nested join expressions | ⬜ | |

## Builder UI

| Requirement | Status | Notes |
|---|---|---|
| Pill-based visual editing | ⬜ | |
| Builder and text editor share one canonical model | ⬜ | **Key design constraint** |
| Add / remove / reorder conditions | ⬜ | |
| Keyboard-operable | ⬜ | |
