# @libregrid/server-side-selection

Maintain a selection across pages, filters, and groups in a server-side grid.
The browser holds a compact selection specification and flags for loaded rows.
Your provider stores and evaluates the selection, including persistence across
sessions when implemented by your backend.

[Documentation and examples](https://libregrid.dev/server-side-selection)

## Install

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/server-side-selection
```

Requires `ag-grid-community >=36.1.0 <37` as a peer dependency.
`@libregrid/server-side-row-model` (and `@libregrid/core`) are installed
automatically.

## Usage

Supply a `ServerSideSelectionProvider` backed by your application and a
server-side datasource. This setup function deliberately accepts both: the
package does not supply a persistence service or a database query endpoint.
See the [live example](https://libregrid.dev/server-side-selection) for a
complete browser mock of the provider contract.

```html
<div id="grid" style="height: 400px"></div>
<div id="footer"></div>
```

```ts
import {
  AllCommunityModule,
  ModuleRegistry,
  createGrid,
  type IServerSideDatasource,
} from 'ag-grid-community';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';
import {
  ServerSideSelectionModule,
  type ServerSideSelectionProvider,
} from '@libregrid/server-side-selection';

interface Trade {
  id: string;
  quantity: number;
}

ModuleRegistry.registerModules([
  AllCommunityModule,
  ServerSideRowModelModule,
  ServerSideSelectionModule,
]);

export function createTradeGrid(
  provider: ServerSideSelectionProvider,
  datasource: IServerSideDatasource<Trade>,
  tabId: string,
) {
  return createGrid<Trade>(document.querySelector<HTMLElement>('#grid')!, {
    columnDefs: [{ field: 'id' }, { field: 'quantity' }],
    rowModelType: 'serverSide',
    rowSelection: { mode: 'multiRow', selectAll: 'currentPage' },
    getRowId: ({ data }) => data.id,
    serverSideDatasource: datasource,
    ssrmSelection: {
      provider,
      gridId: 'trades',
      tabId,
      onReady: (service) => {
        service.attachFooter(document.querySelector<HTMLElement>('#footer')!);
      },
    },
  });
}
```

Choose stable `gridId` and `tabId` values if the selection should survive reloads.
Use distinct tab IDs for independent selections. These identifiers are storage
keys, not authorization: the backend must scope reads and writes to the caller.

Use the `rowSelection` configuration for checkboxes. Also setting the deprecated
`checkboxSelection` column property creates duplicate checkbox controls.

## Provider contract

The provider is the only durable truth. All calls are keyed by
`{gridId, tabId}` so open tabs own independent selections.

| Method                                                  | Purpose                                                                                                                                                                                                                                            |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getSpec({gridId, tabId})`                              | Return the current spec: `{ terms, selectedCount }`. `terms` is the capture order of `all` (filter) and `group` (route) terms; `selectedCount` is the server-side total.                                                                           |
| `applyOps({gridId, tabId, ops})`                        | Apply a batch of ops atomically (server-side). Ops are small — at most one filter model, one group route, or one cache-sized id batch.                                                                                                             |
| `resolveSelected({gridId, tabId, rowIds, groupRoutes})` | Evaluate the spec for a batch of **loaded** rows. `rowIds` are `getRowId` values; `groupRoutes` are `getSsrmRoute` arrays serialized as `\|`-joined strings. Return a map of each sent key to its selected state; missing keys default to `false`. |

Resolve membership for the requested loaded rows without materializing the
entire selected dataset in the browser. Store specifications, additions, and
exceptions on your backend and apply each operation batch atomically.

### Ops

| Op                                | Effect                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `selectAll {filter}`              | Append the `all` term for `filter`; the server clears the in-scope exceptions first. |
| `deselectAll`                     | Clear every term, exception, and addition.                                           |
| `select {ids}` / `deselect {ids}` | Row-level additions / exceptions.                                                    |
| `selectGroup {route}`             | Append the `group` term for `route`; clears the route's exceptions.                  |
| `deselectGroup {route}`           | A route exception.                                                                   |

## Selection behavior

- **Terms accumulate.** Selecting under one filter, then another, keeps
  both selections (union of terms).
- **Survive filter changes.** Clearing or changing filters never touches
  the selection; the spec is filter-independent.
- **Exceptions override terms.** A deselected row/group stays
  deselected even if a later term would match it.
- **Select All (filtered).** Clears the in-scope exceptions and appends
  the `all` term.
- **Groups are atomic.** Selecting any row under a group (or the group
  itself) selects/deselects the whole group route.
- **"Show All Selected".** Toggling the footer's view makes the
  selection _the dataset_ (pagination total = selected count). Filters still
  apply on top. The datasource must implement the selection-view query described below.
- **Header checkbox is viewport-only.** With `selectAll: 'currentPage'`
  the header checkbox checks/unchecks the visible viewport; spec-level
  select-all/deselect-all live in the footer.

### The selection-view datasource contract

When the user activates **Show All Selected**, the package flips the grid
option `ssrmSelectionViewActive` to `true` and calls `refreshServerSide()`.
Your `serverSideDatasource` should read that option (via the grid) and,
while it is `true`, constrain its query to
`selected(spec) AND filterModel` and report `rowCount` as that intersection.
The package never snapshots or restores your filters. Deactivating the view
flips the option back to `false` and refreshes.

## API

| Export                       | Purpose                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `ServerSideSelectionModule`  | Registers the SSRM `selectionSvc` bean and the feature service.                              |
| `ServerSideSelectionService` | The row-model-specific selection service (extends community `BaseSelectionService`).         |
| `SsrmSelectionService`       | The feature service: op capture, spec lifecycle, hydration, footer, selection view.          |
| `ssrmSelectionCss`           | Styles for the service-built footer (also injected by the module).                           |
| `getSsrmRoute(node)`         | _(from `@libregrid/server-side-row-model`)_ A node's group route, or `undefined` for a leaf. |

`SsrmSelectionService` methods: `attachFooter`, `detachFooter`,
`selectAllFiltered`, `deselectAll`, `enterViewMode`, `exitViewMode`,
`toggleViewMode`, `isViewActive`, `getSpec`, `refresh`. The grid also gains
`api.refreshSsrmSelection()`.

## Angular

Use the same column definitions and grid options with `ag-grid-angular`.
Register the modules shown above through `provideLibreGrid` from
[`@libregrid/angular`](../angular/README.md). See the
[Angular setup](https://libregrid.dev/angular) for a complete component and bootstrap example.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
