# Parity — Column Header Edit

> Parity-audited 2026-08-18 — Phase 14 (A7).

**Source:** https://www.ag-grid.com/javascript-data-grid/column-header-edit/ (v36.1, "Editable Column Header Names") · bean contract: `ag-grid-community@36.1.0`
**Phase:** 14 (A7) · **Package:** `@libregrid/column-header-edit`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option                                  | Status | Notes                                                                                                                                                                                                                         |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `columnHeaderEdit`                      | ✅     | `{ applyMode, suppressColumnHighlighting }`.                                                                                                                                                                                  |
| `columnHeaderEdit.applyMode`            | ✅     | `'live'` (default): every keystroke applies immediately; Escape/close restores the override that was in effect when the editor opened. `'deferred'`: Apply/Enter commits, Cancel/Escape/close discards.                    |
| `columnHeaderEdit.suppressColumnHighlighting` | ✅ | `isHighlightedColumn`/`isHighlightedGroup` return false, so the Community header comps stop highlighting the header being edited.                                                    |

## ColDef Properties

| Property               | Status | Notes                                                                                                                                                                                                                     |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `headerNameEditable`   | ✅     | On columns **and** column groups (via `AbstractColDef`); gates the menu item and the editor. Calculated columns are never editable — their names come from the expression, not the header.                          |

## Editor

| Requirement              | Status | Notes                                                                                                                                                                                                                                                             |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inline editor on header  | ✅     | DOM popup anchored to the header cell (`.ag-header-cell[col-id]`; groups: first display instance); `lgr-header-name-editor*` classes (G4); input preselected.                                                             |
| Live mode                | ✅     | `input` → `setHeaderNameOverride` per keystroke; Enter/blur commits (closes); Escape restores the captured override. Integration-tested.                                                                                   |
| Deferred mode            | ✅     | Apply button / Enter commits; Cancel / Escape / close discard (nothing applied until commit); buttons `preventDefault` on mousedown so the input's blur-commit can't preempt the click. Unit-tested.                        |
| Empty name               | ✅     | Committing an empty (whitespace-only) name clears the override (`headerNameOverride = null`), so the original header name returns. Unit-tested.                                                                          |
| Commit path              | ✅     | Columns: `column.setHeaderNameOverride(name, 'uiColumnHeaderEdit')`; groups: `api.setColumnGroupState([{ groupId, open, headerName }])` (keeps expansion state). Both persist in column / grid state — `resetColumnState()` reverts; overrides take priority over `headerValueGetter` (Community's `ColumnNameService.getHeaderName`). |
| Highlight                | ✅     | One `columnHeaderEditHighlightChanged` dispatch on open and close; the Community header comps already subscribe and call `isHighlightedColumn`/`isHighlightedGroup` — the only two v36 call sites for this bean.                                                |
| Single editor at a time  | ✅     | Opening a second editor commits (or cancels) the first.                                                                                                                                                                   |
| Menu entry point         | ✅     | `editColumnName` registry contribution registered at runtime by the service `postConstruct` on the live `MenuItemMapper` registry, overriding the `@libregrid/menu` stub (which resolves to `null` without this module). Registry factories have no bean access by design, so runtime registration is required. Columns: header menu button and column-header right-click. **Groups: the group-header right-click context menu** — Community v36 renders no menu button on group headers, and it routes the header-cell `contextmenu` through `menuSvc.showHeaderContextMenu(group)`, which delegates to the registered column-menu factory (`MenuService.activeMenuFactory` = our `ColumnMenuFactory`, bean `enterpriseMenuFactory`, since `columnMenu: 'new'` is the v36 default). Group menus render the same `Edit Column Name` item with the `AgProvidedColumnGroup` as target. |
| Group menu contents      | ✅     | Group-header menus pass the `AgProvidedColumnGroup` through `MenuActionParams.column`, so per-column items hide themselves via their structural `Column` guard (sort asc/desc/clear, auto-size this column, column chooser, column filter, show values as, row group/ungroup, aggregate); grid-level items (auto-size all columns, reset columns) and group-capable items (edit column name) remain. E2E-asserted on the group-header context menu. |

## API

| Member (bean `colHeaderEditSvc`)       | Status | Notes                                                                                          |
| -------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `isEditable(column \| group)`          | ✅     | The `headerNameEditable` gate (see ColDef).                                                    |
| `getEditColumnNameMenuItem(target)`    | ✅     | The `Edit Column Name` `MenuItemDef`, or `null` when not editable.                             |
| `showHeaderNameEditor(target)`         | ✅     | Opens the editor (no-op when not editable).                                                    |
| `isHighlightedColumn` / `isHighlightedGroup` | ✅  | Consumed by the Community header comps (see Highlight).                                        |

## Module

| Item                       | Status | Notes                                                                                                                                                                                                                          |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ColumnHeaderEditModule`   | ✅     | `moduleName: 'ColumnHeaderEdit'`, `enterprise: true`; registers the reserved `colHeaderEditSvc` bean plus the `lgr-header-name-editor*` styles (G4). Community v36 has no call site for the menu entry point (Enterprise-only), which this package builds. |

## Notes

- **Scope:** the column-menu entry + inline editor — the documented user-facing feature (gap-plan item A7).
- The v36.1.0 public d.ts predates the per-group `headerName` state field, so the group commit path casts through `setColumnGroupState`; the runtime applies it to `colModel.groupHeaderNameOverrides` and dispatches `columnHeaderNameChanged`.
