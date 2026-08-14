# Phase 1 — Enterprise Core, Menus & Side Bar Shell

**Status:** ✅ Complete — menus, side-bar host, Material bridge, and Phase 1 Definition-of-Done verified 2026-08-13.
**Depends on:** Phase 0 (all criteria met)
**Blocks:** Phases 3, 6 (tool panels need the side-bar host); every phase that contributes menu items

**Packages:** `@libregrid/menu`, `@libregrid/side-bar`, `@libregrid/material`
**Parity:** [`../parity/context-menu.md`](../parity/context-menu.md), [`../parity/column-menu.md`](../parity/column-menu.md), [`../parity/side-bar.md`](../parity/side-bar.md)

---

## Context

Menus and the side bar land before any data feature for two reasons.

**It makes progress visible.** Phase 0 produces no UI. Shipping working menus and a themed side bar proves the whole strategy end to end — DI beans, user components, popups, Material integration and the theme bridge — on surfaces a human can see and click.

**Almost everything later contributes menu items.** Row grouping adds _Group by_, clipboard adds _Copy/Paste_, Excel export adds _Export_, charts add _Chart Range_. If the menu-item registry is designed badly, every later phase has to reach back and edit this package. Design it so features **contribute** items rather than modify the menu.

> **This is the extension point most likely to be got wrong. Get it right once.**

The Material work here also establishes the visual language for every later panel. The token bridge in 1C is what makes LibreGrid feel native to the host app — the main differentiator over AG Grid Enterprise.

---

## Todo

### 1A — `@libregrid/menu`

- [x] Beans: `menuItemMapper`, `menuUtils`, `colMenuFactory`
- [x] `ContextMenuModule` (`moduleName: 'ContextMenu'`), `ColumnMenuModule` (`moduleName: 'ColumnMenu'`), both `dependsOn: [EnterpriseCoreModule]`
- [x] **Menu-item registry** — an extensible contribution API so later phases register items without editing this package
- [x] `MenuItemDef` support: `name`, `action`, `cssClasses`, `disabled`, `tooltip`, `subMenu`, `icon`, `shortcut`, `checked`
- [x] Grid options: `contextMenuItems`, `getContextMenuItems`, `suppressContextMenu`, `allowContextMenuWithControlKey`, `popupParent`, `columnMenu` (`'legacy'|'new'`), `suppressMenuHide`, `getColumnMenuItems`, `getMainMenuItems`, `postProcessPopup`
- [x] ColDef: `suppressHeaderMenuButton`, `suppressHeaderFilterButton`, `suppressHeaderContextMenu`, `columnMenuItems`, `mainMenuItems`, `menuTabs`, `columnChooserParams`
- [x] API: `showContextMenu`, `hidePopupMenu`, `showColumnMenu`, `showColumnChooser`, `hideColumnChooser`, `showColumnFilter`, `hideColumnFilter`
- [x] Event: `columnMenuVisibleChanged`
- [x] Default items **whose owning feature exists now**: `separator`, `resetColumns`, `autoSizeThis`, `autoSizeAll`, `sortAscending`, `sortDescending`, `sortUnSort`, `pinSubMenu`, `columnChooser`, `columnFilter`, `pinRowSubMenu`, `pinTop`, `pinBottom`, `unpinRow`
- [x] Register **stubs** for items owned by later phases so the registry shape is proven: `copy`, `copyWithHeaders`, `copyWithGroupHeaders`, `cut`, `paste`, `export`, `csvExport`, `excelExport`, `rowGroup`, `rowUnGroup`, `expandAll`, `contractAll`, `valueAggSubMenu`, `chartRange`, `pivotChart`, `note`, `editColumnName`, `calculatedColumn`

### 1B — `@libregrid/side-bar`

- [x] Bean `sideBarSvc`; module `moduleName: 'SideBar'`; implements `iSideBar` / `iToolPanel`
- [x] Option `sideBar` accepting `boolean | string | string[] | SideBarDef`
- [x] `SideBarDef`: `toolPanels`, `defaultToolPanel`, `hiddenByDefault`, `position`, `hideButtons`
- [x] `ToolPanelDef`: `id`, `labelKey`, `labelDefault`, `minWidth` (default 100), `maxWidth`, `width`, `iconKey`, `toolPanel`, `toolPanelParams`, `parent`
- [x] API: `getSideBar`, `setSideBarVisible`, `isSideBarVisible`, `setSideBarPosition`, `openToolPanel`, `closeToolPanel`, `getOpenedToolPanel`, `isToolPanelShowing`, `refreshToolPanel`, `getToolPanelInstance`
- [x] Events: `toolPanelVisibleChanged`, `toolPanelSizeChanged`
- [x] Tool-panel **registration host** — later phases register panels; ship one stub panel only
- [x] Resizable side bar with min/max width honoured

### 1C — `@libregrid/material` v1

- [x] Material context menu + column menu (`MatMenu`, CDK Overlay, `MatIcon`)
- [x] Material side-bar shell through CDK `DomPortalOutlet` with Material buttons
- [x] `provideLibreGridMaterialTheme(options?)` — reads Material 3 system tokens (`--mat-sys-primary`, `--mat-sys-surface`, `--mat-sys-on-surface`, `--mat-sys-outline`, `--mat-sys-body-medium`) and returns a `Theme` via `themeQuartz.withParams({...})`
- [x] Recompute on theme change — `MutationObserver` on the root element's class/attribute list

> ### ⚠️ Read this before writing the bridge — a working prototype already exists
>
> `apps/docs/src/app/theme.ts` contains a **validated** prototype. Port its behaviour; do not start from scratch, and do not "simplify" it back to the obvious implementation.
>
> **`getComputedStyle().getPropertyValue()` does not work.** Angular Material 3 emits its system tokens as `light-dark()` functions:
>
> ```
> --mat-sys-surface: light-dark(#fef8fc, #151316)
> ```
>
> `getPropertyValue` returns that string **unresolved**. Passing it to the Theming API appears to succeed — the value lands as `--ag-background-color: light-dark(…)` — but `light-dark()` then resolves against the **grid wrapper's own `color-scheme`**, which the grid sets itself. Observed result: a dark page containing a fully light grid, with no error anywhere.
>
> **Resolve tokens to concrete colours** by painting the value onto a throwaway element and reading back the computed colour, which the browser has already resolved against the document's `color-scheme`. See `token()` in the prototype.
>
> **Recompute on `requestAnimationFrame`, not `queueMicrotask`** — the tokens must be read _after_ the browser applies the new `color-scheme`, or you read stale colours.
>
> Verified 2026-08-11: after the fix, grid background matched page background exactly (`rgb(21,19,22)`) with zero console errors.

- [x] Density and typography mapping (Material density scale → grid `spacing`, `fontSize`, `dataFontSize`)

---

## Test plan

| Tier            | Coverage                                                                                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | Menu-item registry: contribution, ordering, dedupe, `disabled`/`checked` resolution, sub-menu nesting. Side bar: `SideBarDef` normalisation from all four accepted shapes (`boolean`, `string`, `string[]`, object). Theme bridge: token→param mapping given a stub computed style |
| **Integration** | Register `ContextMenuModule` + `ColumnMenuModule` on a real grid; assert items appear and `action` fires. `openToolPanel`/`closeToolPanel`/`getOpenedToolPanel` round-trip. `getToolPanelInstance` returns the registered stub                                                     |
| **E2E**         | Right-click a cell → context menu opens with expected items; Escape closes. Click header menu button → column menu opens. Side bar button toggles panel; drag its edge to resize within min/max. Toggle app theme light↔dark → grid restyles without reload                        |
| **a11y**        | axe on docs route, light + dark. Menus keyboard-navigable (arrows, Enter, Escape); focus returns to trigger on close; `aria-expanded` correct on side-bar buttons                                                                                                                  |

**Specific edge cases to cover:**

- `suppressContextMenu` suppresses ours, not the browser's
- `allowContextMenuWithControlKey` on macOS Ctrl+click
- `popupParent` renders the menu outside the grid without clipping
- `getContextMenuItems` returning `[]` yields no menu (not an empty box)

---

## Acceptance criteria

- [x] Right-click context menu operates on a real Community grid with working actions
- [x] Column menu opens from the header button and from header right-click
- [x] Side bar opens/closes with a stub panel; position `left`/`right` both work; resize honours min/max
- [x] Toggling the app's Material theme (light↔dark) visibly restyles the grid **without reload**
- [x] Menu-item registry demonstrated: a test-only module contributes an item **without editing `@libregrid/menu`**
- [x] All parity items in the three checklists marked ✅/🟡/❌ with rationale
- [x] Keyboard navigation works throughout; axe 0 violations light + dark
- [x] Docs routes live for menus and side bar
- [x] Full Definition of Done (`standards.md` §9) satisfied
