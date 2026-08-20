# @libregrid/server-side-selection

Persistent, server-side row selection for AG Grid Community **server-side
row model** grids over very large data sets (~10,000,000 rows). The user
builds a working selection across filters, groups, pages, and **sessions**;
the grid only ever holds the compact selection *spec* plus per-row flags for
the rows currently in the datasource cache.

Works with [`@libregrid/server-side-row-model`](../server-side-row-model).
This feature has no AG Grid Enterprise counterpart — the spec is defined by
this package and its [phase document](../../docs/phases/phase-16-server-side-selection.md).

## Install

```bash
npm install ag-grid-community @libregrid/server-side-selection
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/server-side-row-model` (and `@libregrid/core`) are installed
automatically.

## Why

Community's `RowSelectionModule` only registers its selection service for
the `clientSide`/`infinite`/`viewport` row models. A server-side grid boots
with **no** `selectionSvc` bean, so the checkbox column, the header
select-all, row clicks, keyboard selection, and the `setNodesSelected` /
`selectAll` API family are all silent no-ops. This package fills that seam
for SSRM and adds the durable, spec-based selection layer on top.

## Usage

Register the module and set the required grid options:

```ts
import { ModuleRegistry, AllCommunityModule, createGrid } from 'ag-grid-community';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';
import { ServerSideSelectionModule } from '@libregrid/server-side-selection';
import type { ServerSideSelectionProvider } from '@libregrid/server-side-selection';

// The app's provider — the Redis/DB seam (see "Provider contract").
const provider: ServerSideSelectionProvider = { /* getSpec, applyOps, resolveSelected */ };

ModuleRegistry.registerModules([
  AllCommunityModule,
  ServerSideRowModelModule,
  ServerSideSelectionModule,
]);

createGrid<Trade>(document.querySelector('#grid')!, {
  rowModelType: 'serverSide',
  rowSelection: { mode: 'multiRow', selectAll: 'currentPage' }, // required
  getRowId: ({ data }) => data.id,                             // required — stable ids
  serverSideDatasource: datasource,
  ssrmSelection: {
    provider,
    tabId: 'devices',        // the app's tab identity → {gridId}:{tabId} isolation
    // gridId: 'grid-1',      // optional; defaults to the grid's own id
    // opDebounceMillis: 300, // optional; default 300
    onReady: (svc) => {
      // First rows are hydrated — mount the footer panel here.
      svc.attachFooter(document.querySelector('#footer')!);
    },
  },
});
```

`ServerSideSelectionModule` reuses the community `RowSelection` module name
gated to `rowModels: ['serverSide']`, so it coexists with Community's own
`RowSelectionModule` (which gates the other three row models) — every grid
type gets exactly one selection service.

**One checkbox per row.** The row-selection API (`rowSelection: { mode:
'multiRow' }`) renders the single row checkbox in the first column. Do **not**
also set `checkboxSelection: true` on a column — the deprecated column property
renders a *second* checkbox in the same row, two controls for one selection.
The service warns on boot if it finds one.

## Provider contract

The provider is the only durable truth. All calls are keyed by
`{gridId, tabId}` so open tabs own independent selections.

| Method | Purpose |
| --- | --- |
| `getSpec({gridId, tabId})` | Return the current spec: `{ terms, selectedCount }`. `terms` is the capture order of `all` (filter) and `group` (route) terms; `selectedCount` is the server-side total. |
| `applyOps({gridId, tabId, ops})` | Apply a batch of ops atomically (server-side). Ops are small — at most one filter model, one group route, or one cache-sized id batch. |
| `resolveSelected({gridId, tabId, rowIds, groupRoutes})` | Evaluate the spec for a batch of **loaded** rows. `rowIds` are `getRowId` values; `groupRoutes` are `getSsrmRoute` arrays serialized as `\|`-joined strings. Return a map of each sent key to its selected state; missing keys default to `false`. |

The package only ever sends cache-sized `rowIds`, so keep the spec hot in
your backend (Redis/DB) for low-latency `resolveSelected`.

### Ops

| Op | Effect |
| --- | --- |
| `selectAll {filter}` | Append the `all` term for `filter`; the server clears the in-scope exceptions first. |
| `deselectAll` | Clear every term, exception, and addition. |
| `select {ids}` / `deselect {ids}` | Row-level additions / exceptions. |
| `selectGroup {route}` | Append the `group` term for `route`; clears the route's exceptions. |
| `deselectGroup {route}` | A route exception. |

## Selection semantics (R1–R7)

- **R1 — Terms accumulate.** Selecting under one filter, then another, keeps
  both selections (union of terms).
- **R2 — Survive filter changes.** Clearing or changing filters never touches
  the selection; the spec is filter-independent.
- **R3 — Exceptions override terms.** A deselected row/group stays
  deselected even if a later term would match it.
- **R4 — Select All (filtered).** Clears the in-scope exceptions and appends
  the `all` term.
- **R5 — Groups are atomic.** Selecting any row under a group (or the group
  itself) selects/deselects the whole group route.
- **R6 — "Show All Selected".** Toggling the footer's view makes the
  selection *the dataset* (pagination total = selected count). Filters still
  apply on top. No filter snapshot/clear/restore — the datasource contract
  below does it.
- **R7 — Header checkbox is viewport-only.** With `selectAll: 'currentPage'`
  the header checkbox checks/unchecks the visible viewport; spec-level
  select-all/deselect-all live in the footer.

### The selection-view datasource contract (R6)

When the user activates **Show All Selected**, the package flips the grid
option `ssrmSelectionViewActive` to `true` and calls `refreshServerSide()`.
Your `serverSideDatasource` should read that option (via the grid) and,
while it is `true`, constrain its query to
`selected(spec) AND filterModel` and report `rowCount` as that intersection.
The package never snapshots or restores your filters. Deactivating the view
flips the option back to `false` and refreshes.

## API

| Export | Purpose |
| --- | --- |
| `ServerSideSelectionModule` | Registers the SSRM `selectionSvc` bean and the feature service. |
| `ServerSideSelectionService` | The row-model-specific selection service (extends community `BaseSelectionService`). |
| `SsrmSelectionService` | The feature service: op capture, spec lifecycle, hydration, footer, selection view. |
| `ssrmSelectionCss` | Styles for the service-built footer (also injected by the module). |
| `getSsrmRoute(node)` | *(from `@libregrid/server-side-row-model`)* A node's group route, or `undefined` for a leaf. |

`SsrmSelectionService` methods: `attachFooter`, `detachFooter`,
`selectAllFiltered`, `deselectAll`, `enterViewMode`, `exitViewMode`,
`toggleViewMode`, `isViewActive`, `getSpec`, `refresh`. The grid also gains
`api.refreshSsrmSelection()`.

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
