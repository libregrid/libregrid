# Parity — Advanced Filter

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/filter-advanced/ · transcribed 2026-08-11
**Phase:** 11 · **Package:** `@libregrid/advanced-filter`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Type | Status | Notes |
|---|---|---|---|
| `enableAdvancedFilter` | `boolean` | ✅ | Activates the `advancedFilter` filter-pipeline bean |
| `includeHiddenColumnsInAdvancedFilter` | `boolean` | ✅ | Validates hidden-column references only when enabled |
| `advancedFilterParams` | `IAdvancedFilterParams` | ✅ | Text-editor actions and builder suppression |
| `advancedFilterParent` | `HTMLElement \| null` | ✅ | Builder mounts in the supplied element |
| `advancedFilterBuilderParams` | `IAdvancedFilterBuilderParams` | ✅ | Sizing, actions, movement and full-screen controls |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `getAdvancedFilterModel()` | ✅ | Defensive model round-trip |
| `setAdvancedFilterModel(model)` | ✅ | Restores, validates, and refreshes rows |
| `showAdvancedFilterBuilder()` | ✅ | |
| `hideAdvancedFilterBuilder()` | ✅ | Discards staged edits |

## Events

| Event | Status | Notes |
|---|---|---|
| `advancedFilterBuilderVisibleChanged` | ✅ | Includes `visible` and API/UI source |
| `filterChanged` | ✅ | Uses Community FilterManager pipeline event |

## Model

| Type | Status | Notes |
|---|---|---|
| `AdvancedFilterModel` (union) | ✅ | Public Community model shape |
| `JoinAdvancedFilterModel` | ✅ | Precedence-aware AND/OR joins |
| `ColumnAdvancedFilterModel` | ✅ | Text, scalar, date, object, and boolean conditions |

## IAdvancedFilterParams

| Property | Status | Notes |
|---|---|---|
| `buttons` | ✅ | `'apply' \| 'clear' \| 'reset' \| 'cancel'` |
| `suppressBuilderButton` | ✅ | |

## IAdvancedFilterBuilderParams

| Property | Status | Notes |
|---|---|---|
| `buttons` | ✅ | Apply, clear, reset, and cancel semantics |
| `addSelectWidth` | ✅ | Applied to add control |
| `minWidth` | ✅ | Applied to builder surface |
| `pillSelectMaxWidth` | ✅ | Applied to condition selects |
| `pillSelectMinWidth` | ✅ | Applied to condition selects |
| `showMoveButtons` | ✅ | Exposes keyboard-focusable move controls |
| `suppressFullScreenButton` | ✅ | Controls full-screen action visibility |

## Expression engine

| Requirement | Status | Notes |
|---|---|---|
| Tokeniser | ✅ | Brackets, quoted strings, comparison operators, nesting |
| AST / expression tree | ✅ | Serialises to public join/column model union |
| Validation with accurate error positions | ✅ | Parser errors retain zero-based source offset |
| Operator precedence + parenthesisation | ✅ | AND binds more tightly than OR |
| Text → model → text round-trip stable | ✅ | Canonical bracketed column syntax |
| Autocomplete for column names and operators | ✅ | Native datalist suggestions |
| Column names containing spaces or quotes | ✅ | Bracket quoting and escaped `]` |
| Deeply nested join expressions | ✅ | Recursive parser/evaluator |

## Builder UI

| Requirement | Status | Notes |
|---|---|---|
| Pill-based visual editing | ✅ | Column/operator/value controls per condition |
| Builder and text editor share one canonical model | ✅ | Builder applies to the same service model used by text |
| Add / remove / reorder conditions | ✅ | Add/remove plus optional move controls |
| Keyboard-operable | ✅ | Native form controls and named buttons |
