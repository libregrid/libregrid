# Parity — Side Bar

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/side-bar/ · transcribed 2026-08-11
**Phase:** 1 · **Package:** `@libregrid/side-bar`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `sideBar` | ✅ | Accepts `undefined \| null \| boolean \| string \| string[] \| SideBarDef` — all shapes tested |

## SideBarDef

| Property | Type | Status | Notes |
|---|---|---|---|
| `toolPanels` | `(ToolPanelDef \| string)[]` | ✅ | |
| `defaultToolPanel` | `string` | ✅ | |
| `hiddenByDefault` | `boolean` | ✅ | |
| `position` | `'left' \| 'right'` | ✅ | The whole bar moves to the chosen side of the grid (left uses order -1 in the root wrapper flex row); the button strip stays on the inner edge (1.1.0 fix) |
| `hideButtons` | `boolean` | ✅ | Runtime grid-option update and E2E tested |

## ToolPanelDef

| Property | Type | Status | Notes |
|---|---|---|---|
| `id` | `string` | ✅ | |
| `labelKey` | `string` | ✅ | |
| `labelDefault` | `string` | ✅ | |
| `minWidth` | `number` | ✅ | Enforced by the resize handle; E2E tested |
| `maxWidth` | `number` | ✅ | Enforced by the resize handle; E2E tested |
| `width` | `number` | ✅ | Applied as the initial panel width |
| `iconKey` | `string` | ✅ | |
| `toolPanel` | `any` | ✅ | Component instances are created and retrievable |
| `toolPanelParams` | `any` | ✅ | Passed to the panel `init` method |
| `parent` | `HTMLElement \| null` | ✅ | API parent is used as the panel host |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `getSideBar` | ✅ | Returns SideBarDef |
| `setSideBarVisible(boolean)` | ✅ | |
| `isSideBarVisible` | ✅ | |
| `setSideBarPosition('left' \| 'right')` | ✅ | E2E asserts the bar's geometry against the grid header on both sides |
| `openToolPanel(id, parent?)` | ✅ | |
| `closeToolPanel` | ✅ | |
| `getOpenedToolPanel` | ✅ | Returns id or `null` |
| `isToolPanelShowing` | ✅ | |
| `refreshToolPanel` | ✅ | Calls each panel's `refresh` |
| `getToolPanelInstance(id)` | ✅ | |

## Events

| Event | Status | Notes |
|---|---|---|
| `toolPanelVisibleChanged` | ✅ | Fired on panel open and close |
| `toolPanelSizeChanged` | ✅ | Fired while resizing an open panel |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Tool panel registration host for later phases | ✅ | `registerToolPanel()` on the service; stub panel renders |
| Resize honours `minWidth` / `maxWidth` | ✅ | Pointer resize handle is bounded; E2E tested |
| Side buttons expose `aria-expanded` | ✅ | Updated on panel toggle; E2E tested |
