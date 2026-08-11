# Parity — Side Bar

**Source:** https://www.ag-grid.com/angular-data-grid/side-bar/ · transcribed 2026-08-11
**Phase:** 1 · **Package:** `@libregrid/side-bar`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `sideBar` | ⬜ | Accepts `undefined \| null \| boolean \| string \| string[] \| SideBarDef` — test all shapes |

## SideBarDef

| Property | Type | Status | Notes |
|---|---|---|---|
| `toolPanels` | `(ToolPanelDef \| string)[]` | ⬜ | |
| `defaultToolPanel` | `string` | ⬜ | |
| `hiddenByDefault` | `boolean` | ⬜ | |
| `position` | `'left' \| 'right'` | ⬜ | |
| `hideButtons` | `boolean` | ⬜ | |

## ToolPanelDef

| Property | Type | Status | Notes |
|---|---|---|---|
| `id` | `string` | ⬜ | |
| `labelKey` | `string` | ⬜ | |
| `labelDefault` | `string` | ⬜ | |
| `minWidth` | `number` | ⬜ | Default 100 |
| `maxWidth` | `number` | ⬜ | |
| `width` | `number` | ⬜ | |
| `iconKey` | `string` | ⬜ | |
| `toolPanel` | `any` | ⬜ | Component name or class |
| `toolPanelParams` | `any` | ⬜ | |
| `parent` | `HTMLElement \| null` | ⬜ | Render outside the grid (v34.2) |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `getSideBar` | ⬜ | |
| `setSideBarVisible(boolean)` | ⬜ | |
| `isSideBarVisible` | ⬜ | |
| `setSideBarPosition('left' \| 'right')` | ⬜ | |
| `openToolPanel(id, parent?)` | ⬜ | |
| `closeToolPanel` | ⬜ | |
| `getOpenedToolPanel` | ⬜ | Returns id or `null` |
| `isToolPanelShowing` | ⬜ | |
| `refreshToolPanel` | ⬜ | Calls each panel's `refresh` |
| `getToolPanelInstance(id)` | ⬜ | |

## Events

| Event | Status | Notes |
|---|---|---|
| `toolPanelVisibleChanged` | ⬜ | |
| `toolPanelSizeChanged` | ⬜ | |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Tool panel registration host for later phases | ⬜ | Phases 3 and 6 register into this |
| Resize honours `minWidth` / `maxWidth` | ⬜ | |
| Side buttons expose `aria-expanded` | ⬜ | |
