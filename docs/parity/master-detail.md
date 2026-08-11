# Parity — Master Detail

**Source:** https://www.ag-grid.com/angular-data-grid/master-detail/ · transcribed 2026-08-11
**Phase:** 10 · **Package:** `@libregrid/master-detail`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Type | Status | Notes |
|---|---|---|---|
| `masterDetail` | `boolean` | ⬜ | |
| `isRowMaster` | `IsRowMaster` | ⬜ | |
| `masterDefaultExpanded` | `number` | ⬜ | Levels expanded by default |
| `isMasterOpenByDefault` | `IsMasterOpenByDefault` | ⬜ | |
| `detailCellRenderer` | `any` | ⬜ | |
| `detailCellRendererParams` | `any` | ⬜ | |
| `detailRowHeight` | `number` | ⬜ | Fixed height |
| `detailRowAutoHeight` | `boolean` | ⬜ | Size to content |
| `keepDetailRows` | `boolean` | ⬜ | Cache detail grids |
| `keepDetailRowsCount` | `number` | ⬜ | Cache bound |

## IDetailCellRendererParams

| Property | Type | Status | Notes |
|---|---|---|---|
| `detailGridOptions` | `GridOptions` | ⬜ | |
| `getDetailRowData` | `GetDetailRowData` | ⬜ | |
| `refreshStrategy` | `'rows' \| 'everything' \| 'nothing'` | ⬜ | All three required |
| `template` | `string \| TemplateFunc` | ⬜ | |

## ColDef Properties

| Property | Status | Notes |
|---|---|---|
| `cellRenderer: 'agGroupCellRenderer'` | ⬜ | Required on the first column for expand icons |

## API Methods

| Method | Status | Notes |
|---|---|---|
| `getDetailGridInfo(id)` | ⬜ | Not enumerated on the docs page — verify |
| `forEachDetailGridInfo(cb)` | ⬜ | Not enumerated on the docs page — verify |
| `addDetailGridInfo` / `removeDetailGridInfo` | ⬜ | Not enumerated on the docs page — verify |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| Detail grid mounts with correct data | ⬜ | |
| Detail grid independently sortable/scrollable | ⬜ | |
| **No leaks over 1,000 expand/collapse cycles** | ⬜ | **Gate criterion** |
| `refreshStrategy: 'rows'` | ⬜ | |
| `refreshStrategy: 'everything'` | ⬜ | |
| `refreshStrategy: 'nothing'` | ⬜ | |
| `keepDetailRowsCount` bounds the cache | ⬜ | |
| `detailRowAutoHeight` sizes to content | ⬜ | |
| Async `getDetailRowData` resolving after collapse | ⬜ | Must not error |
| `isRowMaster` returning false for all rows | ⬜ | |
| Tree data + master/detail combined | ⬜ | v34.1 feature |
| Detail grids keyboard-reachable and escapable | ⬜ | |
