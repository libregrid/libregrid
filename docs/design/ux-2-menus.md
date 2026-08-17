# Design Spec — Column Menu & Context Menu (UX Pass 2)

> Status: research complete. Drives the UI/UX pass for `@libregrid/menu`.
> Scope: column menu (header dropdown) and context menu (right-click).
> Sources: ag-grid.com docs (server-rendered, extracted in full) + Quartz theme CSS on disk + LibreGrid source. No enterprise binary consulted (G1/G2).

---

## 1. Behavior spec

### 1.1 Column menu — structure & launch

**Launch surface.** The column menu is launched from the grid header and "displays a list of menu items, along with the ability to select columns and display filters" (https://www.ag-grid.com/angular-data-grid/column-menu/ § intro).

**Triggers (native):**
1. Column-header **menu button** (hamburger) — toggled per column.
2. **Right-click** on a column header.
3. Right-click on the **empty space to the right of the column headers** opens a column menu "with options to choose/reset the columns" (same page, § intro bullet 4).

**Per-column suppression (ColDef):**
- `suppressHeaderMenuButton` (boolean, default `false`) — "Set to true if no menu button should be shown for this column header" (§ Customising the Column Menu).
- `suppressHeaderFilterButton` (boolean, default `false`) — "Set to true to not display the filter button in the column header. Doesn't apply when columnMenu = 'legacy'" (§ Customising the Column Menu).
- `suppressHeaderContextMenu` (boolean, default `false`) — "Set to true to not display the column menu when the column header is right-clicked. Doesn't apply when columnMenu = 'legacy'" (§ Customising the Column Menu).

**Menu item customisation — two mechanisms, used independently or together:**
- `colDef.columnMenuItems` — per column; "Either a list of menu items, or a callback which is passed the list of default items."
- `getColumnMenuItems()` — grid option callback "passed the list of default items, the column, and the source of the menu."
- Precedence: `colDef.columnMenuItems` > `getColumnMenuItems()` (§ Customising the Menu Items).
- `source` param ∈ `'columnMenu' | 'columnsToolPanel' | 'columnChooser'` — "a single callback can tailor the items for the column menu, the Columns Tool Panel context menu, and the Column Chooser" (§ Customising the Menu Items).

**Legacy properties** (`colDef.mainMenuItems`, `getMainMenuItems()`) apply to the column menu only, receive no `source`, and take effect when the newer properties are not set. Full precedence: `columnMenuItems` → `getColumnMenuItems()` → `mainMenuItems` → `getMainMenuItems()` (§ Legacy Column Menu Properties).

**Built-in items + show/hide rules** (§ Built-In Menu Items):
| Token | Label / behavior | Shown when |
|---|---|---|
| `sortAscending` | Sort ascending | not `'legacy'` and not already sorted asc |
| `sortDescending` | Sort descending | not `'legacy'` and not already sorted desc |
| `sortUnSort` | Clear sort | not `'legacy'` and column is sorted |
| `calculatedColumn` | Calculated Columns options | column is a Calculated Column (edit/remove options) |
| `editColumnName` | Rename header | `headerNameEditable` set (never on calculated column) |
| `columnFilter` | Show column filter | not `'legacy'`; a filter is enabled; header filter button / floating filter button NOT displayed |
| `columnChooser` | Show column chooser | not `'legacy'` |
| `pinSubMenu` | Pinning sub-menu | always |
| `valueAggSubMenu` | Value aggregation sub-menu | always |
| `autoSizeThis` | Auto-size this column | always |
| `autoSizeAll` | Auto-size all columns | always |
| `rowGroup` / `rowUnGroup` | Group / un-group | column not grouped / is grouped |
| `resetColumns` | Reset column details | always |
| `expandAll` / `contractAll` | Expand / collapse groups | grouping by ≥1 column |

**Separators.** Items are grouped with the string `'separator'` (§ Menu Item Separators).

**Tabs (legacy format).** `columnMenu = 'legacy'` renders a three-panel tabbed menu; tab order/hide via `colDef.menuTabs` (array of `'filterMenuTab'`, `'generalMenuTab'`, `'columnsMenuTab'`; default `['generalMenuTab','filterMenuTab','columnsMenuTab']`). "With the legacy menu, the column menu button is hidden until moused over"; `suppressMenuHide` (default `true`; `false` only under legacy) toggles that (§ Legacy Tabbed Column Menu). LibreGrid does **not** implement the tabbed format — see §4.

**Column chooser.** The "Choose Columns" tab/panel is configured via `colDef.columnChooserParams`: `suppressSyncLayoutWithGrid`, `suppressColumnFilter`, `suppressColumnSelectAll`, `suppressColumnExpandAll`, `contractColumnSelection`, `columnLayout` (§ Customising the Column Chooser).

### 1.2 Context menu — structure & launch

**Launch.** Right-click on a cell. "By default, the context menu shows Clipboard, CSV Export, Excel Export and Integrated Charts menu items (if the relevant Modules are loaded)" (https://www.ag-grid.com/angular-data-grid/context-menu/ § intro).

**Config — two ways:**
- `colDef.contextMenuItems` — list or callback passed the default items.
- `getContextMenuItems()` — grid callback "passed the list of default menu items as well as the column."
- Precedence: `colDef.contextMenuItems` > `getContextMenuItems()` (§ Configuring the Context Menu).
- Items are "either a) a string or b) a MenuItemDef description" (§ Configuring the Context Menu).

**Important semantics:**
- "if you set `checked=true`, then the icon will be ignored - these options are mutually exclusive" (§ Configuring the Context Menu). No radio-group concept is documented; grouping is emulated by `checked` + action logic.
- `suppressContextMenu=true` disables the grid menu entirely (§ Configuring the Context Menu).

**Built-in items + show/hide rules** (§ Built In Menu Items):
| Token | Shown |
|---|---|
| `copy`, `copyWithHeaders`, `copyWithGroupHeaders` | default |
| `cut` | NOT shown by default |
| `paste` | default; **disabled** if `suppressClipboardApi=true` or target cell not editable |
| `note` | when Notes enabled |
| `resetColumns` | NOT shown by default |
| `export` (sub-menu: `csvExport`+ `excelExport`) | default |
| `csvExport`, `excelExport` | default |
| `chartRange` | charting enabled |
| `pivotChart` | charting enabled **and** Pivot Mode |
| `pinRowSubMenu` (pinTop/pinBottom/unpinRow) | Row Pinning enabled |
| `pinTop`, `pinBottom` | Row Pinning enabled |
| `unpinRow` | pinned rows, Row Pinning enabled |
| `autoSizeAll`, `expandAll`, `contractAll` | NOT shown by default |

**Ctrl/Cmd key behavior.** Hold Ctrl/Cmd while right-clicking to fall back to the **browser** context menu; set `allowContextMenuWithControlKey=true` to always show the grid menu (§ Default Context Menu).

### 1.3 MenuItemDef shape (as consumed by LibreGrid)

From the menu package source and parity docs: `name`, `action`, `cssClasses` (`lgr-` prefix, G4), `disabled`, `tooltip`, `subMenu` (nested `MenuItemDef[]`), `icon`, `shortcut` (display only), `checked`, `suppressCloseOnSelect`. Custom items may return a `Promise` for async resolution (doc § Context Menu Example: "Country column uses a Promise").

### 1.4 States

Per native CSS (ag-grid.css) the menu option has three visual states:
- **default** — transparent background, `font-weight: 500` (Quartz).
- **hover / active (keyboard-highlight)** — `.ag-menu-option-active` = `var(--ag-row-hover-color)`.
- **disabled** — `opacity: 0.5` (`.ag-menu-option-disabled`).
- **focus-visible** — inset 1px outline in `var(--ag-input-focus-border-color)` (`.ag-menu-option:focus-visible::after`).
- **checked** — check glyph in the icon column; mutually exclusive with `icon`.

### 1.5 Positioning & clamping

- Native: the menu is "displayed inside a popup"; `postProcessPopup(params)` repositions it, and `popupParent` is the fix when a large menu is clipped inside a small grid — "the element must … cover the same area as the grid (or simply be a parent of the grid)" (both pages § Menu Popup / Popup Parent).
- LibreGrid delegates position+clamp to Community's `PopupService` (see §4); the column menu uses `position:'under', keepWithinBounds:true`, the context menu uses `positionPopupUnderMouseEvent`. LibreGrid menus open in a **body-level popup by default** (an app-set `popupParent` is honoured), so clamping applies to the viewport and menus can extend past the grid edge instead of being clipped at the grid's boundary.

### 1.6 Closing behavior

Native closes on: item selection, `Escape`, clicking outside, and `hidePopupMenu()` (both pages § API). LibreGrid: `popupSvc.addPopup({ modal:true, closeOnEsc:true })` provides outside-click + Esc; item select calls `hideActiveMenu()` unless `suppressCloseOnSelect`.

### 1.7 Keyboard navigation

The two permitted doc pages **do not document keyboard behavior**. LibreGrid implements (from source): ArrowUp/ArrowDown (wrap-around), Enter/Space (activate), Escape (close), initial focus to first enabled item, and focus return to the trigger on close. The Material renderer adds ArrowRight/ArrowLeft for submenu open/close.

**Not implemented / unspecified (gap):** Home/End (jump first/last), type-ahead (letter keys), arrow-key navigation into submenus in the default DOM renderer, and an explicit focus trap. Because no permitted source specifies these, treat them as open items to source from the WAI-ARIA menu pattern — not from enterprise observation (G2).

### 1.8 API / events

Column menu: `showColumnMenu(colKey)`, `showColumnChooser()`, `hideColumnChooser()`, `hidePopupMenu()`, `showColumnFilter()`, `hideColumnFilter()`; event `columnMenuVisibleChanged` ("Fires twice if switching between tabs") (§ Column Menu API / Events).
Context menu: `showContextMenu()`, `hidePopupMenu()`; event `contextMenuVisibleChanged` (§ Context Menu API / Events).

---

## 2. Visual spec — Quartz tokens (native enterprise look)

All tokens from `node_modules/ag-grid-community/styles/ag-theme-quartz.css` (light `.ag-theme-quartz` block) and structural metrics from `node_modules/ag-grid-community/styles/ag-grid.css`. Dark values from `.ag-theme-quartz-dark`.

### 2.1 Base tokens

| Token | Value | File / line |
|---|---|---|
| `--ag-active-color` | `#2196f3` | quartz.css:10 |
| `--ag-grid-size` | `8px` | quartz.css:75 |
| `--ag-icon-size` | `16px` | quartz.css:75 |
| `--ag-font-size` | `14px` | quartz.css:98 |
| `--ag-font-family` | `'IBM Plex Sans', -apple-system, …, sans-serif` | quartz.css:95 |
| `--ag-border-radius` | `4px` | quartz.css:67 |
| `--ag-borders` | `solid 1px` | quartz.css:66 |
| `--ag-card-radius` | `var(--ag-border-radius)` = 4px | ag-grid.css:1483 |
| `--ag-card-shadow` (light) | `0 1px 4px 1px rgba(186,191,199,0.4)` | quartz.css:102 |
| `--ag-card-shadow` (dark) | `0 1px 20px 1px black` | quartz.css:121 |
| `--ag-popup-shadow` (light) | `0 0 16px 0 rgba(0,0,0,0.15)` | quartz.css:103 |
| `--ag-menu-min-width` | `181px` (default, not overridden) | ag-grid.css:1478 |
| `--ag-tab-min-width` | `290px` (Quartz override) | quartz.css:100 |
| `--ag-icon-font-family` | `agGridQuartz` | quartz.css:99 |
| `--ag-icon-font-color` | `color-mix(transparent, fg 90%)` | quartz.css:26 |

### 2.2 Menu colors

| Token | Light value | Dark value | File / line |
|---|---|---|---|
| `--ag-menu-background-color` | `color-mix(bg, fg 3%)` | `color-mix(bg, fg 10%)` | quartz.css:33 / :129 |
| `--ag-menu-border-color` | `color-mix(transparent, fg 20%)` | `color-mix(transparent, fg 10%)` | quartz.css:34 / :130 |
| `--ag-row-hover-color` | `color-mix(transparent, active 12%)` | `color-mix(transparent, active 20%)` | quartz.css:36 / :125 |
| `--ag-input-focus-border-color` | `var(--ag-active-color)` | same | quartz.css:39 |
| `--ag-border-color` (separators) | `color-mix(transparent, fg 15%)` | `rgba(255,255,255,.16)` | quartz.css:13 / :115 |
| menu text color | `color-mix(transparent, fg 95%)` (via `.ag-menu`) | same | quartz.css:311-314 |

### 2.3 Menu geometry (derived from ag-grid.css + quartz overrides)

| Property | Value | Source |
|---|---|---|
| Menu container `.ag-menu` | `border-radius: var(--ag-card-radius)` = 4px; `border: solid 1px var(--ag-menu-border-color)`; `box-shadow: var(--ag-card-shadow)`; `background-color: var(--ag-menu-background-color)`; `padding: 0`; `max-height:100%`; `overflow-y:auto`; `user-select:none`; `position:absolute` | ag-grid.css:5490-5499, 2958-2966 |
| Menu list `.ag-menu-list` | `padding: var(--ag-grid-size) 0` = **8px 0**; `display:table; width:100%` | ag-grid.css:5505-5508, 2980-2983 |
| Option row `.ag-menu-option` | `display: table-row`; parts are `table-cell` | ag-grid.css:2985-2994 |
| Option part padding | `padding: calc(var(--ag-grid-size) + 2px) 0` = **10px 0**; `line-height: var(--ag-icon-size)` = 16px → **~36px row height** | ag-grid.css:5550-5554 |
| Icon column | `width: var(--ag-icon-size)` = 16px; **padding-left 12px** (Quartz overrides shared 16px to `grid-size*1.5`) | quartz.css:1054-1069 |
| Text | `padding-left/right: calc(var(--ag-grid-size) * 2)` = **16px**; `white-space:nowrap` | ag-grid.css:5578-5582, 2996-2998 |
| Shortcut | `padding-right: var(--ag-grid-size)` = **8px** (LTR) | ag-grid.css:5584-5587 |
| Submenu arrow (popup-pointer) | `padding-right: var(--ag-grid-size)` = **8px** (LTR); text-align right | ag-grid.css:5593-5596; quartz.css:307-310 |
| Separator | `height: calc(var(--ag-grid-size) * 2 + 1px)` = **17px**; 1px `border-top: var(--ag-borders-critical) var(--ag-border-color)` | ag-grid.css:5510-5518 |
| Disabled | `opacity: 0.5` | ag-grid.css:5556-5559 |
| Hover/active | `background-color: var(--ag-row-hover-color)` | ag-grid.css:5545-5548 |
| Focus-visible | inset 1px outline `var(--ag-input-focus-border-color)` via `::after` | ag-grid.css:5524-5539 |
| Option font | `font-weight: 500` (Quartz) | quartz.css:314-317 |
| Tab row `.ag-tab` | `padding: var(--ag-grid-size)` = 8px; selected bg `var(--ag-background-color)`; unselected `opacity:0.7` (→1 on hover); tabs header border-bottom 1px | quartz.css:272-307, 339-342 |
| Tabs header | `border-bottom: solid 1px var(--ag-border-color)`; bg `color-mix(transparent, fg 5%)` | quartz.css:339-342 |

**Icon rendering.** Native menu icons come from the `agGridQuartz` icon font (`--ag-icon-font-family`), sized `--ag-icon-size` (16px), colored `--ag-icon-font-color`. LibreGrid renders Unicode text glyphs instead (see §4 gap).

---

## 3. LibreGrid current state

Package `@libregrid/menu` (`packages/menu/src`).

| File | Role | Notes |
|---|---|---|
| `colMenuFactory.ts` | Column menu bean (`enterpriseMenuFactory`), builds items, opens popup, inline DOM fallback renderer | Precedence chain implemented (columnMenuItems → getColumnMenuItems → mainMenuItems → getMainMenuItems). Popup uses `popupSvc.positionPopupByComponent({position:'under', keepWithinBounds:true})`. Header right-click via `showMenuAfterContextMenuEvent`. **No tabs / `columnMenu` option / `menuTabs` handling.** Its inline `createMenuElement` renders only `item.name` — no icon/shortcut/checked/submenu/tooltip/cssClasses. |
| `contextMenuSvc.ts` | Context menu bean (`contextMenuSvc`), builds items, filters separators, opens popup, inline DOM fallback renderer | Inline `createMenuElement` renders icon/shortcut/checked(`lgr-menu-item-checked`)/tooltip/cssClasses and a submenu **arrow** + `aria-haspopup`, and **opens submenus** (hover, click, ArrowRight/Left; see OPEN-ACTIONS C3). Handles Ctrl+right-click (browser fallback) and `allowContextMenuWithControlKey`. Focus returns to trigger on close. |
| `menuCss.ts` | Inline CSS (`css: [menuCss]`) | Only injected by `ContextMenuModule` (see gap). Values differ from Quartz (see gap list). |
| `menuItemMapper.ts` | Name→MenuItemDef resolution via registry | Maps `subMenu` children recursively (string entries resolve through the registry; separators become sentinel `__separator__` items). |
| `menuItemRegistry.ts` + `registryApi.ts` | Extensibility point | Global store; feature packages call `registerMenuItem(s)` at module scope. |
| `defaultItems.ts` | Default item name arrays + built-in factories | Column: sort×3, pinSubMenu(stub), autoSizeThis/All, resetColumns, columnChooser, columnFilter. Context: copy/copyWithHeaders/copyWithGroupHeaders/paste/export. `pinSubMenu`, `rowGroup`-family, clipboard, export, `note`, `pinRowSubMenu` etc. are **stubs returning `null`** (hidden). Sort/auto-size/reset are real; `columnFilter` opens `filterPopup.ts`. |
| `filterPopup.ts` | Filter popup for the column-menu "Filter" item | Manual fixed-position popup; clamps `maxHeight` to viewport; uses `var(--ag-popup-shadow)` and hardcoded `borderRadius:6px`, `minWidth:240px`. |
| `menuRenderer.ts` | Renderer seam (`registerMenuRenderer`/`getMenuRenderer`) | Fallback = inline DOM. `@libregrid/material` registers an Angular Material renderer (`packages/material/src/materialMenuRenderer.ts`) that **does** open submenus (click + ArrowRight/Left) and shows a check `<mat-icon>`. |
| `columnMenuModule.ts` / `contextMenuModule.ts` | Module registration | `ColumnMenuModule` registers only `[ColumnMenuFactory]` and does **not** include `css:[menuCss]`; `MenuItemMapper` bean + the CSS are registered **only** by `ContextMenuModule`. |

**Already matching Quartz:** hover background token (`--ag-row-hover-color`), disabled `opacity:0.5`, menu `role="menu"`/`menuitem`/`separator` ARIA roles, Escape/outside-click close, focus-return-to-trigger, `getColumnMenuItems`/precedence chain, `suppressHeaderMenuButton/FilterButton/ContextMenu`, `getContextMenuItems`+async, `contextMenuItems` grid option, `showContextMenu`/column-menu APIs.

**Differs / missing (see §4 for the full gap list):** menu metrics (padding, radius, shadow, border color, min-width, separator geometry), focus ring, icon font, checked glyph, functional submenus in the default renderer, tabs/legacy format, column-menu inline renderer parity with context menu, `menuCss` wiring, `--ag-card-shadow`, animation/timing, Home/End/type-ahead.

---

## 4. Gap list (ordered by visual impact)

1. **Rewrite `menuCss.ts` against Quartz tokens.** Replace the hardcoded look with: menu `border: solid 1px var(--ag-menu-border-color)`, `background-color: var(--ag-menu-background-color)`, `border-radius: var(--ag-card-radius)`, `box-shadow: var(--ag-card-shadow)`, `padding:0`, `max-height:100%; overflow-y:auto; user-select:none`; list `padding:8px 0`; option part `line-height:16px; padding:10px 0`; icon `width:16px; padding-left:12px`; text `padding:0 16px`; shortcut `padding-right:8px`; separator `height:17px` + 1px top border; `min-width: var(--ag-menu-min-width)` (181px). (Highest impact — every menu pixel changes.)
2. **Fix `--ag-menu-min-width`**: currently hardcoded `180px`; use token (native = 181px).
3. **Fix shadow + radius**: currently `0 4px 12px rgba(0,0,0,.15)` / `4px` hardcoded; use `var(--ag-card-shadow)` and `var(--ag-card-radius)`.
4. **Fix menu background/border tokens**: currently `var(--ag-background-color)` / `var(--ag-border-color)`; should be `--ag-menu-background-color` / `--ag-menu-border-color` (both differ in Quartz).
5. **Add focus-visible ring**: inset 1px `var(--ag-input-focus-border-color)` (`::after`), matching `.ag-menu-option:focus-visible`. Currently focus shares the hover background only.
6. **Replace Unicode icons with the icon font / IconName**. Sort uses `↑`/ `↓`, submenu arrow `▶`, checked `✓`, filter arrow `›`. Native uses `agGridQuartz` (`--ag-icon-font-family`) at `--ag-icon-size` (16px), colored `--ag-icon-font-color`. Wire `MenuItemDef.icon` to the `IconName` registry instead of raw text.
7. **Implement functional submenus in the default DOM renderer.** Both `colMenuFactory.createMenuElement` and `contextMenuSvc.createMenuElement` need real submenu open/close (click + ArrowRight/Left), matching the Material renderer's behavior; currently the column-menu renderer omits the arrow entirely and the context renderer shows a dead `▶`.
8. **Bring the column-menu inline renderer to parity with the context-menu renderer**: add icon, shortcut, checked, tooltip, cssClasses, and separators (currently `textContent = item.name` only, and separators are filtered out in `buildColumnMenuItems`).
9. **Wire `menuCss` into `ColumnMenuModule`** and make `ColumnMenuModule` register (or depend on) `MenuItemMapper`. Today `ColumnMenuModule` alone has no CSS and no `menuItemMapper` bean (its `postConstruct` reads `beans.menuItemMapper`), so it only works if `ContextMenuModule` is also registered — despite the README implying either module works.
10. **Implement the tabbed (legacy) column menu** (`columnMenu='legacy'` + `menuTabs`): general/filter/columns tabs with the Quartz tab row (8px padding, selected bg `var(--ag-background-color)`, unselected opacity 0.7, 1px bottom border), min-width `--ag-tab-min-width` (290px). Currently ignored.
11. **Checked/radio semantics**: render `checked` as a check icon in the icon column (respecting "checked ignores icon"), not a `::before '✓'`; add `aria-checked` and `role="menuitemcheckbox|menuitemradio"` for a11y.
12. **Keyboard parity**: add Home/End and type-ahead (needs a source decision per G2 — not specified in the permitted docs); ensure ArrowLeft/Right open/close submenus in the default renderer.
13. **Right-click on empty header space** ("choose/reset columns" menu) is not implemented (only per-column header context menu).
14. **`filterPopup.ts` metrics**: hardcoded `borderRadius:6px` / `minWidth:240px` vs native filter-popup tokens; use `--ag-card-radius` and the filter panel `min-width: calc(var(--ag-menu-min-width) - 2px)` (ag-grid.css:5781-5783). Note `--ag-popup-shadow` is correct here (not `--ag-card-shadow`).
15. **Animation/timing**: native Quartz has no menu open animation (tabs only use a `--ag-selected-tab-underline-transition-speed` underline that is 0-width by default); LibreGrid adds none — acceptable, but any added transition should be opt-in and token-driven.

---

## 5. Citations

**Docs (server-rendered; text extracted in full):**
- Column Menu — https://www.ag-grid.com/angular-data-grid/column-menu/ (§ intro; Customising the Column Menu; Customising the Menu Items; Legacy Column Menu Properties; Built-In Menu Items; Menu Item Separators; Customising the Column Chooser; Column Menu API / Events; Menu Popup; Legacy Tabbed Column Menu)
- Context Menu — https://www.ag-grid.com/angular-data-grid/context-menu/ (§ intro; Configuring the Context Menu; Built In Menu Items; Default Context Menu; Hiding the Context Menu; Context Menu Example; Popup Parent; Context Menu API / Events)

**Quartz theme CSS (on disk, MIT):**
- `node_modules/ag-grid-community/styles/ag-theme-quartz.css` — `.ag-theme-quartz` token block (lines 8-110), dark block (112-140), menu-option icon override (1054-1070), tab styles (272-342), `.ag-menu` text color (311-314).
- `node_modules/ag-grid-community/styles/ag-grid.css` — `.ag-menu` container (5490-5499), `.ag-menu-list` (5505-5508), separator (5510-5518), option/part/disabled/hover/focus (5520-5559), icon/text/shortcut/popup-pointer (5565-5600), tabs (5602-5659), default params `--ag-menu-min-width:181px` (1478), `--ag-card-radius` (1483), `--ag-tab-min-width:220px` default (1476), `.ag-menu` structural table layout (2958-3008).

**LibreGrid source:**
- `packages/menu/src/menuCss.ts`, `colMenuFactory.ts`, `contextMenuSvc.ts`, `menuItemMapper.ts`, `defaultItems.ts`, `filterPopup.ts`, `menuItemRegistry.ts`, `registryApi.ts`, `menuRenderer.ts`, `columnMenuModule.ts`, `contextMenuModule.ts`, `menuUtils.ts`.
- `packages/material/src/materialMenuRenderer.ts` — alternate Angular Material renderer (submenu + checked reference).
- `docs/parity/column-menu.md`, `docs/parity/context-menu.md` — current parity matrix.

**Not extracted / not specified:** keyboard navigation details (type-ahead, Home/End, submenu keys) and focus-trap semantics are absent from both permitted doc pages; no permitted source specifies them, so they are recorded as open items above (G2 — not to be resolved by observing enterprise).
