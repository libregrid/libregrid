# Phase 10 — Tree Data & Master/Detail

**Status:** ⬜ Not started
**Depends on:** Phase 2 (`groupStage` is shared), Phase 3 (drag-drop infrastructure)
**Blocks:** nothing

**Packages:** `@libregrid/tree-data` (`TreeData`), `@libregrid/master-detail` (`MasterDetail`)
**Parity:** [`../parity/tree-data.md`](../parity/tree-data.md), [`../parity/master-detail.md`](../parity/master-detail.md)

---

## Context

Two hierarchy features that look similar but work quite differently.

**Tree data** is the same `groupStage` from Phase 2 in a different mode — hence the `treeData` / `hasTreeData` flags on `_IRowNodeGroupStage`. Nodes come from an explicit hierarchy rather than being derived from column values. Three source shapes are supported: `getDataPath` (path array per row), `treeDataChildrenField` (nested arrays), and `treeDataParentIdField` (flat rows with parent pointers). **Extend the Phase 2 stage; do not fork it.**

Managed row dragging is the hard part (added in AG Grid v34): dragging a node reparents it, and a leaf dropped onto another leaf must **convert that leaf into a group**. Reparenting must maintain aggregates and expansion state.

**Master/detail** embeds a full nested grid inside an expanded row. The risk here is lifecycle: detail grids are real grid instances that must be created and destroyed cleanly. Leaks show up as memory growth over repeated expand/collapse, which is why the acceptance criterion is a 1,000-cycle test. `keepDetailRows` / `keepDetailRowsCount` control caching, and `refreshStrategy` governs how a detail grid reacts to master data changes.

AG Grid v34.1 added tree-data-with-master-detail; support the combination.

---

## Todo

### 10A — `@libregrid/tree-data`

- [ ] Extend Phase 2's `GroupStage` with tree mode (`treeData`, `hasTreeData` flags)
- [ ] Source shape: `getDataPath` (path array)
- [ ] Source shape: `treeDataChildrenField` (nested children, via `NestedDataGetter`)
- [ ] Source shape: `treeDataParentIdField` (flat + parent id)
- [ ] Options: `treeData`, `treeDataDisplayType` (`'auto'|'custom'`), `autoGroupColumnDef`, `groupDefaultExpanded`, `isGroupOpenByDefault`, `suppressGroupRowsSticky`
- [ ] Aggregation over tree nodes (reuse Phase 2 `aggStage`)
- [ ] **Managed row dragging**: reparenting, reordering, leaf→group conversion
- [ ] Filtering a tree (retain ancestors of matches)
- [ ] Tree data combined with master/detail (v34.1)

### 10B — `@libregrid/master-detail`

- [ ] Bean `masterDetailSvc`; detail grid registry and lifecycle
- [ ] `agDetailCellRenderer` full-width row component
- [ ] Options: `masterDetail`, `isRowMaster`, `masterDefaultExpanded`, `isMasterOpenByDefault`, `detailCellRenderer`, `detailCellRendererParams`, `detailRowHeight`, `detailRowAutoHeight`, `keepDetailRows`, `keepDetailRowsCount`
- [ ] `IDetailCellRendererParams`: `detailGridOptions`, `getDetailRowData`, `refreshStrategy` (`'rows'|'everything'|'nothing'`), `template`
- [ ] Detail grid API access from the master grid
- [ ] `detailRowAutoHeight` sizing to detail content
- [ ] Deterministic destruction of detail grids on collapse (subject to `keepDetailRows`)

---

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | Tree construction from each of the three source shapes producing identical node trees for equivalent data. Path normalisation (duplicate paths, missing intermediates). Reparent validity (a node cannot become its own descendant) |
| **Integration** | Aggregates correct over tree hierarchies. Filtering retains ancestor chains. Drag-reparent updates the tree and re-aggregates. Leaf→group conversion on drop. Detail grid mounts with correct data; `refreshStrategy` variants behave as documented; `keepDetailRows` caches and `keepDetailRowsCount` bounds the cache |
| **E2E** | Expand a tree three levels; drag a node onto a different parent; drop a leaf onto a leaf and confirm it becomes a group. Expand a master row → detail grid renders and is independently scrollable/sortable |
| **Memory** | **1,000 expand/collapse cycles** on master rows; assert no unbounded growth in detail-grid instance count or heap. This is a gate criterion |
| **a11y** | Tree rows expose `aria-level` and `aria-expanded`; detail grids are reachable and escapable by keyboard; axe 0 violations light + dark |

**Specific edge cases to cover:**
- Missing intermediate path nodes (`['a','b','c']` with no `['a','b']` row) — filler nodes
- Cyclic parent references in `treeDataParentIdField` (must fail gracefully, not hang)
- Dragging a group node with expanded descendants
- `isRowMaster` returning false for all rows
- Detail grid whose `getDetailRowData` resolves asynchronously after collapse
- Tree data + master detail combined

---

## Acceptance criteria

- [ ] All **three** tree source shapes render identical trees for equivalent data
- [ ] Aggregation correct across tree hierarchies
- [ ] Drag-reorder reparents correctly, **including leaf→group conversion**
- [ ] Reparenting preserves expansion state and re-aggregates
- [ ] Cyclic/invalid hierarchies fail gracefully with a clear diagnostic
- [ ] Detail grids mount and unmount cleanly — **no leaks over 1,000 expand/collapse cycles**
- [ ] All three `refreshStrategy` modes behave as documented
- [ ] Tree data + master/detail combination works
- [ ] Both parity checklists fully marked ✅/🟡/❌ with rationale
- [ ] Full Definition of Done (`standards.md` §9) satisfied
