# Phase 16 — Server-Side Selection (new feature, beyond parity)

**Status:** ✅ Implemented — package built, tested (6/6 selection spec, 17/17 SSRM regression), and
wired (barrel, budgets, changeset, docs route + e2e). Design locked with the user 2026-08-20 (Q&A).
**Depends on:** Phases 7/9 (`@libregrid/server-side-row-model`), Phase 13 core
**Blocks:** nothing

**Packages:** new `@libregrid/server-side-selection`; modified `@libregrid/server-side-row-model`
(one-line `forEachNodeAfterFilter` fix, §6), `@libregrid/all` (barrel)
**Parity:** none — this feature has no AG Grid Enterprise counterpart (Enterprise's SSRM
selection API is the in-session `getServerSideSelectionState`/`setServerSideSelectionState`
pair, which Phase 7/14-A9 already ships). The spec is defined by this document. Guardrail G2
applies only to the reused Community surface listed in §2.

---

## 1. Context

Target use: SSRM grids over datasets of ~10,000,000 rows where the user builds a working
selection across sessions:

1. Filter to *All Dell Devices* → **Select All** → filter to *All HP Devices* → **Select All**
   → clear all filters → the full list is visible with **both** Dell and HP rows selected.
2. A **"Show All Selected"** view shows the selection *as the dataset* (pagination total =
   selected count). Filters still apply **on top of** it: with 3,000 selected, filtering "Dell"
   shows the selected Dells; unchecking rows (header checkbox, viewport-only) removes them
   from the selection itself; clearing the filter then shows 2,700.
3. **Tab isolation:** each `{gridId}:{tabId}` owns an independent selection list; two open tabs
   never share or clobber each other.
4. **Hard constraint:** the client never holds a selection list larger than the datasource
   cache. No client-side list of millions of ids — only the compact spec (terms) plus
   per-row flags for loaded rows.

The grid stores no durable selection truth. The app's backend (e.g. Redis) is the source of
truth; the grid is a projection; this package is the middleware — event wiring, hydration,
ops batching, and the selection UI (footer panel).

## 2. Verified contracts (ag-grid-community@36.1.0, this design session)

- **`selectionChanged` event** (`types/src/events.d.ts`): `{ source: SelectionEventSourceType,
  selectedNodes: IRowNode[] | null, serverSideState: IServerSideSelectionState |
  IServerSideGroupSelectionState | null }`. `source` distinguishes `checkboxSelected`,
  `rowClicked`, `uiSelectAll`, `uiSelectAllCurrentPage`, `keyboardSelectAll`, `spaceKey`,
  `api`, … The Community core always dispatches `serverSideState: null`
  (`main.esm.mjs` `dispatchSelectionChanged`) — a reserved seam this package does not rely on.
  Bulk flips coalesce into a single event.
- **`rowSelected`** fires per node on every `__selected` flip, including flips made by
  `api.setNodesSelected` — the SSRM bean's recording path (§2, next).
- **SSRM durable flat state** (`@libregrid/server-side-row-model`): the bean owns
  `{ selectAll, toggledNodes }` keyed by `getRowId` plus `selectedGroupRoutes`; it records
  every `rowSelected` (`updateSelection`) and reapplies state at every node-materialization
  site (`applySelection`: root rows, lazy blocks, group nodes, hierarchy leaves, transaction
  updates) with a `selectionUpdateInProgress` feedback guard. `getRowId` is mandatory for
  durable behavior. `getServerSideSelectionState`/`setServerSideSelectionState` remain the
  **in-session snapshot** API — this feature does not use them as truth.
- **Header checkbox scopes** (`rowSelection.selectAll: 'all' | 'filtered' | 'currentPage'`):
  Community's `RowSelectionModule` registers its `selectionSvc` bean only for the
  `clientSide`/`infinite`/`viewport` row models, so an SSRM grid boots with **no** selection
  service — every checkbox, header, keyboard, and API selection gesture was a silent no-op.
  `ServerSideSelectionService` (this package's `selectionSvc` bean for `serverSide`) fills that
  seam natively and implements `getNodesToSelect` for all three scopes (`'currentPage'` walks
  `PageBoundsService` page bounds, `'filtered'` walks `forEachNodeAfterFilter`, `'all'` walks
  `forEachNode`), so the header checkbox checks **and** unchecks the viewport and the
  `selectAll`/`deselectAll` API family all dispatch real events on SSRM.
- **`api.setNodesSelected({ nodes, newValue, source? })`** — bulk flip, single coalesced
  `selectionChanged`. The hydration path.
- **Counts:** the datasource's `success({ rowCount })` is the filtered total — the N for
  "Select All (N)". `api.getFilterModel()`/`setFilterModel()` carry the same `FilterModel`
  that Phase 9 forwards in every SSRM request, so the backend already evaluates any
  `FilterModel` this feature produces.
- **`api.refreshServerSide()`** re-requests the root store; pagination options are untouched.

## 3. The selection spec (server-side, per `{gridId}:{tabId}`)

```
spec:
  terms: [ { type: 'all', filter: FilterModel }     // one per "Select All" under that filter
         | { type: 'group', route: string[] } ]     // one per user-selected group
  exceptions: Set<rowId | groupRoute>   // server-only: user deselects
  additions:    Set<rowId>              // server-only: user selects outside terms

selected(x) = (x matches any term  OR  x ∈ additions)  AND  x ∉ exceptions
  flat mode:    x matches term = row matches term.filter
  grouped mode: a group matches term = ANY of its rows matches term.filter
                (the whole group is then selected — rule R5)
```

The client holds **terms + in-flight ops + loaded nodes' `__selected` flags** and nothing
else. `exceptions`/`additions` never materialize in the browser; they are resolved on demand
for loaded rows via the provider. Every id the client knows was loaded, so client selection
state is bounded by the datasource cache.

### Ops protocol (the client's only writes — always small)

```ts
type SelectionOp =
  | { op: 'selectAll', filter: FilterModel }   // append term (server dedupes); clears
  | { op: 'deselectAll' }                      //   in-scope exceptions (R4); clears terms,
  | { op: 'select', ids: string[] }            // exceptions, additions
  | { op: 'deselect', ids: string[] }
  | { op: 'selectGroup', route: string[] }     // append group term; clears route exceptions
  | { op: 'deselectGroup', route: string[] }   // route exception
```

### Provider interface (app-implemented — the Redis/DB seam)

```ts
interface ServerSideSelectionProvider {
  getSpec({ gridId, tabId }): Promise<{ terms: SelectionTerm[]; selectedCount: number }>
  applyOps({ gridId, tabId, ops: SelectionOp[] }): Promise<void>
  resolveSelected({ gridId, tabId, rowIds: string[], groupRoutes: string[] }):
      Promise<Record<string, boolean>>   // server evaluates the spec for a loaded batch
}
```

### Locked semantics (from design Q&A)

- **R1 — terms accumulate.** Select All under filter F appends a term; it never replaces.
  Dell → Select All → HP → Select All → clear filters ⇒ Dells **and** HPs selected.
- **R2 — selections survive filter changes.** Clearing/changing the filter never clears the
  selection. The selection is a persistent worklist, not a view artifact.
- **R3 — exceptions override terms.** Deselecting a group that a term selected records a
  route exception; net effect: that group is no longer selected. (The only mechanism by
  which group-deselect can mean anything while the term persists.)
- **R4 — Select All is a reset within its scope.** `selectAll(F)` clears every exception F
  would match, then (re)adds the term (deduped). Same for `selectGroup(route)`. A repeated
  Select All under F re-selects rows the user had deselected within F — predictable,
  Gmail-style.
- **R5 — groups are atomic.** With grouping active: a filter term matching any row of a
  group selects the whole group; selecting one row in a group selects the whole group;
  deselecting one row in a group deselects the whole group. No partial groups.
- **R6 — "Show All Selected" is a view mode, not a filter.** While active the datasource
  query is `selected(spec) AND <filterModel>` — filters are untouched and keep working on
  top of the selection. No filter snapshot/clear/restore. Pagination/page size untouched.
  The view never recalls or displays how the selection was built.
- **R7 — "current page" = visible viewport** (the `pageBounds` range), identical to the
  header checkbox's reach.

## 4. Package shape

**`@libregrid/server-side-selection`** — the module reuses the community
`RowSelection` module name with `rowModels: ['serverSide']` (`ModuleName` is a closed union —
`'ServerSideSelection'` does not exist; the `(rowModel, moduleName)` registry keying means it
complements Community's CSR-gated module and the app may register both).
`enterprise: true`, `dependsOn: [EnterpriseCoreModule, ServerSideRowModelModule,
SharedRowSelectionModule]`, `lgr-` CSS (G4), `apiFunctions: { refreshSsrmSelection }`
(refetch spec + re-resolve the loaded set).

**Bean architecture (managed sub-bean):** `ServerSideSelectionService`
(`beanName: 'selectionSvc'`) is the module bean — the row-model-specific half of the
community selection seam (extends `BaseSelectionService`). The feature service
`SsrmSelectionService` has **no** bean name (`beanName` is a closed
`keyof BeanCollection` union) — it is a managed sub-bean created via
`createManagedBean` in the selection service's `postConstruct` (lifecycle:
init → preWire → wire → pre/postConstruct, destroyed with the parent), exposed via
`getSsrmSelectionService()`.

Grid option:

```ts
ssrmSelection: {
  provider: ServerSideSelectionProvider,
  tabId: string,                    // app's tab identity → {gridId}:{tabId} isolation
  gridId?: string,                  // defaults to the grid's id
  opDebounceMillis?: number,        // default 300
  onReady?: (svc: SsrmSelectionService) => void,  // app mounts the footer via the service
}
```

**Required consumer grid options** (validated with a prefixed `console.warn` otherwise —
the repo's free-form logging convention; `beans.log` is error-IDs only):
`rowModelType: 'serverSide'`, `rowSelection: { mode: 'multiRow', selectAll: 'currentPage' }`,
stable `getRowId`.

**Service responsibilities**

- **Spec lifecycle** — `getSpec` on the first model update and after every `applyOps` ack
  (request-id guarded). `onReady` fires on the first hydration that resolved **actual**
  loaded rows (the grid's first `modelUpdated` can arrive before any row materialises —
  those empty hydrations are skipped).
- **Hydration** — on every global `modelUpdated`: collect all currently loaded leaf row ids +
  group routes (cache-bounded by construction — partial-mode `forEachNode` iterates exactly
  the cached block rows, stubs excluded), `provider.resolveSelected`, diff against current
  node flags, apply the delta via `api.setNodesSelected` (≤ 2 calls, `source: 'api'`,
  inside a guard flag). v1 re-resolves the **whole loaded set per model update** — the
  service keeps no answered-bookkeeping, so the pass is idempotent and self-healing; the
  cost is one provider query carrying ≤ `maxBlocksInCache × cacheBlockSize` ids per model
  update, and grid writes are delta-only. A generation counter (bean `loadGeneration`
  pattern) drops stale in-flight `resolveSelected` responses. The package only ever sends
  cache-sized id batches — **responsiveness is the provider/backend's own caching** (the
  app's Redis etc.), by design.
  - **Governing invariant — working-copy lifetime = row cache lifetime.** The API is the
    only truth of what is selected. The SSRM bean's flat state is a query-avoidance cache,
    not a selection list: a row still in the grid cache may get its flag back from
    `applySelection` with no query; the moment a row is evicted, its state is purged with
    it (§6.3, bean-enforced); when the row is requested again, the API answers again. The
    core fires global `rowSelected` per user/`setNodesSelected` flip → the bean records
    for free (O(1) after §6.3) → the working copy stays in sync with no package
    involvement; hydration re-verifies on the same model update (diff usually empty).
    Verified silent: the bean's `applySelection` flips dispatch `rowSelected`
    per-node-local only (community `RowNode.dispatchRowEvent` never reaches the global
    bus), and the core dispatches `selectionChanged` only from its own methods with an
    explicit `source` — so reapplication on re-materialization never reaches the capture
    listener (no phantom ops). Cosmetic: a one-frame checkbox flash is possible when a
    freshly loaded block's baseline default disagrees with the truth; block prefetching
    makes this land off-screen in practice — documented, not fixed, in v1.
- **Change capture** — per-node **`rowSelected`** listener (the core fires it on every
  `__selected` flip, including `setNodesSelected`); the runtime `source` is read off the
  event (a cast — it is not on the typed event). Ignored: `api`, `selectableChanged`, and
  guard-flagged hydration. Sources that mean "select all in scope" (`uiSelectAll`,
  `uiSelectAllFiltered`, `apiSelectAllFiltered`) → a single `selectAll {filter:
  getFilterModel()}` / `deselectAll` op (R4); every other flip is per-node — a group node,
  or a leaf under a group ancestor, promotes to `selectGroup`/`deselectGroup` (route read
  via `getSsrmRoute`, §6; R5, v1 = nearest group ancestor), a flat leaf →
  `select`/`deselect [id]`. Enqueue merges same-kind id ops, cancels opposite ops for the
  same ids, dedups group routes, `selectAll` subsumes pending selects, `deselectAll`
  clears the queue; flushed through the debounce (default 300 ms).
- **Header checkbox** — both check **and** uncheck now dispatch real viewport flips (§2:
  the `selectionSvc` bean fills the seam natively, so there is no core no-op to work
  around). The per-node capture turns the `uiSelectAllCurrentPage` flips into viewport
  `select`/`deselect [ids]` ops (R7).
- **Selection view** — manages the internal grid option `ssrmSelectionViewActive`:
  enter = set true + `api.refreshServerSide()`; exit = set false + refresh. While active,
  each `applyOps` ack triggers a refresh so deselected rows leave the view. "Select All"
  is disabled; "Deselect All" clears the whole selection.
- **Counts** — "selected on current page": walk `pageBounds` first..last over
  `rowModel.getRow(i)` (service is a bean; same reach as the core's `forEachNodeOnPage`).
  "Total Selected": `getSpec().selectedCount`. Select All label N: the store's `rowCount`
  (the filtered total from the last `success`).

**Footer panel** — service-built component (`lgr-` prefix), app-mounted via
`onReady` → `svc.attachFooter(container)` / `svc.detachFooter()`:

- info **"Selected on current page: X"** (viewport, R7)
- info **"Total Selected: Y"** (server aggregate)
- action **"Select All (N)"** / "Select All" (N = filtered total when a filter is active)
- action **"Deselect All"**
- action **"Show All Selected (N)"** ⇄ **"Show All Records"** (view toggle, R6)

No separate Gmail-style banner in v1 — the Select All action carries the count. (Banner
listed as future, §8.)

**Datasource contract (app-side, documented in the package README):** when
`ssrmSelectionViewActive` is true the SSRM datasource MUST constrain results to
`selected(spec)` while still applying `filterModel`, and `rowCount` must be that
intersection. The provider/backend owns the spec evaluation; the package only flips the
option and refreshes.

## 5. Flows (locked walkthroughs)

**Build-up:** filter `brand=Dell` → Select All (op `selectAll {brand:Dell}`; loaded rows
flipped on optimistically) → filter `brand=HP` → Select All (term appended) → clear filters
→ hydration shows Dells + HPs selected (R1/R2).

**View + correction:** selection = 3,000 → Show All Selected → option on, refresh →
pagination total 3,000 → filter `Dell` → view = selected ∩ Dell (300) → header uncheck
scrubs the viewport (R7): each uncheck = `deselect` op, row leaves the selection, view
refreshes without it → clear `Dell` → 2,700 (R6).

**Group (grouped by brand):** Select All under any filter whose match lands in a group
selects the whole group (R5); unchecking one row in the Dell group deselects the whole
Dell group (route exception, R3); a later Select All under `brand=Dell` clears that
exception and re-selects the group (R4).

## 6. `@libregrid/server-side-row-model` changes

1. **`forEachNodeAfterFilter(callback)`** — delegate to
   `forEachNodeAfterFilterAndSort` (in SSRM loaded ≡ after-filter; the server filters).
   Feeds the `selectionSvc` bean's `'filtered'` scope (`getNodesToSelect`), so the header
   checkbox and `selectAllFiltered`/`deselectAllFiltered` work natively in both directions.
2. **`getSsrmRoute(node): string[] | undefined`** — export the group-route marker
   (`__lgrSsrmRoute`) so the selection package can emit route ops without string-parsing
   node ids.
3. **Working-copy hygiene** (bean-enforces the §4 invariant; without it the flat state
   grows monotonically for the session — eviction never prunes it — and every op is O(n)):
   - `toggledNodes` is an internal `Set` (O(1) add/has/delete); the public
     `IServerSideSelectionState` shape is unchanged (`getSelectionState` converts to an
     array).
   - `evictBlocks` purges the evicted blocks' leaf ids from `toggledNodes` and their group
     routes from `selectedGroupRoutes` — state leaves the client with the row (the
     governing invariant: the working copy's lifetime = the row cache's lifetime).
   - `refreshStore` **preserves** the working copy (it clears the block/root store but not
     the selection state, so re-materialised rows get their flags back from
     `applySelection` with no provider query); `setDatasource` is the only **reset** — a
     brand-new datasource invalidates every id, so the working copy is cleared and every
     row is re-resolved by hydration.

## 7. Out of scope / future

- Cross-tab shared selection + invalidation (per-tab isolation is the design).
- Gmail-style floating banner (footer count label covers v1).
- `applyServerSideTransaction` removals for view-mode deselects (v1 refreshes the store).
- Infinite row model (SSRM only). `singleRow`/`none` selection modes (feature requires
  `multiRow`; the service warns).
- `serverSideState` population on `selectionChanged` (reserved core seam; unused).

## 8. Test plan

- **Unit** — spec evaluation (formula, R1–R5), op derivation from `selectionChanged`
  sources (incl. guard/hydration exclusion and group promotion), viewport counting,
  debounce/flush.
- **Integration** (real grid + mock SSRM datasource + in-memory provider):
  hydration + block eviction + reload keeps flags **while cached**; eviction **purges the
  working copy** (bean state no longer holds the evicted ids) and re-request re-resolves
  from the provider (assert provider query count); toggle → batched `applyOps` with no
  hydration echo; header check selects viewport ids; **header uncheck deselects viewport
  (the 102 no-op case)**; group promotion both directions; Select All op carries
  `getFilterModel()` and label N = filtered `rowCount`; R4 reset (deselect within F, Select
  All again ⇒ re-selected); selection view enter/deselect-refresh/exit with filters active
  (the 3,000 → 300 → 2,700 walkthrough); `refreshSsrmSelection`.
- **E2E** (`apps/docs` route `/server-side-selection`, in-memory provider as "Redis",
  device dataset with a `brand` column, pagination): the full user walkthrough of §1 plus
  the grouped-mode cases; footer info/action assertions.

## 9. Definition of Done

- [x] `npx vitest run packages/server-side-selection` green (unit + integration) — 6/6.
- [x] Full suite green; `npm run verify` green (lint, test, build, contamination,
      versions, budgets).
- [x] `@libregrid/server-side-row-model` changes (§6) with regression tests (17/17); SSRM
      parity doc updated (Behaviour: selection working-copy lifetime row).
- [x] Wiring: tsconfig base paths, vitest alias, `packages/all` barrel,
      `bundle-budgets.json` (+ consumer fixture), `tools/version/generate.mjs`,
      `.changeset/p16-server-side-selection.md` (staged, unconsumed — lockstep, added to the
      `fixed` group).
- [x] Docs route (`/server-side-selection`) +
      `apps/docs-e2e/src/e2e/server-side-selection.spec.ts` (5 tests: capture, Select All /
      Deselect All, R6 selection view, light + dark axe).
- [x] Package README (install, provider contract, datasource contract for the selection
      view, required grid options, R1–R7 semantics) and a "beyond parity" note in
      `docs/parity/README.md`.
