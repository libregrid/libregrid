# Parity — Tree Data

**Source:** https://www.ag-grid.com/angular-data-grid/tree-data/ · transcribed 2026-08-11
**Phase:** 10 · **Package:** `@libregrid/tree-data`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Type | Default | Status | Notes |
|---|---|---|---|---|
| `treeData` | `boolean` | `false` | ⬜ | |
| `getDataPath` | `GetDataPath` | — | ⬜ | Source shape 1: path array |
| `treeDataChildrenField` | `string` | — | ⬜ | Source shape 2: nested children |
| `treeDataParentIdField` | `string` | — | ⬜ | Source shape 3: flat + parent id |
| `treeDataDisplayType` | `'auto' \| 'custom'` | — | ⬜ | |
| `autoGroupColumnDef` | `AutoGroupColumnDef` | — | ⬜ | Shared with Phase 2 |
| `groupDefaultExpanded` | `number` | `0` | ⬜ | |
| `isGroupOpenByDefault` | callback | — | ⬜ | |
| `suppressGroupRowsSticky` | `boolean` | `false` | ⬜ | |

## Callbacks

| Callback | Status | Notes |
|---|---|---|
| `getDataPath` | ⬜ | |
| `isGroupOpenByDefault` | ⬜ | |

## Interfaces

| Interface | Status | Notes |
|---|---|---|
| `NestedDataGetter` | ⬜ | For `treeDataChildrenField` |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| All three source shapes yield identical trees | ⬜ | **Gate criterion** |
| Aggregation over tree nodes | ⬜ | Reuses Phase 2 `aggStage` |
| Filtering retains ancestor chains | ⬜ | |
| **Managed row dragging — reparent** | ⬜ | v34 feature |
| **Managed row dragging — reorder** | ⬜ | |
| **Leaf → group conversion on drop** | ⬜ | v34 feature |
| Reparenting preserves expansion state | ⬜ | |
| Reparenting re-aggregates | ⬜ | |
| Missing intermediate path nodes → filler nodes | ⬜ | e.g. `['a','b','c']` with no `['a','b']` |
| Cyclic parent references fail gracefully | ⬜ | Must not hang |
| Tree data + master/detail combined | ⬜ | v34.1 feature |
| `aria-level` / `aria-expanded` on tree rows | ⬜ | |

> The docs page listed no ColDef properties, API methods or events. Verify against the live docs when working Phase 10.
