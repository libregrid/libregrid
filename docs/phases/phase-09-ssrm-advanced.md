# Phase 9 — SSRM Grouping/Pivot & Viewport Row Model

**Status:** ⬜ Not started
**Depends on:** Phase 7 (SSRM stores), Phase 2 (grouping), Phase 6 (filter models), Phase 8 (pivot)
**Blocks:** nothing

**Packages:** `@libregrid/server-side-row-model` (part 2), `@libregrid/viewport-row-model` (`ViewportRowModel`)
**Parity:** [`../parity/server-side-row-model.md`](../parity/server-side-row-model.md), [`../parity/viewport-row-model.md`](../parity/viewport-row-model.md)

---

## Context

Phase 7 delivered SSRM for flat data. This phase makes it work with the grid's analytical features, which is where SSRM gets genuinely hard: the **server** performs grouping, pivoting, filtering and sorting, and the grid must express its intent in the request and correctly interpret the response.

The core change is that the store becomes **hierarchical** — each expanded group node owns its own child store, loaded lazily on expand. A grid with three group levels expanded across many branches has a tree of stores, each with its own block state.

Key design points:
- `IServerSideGetRowsRequest` gains `rowGroupCols`, `groupKeys`, `valueCols`, `pivotCols`, `pivotMode`, `filterModel`, `sortModel`. The `groupKeys` array identifies which node's children are being requested.
- Expand/collapse-all across a lazily-loaded tree is genuinely tricky — `ssrmExpandAllAffectsAllRows` governs the semantics.
- Aggregates come **from the server**, not from `aggStage`. Do not accidentally re-aggregate client-side.

The **Viewport Row Model** is a separate, much smaller row model for streaming/live-updating datasets where the server pushes the visible window. It ships here because it shares request/response plumbing concepts and is otherwise homeless.

---

## Todo

### 9A — SSRM grouping, pivot, filter, sort

- [ ] Hierarchical stores — child store per expanded group node
- [ ] Request extension: `rowGroupCols`, `groupKeys`, `valueCols`, `pivotCols`, `pivotMode`, `filterModel`, `sortModel`
- [ ] Server-side **grouping** with lazy child loading on expand
- [ ] Server-supplied aggregates on group rows (no client-side re-aggregation)
- [ ] Server-side **pivoting**; `setPivotResultColumns` driven by the response
- [ ] Bean `ssrmFilterListener` — refresh affected stores on filter change
- [ ] Bean `ssrmSortSvc` — sort model propagation and store refresh
- [ ] Bean `ssrmExpandListener` — expand/collapse triggering child-store load
- [ ] Bean `ssrmListenerUtils`
- [ ] Expand-all / collapse-all for group rows; `ssrmExpandAllAffectsAllRows`
- [ ] Group-level selection semantics (select group ⇒ descendants)
- [ ] Extend the `apps/docs` mock server to perform real grouping/pivot/filter/sort

### 9B — `@libregrid/viewport-row-model`

- [ ] `ViewportRowModel` implementing `iViewportRowModel`; `rowModelType: 'viewport'`
- [ ] `iViewportDatasource`: `init`, `setViewportRange`, `destroy`
- [ ] `setRowCount`, `setRowData` push-update path
- [ ] Viewport range change notification as the user scrolls
- [ ] Streaming demo route in `apps/docs`

---

## Test plan

| Tier | Coverage |
|---|---|
| **Unit** | `groupKeys` construction for a node at depth N. Request assembly from combined grouping + pivot + filter + sort state. Store-tree addressing (locate the store owning a given node) |
| **Integration** | Expanding a group requests exactly that node's children, once. Aggregates render from the server payload without client re-aggregation. Changing a filter refreshes affected stores only. Sorting propagates and refreshes. Pivot mode drives result columns from the response. Expand-all under both `ssrmExpandAllAffectsAllRows` settings. Viewport model tracks scroll and applies pushed updates |
| **E2E** | Expand three levels deep in a 1M-row grouped mock; assert correct rows and no duplicates. Filter while groups are expanded; expansion state behaves as documented. Viewport route shows live-updating rows without flicker |
| **Performance** | Deep expansion (3 levels, 50 expanded nodes): request count bounded, no request storm; scroll FPS within baseline |
| **a11y** | Group rows expose `aria-expanded` and loading state; axe 0 violations light + dark |

**Specific edge cases to cover:**
- Expanding a node whose parent store is evicted mid-flight
- Filter change while several child-store requests are in flight
- Group with zero children returned
- Pivot result columns changing between responses
- Selection across a collapse→expand cycle
- Viewport datasource pushing a row count smaller than the current scroll position

---

## Acceptance criteria

- [ ] Server-side grouped data expands lazily with **correct server-supplied aggregates**
- [ ] Filter, sort and pivot all propagate into requests and refresh the right stores
- [ ] Expand-all / collapse-all correct under both `ssrmExpandAllAffectsAllRows` settings
- [ ] No client-side re-aggregation of server-supplied group values
- [ ] In-flight request races resolve without corrupt row state
- [ ] Viewport row model tracks a streaming datasource and applies pushed updates
- [ ] Deep expansion produces a bounded request count (no storm)
- [ ] Both parity checklists fully marked ✅/🟡/❌; Phase 7's 🟡 items now resolved
- [ ] Full Definition of Done (`standards.md` §9) satisfied
