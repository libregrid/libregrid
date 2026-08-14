# Parity — Tree Data

**Sources:** [Tree Data](https://www.ag-grid.com/javascript-data-grid/tree-data/) and [Tree Data Row Dragging](https://www.ag-grid.com/javascript-data-grid/tree-data-row-dragging/) · reviewed 2026-08-13
**Phase:** 10 · **Package:** `@libregrid/tree-data`
**Legend:** ⬜ not started · ✅ done+tested · 🟡 partial (note gap) · ❌ won't-do (rationale required)

## Grid Options

| Option | Status | Notes |
|---|---|---|
| `treeData` | ✅ | Activates the shared GroupStage tree branch |
| `getDataPath` | ✅ | Path-array source with deterministic filler nodes |
| `treeDataChildrenField` | ✅ | Nested child-array source, including dotted fields |
| `treeDataParentIdField` | ✅ | Parent-pointer source with cycle-safe fallback |
| `treeDataDisplayType` | ✅ | Consumed by Community’s shared display layer |
| `autoGroupColumnDef` | ✅ | Shared Phase 2 auto-group column |
| `groupDefaultExpanded` / `isGroupOpenByDefault` | ✅ | Tree defaults/callback use the shared expansion service |
| `suppressGroupRowsSticky` | ✅ | Consumed by Community sticky-row rendering |

## Behaviour

| Requirement | Status | Notes |
|---|---|---|
| All three source shapes yield identical trees | ✅ | Gate-tested with equivalent two-level trees |
| Aggregation over tree nodes | ✅ | Reuses Phase 2 `aggStage` |
| Filtering retains ancestor chains | ✅ | Community hierarchical filter operates on the shared parent links |
| Managed reparent/reorder | ✅ | Managed drops mutate paths, child arrays, or parent IDs then rebuild |
| Leaf → group conversion | ✅ | Dropping onto a leaf makes it the parent of the moved row |
| Reparenting preserves expansion and re-aggregates | ✅ | Deterministic IDs and a group-stage refresh |
| Missing intermediates | ✅ | Filler nodes are generated for partial paths |
| Cyclic parents fail gracefully | ✅ | Warning plus accessible root placement; no traversal loop |
| Tree Data + Master/Detail | ✅ | `/master-detail` runs both modes |
| `aria-level` / `aria-expanded` | ✅ | Shared group-cell renderer semantics |
