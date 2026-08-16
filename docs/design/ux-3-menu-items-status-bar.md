# UX Spec — Custom Menu Item Components & Status Bar

> **Scope:** `@libregrid/menu` (custom menu item components, menu item DOM/visuals) and `@libregrid/status-bar` (status bar panels, layout, visuals).
> **Theme baseline:** AG Grid Quartz (`ag-theme-quartz.css`), which Community and Enterprise share — these tokens define the native look we must match or beat.
> **Guards honored:** G1 (no enterprise source read — behavior only from public docs + MIT CSS/types), G2 (behavior from docs), G4 (`lgr-` prefix only; `ag-` classes read from core DOM but never emitted by us).

---

## 1. Behavior spec — Custom Menu Item Components

Primary source: <https://www.ag-grid.com/angular-data-grid/component-menu-item/> (server-rendered; full text extracted via `curl` + browser User-Agent — no JS-shell fallback needed). Section names below match that page's headings verbatim.

### 1.1 What they are and where they render

- Menu Item Components customise the items shown in the **Column Menu** and **Context Menu** ("Menu Item Components allow you to customise the menu items shown in the Column Menu and Context Menu" — intro).
- They are supplied through the `menuItem` field of a `MenuItemDef`, with optional `menuItemParams` (community type `MenuItemDef.menuItem: any`, `menuItemParams: any` — `menuItem.d.ts:44-48`).
- Grid-provided menu items and custom menu item components can be **mixed in the same menu** — the custom component must then conform to the default table layout (§1.6) or the grid styles must be overridden ("...they must adhere to a certain structure, or the grid styles must be overridden" — "Default Styling").

### 1.2 Component lifecycle (the `IMenuItemComp` contract)

From the "Implement this interface" section and community `menuItem.d.ts:121-140`:

| Method | Mandatory | Called when | Behavior |
|---|---|---|---|
| `agInit(params: IMenuItemParams)` | yes | once, on item creation | receives `IMenuItemParams` (§1.3) |
| `configureDefaults()` | optional | once, before default behaviour is wired | returns `true` (all default behaviour) / `false` (none) / `IMenuConfigParams` (§1.5) |
| `setActive(active: boolean)` | optional | on activation/deactivation via mouseover or keyboard nav | style the active/hover state |
| `setExpanded(expanded: boolean)` | optional | when the item's sub-menu opens/closes | style the expanded (sub-menu open) state |
| `select()` | optional | when the item is chosen (clicked or Enter) | perform the item's action |

- "To enable the default menu item behaviour, implement the `configureDefaults` method and return `true`" — without it the component must implement all interactions (hover, click, keyboard, tooltip, aria, focus) itself ("Providing Custom Behaviour").
- Community signature: `configureDefaults?(): boolean | IMenuConfigParams` (`menuItem.d.ts:132`).

### 1.3 `IMenuItemParams` — full API surface

From the page's "Properties available on the IMenuItemParams<TData = any, TContext = any> interface" list, cross-checked against community `BaseMenuItemParams` / `IMenuItemParams` (`menuItem.d.ts:93-119`). The params object is `MenuItemDef & AgGridCommon` plus interaction callbacks:

**Interaction / menu-control callbacks:**

| Field | Type | Purpose |
|---|---|---|
| `onItemActivated` | `() => void` | Callback to let the menu know the current item became active. Required if updating active status within the item. |
| `level` | `number` | Level within the menu tree (starts at 0). |
| `isAnotherSubMenuOpen` | `() => boolean` | Returns true if another sub-menu is open. |
| `openSubMenu` | `(activateFirstItem?: boolean) => void` | Open the sub-menu for this item. |
| `closeSubMenu` | `() => void` | Close the sub-menu for this item. |
| `closeMenu` | `(event?) => void` | Close the entire menu. |
| `updateTooltip` | `(tooltip?: string, shouldDisplayTooltip?: () => boolean) => void` | Updates the grid-provided tooltip; `shouldDisplayTooltip` gates display and does not work with `enableBrowserTooltips={true}`. |

**Item definition fields (also present on the params object — community `BaseMenuItemParams extends MenuItemDef`):**

| Field | Type | Purpose |
|---|---|---|
| `name` | `string` | Name of the menu item. |
| `disabled` | `boolean` | Render as disabled. |
| `shortcut` | `string` | Shortcut text shown inside the item (does NOT create a binding). |
| `action` | `Function` | Executed when the item is chosen. |
| `checked` | `boolean` | Show a check beside the option. |
| `icon` | `Element \| string` | Icon: DOM element or HTML string. |
| `cssClasses` | `string[]` | Extra CSS classes applied to the item. |
| `tooltip` | `string` | Tooltip text for the item. |
| `suppressCloseOnSelect` | `boolean` | Keep menu open on select (ignored when the item has a sub-menu — it always stays open). |
| `subMenu` | `(MenuItemDef \| string)[]` | Sub-menu definitions (strings are resolved default-item tokens). |
| `subMenuRole` | `'menu' \| 'listbox' \| 'tree' \| 'grid' \| 'dialog'` | ARIA role for the sub-menu; default `'menu'`. |
| `menuItem` | `any` | The custom component (class or registered name). |
| `menuItemParams` | `any` | Params passed to the custom component. |
| `api` | `GridApi` | The grid API. |
| `context` | `TContext` | `gridOptions.context`. |

### 1.4 Default menu item types (tokens)

The component-menu-item page references default items only through `subMenu` string resolution; the authoritative token list is the MIT type union `DefaultMenuItem` / `DefaultColumnMenuItem` (`menuItem.d.ts:142-155`):

- **Sort/group/pin:** `pinSubMenu`, `pinLeft`, `pinRight`, `pinRowSubMenu`, `pinTop`, `pinBottom`, `unpinRow`, `clearPinned`, `valueAggSubMenu`, `showValuesAsSubMenu`, `rowGroup`, `rowUnGroup`, `sortAscending`, `sortDescending`, `sortAbsoluteAscending`, `sortAbsoluteDescending`, `sortUnSort`.
- **Sizing/reset:** `autoSizeThis`, `autoSizeAll`, `resetColumns`, `expandAll`, `contractAll`.
- **Clipboard:** `copy`, `copyWithHeaders`, `copyWithGroupHeaders`, `cut`, `paste`.
- **Export:** `export`, `csvExport`, `excelExport`.
- **Advanced:** `note`, `columnFilter`, `columnChooser`, `chartRange`, `pivotChart`, `calculatedColumn`, `editCalculatedColumn`, `removeCalculatedColumn`, `editColumnName`.
- **Structural:** `separator`.
- **Tool-panel/chooser-only:** `scrollIntoView`, `value`, `pivot` (`DefaultToolPanelItem`, `menuItem.d.ts:148`).

LibreGrid's registry enumerates a subset in `packages/menu/src/defaultItems.ts:43-280` (see §4).

### 1.5 `IMenuConfigParams` — selective default behaviour

From "Providing Custom Behaviour" and community `menuItem.d.ts:50-92`:

| Flag | Effect when `true` |
|---|---|
| `suppressTooltip` | Suppress the grid-provided tooltip on hover. |
| `suppressClick` | Suppress click handling; component handles clicks (grid stops running the action / opening the sub-menu). |
| `suppressMouseDown` | Suppress mouse-down handling. |
| `suppressMouseOver` | Suppress `mouseenter`/`mouseleave`; grid stops updating active status / opening sub-menus. |
| `suppressKeyboardSelect` | Grid does not select the item on Enter/Space. |
| `suppressTabIndex` | Suppress `tabindex` on the root; component sets its own. |
| `suppressAria` | Suppress ARIA properties on the root. |
| `suppressRootStyles` | Suppress grid CSS classes on the root; component must supply table display + active/disabled styling when mixed with grid items. |
| `suppressFocus` | Suppress focusing the root when made active; component handles keyboard nav. |

### 1.6 Default item structure & layout

From "Default Styling":

- Grid sizing uses **`display: table`** on the menu list; each item is a **`table-row`** with **four `table-cell` children** (icon, text, shortcut, sub-menu pointer).
- "The default structure consists of a parent element with `display: table-row`, and four children with `display: table-cell`."
- If `configureDefaults` is used and root styling is not suppressed, the grid auto-adds the correct styling to the parent element.
- Overridable via the documented `ag-menu-list`, `ag-menu-option`, `ag-menu-option-part`, `ag-menu-separator`, `ag-menu-separator-part` classes (read from core CSS only; never emitted by us — G4).

The four `table-cell` slots map to `.ag-menu-option-icon`, `.ag-menu-option-text`, `.ag-menu-option-shortcut`, `.ag-menu-option-popup-pointer` (`ag-grid.css:5565-5600`).

---

## 2. Behavior spec — Status Bar

Primary source: <https://www.ag-grid.com/angular-data-grid/status-bar/> (server-rendered; full text extracted — no fallback needed).

### 2.1 What it is / where it renders

- "The Status Bar appears **below the grid** and contains Status Bar Panels." Panels are **Grid Provided Panels** or **Custom Status Bar Panels**.
- Configured with the `statusBar` grid property: `statusBar.statusPanels` (community `StatusBar = { statusPanels: StatusPanelDef[] }` — `iStatusPanel.d.ts:3-5`).

### 2.2 Provided panels (the five native names)

| Registered name | Provides |
|---|---|
| `agTotalRowCountComponent` | Total row count. |
| `agTotalAndFilteredRowCountComponent` | Total and filtered row count. |
| `agFilteredRowCountComponent` | Filtered (displayed) row count. |
| `agSelectedRowCountComponent` | Selected row count. |
| `agAggregationComponent` | Aggregations on the selected range. |

- "Some Status Panels only show when a Cell Selection is present" — the aggregation panel (and selection-dependent output) is hidden unless a range selection exists.

### 2.3 Configuration (`StatusPanelDef`)

From "Configuration" and community `iStatusPanel.d.ts:6-11`:

| Field | Behavior |
|---|---|
| `statusPanel` | Provided name or custom component. |
| `align` | `'left'`, `'center'`, or `'right'` — **default `right`**. |
| `key` | Used to look up the panel instance via `api.getStatusPanel(key)`. |
| `statusPanelParams` | Extra props passed to the panel. |

- `agAggregationComponent` accepts `statusPanelParams.aggFuncs: Array<'count' | 'sum' | 'min' | 'max' | 'avg'>` (`IAggregationStatusPanelParams`, `iStatusPanel.d.ts:24-30`).
- **Localisation:** "Labels (e.g. 'Rows', 'Total Rows', 'Average') and number formatting are changed using the grid's Localisation."
- **Bigint:** "The Aggregation Panel works with number and bigint values. When bigint values are present, `avg` uses integer division and discards the fractional part."
- **Height:** "The Status Bar sizes its height to fit content. When no panels are visible, the Status Bar will have zero height (not be shown)." A fixed height is added by app CSS, e.g. `.ag-status-bar { min-height: 35px }` (we would emit `.lgr-status-bar` — G4).

### 2.4 Value formatting

From "Value Formatting" and "IProvidedStatusPanelParams":

- `statusPanelParams.valueFormatter: (params: IStatusPanelValueFormatterParams) => string` formats a panel's displayed values.
- `IStatusPanelValueFormatterParams` (`iStatusPanel.d.ts:12-17`): `value: number | null`, `bigintValue?: bigint`, `totalRows: number`, `key: string`, plus `api`/`context`.

### 2.5 Custom panels (`IStatusPanelComp` contract)

From "Custom Panels" and community `iStatusPanel.d.ts:31-43`:

| Method | Mandatory | Semantics |
|---|---|---|
| `agInit(params: IStatusPanelParams)` | yes | called once on creation; `IStatusPanelParams = { key, api, context }`. |
| `refresh(params: IStatusPanelParams)` | optional | called when the `statusBar` option updates; return `true` → panel updated itself; `false`/absent → grid **destroys and recreates** the panel. |

- Custom panels can listen to grid events via `params.api.addEventListener(...)` (e.g. `modelUpdated`) — shown in the page example.
- **Accessing instances:** `api.getStatusPanel(key)` returns the panel instance ("Accessing Instances").

### 2.6 Panel layout & internal structure

From the CSS structural rules (`ag-grid.css`), which describe how the native host lays panels out:

- Host `.ag-status-bar` is a **flex row** with `justify-content: space-between` (`ag-grid.css:3323-3327`).
- Three alignment buckets, each `display: inline-flex`: `.ag-status-bar-left`, `.ag-status-bar-center`, `.ag-status-bar-right` (`ag-grid.css:3338-3348`). Right is the default bucket.
- Each `.ag-status-panel` is `display: inline-flex` (`ag-grid.css:3329-3332`); the aggregation panel lays its per-func `.ag-status-name-value` blocks inline.
- Each panel renders **name/value pairs**: `.ag-status-name-value` (the label+value row, `white-space: nowrap`) containing a value span `.ag-status-name-value-value`. There is **no** dedicated separator element between panels — panels are separated by horizontal margins on `.ag-status-name-value` (see §3.1). No hover/active/pointer state is defined for status panels — they are read-only and non-interactive.

---

## 3. Visual spec — Quartz theme tokens (exact values)

### 3.1 Status bar

Tokens from `node_modules/ag-grid-community/styles/ag-theme-quartz.css`; structural rules from `node_modules/ag-grid-community/styles/ag-grid.css`.

**Tokens (`ag-theme-quartz.css`, `:root` block lines 7-110):**

| Token | Value | Line |
|---|---|---|
| `--ag-grid-size` | `8px` | 74 |
| `--ag-font-size` | `14px` | 98 |
| `--ag-font-family` | `'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif` | 95-97 |
| `--ag-borders` | `solid 1px` | 66 |
| `--ag-border-color` | `color-mix(in srgb, transparent, var(--ag-foreground-color) 15%)` | 13 |
| `--ag-foreground-color` | `#181d1f` | 12 |
| `--ag-secondary-foreground-color` | `var(--ag-foreground-color)` | 53 |
| `--ag-disabled-foreground-color` | `color-mix(in srgb, transparent, var(--ag-foreground-color) 50%)` | 56 |
| `--ag-widget-container-vertical-padding` | `calc(var(--ag-grid-size) * 1.5)` = **12px** | 88 |
| `--ag-widget-container-horizontal-padding` | `calc(var(--ag-grid-size) * 1.5)` = **12px** | 89 |

`--ag-header-foreground-color` resolves to `var(--ag-secondary-foreground-color)` → `#181d1f` (`ag-grid.css:1342`).

**Structural + visual rules:**

| Selector | Declarations | Source (line) |
|---|---|---|
| `.ag-status-bar` | `display: flex; justify-content: space-between; overflow: hidden` | `ag-grid.css:3323-3327` |
| `.ag-status-bar` | `border-top: var(--ag-borders) var(--ag-border-color)` (1px solid, 15% fg); `padding-left/right: calc(var(--ag-grid-size) * 4)` = **32px**; `line-height: 1.5`; `overflow: auto hidden; scrollbar-width: thin` | `ag-grid.css:6733-6741` |
| `.ag-status-bar` (base color) | `color: var(--ag-disabled-foreground-color)` | `ag-grid.css:6735` |
| `.ag-theme-quartz .ag-status-bar` | `color: var(--ag-header-foreground-color)` (= `#181d1f`); `font-weight: normal` | `ag-theme-quartz.css:209-233` and `813-817` |
| `.ag-status-bar-left/center/right` | `display: inline-flex`; center adds `text-align: center` | `ag-grid.css:3338-3348`, `6747-6749` |
| `.ag-status-panel`, `.ag-status-panel-aggregations .ag-status-name-value` | `display: inline-flex` | `ag-grid.css:3329-3332` |
| `.ag-status-name-value` | `white-space: nowrap`; `margin-left/right: var(--ag-grid-size)` = **8px**; `padding-top/bottom: calc(var(--ag-grid-size) * 2)` = **16px** | `ag-grid.css:3334-3336`, `6751-6756` |
| `.ag-theme-quartz .ag-status-name-value` | `padding: var(--ag-widget-container-vertical-padding) 0` = **12px 0** (overrides the 16px) | `ag-theme-quartz.css:818-822` |
| `.ag-status-name-value-value` | `color: var(--ag-foreground-color)` | `ag-grid.css:6743-6745` |
| `.ag-theme-quartz .ag-status-name-value-value` | `font-weight: 500; font-variant-numeric: tabular-nums` | `ag-theme-quartz.css:823-834` |

**Effective Quartz status bar (native):** full `#181d1f` label text at normal weight; value numbers `#181d1f` at `500` weight with tabular numerals; 1px top border at 15% foreground; 32px horizontal padding; each name/value pair has 8px horizontal separation (margins) and 12px vertical padding; panels flow inline-flex within left/center/right buckets; **no background fill, no box-shadow, no radius, no hover/active state**.

### 3.2 Menu (context for the custom-item DOM)

Tokens (`ag-theme-quartz.css` lines 7-110 and shared `ag-grid.css`):

| Token | Value | Line |
|---|---|---|
| `--ag-active-color` | `#2196f3` | 10 |
| `--ag-background-color` | `#fff` | 11 |
| `--ag-foreground-color` | `#181d1f` | 12 |
| `--ag-menu-background-color` | `color-mix(in srgb, var(--ag-background-color), var(--ag-foreground-color) 3%)` | 33 |
| `--ag-menu-border-color` | `color-mix(in srgb, transparent, var(--ag-foreground-color) 20%)` | 34 |
| `--ag-row-hover-color` | `color-mix(in srgb, transparent, var(--ag-active-color) 12%)` | 36 |
| `--ag-input-focus-border-color` | `var(--ag-active-color)` = `#2196f3` | 39 |
| `--ag-card-shadow` | `0 1px 4px 1px rgba(186, 191, 199, 0.4)` | 102 |
| `--ag-card-radius` | `var(--ag-border-radius)` = **4px** (`_css-content.scss:1505`) | — |
| `--ag-borders-critical` | `var(--ag-borders)` = `solid 1px` (`_css-content.scss:1426`) | — |
| `--ag-menu-min-width` | `181px` | `ag-grid.css:1478` |
| `--ag-tab-min-width` | `290px` | `ag-theme-quartz.css:100` |

**Rules (`ag-grid.css`):**

| Selector | Declarations | Line |
|---|---|---|
| `.ag-menu` | `border: 1px solid 20%-fg`; `border-radius: 4px`; `box-shadow: var(--ag-card-shadow)`; `background-color: var(--ag-menu-background-color)`; `padding: 0` | 5490-5499 |
| `.ag-menu-list` | `display: table; width: 100%`; `padding: var(--ag-grid-size) 0` = **8px 0** | 2980-2983, 5505-5508 |
| `.ag-menu-option`, `.ag-menu-separator` | `display: table-row` | 2985-2988 |
| `.ag-menu-option-part`, `.ag-menu-separator-part` | `display: table-cell; vertical-align: middle` | 2990-2994 |
| `.ag-menu-option-text` | `white-space: nowrap` | 2996-2998 |
| `.ag-menu-option-custom` | `display: contents` | 3000-3002 |
| `.ag-menu-separator` | `height: calc(var(--ag-grid-size) * 2 + 1px)` = **17px** | 5510-5512 |
| `.ag-menu-separator-part::after` | `border-top: var(--ag-borders-critical) var(--ag-border-color)` | 5514-5518 |
| `.ag-menu-option:focus-visible::after` | inset 1px `#2196f3` outline (focus ring) | 5524-5539 |
| `.ag-menu-option-active` | `background-color: var(--ag-row-hover-color)` (active @ 12%) | 5545-5548 |
| `.ag-menu-option-part` | `line-height: var(--ag-icon-size)` = 16px; `padding: calc(var(--ag-grid-size) + 2px) 0` = **10px 0** | 5550-5554 |
| `.ag-menu-option-disabled` | `opacity: 0.5` | 5556-5559 |
| `.ag-menu-option-icon` | `width: var(--ag-icon-size)` = 16px; LTR `padding-left: calc(var(--ag-grid-size) * 2)` = **16px** | 5565-5576 |
| `.ag-menu-option-text` | `padding-left/right: calc(var(--ag-grid-size) * 2)` = **16px** | 5578-5582 |
| `.ag-menu-option-shortcut` | LTR `padding-right: var(--ag-grid-size)` = **8px** | 5584-5591 |
| `.ag-menu-option-popup-pointer` | LTR `padding-right: var(--ag-grid-size)` = **8px** | 5593-5600 |

Quartz menu overrides (`ag-theme-quartz.css`): `.ag-menu { color: color-mix(in srgb, transparent, var(--ag-foreground-color) 95%) }`; `.ag-menu-option { font-weight: 500; cursor: pointer }`.

**Effective native menu item (Quartz):** 181px min width; item row height = 16px line-height + 10px×2 padding ≈ **36px**; icon cell 16px wide with 16px leading pad; label 16px pad each side; active row background = active color at 12% alpha; disabled = 50% opacity; focus ring = 1px `#2196f3` inset.

---

## 4. LibreGrid current state

### 4.1 Status bar (`packages/status-bar/src`)

**What exists:**

- `statusBarModule.ts` — registers `StatusBarModule` (`enterprise: true`, dependsOn `EnterpriseCoreModule`), bean `statusBarSvc`, the five provided panels as `userComponents` under the exact required names, and `apiFunctions.getStatusPanel`.
- `statusBarService.ts` — reads `statusBar.statusPanels`, instantiates provided/custom panels, merges `statusPanelParams`, auto-keys `status-${index}`, calls `agInit`, refreshes on `modelUpdated`/`filterChanged`/`selectionChanged`/`rangeSelectionChanged`/`cellValueChanged`, and implements `getStatusPanel`/`register`/`destroy`.
- `statusPanels.ts` — `BaseStatusPanel` (returns a `<span>` with `aria-live="polite"`; `agInit`/`getGui`/`refresh`) plus the five concrete panels. Text output: `Total Rows: N`, `Rows: N / M`, `Filtered Rows: N`, `Selected Rows: N`, `Count: N Sum: … Avg: …`.
- `statusMetrics.ts` — `aggregate()` computing count/sum/min/max/avg over finite numbers.
- `material/src/materialStatusBar.ts` — a standalone Angular `<mat-toolbar>` demo shell taking a single `text` string (`role="status" aria-live="polite"`); not wired to the core service.

**What already matches the docs:**

- All five provided panel names registered exactly (G4.1a `StatusPanelComponentName` table).
- `statusBar.statusPanels` array + `StatusPanelDef` (`statusPanel`, `key`, `statusPanelParams`) parsed.
- Custom panels: `agInit` on create, `refresh` on model/filter/selection/range/value changes.
- `getStatusPanel(key)` via `apiFunctions`.
- `aria-live="polite"` on each panel's DOM node.
- Aggregation tracks cell (range) selection.

**What differs / is missing (vs docs):**

- **No status bar is rendered into the grid at all.** `statusPanels.ts` only builds `<span>` fragments; `statusBarService.ts` never creates a `.ag-status-bar`/`.lgr-status-bar` host or appends panel GUIs. The integration test only asserts `getStatusPanel(...).getGui().textContent` — nothing is visible (`statusBarModule.integration.spec.ts:34-38`). **This is the #1 gap.**
- `align` (`left`/`center`/`right`) is retained on the def but ignored — no left/center/right buckets (`docs/parity/status-bar.md` marks `align` 🟡).
- `valueFormatter` / `IProvidedStatusPanelParams.valueFormatter` not applied (parity doc marks 🟡).
- `aggFuncs` on `agAggregationComponent` ignored — output is a hard-coded `Count/Sum/Avg` line (`statusPanels.ts:85`).
- Labels hard-coded in English and merged with values (`Total Rows: N`) — no localisation; native renders a **label** span + a **value** span (`.ag-status-name-value` / `.ag-status-name-value-value`) so the number gets `font-weight:500` + tabular-nums and the label does not.
- No "some panels hidden without cell selection" logic — `AggregationPanel` always returns `Count: 0` and `SelectedRowCountPanel` always shows `Selected Rows: 0`.
- No height-to-content / zero-height-when-empty behavior (no host element to measure).
- No `destroy()`/`refresh()` return-`false` → recreate semantics (return value ignored).
- No `bigint` handling in aggregation (`Number.isFinite` filters bigints out).

### 4.2 Menu — custom item components & item DOM (`packages/menu/src`)

**What exists:**

- `menuItemRegistry.ts` — plain-class registry + module-scope global store; `register/getItem/buildItems/has`; `registerMenuItem`/`registerMenuItems` in `registryApi.ts`.
- `menuItemMapper.ts` — resolves item **names** → `MenuItemDef`, maps `subMenu` recursively, handles `'separator'`.
- `defaultItems.ts` — `DEFAULT_CONTEXT_MENU_ITEMS` / `DEFAULT_COLUMN_MENU_ITEMS` token lists + a `builtInItems` factory table; only `sortAscending`/`sortDescending`/`sortUnSort`/`autoSizeThis`/`autoSizeAll`/`resetColumns`/`columnChooser`/`columnFilter` have real factories, the rest are `() => null` stubs.
- `contextMenuSvc.ts` — full context menu: builds items (defaults → `getContextMenuItems` → `contextMenuItems` → `colDef.contextMenuItems`), separator collapsing, renders via `getMenuRenderer()` or a fallback `createMenuElement`. The fallback renders **icon, name, shortcut, checked, tooltip, cssClasses, disabled, subMenu arrow** and handles ArrowUp/Down/Enter/Space/Escape.
- `colMenuFactory.ts` — column menu via the reserved `enterpriseMenuFactory` bean; its fallback `createMenuElement` renders **only `item.name`** (no icon/shortcut/check/submenu arrow) — visually inferior to the context menu.
- `menuRenderer.ts` — `registerMenuRenderer`/`getMenuRenderer` seam; `packages/material/src/materialMenuRenderer.ts` provides an Angular Material renderer (name, shortcut, check icon, sub-menu arrow + expand/collapse + arrow keys).
- `menuCss.ts` — inline `lgr-*` CSS: `.lgr-menu` (min-width 180px, padding 4px 0, radius 4px, `0 4px 12px` shadow), `.lgr-menu-item` (**`display: flex`**, `gap: 8px`, padding `6px 12px`), hover/focus `--ag-row-hover-color`, disabled 50%, checked `::before '✓'`, icon 16×16, shortcut 0.6 opacity, arrow 0.6 opacity, separator 1px.

**What already matches:**

- Registry + mapper bridge the `MenuItemDef` resolution model; fields pass through (name/disabled/shortcut/action/checked/icon/cssClasses/tooltip/suppressCloseOnSelect/subMenu/subMenuRole).
- `separator` handling, `suppressCloseOnSelect`, disabled rendering, tooltip (`title`), cssClasses, subMenu arrow in the context-menu fallback.
- `registerMenuRenderer` seam allows a framework renderer (Material).

**What differs / is missing (vs docs):**

- **Custom menu item components are not supported anywhere.** No renderer (fallback or Material) instantiates `item.menuItem`, passes `menuItemParams`, or calls `agInit`/`configureDefaults`/`setActive`/`setExpanded`/`select`. Grep of the menu package shows zero references to `IMenuItemComp`/`IMenuItemParams`/`configureDefaults`/`setActive`/`setExpanded`.
- **Wrong layout model.** Docs mandate `display: table` / `table-row` / four `table-cell` children; LibreGrid uses `display: flex` + `gap` (`.lgr-menu-item`, `menuCss.ts:18-26`). A custom component emitting the documented table structure will not lay out correctly, and `configureDefaults`' auto-injected table styling is unimplemented.
- No `onItemActivated`/`openSubMenu`/`closeSubMenu`/`closeMenu`/`updateTooltip`/`isAnotherSubMenuOpen` params contract (the whole `IMenuItemParams` interaction surface).
- No `subMenuRole` (ARIA `menu|listbox|tree|grid|dialog`); context fallback hard-codes `role="menuitem"`/`aria-haspopup`.
- Sub-menus render as an arrow glyph but do **not** open on hover/keyboard in the vanilla fallback (only the Angular Material renderer expands them).
- No `setActive`-driven active/hover state contract (CSS `:hover`/`:focus` only; no `.active` class path).
- `lgr-menu` uses `min-width: 180px` vs native `181px`; shadow `0 4px 12px rgba(0,0,0,.15)` vs native `--ag-card-shadow` `0 1px 4px 1px rgba(186,191,199,.4)`; padding `4px 0` vs native `8px 0`; item padding `6px 12px` vs native `10px 0` + 16px icon/text pads (native ≈36px row height).
- `colMenuFactory` fallback renders only `item.name` — icons/shortcuts/checks/submenu arrows are dropped in the column menu.

---

## 5. Gap list (ordered by visual impact)

1. **Render an actual status bar host.** Mount a `.lgr-status-bar` flex host below the grid (left/center/right buckets), append each panel's `getGui()`, and add the `lgr-` CSS for border-top, 32px horizontal padding, 12px vertical padding, 8px panel margins, `line-height:1.5`. Without this the feature is invisible — highest impact.
2. **Split labels from values.** Emit a label span + value span (`lgr-status-name-value` / `lgr-status-name-value-value`) so numbers get `font-weight:500` + `font-variant-numeric: tabular-nums` and full-foreground color while labels render normal — matches the Quartz emphasis exactly.
3. **Honor `align`.** Implement `left`/`center`/`right` buckets (default right) in the new host so panels distribute per the docs.
4. **Hide selection-dependent panels.** `agAggregationComponent` and selection-derived output should not render when there is no range/cell selection (zero-height → hide).
5. **Implement `valueFormatter`** (`IProvidedStatusPanelParams.valueFormatter`) and **`aggFuncs`** on the aggregation panel (count/sum/min/max/avg, incl. bigint integer-division `avg`).
6. **Localise labels** ("Rows", "Total Rows", "Average", …) through the grid's localisation instead of hard-coded English strings.
7. **Implement custom menu item components.** Add a menu-item component host that reads `MenuItemDef.menuItem`/`menuItemParams`, calls `agInit` + `configureDefaults` + `setActive`/`setExpanded`/`select`, and honors `IMenuConfigParams` suppress flags.
8. **Adopt the table layout contract.** Switch `.lgr-menu-item` internals to `table-row`/four `table-cell` parts (icon/text/shortcut/popup-pointer) — or document that `configureDefaults`' auto-styling is suppressed — so custom components and grid items mix correctly.
9. **Match Quartz menu metrics.** Menu list padding `8px 0`, item part padding `10px 0`, icon cell 16px + 16px leading pad, label 16px pads, row height ≈36px, min-width 181px, `--ag-card-shadow` shadow, focus ring `1px #2196f3` inset, active bg `--ag-row-hover-color`.
10. **Parity for the column-menu fallback.** Give `colMenuFactory.createMenuElement` the same icon/shortcut/check/submenu-arrow rendering as the context menu (today it renders only `item.name`).
11. **Sub-menu interaction + `subMenuRole`.** Open sub-menus on hover/ArrowRight, close on ArrowLeft/Escape, and set the documented ARIA role (`menu|listbox|tree|grid|dialog`, default `menu`) instead of hard-coded `menuitem`/`aria-haspopup`.
12. **`refresh` return-`false` → destroy/recreate** custom status panels, per the `IStatusPanel` contract (currently the return value is ignored).

---

## 6. Citations

### Documentation pages (behavior)

- Menu Item Components — <https://www.ag-grid.com/angular-data-grid/component-menu-item/> — sections: intro; "Implement this interface"; `IMenuItemParams` property list; "Default Styling"; "Providing Custom Behaviour" (`IMenuConfigParams`).
- Status Bar — <https://www.ag-grid.com/angular-data-grid/status-bar/> — sections: intro; "Provided Panels"; "Configuration"; "Value Formatting"; "IProvidedStatusPanelParams"; "Custom Panels"; "Accessing Instances".
- Local parity checklist — `docs/parity/status-bar.md` (flags `align` and `valueFormatter` as 🟡 partial; `getStatusPanel`, custom-panel contract, live counts, `aria-live` as ✅).

### Quartz theme / structural CSS (visual tokens)

- `node_modules/ag-grid-community/styles/ag-theme-quartz.css` — lines 7-110 (tokens); 207-233 & 813-834 (`.ag-status-bar` color/weight; `.ag-status-name-value` 12px vertical padding; `.ag-status-name-value-value` `font-weight:500` + `tabular-nums`); 33/34/36/102 (`--ag-menu-*`, `--ag-row-hover-color`, `--ag-card-shadow`).
- `node_modules/ag-grid-community/styles/ag-grid.css` — 1342 (`--ag-header-foreground-color`), 1478 (`--ag-menu-min-width: 181px`), 2980-3002 (table layout), 3323-3348 (status-bar flex + buckets), 5490-5600 (menu visual rules), 6733-6756 (status-bar border/padding/name-value).
- `node_modules/ag-grid-community/styles/_css-content.scss` — 1426 (`--ag-borders-critical`), 1505 (`--ag-card-radius`).

### Community type definitions (interface surface — MIT)

- `node_modules/ag-grid-community/dist/types/src/interfaces/menuItem.d.ts` — `MenuItemLeafDef`/`MenuItemDef` (1-49), `IMenuConfigParams` (50-92), `BaseMenuItemParams` (93-113), `IMenuItemParams` (114-119), `BaseMenuItem`/`IMenuItem`/`IMenuItemComp` (121-140), `DefaultMenuItem`/`DefaultToolPanelItem`/`DefaultColumnMenuItem` (142-155).
- `node_modules/ag-grid-community/dist/types/src/interfaces/iStatusPanel.d.ts` — `StatusBar`/`StatusPanelDef` (3-11), `IStatusPanelValueFormatterParams` (12-17), `IProvidedStatusPanelParams` (18-20), `IStatusPanelParams` (21-23), `AggregationStatusPanelAggFunc`/`IAggregationStatusPanelParams` (24-30), `IStatusPanel`/`IStatusPanelComp` (31-43).

### LibreGrid source inspected

- `packages/menu/src/menuItemRegistry.ts`, `menuItemMapper.ts`, `defaultItems.ts`, `contextMenuSvc.ts`, `colMenuFactory.ts`, `menuCss.ts`, `menuRenderer.ts`, `menuUtils.ts`, `registryApi.ts`.
- `packages/status-bar/src/statusBarModule.ts`, `statusBarService.ts`, `statusPanels.ts`, `statusMetrics.ts`, `statusBarModule.integration.spec.ts`, `statusPanels.spec.ts`.
- `packages/material/src/materialStatusBar.ts`, `packages/material/src/materialMenuRenderer.ts`.
