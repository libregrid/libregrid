# Parity — Filters Tool Panel

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Source:** https://www.ag-grid.com/angular-data-grid/tool-panel-filters/ · transcribed 2026-08-11
**Phase:** 6 · **Package:** `@libregrid/filters-tool-panel`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

> **Note:** AG Grid v34 redesigned this panel. Community declares both `iFiltersToolPanel` (legacy) and `iNewFiltersToolPanel`. **Implement the new interface** while still satisfying the legacy one.

## FiltersToolPanelParams

| Property | Status | Notes |
|---|---|---|
| `suppressExpandAll` | ✅ | |
| `suppressFilterSearch` | ✅ | |
| `suppressSyncLayoutWithGrid` | ✅ | |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `suppressFiltersToolPanel` | ✅ | Hides a column or filter group |

## IFiltersToolPanel API

| Method | Status | Notes |
|---|---|---|
| `expandFilterGroups(groupIds?)` | ✅ | Omit ⇒ all |
| `collapseFilterGroups(groupIds?)` | ✅ | Omit ⇒ all |
| `expandFilters(colIds?)` | ✅ | Omit ⇒ all |
| `collapseFilters(colIds?)` | ✅ | Omit ⇒ all |
| `setFilterLayout(colDefs)` | ✅ | Custom arrangement |

## v34 redesign features

| Feature | Status | Notes |
|---|---|---|
| No pre-added columns | ✅ | The panel opens empty; columns are added on demand via the Add Filter type-ahead. |
| Add Filter type-ahead | ✅ | A searchable dropdown below the cards lists the remaining filterable columns; picking one drops in a card. |
| Card per column | ✅ | Each added column renders an expandable card embedding its real filter UI. |
| Single card version | ✅ | Every filterable column renders the same selectable card — Simple Filter / Selection Filter — regardless of its grid filter type. |
| Filter mode selector | ✅ | A **Simple Filter / Selection Filter** dropdown; new cards default to **Simple Filter**. |
| Simple Filter mode | ✅ | Operator select with the value input stacked beneath; the AND/OR join and second condition appear only once the first value is entered (max two conditions). |
| Filter-type configuration (Simple) | ✅ | Community text/number filters mount through `getColumnFilterInstance`. |
| Filter-type configuration (Selection) | ✅ | LibreGrid's Set Filter is constructed directly with a real grid-apply path (its `filterParams.buttons` Apply/Clear/Cancel render in the card). |
| Filter-type configuration (Combo) | ✅ | The multi filter component mounts through `getColumnFilterInstance`. |
| Global **Apply** button | ✅ | Pinned at the panel bottom; re-applies the current filter model |
| Global **Clear** button | ✅ | Clears all filters immediately |
| Global **Reset** button | ✅ | Clears all filters immediately (initial model is empty) |
| Global **Cancel** button | ✅ | Re-syncs embedded filters with the applied model |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Registers with the Phase 1 side-bar host | ✅ | |
| Filter search box | ✅ | Type-ahead search within the Add Filter dropdown |
| Expand/collapse all | ✅ | Expansion APIs target the cards currently present |
| Pinned Cancel/Apply row | ✅ | Bottom buttons stay put while cards scroll |
| Legacy `iFiltersToolPanel` still satisfied | ✅ | |
| `aria-expanded` on filter groups | ✅ | |
