# Parity — Master Detail

> Parity-audited 2026-08-14 — no unresolved ⬜ rows.

**Sources:** [Master / Detail](https://www.ag-grid.com/javascript-data-grid/master-detail/), [Detail Grids](https://www.ag-grid.com/javascript-data-grid/master-detail-grids/), and [Detail Refresh](https://www.ag-grid.com/javascript-data-grid/master-detail-refresh/) · reviewed 2026-08-13
**Phase:** 10 · **Package:** `@libregrid/master-detail`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options and Params

| Contract | Status | Notes |
|---|---|---|
| `masterDetail`, `isRowMaster` | ✅ | MasterDetailService marks eligible rows |
| `masterDefaultExpanded`, `isMasterOpenByDefault` | ✅ | Depth/default callback supported |
| `detailCellRenderer`, `detailCellRendererParams` | ✅ | Registered `agDetailCellRenderer` or supplied component |
| `detailRowHeight`, `detailRowAutoHeight` | ✅ | Fixed or post-content size |
| `keepDetailRows`, `keepDetailRowsCount` | ✅ | LRU cache, default bound 10 |
| `detailGridOptions`, `getDetailRowData` | ✅ | Creates independent grid and supports async rows |
| `refreshStrategy: rows/everything/nothing` | ✅ | All three renderer outcomes unit-tested |
| `template` | ✅ | String/function host with optional `eDetailGrid` ref |

## API and Behaviour

| Requirement | Status | Notes |
|---|---|---|
| `getDetailGridInfo` / `forEachDetailGridInfo` | ✅ | Live-grid integration-covered |
| Detail grid mounts with correct data | ✅ | Renderer calls `getDetailRowData` |
| Detail grid independently sortable/scrollable | ✅ | Browser-covered |
| No leaks over 1,000 cycles | ✅ | Gate-tested with bounded cache lifecycle |
| Async callback after collapse | ✅ | Generation guard ignores stale callback |
| No eligible masters | ✅ | `isRowMaster: false` unit-covered |
| Tree Data + Master/Detail | ✅ | Docs route runs both modes |
| Keyboard reachability | ✅ | Labeled detail region hosting an independent grid |

## AG Grid 36.2 compatibility

Community 36.2.0 sets `aria-expanded` on every expandable row, not only on
grouping rows. A master row is expandable, but the grid keeps `role="grid"`
unless row grouping or tree data is active, and ARIA allows `aria-expanded` on
a row only inside a `treegrid`. Axe reported `aria-conditional-attr` on every
master row, so axe checks no longer passed with 0 violations. The same defect is
open upstream as [ag-grid#12892](https://github.com/ag-grid/ag-grid/issues/12892)
for pinned rows.

`MasterDetailService` restores the 36.1 contract: after each model pass it
removes `aria-expanded` from master rows that are not grouping rows. Group rows
keep the attribute, so a `treegrid` keeps correct disclosure semantics.
