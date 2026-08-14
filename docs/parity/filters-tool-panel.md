# Parity — Filters Tool Panel

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
| Column selection within the panel | ✅ | Filtered cards preserve the active grid columns |
| Filter-type configuration (Simple) | ✅ | |
| Filter-type configuration (Selection) | ✅ | |
| Filter-type configuration (Combo) | ✅ | |
| Global **Apply** button | ✅ | Applies staged model changes |
| Global **Clear** button | ✅ | Stages an empty model |
| Global **Reset** button | ✅ | Stages the initial empty model |
| Global **Cancel** button | ✅ | Restores the last applied model |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Registers with the Phase 1 side-bar host | ✅ | |
| Filter search box | ✅ | |
| Expand/collapse all | ✅ | |
| Legacy `iFiltersToolPanel` still satisfied | ✅ | |
| `aria-expanded` on filter groups | ✅ | |
