# Parity — Toolbar

> Parity-audited 2026-08-15 — first pass for the 1.1.0 UX/UI release.

**Source:** https://www.ag-grid.com/angular-data-grid/toolbar/ · deep-dive: docs/design/ux-1-tool-panel-toolbar.md
**Phase:** 13 (UX pass) · **Package:** `@libregrid/toolbar`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option                  | Status | Notes                                                          |
| ----------------------- | ------ | -------------------------------------------------------------- |
| `toolbar`               | ✅     | `{ alignment, items }` parsed and rendered by `toolbarSvc`.   |
| `toolbar.alignment`     | ✅     | Default left; right items push via an auto-margin spacer.        |
| `toolbar.items`         | ✅     | Shorthand strings, action buttons, separators, custom components. |

## Built-in items

| Item                        | Status | Notes                                                                  |
| --------------------------- | ------ | ---------------------------------------------------------------------- |
| `agQuickFilterToolbarItem`  | ✅     | Input bound to `quickFilterText`; search icon; theme-native styling.   |
| `agFindToolbarItem`         | ✅     | Input bound to `findSearchValue`, match count, previous/next buttons. |
| `agRowGroupPanelToolbarItem`| ✅     | Embeds the shared row group drop zone (registered by columns-tool-panel). |
| `agPivotPanelToolbarItem`   | ✅     | Embeds the shared pivot drop zone (registered by columns-tool-panel).   |
| `agMenuToolbarItem`         | ✅     | Dropdown of menu items via the shared menu renderer (registered by menu). |
| `separator`                 | ✅     | Vertical divider.                                                      |

## Item definitions

| Property             | Status | Notes                                                             |
| -------------------- | ------ | ----------------------------------------------------------------- |
| `label` / `icon` / `tooltip` | ✅ | Action buttons and menu items render all three.             |
| `action`             | ✅     | Receives `{ api, context, key }`.                                  |
| `toolbarItem` (custom) | 🟡   | Component references resolve via `userCompFactory`; registered-name lookup untested. |
| `toolbarItemParams`    | ✅     | Forwarded to built-in and custom items.                            |
| `key` / `alignment`   | ✅     | Item-level alignment and `getToolbarItemInstance(key)`.            |

## API

| Method                      | Status | Notes                        |
| --------------------------- | ------ | ---------------------------- |
| `getToolbarItemInstance(key)` | ✅   | Returns built-in or custom item instances. |

## Behaviour

| Requirement                | Status | Notes                                                            |
| -------------------------- | ------ | ---------------------------------------------------------------- |
| Shell hides without option | ✅     | Integration-tested.                                              |
| Items scroll horizontally  | ✅     | `overflow: auto hidden` + thin scrollbar, never wraps.           |
| Live reconfiguration       | ✅     | `toolbar` option changes destroy and rebuild items.              |
| Keyboard focus rings       | ✅     | `--ag-input-focus-box-shadow` on buttons and inputs.             |
