# Design Spec — Tool Panel & Quick Access Toolbar (UX Pass 1)

> Status: research complete. Drives the UI/UX pass for `@libregrid/side-bar`,
> `@libregrid/columns-tool-panel`, `@libregrid/filters-tool-panel`, `@libregrid/find`,
> and the **missing** Quick Access Toolbar surface.
> Sources: ag-grid.com docs (server-rendered, extracted in full) + Quartz theme CSS on disk
> (`ag-theme-quartz.css`, `ag-grid.css`) + LibreGrid source. No enterprise binary consulted (G1/G2).
> Companion audit: `docs/design/ux-4-current-state-audit.md` (defect inventory this spec turns into a plan).

---

## 1. Behavior spec

### 1.1 Side bar — structure, tabs, states

**Role.** "Tool Panels are panels that sit in the Side Bar to the right of the grid. The Side Bar
allows access to the tool panels via buttons that work like tabs" (https://www.ag-grid.com/angular-data-grid/tool-panel/ § Overview). Default position is **right**; `position: 'left' | 'right'` relocates it (https://www.ag-grid.com/angular-data-grid/side-bar/ § SideBarDef Configuration).

**Config forms** for the `sideBar` grid option (https://www.ag-grid.com/angular-data-grid/side-bar/ § Configuring the Side Bar):
| Form | Meaning |
|---|---|
| `undefined / null` | no side bar |
| `boolean` | `true` = default side bar (Columns + Filters panels, **Columns open by default**) |
| `string / string[]` | `'columns'`, `'filters'`, `'filters-new'` (one or several) |
| `SideBarDef` | long form (detailed below) |

**SideBarDef** (https://www.ag-grid.com/angular-data-grid/side-bar/ § SideBarDef Configuration):
`toolPanels` (`(ToolPanelDef | string)[]`), `defaultToolPanel` (string id, else closed initially),
`hiddenByDefault` (bool), `position` (`'left' | 'right'`), `hideButtons` (bool — panel without tab buttons).

**ToolPanelDef** (same section): `id`, `labelKey`, `labelDefault`, `iconKey`,
`minWidth` (default **100**), `maxWidth`, `width` (default **$side-bar-panel-width** = the
`--ag-side-bar-panel-width` theme var), `toolPanel` (component), `toolPanelParams`, `parent` (`HTMLElement | null`).

**Tabs.** Each `toolPanels` entry renders one tab button (icon + label); clicking opens that panel,
clicking the open panel's tab closes it (toggle). `defaultToolPanel` opens a panel on init.

**External panel host** (https://www.ag-grid.com/angular-data-grid/side-bar/ § Tool Panel Parent):
`ToolPanelDef.parent` (or `openToolPanel(id, parent)`) moves the panel outside the side bar. The
parent element **must** include the `ag-tool-panel-external` class ("include the ag-tool-panel-external
class when setting the parent class"), and `popupParent` must contain both the parent and the grid.

**Animation** (https://www.ag-grid.com/angular-data-grid/side-bar/ § Animation): panels open/close
instantly by default; `sideBarPanelAnimationDuration` (theme param, seconds) enables a slide animation
that is "automatically disabled for users who have requested reduced motion".

**API / events** (https://www.ag-grid.com/angular-data-grid/tool-panel/ § API / § Events and
https://www.ag-grid.com/angular-data-grid/side-bar/ § Side Bar API):
`getSideBar()`, `setSideBarVisible()`, `isSideBarVisible()`, `setSideBarPosition()`,
`openToolPanel(id, parent?)`, `closeToolPanel()`, `getOpenedToolPanel()`, `isToolPanelShowing()`,
`refreshToolPanel()`, `getToolPanelInstance(id)`. Events: `toolPanelVisibleChanged`
("Fires twice if switching between panels — once with the old panel and once with the new panel"),
`toolPanelSizeChanged` ("The tool panel size has been changed").

**States:** closed / open(tab selected) / resizing. Selected tab is distinguished visually (see §2.3);
`hideButtons=true` + no open panel ⇒ "Calling `setSideBarVisible(true)` … will not display anything"
(https://www.ag-grid.com/angular-data-grid/side-bar/ § SideBarDef Configuration).

### 1.2 Provided tool panels

Three panels ship (https://www.ag-grid.com/angular-data-grid/tool-panel/ § Provided Tool Panels):
- **Columns Tool Panel** — "to control aggregations, grouping and pivoting".
- **Filters Tool Panel** — "to perform multiple column filters".
- **New Filters Tool Panel** — "a redesigned version … that provides improved UX".

Custom panels via the `toolPanel` component (https://www.ag-grid.com/angular-data-grid/tool-panel/ § Custom Tool Panels).

### 1.3 Columns tool panel — structure & interactions

**Sections, top→bottom** (https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ § Columns Tool Panel Sections):
1. **Top area** (title + search + select-all + expand/collapse-all controls).
2. **Pivot Mode Section** — toggle to enter/exit pivot mode.
3. **Expand / Collapse All** — toggle all column groups.
4. **Columns Section** — "displays all columns, grouped by column groups … order kept in sync with
   the order they are shown in the grid" (disable via `suppressSyncLayoutWithGrid`); per-column
   **Select/Unselect** checkbox, group checkbox (indeterminate when mixed), and a **Drag Handle**.
5. **Row Groups Section**, **Values Section**, **Column Labels (Pivot) Section** — drop targets.
6. **Context menu** — right-click a column/group label.

**Selection action semantics** (https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ § Selection Action):
- Pivot mode **off**: selecting toggles column **visibility** (selected = visible).
- Pivot mode **on**: selecting "trigger[s] the column to be either aggregated, grouped or pivoted
  depending on what is allowed for that column".

**Drag affordances** (https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ § Columns Tool Panel Sections):
each column has a **drag handle** ("dragged either with the mouse or via touch on touch devices") and can be
dropped onto **Row Groups**, **Values**, **Column Labels**, **onto the grid** (only when
`allowDragFromColumnsToolPanel=true`), or **inside the Columns Section to reorder**.

**Suppression / section visibility** (https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ § Section Visibility):
`suppressColumnMove`, `suppressRowGroups`, `suppressValues`, `suppressPivots`,
`suppressPivotMode`, `suppressColumnFilter`, `suppressColumnSelectAll`,
`suppressColumnExpandAll`, `contractColumnSelection` ("By default, column groups start expanded.
Pass true to default to contracted groups"), `suppressSyncLayoutWithGrid`, `buttons`
(`'apply'` enables deferred updates). Runtime: `setPivotModeSectionVisible`,
`setRowGroupsSectionVisible`, `setValuesSectionVisible`, `setPivotSectionVisible`. ColDef
`suppressColumnsToolPanel` hides a column/group.

**Deferred updates** (https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ § Deferred Updates):
`buttons: ['cancel','apply']` stages changes; Apply commits in one operation; Cancel discards.
"Changes made outside the Columns Tool Panel … are applied immediately and clear any pending changes."

**Context menu items** (https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ § Built-In Menu Items):
`scrollIntoView` (hidden while pivoting or pinned), `rowGroup` ("Group by"/"Un-Group by", when
`enableRowGroup`), `value` ("Add to values"/"Remove from values", when `enableValue`),
`pivot` ("Add to labels"/"Remove from labels", pivot mode + `enablePivot`). With
`functionsReadOnly` these are hidden (§ Read Only Functions).

**Styling** (https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ § Styling Columns):
`colDef.toolPanelClass` (string | string[] | callback) applied to leaf rows.

**API** (https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ § Expand / Collapse Column Groups, § Custom Column Layout):
`expandColumnGroups(groupIds?)`, `collapseColumnGroups(groupIds?)`, `setColumnLayout(colDefs)`,
`syncLayoutWithGrid()`, `getState()` (returns `expandedGroupIds`; consumes `initialState.expandedGroupIds`).

### 1.4 Filters tool panel — structure & interactions

**Content** (https://www.ag-grid.com/angular-data-grid/tool-panel-filters/ § intro): lists columns
that **have filters**; "Clicking on a column … will show the filter below the column name. Clicking a
second time will hide the filter again"; "Columns with filters active will have the filter icon appear
beside the filter name".

**Suppression** (https://www.ag-grid.com/angular-data-grid/tool-panel-filters/ § Suppress Options):
`suppressExpandAll`, `suppressFilterSearch`, `suppressSyncLayoutWithGrid`;
`colDef.suppressFiltersToolPanel` hides a column/group.

**v34 redesign** (per `docs/parity/filters-tool-panel.md`): card-based panel with per-column
**filter-type configuration** (Simple / Selection / Combo) and global **Apply / Clear / Reset / Cancel**.

**API** (https://www.ag-grid.com/angular-data-grid/tool-panel-filters/ § Expand / Collapse Filters, § Custom Filters Layout):
`expandFilterGroups(groupIds?)`, `collapseFilterGroups(groupIds?)`, `expandFilters(colIds?)`,
`collapseFilters(colIds?)`, `setFilterLayout(colDefs)`.

### 1.5 Quick Access Toolbar — structure & items

**Where it renders.** "The Toolbar appears above the grid" (https://www.ag-grid.com/angular-data-grid/toolbar/ § intro) — a full-width bar above the header row.

**Config.** `toolbar` grid option → `Toolbar` object with `items: (string | ToolbarItem)[]` accepting built-in item names, Action Buttons, and Custom Components (https://www.ag-grid.com/angular-data-grid/toolbar/ § Configuring the Toolbar).

**Alignment** (https://www.ag-grid.com/angular-data-grid/toolbar/ § Alignment): "Toolbar items are aligned to the left by default. Set the `alignment` property … to change the default alignment for all items, or set it individually per item." `'right'` items are pushed via a flex auto-margin (native `.ag-toolbar-right-start`, §2.4).

**Built-in items** (https://www.ag-grid.com/angular-data-grid/toolbar/ § Built-in Items):
| Item | Description | Required Module |
|---|---|---|
| `agQuickFilterToolbarItem` | "Text input that filters grid rows using the Quick Filter." | `QuickFilterModule` |
| `agFindToolbarItem` | "Text input that searches within grid cells using Find." | `FindModule` |
| `agRowGroupPanelToolbarItem` | "Embeds the Row Group Panel." | `RowGroupingPanelModule` |
| `agPivotPanelToolbarItem` | "Embeds the Pivot Panel." | `RowGroupingPanelModule` |
| `agMenuToolbarItem` | "Button that opens a dropdown menu." | `ContextMenuModule` or `ColumnMenuModule` |
| `separator` | "Vertical divider used to group items visually. Has no behaviour of its own." | none |

These four camelCase names are **mandatory registrations** (G4.1a — `ToolbarItemComponentName` union,
`docs/reference/guardrails.md:87`); they are config keys, not CSS.

**Row group + pivot panels in the toolbar** (https://www.ag-grid.com/angular-data-grid/toolbar/ § Row Group and Pivot Panels): "Both panels are configured independently of the Row Group Panel and the Pivot Panel, so you can display each panel in the Toolbar, above the grid, or both at the same time."

**Dropdown menus** (https://www.ag-grid.com/angular-data-grid/toolbar/ § Dropdown Menus):
`label` ("Omit to render an icon-only button"), `icon`, `tooltip` ("Hover tooltip and aria-label. Falls back to label"), `toolbarItemParams.menuItems` (MenuItemDef or built-in names).

**Action buttons** (https://www.ag-grid.com/angular-data-grid/toolbar/ § Action Buttons):
`label`, `icon`, `tooltip`, `action(params)` — "Callback fired on click. Receives the grid api, context, and the item key."

**Custom components** (https://www.ag-grid.com/angular-data-grid/toolbar/ § Custom Components):
`IToolbarItemAngularComp` with `agInit(params)` (mandatory) + optional `refresh(params): boolean`; provided by **string** (registered name) or **component reference**; `toolbarItemParams` reachable via `params.toolbarItemParams`.

**Theme parameters** (https://www.ag-grid.com/angular-data-grid/toolbar/ § Theme Parameters):
`toolbarBackgroundColor` ("Defaults to the header background colour"), `toolbarTextColor`
("Defaults to the header text colour"), `toolbarSeparatorBorder` ("Border style for the vertical separator").

**API** (https://www.ag-grid.com/angular-data-grid/toolbar/ § Accessing Toolbar Items):
`getToolbarItemInstance(key)` — "Only toolbar items configured with a key can be accessed." `IToolbarItemParams` carries `key`, `alignment`, `toolbarItemParams`, `label`, `tooltip`, `icon`, `action`, `api`, `context`.

### 1.6 Toolbar states & overflow (from native CSS, MIT `ag-grid.css`)

- **Default** — transparent button, `color: var(--ag-toolbar-text-color)`, no border, `line-height:1`.
- **Hover** — the *wrapper* (not the button) gets `background-color: var(--ag-icon-button-hover-background-color)` and re-colors the button + icon (ag-grid.css:7831-7839).
- **Focus-visible** — `box-shadow: var(--ag-input-focus-box-shadow)`; `:focus:not(:focus-visible)` = `box-shadow:none` (ag-grid.css:7849-7855).
- **Disabled** — `opacity:0.5; cursor:default; pointer-events:none` (ag-grid.css:7857-7861).
- **Separator** — vertical 1px line (ag-grid.css:7951-7955).
- **Responsive/overflow** — `.ag-toolbar { overflow: auto hidden; white-space: nowrap; scrollbar-width: thin }` (ag-grid.css:7781-7794): items **never wrap**; they scroll horizontally with a thin scrollbar.

### 1.7 Keyboard & a11y

The permitted docs **do not document** side-bar/toolbar keyboard behavior beyond:
- Side bar buttons are tab-like controls with an active/selected state.
- Native CSS defines **focus-visible rings** for side buttons (ag-grid.css:5885-5893) and toolbar buttons (ag-grid.css:7849-7855).

LibreGrid already emits `role=tablist`/`tab`/`tabpanel` and `aria-expanded` on side buttons
(`sideBarComponent.ts`), and `role=tree`/`treeitem`/`aria-level`/`aria-expanded` on the columns list
(`columnsToolPanel.ts`). **Gaps that need a source decision (G2):** roving-focus/arrow-key tree traversal,
Home/End/type-ahead in the search boxes and lists, and a focus trap for the column chooser. Do **not** resolve
these by observing enterprise; source them from the WAI-ARIA tree/accordion patterns.

---

## 2. Visual spec — Quartz tokens (native enterprise look)

Light values from `node_modules/ag-grid-community/styles/ag-theme-quartz.css` (`.ag-theme-quartz` block,
lines 8-109); structural metrics from `node_modules/ag-grid-community/styles/ag-grid.css`. Dark values from
`.ag-theme-quartz-dark` (lines 113-155).

### 2.1 Base tokens

| Token | Value | Source |
|---|---|---|
| `--ag-active-color` | `#2196f3` | quartz.css:10 |
| `--ag-background-color` | `#fff` | quartz.css:11 |
| `--ag-foreground-color` | `#181d1f` | quartz.css:12 |
| `--ag-grid-size` | `8px` | quartz.css:74 |
| `--ag-icon-size` | `16px` | quartz.css:75 |
| `--ag-font-size` | `14px` | quartz.css:98 |
| `--ag-font-family` | `'IBM Plex Sans', …` | quartz.css:95 |
| `--ag-border-radius` | `4px` | quartz.css:67 |
| `--ag-wrapper-border-radius` | `8px` | quartz.css:68 |
| `--ag-borders` | `solid 1px` | quartz.css:66 |
| `--ag-header-height` | `calc(font-size + grid-size*4.25)` = **48px** | quartz.css:76 |
| `--ag-row-height` | `calc(font-size + grid-size*3.5)` = **42px** | quartz.css:77 |
| `--ag-list-item-height` | `calc(icon-size + widget-vertical-spacing)` = **24px** | quartz.css:79-80 |
| `--ag-card-shadow` (light) | `0 1px 4px 1px rgba(186,191,199,0.4)` | quartz.css:102 |
| `--ag-popup-shadow` (light) | `0 0 16px 0 rgba(0,0,0,0.15)` | quartz.css:103 |
| `--ag-side-bar-panel-width` | **250px** | quartz.css:104 |
| `--ag-tab-min-width` | `290px` | quartz.css:100 |
| `--ag-icon-font-family` | `agGridQuartz` | quartz.css:99 |

Derived: `--ag-widget-container-vertical-padding` = `grid-size*1.5` = 12px (L88),
`--ag-widget-container-horizontal-padding` = 12px (L89), `--ag-widget-horizontal-spacing` = 12px (L90),
`--ag-widget-vertical-spacing` = `grid-size*1` = 8px (L91).

### 2.2 Panel / chrome colors

| Token | Light | Dark | Source |
|---|---|---|---|
| `--ag-header-background-color` | `color-mix(bg, fg 2%)` | `color-mix(#fff, #182230 93%)` | quartz.css:15 / :117 |
| `--ag-control-panel-background-color` | `var(--ag-header-background-color)` | same pattern | quartz.css:17 / :119 |
| `--ag-panel-background-color` | `color-mix(bg, fg 3%)` | `color-mix(bg, fg 10%)` | quartz.css:31 / :127 |
| `--ag-panel-border-color` | `color-mix(transparent, fg 20%)` | `color-mix(transparent, fg 10%)` | quartz.css:32 / :128 |
| `--ag-menu-background-color` | `color-mix(bg, fg 3%)` | — | quartz.css:33 |
| `--ag-menu-border-color` | `color-mix(transparent, fg 20%)` | — | quartz.css:34 |
| `--ag-border-color` | `color-mix(transparent, fg 15%)` | `rgba(255,255,255,.16)` | quartz.css:13 / :115 |
| `--ag-secondary-border-color` | `var(--ag-border-color)` | `color-mix(transparent, fg 10%)` | quartz.css:14 / :116 |
| `--ag-selected-row-background-color` | `color-mix(transparent, active 8%)` | `var(--ag-row-hover-color)` | quartz.css:35 / :126 |
| `--ag-row-hover-color` | `color-mix(transparent, active 12%)` | `color-mix(transparent, active 20%)` | quartz.css:36 / :125 |
| `--ag-column-hover-color` | `color-mix(transparent, fg 5%)` | — | quartz.css:37 |
| `--ag-icon-button-hover-background-color` | `color-mix(transparent, fg 10%)` | — | quartz.css:38 |
| `--ag-chip-background-color` | `color-mix(transparent, fg 7%)` | — | quartz.css:57 |
| `--ag-chip-border-color` | `color-mix(header-bg, fg 13%)` | — | quartz.css:58 |
| `--ag-side-button-selected-background-color` | `transparent` | — | quartz.css:70 |
| `--ag-filter-panel-apply-button-color/bg` | `background-color` / `active-color` | — | quartz.css:105-106 |
| `--ag-column-panel-apply-button-color/bg` | `background-color` / `active-color` | — | quartz.css:107-108 |

### 2.3 Side bar geometry (native)

| Property | Value | Source |
|---|---|---|
| Side bar container | `background-color: var(--ag-control-panel-background-color)`; `min-width: calc(icon-size + grid-size*2)` = **32px** | quartz.css:345-348 |
| Button strip `.ag-side-buttons` | `padding:0`; `width: calc(icon-size + grid-size*2)` = **32px**; `background: var(--ag-control-panel-background-color)` | quartz.css:351-357 |
| Strip padding-top (shared) | `calc(grid-size * 4)` = **32px** | ag-grid.css:5859-5860 |
| Side button | `min-height: calc(grid-size*18)` = **144px**; `padding: grid-size*2 0` = **16px 0**; full width; `background: transparent`; `border-top/bottom: var(--ag-borders-side-button) var(--ag-border-color)` | ag-grid.css:5867-5884 |
| Button layout | vertical: icon (`.ag-side-button-icon-wrapper`, `margin-bottom:3px`) over label (`.ag-side-button-label`) | ag-grid.css:5910-5912, 3319 |
| Selected tab | `.ag-side-button.ag-selected` → `background-color: var(--ag-background-color)` + `border-bottom-color: var(--ag-border-color)` (and top border on 2nd+); base `--ag-side-button-selected-background-color` is `transparent` | quartz.css:373-382, 70 |
| Selected underline | `border-left/right: var(--ag-selected-tab-underline-width) solid var(--ag-selected-tab-underline-color)`; Quartz `--ag-selected-tab-underline-width:0` | ag-grid.css:5914-5949, 1389-1391 |
| Focus ring | `:focus-visible::after` inset `1px` `var(--ag-input-focus-border-color)`, inset 4px | ag-grid.css:5885-5893 |
| Side bar outer border | `border-right` (left-positioned) / `border-left` (right-positioned) `var(--ag-borders) var(--ag-border-color)` | ag-grid.css:5914-5949 |

### 2.4 Toolbar tokens & geometry (native, MIT `ag-grid.css`)

**Tokens** (ag-grid.css:1347-1350):
| Token | Value |
|---|---|
| `--ag-toolbar-background-color` | `var(--ag-header-background-color)` |
| `--ag-toolbar-text-color` | `var(--ag-foreground-color)` (= header foreground) |
| `--ag-toolbar-separator-color` | `var(--ag-border-color)` |
| `--ag-toolbar-separator-width` | `1px` |

**Metrics** (ag-grid.css:7781-7999):
| Property | Value | Source |
|---|---|---|
| `.ag-toolbar` | `display:flex; align-items:center; overflow:auto hidden; scrollbar-width:thin; border-bottom: var(--ag-borders) var(--ag-border-color); min-height: var(--ag-header-height)` = 48px; header font family/size; `white-space:nowrap` | 7781-7794 |
| Right alignment | `.ag-toolbar-right-start { margin-inline-start:auto }` | 7795-7797 |
| Item spacing | `.ag-toolbar-item { margin: 0 calc(grid-size*2) }` = **0 16px** | 7799-7806 |
| Button wrapper | `padding: calc(grid-size*0.25)` = 2px; `height:100%` | 7808-7812 |
| Button | `gap: grid-size` = 8px; `padding: grid-size` = 8px; transparent; `line-height:1`; header font; `outline:none` | 7814-7830 |
| Hover | wrapper `background-color: var(--ag-icon-button-hover-background-color)`; button+icon recolor | 7831-7839 |
| First/last button radius | `calc(var(--ag-border-radius) + 1px)` = **5px** (start-start / end-end) | 7841-7847 |
| Focus | `box-shadow: var(--ag-input-focus-box-shadow)` | 7849-7855 |
| Disabled | `opacity:.5; pointer-events:none` | 7857-7861 |
| Input (quick filter) | `.ag-toolbar-input { min-width:200px; margin: 0 calc(grid-size*2) }`; field `padding-block: grid-size*0.5` = 4px, `padding-inline: calc(icon-size + grid-size*2) grid-size` = **32px 8px**; `border: var(--ag-borders-input); border-radius: var(--ag-border-radius)` = 4px | 7867-7908 |
| Input focus | `box-shadow: var(--ag-input-focus-box-shadow); border: var(--ag-borders-input) var(--ag-input-focus-border-color)`; placeholder `var(--ag-disabled-foreground-color)` | 7923-7930 |
| Input icon | `position:absolute; inset-inline-start: grid-size` = 8px; `opacity:.5` | 7890-7896 |
| Find box | `.ag-toolbar-find { gap: grid-size*0.5` = 4px; `width:280px; min-width:220px; border: var(--ag-borders-input) var(--ag-input-border-color); border-radius: var(--ag-border-radius); background: var(--ag-background-color) }`; `focus-within` = focus shadow; nested input transparent/no border | 7957-7981 |
| Find match count | `opacity:.7; font-variant-numeric: tabular-nums; text-align:end` | 7982-7994 |
| Find button | `padding: calc(grid-size*0.5)` = 4px | 7996-7999 |
| Separator | `align-self:stretch; width:0; margin: calc(grid-size*1.75) 0` = **14px 0**; `border-inline-start: solid var(--ag-toolbar-separator-width) var(--ag-toolbar-separator-color)` | 7951-7955 |
| Embedded drop panel | `.ag-toolbar-panel { flex:1 0 0 }`; `.ag-toolbar .ag-column-drop-horizontal { background:transparent; border-bottom:none }` | 7863-7865, 7932-7944 |

### 2.5 Drop zones / pills / empty states (native)

| Property | Value | Source |
|---|---|---|
| Drop cell (pill) | `border-radius: calc(grid-size*3)` = **24px**; `height: calc(grid-size*3)` = **24px**; `padding: 0 grid-size` = 0 8px | quartz.css:743-748 |
| Drop cell text | `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` | ag-grid.css:6784-6787 |
| Drop cell focus | `:focus-visible::after` ring | ag-grid.css:6767-6773 |
| Vertical drop zone | `min-height:75px` | quartz.css:761-765 |
| Drop zone title bar | `padding: 12px 16px 0` (widget-container-vertical-padding / grid-size*2) | quartz.css:766-770 |
| **Empty message** | `border: dashed 1px var(--ag-border-color); margin: calc(grid-size*1.5) calc(grid-size*2)` = **12px 16px**; `padding: calc(grid-size*2)` = **16px**; centered | quartz.css:781-790 |
| Empty message color | `var(--ag-foreground-color)` (not opacity-dimmed) | quartz.css:792-795 |

### 2.6 Inputs / search

| Property | Value | Source |
|---|---|---|
| Text input | `min-height: calc(grid-size*4)` = 32px; `border-radius: var(--ag-border-radius)` = 4px; `padding: 1px grid-size 2px grid-size` | quartz.css:238-247 |
| Focus ring | `--ag-input-focus-box-shadow: 0 0 0 3px color-mix(transparent, var(--ag-input-focus-border-color) 47%)` | quartz.css:41 |
| Focus border | `--ag-input-focus-border-color: var(--ag-active-color)` | quartz.css:39 |
| Disabled | `--ag-disabled-foreground-color: color-mix(transparent, fg 50%)` | quartz.css:56 |
| Find highlight | `--ag-find-match-background-color:#ffff00`; `--ag-find-active-match-background-color:#ffa500` | quartz.css:28, 30 |
| Apply button | white text on `--ag-active-color` (`--ag-column/filter-panel-apply-button-color/background-color`) | quartz.css:105-108 |

---

## 3. LibreGrid current state

### 3.1 `@libregrid/side-bar` (`packages/side-bar/src`)

| File | Role | Assessment |
|---|---|---|
| `sideBarComponent.ts` | `ISideBar` shell: template `.lgr-side-bar` (+ `.lgr-side-bar-buttons`, `.lgr-side-bar-resize-handle`, `.lgr-side-bar-panel`) | Implements `role=tablist/tab/tabpanel`, `aria-expanded`, resize via pointer events with `minWidth`/`maxWidth` clamp. **Mismatches:** renders `panel.labelDefault` as `textContent` in the button (iconKey parsed but never rendered); default width `200` (vs `--ag-side-bar-panel-width:250px`); max width hard-capped 500px (native has no default max). |
| `sideBarCss.ts` | Inline CSS | **Differs from Quartz:** strip uses `--ag-chrome-background-color` fallback `#f8f8f8` (a legacy Alpine token, not in Quartz) instead of `--ag-control-panel-background-color`; 32×32 buttons (native: 32px-wide × 144px-tall icon+label); selected = `--ag-selected-row-background-color` (native: `--ag-background-color` + top/bottom border); no `:focus-visible` ring. |
| `sideBarRenderer.ts` | Renderer seam (plugin point) | `@libregrid/material` registers `materialSideBarRenderer.ts`; the default DOM renderer is the component itself. |

**Already matches:** all `SideBarDef`/API/event semantics (per `docs/parity/side-bar.md`, audited 2026-08-14 with no open rows); resize honors min/max; `aria-expanded` on buttons.

### 3.2 `@libregrid/columns-tool-panel` (`packages/columns-tool-panel/src`)

| File | Role | Assessment |
|---|---|---|
| `columnsToolPanel.ts` | `IColumnToolPanel` — tree, search, select-all, function sections, deferred buttons | Full semantics (per `docs/parity/columns-tool-panel.md`). **Now native-styled:** header row with a painted select-all checkbox (`lgr-checkbox`, indeterminate when mixed) beside a search input with a leading search icon and `Search...` placeholder; pivot mode rendered as a labeled switch (`lgr-toggle`) directly under the header; 24px list rows with 24px-per-level indentation; pin/move controls are icon buttons revealed on hover; rows carry a grip drag handle; function-section members are pills (`lgr-chip`) with icon-only remove controls; empty sections show the native dashed message (`Drag here to set row groups` / `Drag here to aggregate` / `Drag here to set column labels`); drop zones highlight while dragging over. |
| `columnsToolPanelCss.ts` | Inline CSS | Native metrics: `--ag-list-item-height` rows, `--ag-column-select-indent-size` indentation, dashed empty boxes (12px/16px margin, 16px padding), `--ag-modal-overlay-background-color` overlay, `--ag-popup-shadow` dialog. |
| `rowGroupingPanel.ts` + `rowGroupDropZone.ts` + `pivotDropZone.ts` | Standalone header row-group/pivot panel + drop zones | Members are pills (`lgr-chip`, native 24px radius via core) with icon remove buttons and a drag-over highlight; empty state shows a dashed affordance. |
| `rowGroupingPanelCss.ts` | Inline CSS | Pill metrics now come from the shared `lgr-chip` core styles (radius `grid-size*3`). |
| `rowGroupPanelBuilder.ts` | `_IRowGroupPanelBuilder` bean | Already exposes `createRowGroupDropZone(horizontal, embedded)` / `createPivotDropZone(horizontal, embedded)` — **this is the seam `agRowGroupPanelToolbarItem`/`agPivotPanelToolbarItem` should reuse** (embedded horizontal drop zones). |

**Already matches:** all `IColumnToolPanel` API, suppression params, deferred updates, search-scoped select-all, indeterminate group checkbox, keyboard alternative to drag, material drag adapter, column chooser (per parity doc). Shared control styling (`lgr-button`/`lgr-text-button`/`lgr-icon-button`/`lgr-input`/`lgr-chip`/`lgr-checkbox`/`lgr-toggle`) lives in `@libregrid/core`'s `coreCss.ts` and drives hover/focus/active/disabled states from `--ag-*` tokens.

### 3.3 `@libregrid/filters-tool-panel` (`packages/filters-tool-panel/src`)

| File | Role | Assessment |
|---|---|---|
| `filtersToolPanel.ts` | `IFiltersToolPanel` + `INewFiltersToolPanel` card panel | Semantics complete (per parity doc). **Native v34 card anatomy + real filters:** each card has a header row — an expand button holding the title (active-filter dot when applied) and a chevron, plus an icon-only delete — and a body that embeds the column's **actual filter UI**: LibreGrid's Set Filter is constructed directly with a real grid-apply path (its own Apply/Clear/Cancel buttons from `filterParams.buttons`, or immediate apply without them), and community text/number/date/multi filters mount through `getColumnFilterInstance`. Filtering from the panel updates the grid (verified 40→34 rows on the demo). Cards are reused across renders; active state follows the grid model via `filterChanged`. Also re-renders when the grid loads columns after panel creation. |
| `filtersToolPanelCss.ts` | Inline CSS | Native card metrics: border `--ag-border-color`, radius `--ag-border-radius`, surface `--ag-background-color`, header padding-top 8px, heading 12px/4px padding, delete icon 16px with 12px end margin, 12px panel padding/gap; Apply uses `--ag-filter-panel-apply-button-*`. |

### 3.4 `@libregrid/find` (`packages/find/src`)

| File | Role | Assessment |
|---|---|---|
| `findService.ts` | `findSvc` bean + `IFindService` | Full Find API (per `docs/parity/find.md`): `next/previous/goTo/getParts/refresh`, wrap-around, scroll-to-match, `findChanged` event. |
| `findCellRenderer.ts` | `agFindCellRenderer` — match highlighting | Renders `.lgr-find-match` / `.lgr-find-match-active` spans. |
| `findCss.ts` | Inline CSS | **One minified line**; fallbacks `#ffe082`/`#ff9800` differ from Quartz `#ffff00`/`#ffa500` (ag-theme-quartz.css:28,30); active match uses `outline:1px solid currentColor`. |

### 3.5 Quick Access Toolbar — **absent**

- **No `ToolbarModule`, no `toolbar` grid option, no `getToolbarItemInstance` API** anywhere under `packages/*`. `grep` for `agFindToolbarItem` / `agQuickFilterToolbarItem` / `agPivotPanelToolbarItem` / `agRowGroupPanelToolbarItem` returns **zero** matches in source (only the guardrail table `docs/reference/guardrails.md:87` and the pivoting parity note).
- The four toolbar-item component names are **unregistered**, so every toolbar surface (find box, quick-filter pill, embedded row-group/pivot panels, dropdown menu button, action buttons) is missing — not just unstyled.
- **Reusable building blocks that exist:** `FindService` (+ `findChanged`, `findNext/Previous/getTotalMatches`) to back `agFindToolbarItem`; Community `QuickFilterModule` (`quickFilterText` grid option) to back `agQuickFilterToolbarItem`; `RowGroupDropZone`/`PivotDropZone` (via `rowGroupPanelBuilder`) to back `agRowGroupPanelToolbarItem`/`agPivotPanelToolbarItem`.
- The native toolbar **CSS already exists in the MIT `ag-grid.css`** (`.ag-toolbar`, `.ag-toolbar-button`, `.ag-toolbar-input`, `.ag-toolbar-find`, `.ag-toolbar-separator`, `--ag-toolbar-*` tokens) — LibreGrid may mirror those exact tokens/classes under its own `lgr-` DOM without reading any enterprise source.

Cross-cutting defect themes are inventoried in `docs/design/ux-4-current-state-audit.md` (D1 unstyled native controls; D2 hardcoded colors/radii/shadows; D3 missing hover/focus/active/disabled; D4 inconsistent spacing; D6 body-level popups lose dark-mode scope).

---

## 4. Gap list (ordered by visual impact)

1. **Ship the Quick Access Toolbar (`ToolbarModule`, new package).** Register `agFindToolbarItem`, `agQuickFilterToolbarItem`, `agRowGroupPanelToolbarItem`, `agPivotPanelToolbarItem` (+ `separator`, action button, `agMenuToolbarItem` via `@libregrid/menu`, custom component). Style it to the native metrics in §2.4 (48px bar, 0/16px item margins, 8px button padding+gap, `--ag-toolbar-*` tokens, hover via `--ag-icon-button-hover-background-color`, focus `--ag-input-focus-box-shadow`, disabled `opacity:.5`, horizontal-scroll overflow, 14px-margin separators). This is the single largest surface — entirely absent today. Reuse `FindService`/QuickFilter text/`RowGroupDropZone`/`PivotDropZone` as the item bodies; `agFindToolbarItem` renders the 280px/`min-width:220px` find box with match count + next/prev, `agRowGroupPanelToolbarItem`/`agPivotPanelToolbarItem` embed horizontal drop zones via `rowGroupPanelBuilder`.
2. **Style every bare tool-panel control** (`columnsToolPanel.ts`, `filtersToolPanel.ts`, `rowGroupDropZone.ts`, `pivotDropZone.ts`): add `lgr-` classes to buttons/inputs/selects/checkboxes and one shared control stylesheet (hover/focus-visible/active/disabled driven by `--ag-active-color`, `--ag-row-hover-color`, `--ag-icon-button-hover-background-color`, `--ag-input-focus-box-shadow`). Removes the "browser-default inside Quartz" look (D1, the dominant "ugly" factor).
3. **Correct the side bar to native Quartz** (§2.3): strip background `--ag-control-panel-background-color` (drop `--ag-chrome-background-color`/`#f8f8f8`); buttons `min-height:144px`, 16px vertical padding, icon-over-label; **render `iconKey` as an icon** (currently the label text overflows a 32px button); selected = `background-color: var(--ag-background-color)` + top/bottom `var(--ag-border-color)`; add the `:focus-visible::after` ring; default panel width `--ag-side-bar-panel-width` (250px) and remove the 500px hard max.
4. **Route hardcoded values through Quartz tokens** (D2 table in `ux-4-current-state-audit.md`): chooser overlay→`--ag-modal-overlay-background-color` + `--ag-popup-shadow`; pills→`--ag-chip-*` + radius `grid-size*3`; find→exact `--ag-find-*-background-color`; apply buttons→`--ag-column/filter-panel-apply-button-*`.
5. **Restyle drop-zone members as native pills/chips** (§2.5): radius 24px, height 24px, 0/8px padding, ellipsized text, **icon-only remove (`×`)** with `aria-label` instead of "Move up/down/Remove" word-buttons; add a real drag-over highlight; remove the permanent `opacity:.75` on `.lgr-pivot-drop-zone`.
6. **Match native empty states** (§2.5): centered `dashed 1px var(--ag-border-color)` box with `12px 16px` margin / `16px` padding (not an opacity-dimmed text line). Applies to Row Groups / Values / Column Labels drop zones.
7. **Fix the columns-list container**: drop the `max-height:160px` cap — native `.ag-column-select-list` is a full-height flex scroller, so long column lists fill the panel.
8. **Polish the filters panel cards**: style `summary` (no browser marker), the mode `<select>` (Quartz input tokens), active-filter chips, and Apply/Clear/Reset/Cancel as token-driven buttons (Apply = `--ag-filter-panel-apply-button-*`).
9. **Fix body-level popup dark-mode scoping** (D6): re-host the column chooser (and any toolbar dropdown rendered via body) through `popupSvc.addPopup` or copy the grid's `--ag-*` custom properties onto the popup root, so dark grids don't get light panels.
10. **Add missing focus-visible/active/disabled states** everywhere (D3), using `--ag-input-focus-box-shadow` as the ring recipe, and `--ag-disabled-foreground-color`/opacity for disabled.
11. **Split `findCss.ts`** into readable rules and align with the Quartz find tokens (drop `#ffe082`/`#ff9800` fallbacks).
12. **Responsive toolbar overflow** = horizontal scroll, thin scrollbar, no wrap (§1.6) — implement when building #1.
13. **a11y**: tree roving focus / arrow-key traversal for `role=tree` (`columnsToolPanel.ts`), focus trap for the chooser, and `prefers-reduced-motion` for any slide animation (`sideBarPanelAnimationDuration`). Source these from WAI-ARIA (G2 — not enterprise observation).

### 4b. Status (2026-08-16)

Columns tool panel UI/UX pass complete (this spec's §1.3 + §2.5 look, verified against the
live https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ example):

- ✅ Gap 2 (columns panel): all controls use shared `lgr-*` core styles incl. new painted `lgr-checkbox` and switch `lgr-toggle`.
- ✅ Gap 4 (columns panel): chooser uses `--ag-modal-overlay-background-color`/`--ag-popup-shadow`/`--ag-wrapper-border-radius`; pills use `--ag-chip-*`.
- ✅ Gap 5: function-section members and header drop-zone members are native pills (`lgr-chip`, radius `grid-size*3`, height `grid-size*3`) with icon-only remove controls.
- ✅ Gap 6: Row Groups / Values / Column Labels sections show the native dashed empty message (12px/16px margin, 16px padding).
- ✅ Gap 7: columns list scrolls full-height (no max-height cap).
- ✅ Header: select-all is a single painted checkbox (indeterminate when mixed) beside the search input with leading icon and `Search...` placeholder; pivot mode is a labeled switch right under the header; rows are 24px list items with 24px indentation, hover-revealed pin/move icons, and a grip drag handle; drop zones highlight while dragging over.
- Remaining for later surfaces: filters panel cards (gap 8), find CSS split (gap 11), tree roving focus (gap 13).

### 4c. Status — filters panel pass (2026-08-16)

Filters tool panel UI/UX pass complete (native v34 "new" panel look, verified against the live
https://www.ag-grid.com/angular-data-grid/tool-panel-filters-new/ example):

- ✅ No pre-added columns: the panel opens empty and grows cards on demand via an **Add Filter**
  type-ahead (search + listbox) that stays below the cards; picking a column drops in an expanded
  card and removes it from the available list. Cards float in a scrollable container and a pinned
  **Cancel/Apply** row sits at the bottom. `initialState.filters` seeds the ordered card list.
- ✅ Selectable filter + Simple Filter: **every** filterable column renders the one card version — a
  **filter-type selector** (Simple Filter / Selection Filter) at the top, defaulting to Simple Filter.
  The Simple Filter is a rule-based comparison: operator select with the value input stacked beneath,
  and the AND/OR join + one secondary condition revealed only once the first value is entered (max two
  conditions). Selection Filter mounts the Set Filter. The selectable model wraps the active inner model
  and the card applies it through the grid's filter manager; typing updates the card without re-rendering
  the panel, so the input keeps focus.
- ✅ Gap 8: cards rebuilt to the native anatomy — header row (expand button with title + chevron, 16px icon-only delete), body embedding the column's **real filter component** (Set Filter with search/values/Apply, community text/number filters, the multi filter), active-filter dot on the title, `--ag-filter-panel-apply-button-*` Apply button, leading search icon with `Search...` placeholder, 12px panel padding/gap.
- ✅ Fixed the empty-panel race: the panel re-renders on `newColumnsLoaded`/`columnEverythingChanged` plus a deferred repaint when created before the host binds column defs.
- ✅ Filtering from the panel now actually filters the grid (set-filter selections apply through `setFilterModel`/`onFilterChanged`).
- Remaining for later surfaces: find CSS split (gap 11), tree roving focus (gap 13). The embedded multi filter mirrors the header component's own staging semantics (no per-card apply panel).

---

## 5. Citations

**Docs (server-rendered; text extracted in full):**
- Tool Panels — https://www.ag-grid.com/angular-data-grid/tool-panel/ (§ Overview; Provided Tool Panels; Custom Tool Panels; API; Events)
- Side Bar — https://www.ag-grid.com/angular-data-grid/side-bar/ (§ Configuring the Side Bar; Boolean/String/SideBarDef Configuration; Side Bar Customisation; Tool Panel Parent; Providing Parameters; Animation; Side Bar API)
- Columns Tool Panel — https://www.ag-grid.com/angular-data-grid/tool-panel-columns/ (§ Columns Tool Panel Sections; Selection Action; Section Visibility; Suppress Column Reordering; Styling Columns; Context Menu → Built-In Menu Items; Read Only Functions; Expand / Collapse Column Groups; Deferred Updates; Custom Column Layout; Custom Drag and Drop Image)
- Filters Tool Panel — https://www.ag-grid.com/angular-data-grid/tool-panel-filters/ (§ intro; Suppress Options; Filter Instances; Expand / Collapse Filter Groups; Expand / Collapse Filters; Custom Filters Layout)
- Quick Access Toolbar — https://www.ag-grid.com/angular-data-grid/toolbar/ (§ intro; Configuring the Toolbar; Alignment; Built-in Items; Row Group and Pivot Panels; Dropdown Menus; Action Buttons; Custom Components; Theme Parameters; Accessing Toolbar Items; API Reference)

**Quartz theme CSS (on disk, MIT):**
- `node_modules/ag-grid-community/styles/ag-theme-quartz.css` — `.ag-theme-quartz` token block (8-109), dark block (113-155), input metrics (238-247), panel title/toolbar-item weight (212-235), side bar (345-391), drop cells (743-795), apply buttons (105-108).
- `node_modules/ag-grid-community/styles/ag-grid.css` — toolbar tokens (1347-1350), selected-tab-underline defaults (1389-1391), column panel/drop structure (2056-2178), panel title bar (2830-2845), side buttons (5859-5949), column-panel buttons/apply (6271-6300), drop-cell focus/ghost/horizontal (6758-6820), toolbar block (7781-7999).

**LibreGrid source:**
- `packages/side-bar/src/sideBarComponent.ts`, `sideBarCss.ts`, `sideBarRenderer.ts`, `sideBarSvc.ts`
- `packages/columns-tool-panel/src/columnsToolPanel.ts`, `columnsToolPanelCss.ts`, `rowGroupingPanel.ts`, `rowGroupDropZone.ts`, `pivotDropZone.ts`, `rowGroupingPanelCss.ts`, `rowGroupPanelBuilder.ts`, `columnChooserFactory.ts`, `columnsToolPanelModule.ts`, `rowGroupingPanelModule.ts`
- `packages/filters-tool-panel/src/filtersToolPanel.ts`, `filtersToolPanelCss.ts`, `filtersToolPanelModule.ts`
- `packages/find/src/findService.ts`, `findCellRenderer.ts`, `findCss.ts`, `findModule.ts`
- `docs/parity/side-bar.md`, `columns-tool-panel.md`, `filters-tool-panel.md`, `find.md`
- `docs/design/ux-4-current-state-audit.md` — cross-surface defect inventory (D1-D8)

**Not specified in permitted sources (open items, G2):** side-bar/toolbar keyboard navigation specifics (roving focus, Home/End, type-ahead), focus-trap semantics, and the exact animation easing are absent from the cited doc pages; the only keyboard facts available are the native focus-visible ring recipes quoted from the MIT CSS above. These must be sourced from WAI-ARIA patterns, not enterprise observation.
