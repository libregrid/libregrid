# @libregrid/all

A convenience entry point for a broad set of LibreGrid modules and helpers.
Use named imports to register the features you need. Individual packages offer
a smaller dependency graph and make application dependencies more explicit.

[Documentation and examples](https://libregrid.dev/packages) · [Getting started](https://libregrid.dev/getting-started)

## Install

```bash
npm install "ag-grid-community@^36.1.0" "ag-charts-community@^14.1.0" @libregrid/all
```

This package declares Angular core, common, CDK, and Material (`>=20`) as peers
as well as AG Grid (`>=36.1.0 <37`) and AG Charts (`>=14.1.0 <15`). In an Angular
project, keep the Angular packages aligned with that application's version. In
a plain TypeScript project, individual feature packages avoid these Angular
dependencies and are usually a better fit.

## Usage

Add a container to your page:

```html
<div id="grid" style="height: 400px"></div>
```

Register named modules before creating a grid:

```ts
import { AllCommunityModule, ModuleRegistry, createGrid } from 'ag-grid-community';
import { RowGroupingModule, SetFilterModule, CellSelectionModule } from '@libregrid/all';

ModuleRegistry.registerModules([
  AllCommunityModule,
  RowGroupingModule,
  SetFilterModule,
  CellSelectionModule,
]);

createGrid(document.querySelector<HTMLElement>('#grid')!, {
  columnDefs: [
    { field: 'country', rowGroup: true, hide: true },
    { field: 'product', filter: 'agSetColumnFilter' },
    { field: 'sales', aggFunc: 'sum' },
  ],
  rowData: [
    { country: 'Canada', product: 'Notebook', sales: 120 },
    { country: 'Canada', product: 'Pen', sales: 80 },
    { country: 'Japan', product: 'Notebook', sales: 240 },
  ],
  cellSelection: true,
});
```

Importing this package does not register modules automatically. In Angular,
pass the modules to `provideLibreGrid` as shown in the
[Angular quick start](../angular/README.md).

## Scope and dependency tradeoffs

This entry point re-exports selected modules and helpers, including
`RowGroupingEditModule`; it is not an export of every symbol in the monorepo.
In particular, install and import the following packages directly:

- [`@libregrid/calculated-columns`](../calculated-columns/README.md)
- [`@libregrid/toolbar`](../toolbar/README.md)
- [`@libregrid/ai-client`](../ai-client/README.md)
- [`@libregrid/ai-protocol`](../ai-protocol/README.md)
- [`@libregrid/ai-gateway`](../ai-gateway/README.md)

Bundlers can remove unused exports, but the installed dependency graph still
includes the feature packages, Angular integration, and Material bridge. Prefer
individual packages when you want explicit dependencies or need to control
bundle size. See the [full package catalog](../../README.md#packages).

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
