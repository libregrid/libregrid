# LibreGrid

> Enterprise-grade grid features for [AG Grid Community](https://www.npmjs.com/package/ag-grid-community), delivered as open-source modules.

[![npm version](https://img.shields.io/npm/v/%40libregrid%2Fcore.svg)](https://www.npmjs.com/package/@libregrid/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

LibreGrid gives `ag-grid-community` the advanced capabilities that teams
usually buy: row grouping, pivoting, server-side row models, cell selection
and clipboard, filter controls, menus, Excel export, charts, and more — as
MIT-licensed npm packages.

You keep the grid you already have. LibreGrid plugs into the Community module
registry, so your grid instance, column definitions, events, and options stay
exactly as they are. You register only the feature modules your application
uses; the rest never enters your bundle.

LibreGrid is an independent open-source project. It is not affiliated with,
endorsed by, or sponsored by AG Grid Ltd. “AG Grid” is a trademark of AG Grid Ltd.

## Quick start

Install AG Grid Community and the feature packages you need:

```bash
npm install ag-grid-community @libregrid/row-grouping
```

Register the feature module before creating a grid:

```ts
import { AllCommunityModule, createGrid, ModuleRegistry } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

createGrid(document.querySelector('#myGrid')!, {
  columnDefs: [
    { field: 'country', rowGroup: true, hide: true },
    { field: 'product' },
    { field: 'sales', aggFunc: 'sum' },
  ],
  rowData: [
    { country: 'United Kingdom', product: 'Widget', sales: 120 },
    { country: 'United States', product: 'Widget', sales: 240 },
  ],
});
```

Feature modules pull in the shared LibreGrid core automatically. Add more
feature packages and modules as your grid needs grow:

```ts
import { CellSelectionModule } from '@libregrid/cell-selection';
import { ClipboardModule } from '@libregrid/clipboard';
import { SetFilterModule } from '@libregrid/set-filter';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';

ModuleRegistry.registerModules([
  CellSelectionModule,
  ClipboardModule,
  SetFilterModule,
  ServerSideRowModelModule,
]);
```

## What you get

LibreGrid provides modular implementations of the most commonly requested
advanced grid capabilities:

| Area          | Features                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| Data shaping  | Row grouping, aggregation, pivoting, tree data, master/detail            |
| Large data    | Server-side row model, viewport row model, SSRM pagination               |
| Filtering     | Set Filter, Multi Filter, Filters Tool Panel, Advanced Filter, Find      |
| Interaction   | Cell-range selection, fill handle, clipboard copy/cut/paste, Rich Select |
| Data out      | Excel (.xlsx) export with grouped-row outlines, styling and multi-sheet |
| Grid UI       | Context and column menus, side bar, columns tool panel, status bar, quick access toolbar |
| Visualization | Integrated charts and sparklines                                         |
| Angular       | Angular module registration helpers, signals, and Material theme bridge  |

Every feature is a separate package. Import only what you need for a smaller
bundle. [`@libregrid/all`](./packages/all/README.md) is available for
prototypes and demos.

## Choose packages by feature

| Need | Package |
| --- | --- |
| Group, aggregate, or pivot client-side rows | [`@libregrid/row-grouping`](./packages/row-grouping/README.md), [`@libregrid/pivot`](./packages/pivot/README.md) |
| Load large or live server-backed data sets | [`@libregrid/server-side-row-model`](./packages/server-side-row-model/README.md), [`@libregrid/viewport-row-model`](./packages/viewport-row-model/README.md) |
| Provide filter controls | [`@libregrid/set-filter`](./packages/set-filter/README.md), [`@libregrid/multi-filter`](./packages/multi-filter/README.md), [`@libregrid/filters-tool-panel`](./packages/filters-tool-panel/README.md), [`@libregrid/advanced-filter`](./packages/advanced-filter/README.md) |
| Let users select, fill, copy, or paste cells | [`@libregrid/cell-selection`](./packages/cell-selection/README.md), [`@libregrid/clipboard`](./packages/clipboard/README.md) |
| Add menus, panels, or grid chrome | [`@libregrid/menu`](./packages/menu/README.md), [`@libregrid/side-bar`](./packages/side-bar/README.md), [`@libregrid/columns-tool-panel`](./packages/columns-tool-panel/README.md), [`@libregrid/status-bar`](./packages/status-bar/README.md) |
| Work with hierarchical or related records | [`@libregrid/tree-data`](./packages/tree-data/README.md), [`@libregrid/master-detail`](./packages/master-detail/README.md) |
| Search, edit, or display data | [`@libregrid/find`](./packages/find/README.md), [`@libregrid/rich-select`](./packages/rich-select/README.md), [`@libregrid/sparklines`](./packages/sparklines/README.md) |
| Create charts | [`@libregrid/integrated-charts`](./packages/integrated-charts/README.md) |
| Use Angular or Angular Material | [`@libregrid/angular`](./packages/angular/README.md), [`@libregrid/material`](./packages/material/README.md) |
| Shared infrastructure (installed automatically) | [`@libregrid/core`](./packages/core/README.md) |

## Angular

For Angular applications, `@libregrid/angular` registers modules during
bootstrap. `@libregrid/material` is optional. It maps Angular Material 3
tokens onto the grid's Quartz theme.

```ts
import { ApplicationConfig } from '@angular/core';
import { provideLibreGrid } from '@libregrid/angular';
import { provideLibreGridMaterialTheme } from '@libregrid/material';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { SideBarModule } from '@libregrid/side-bar';

export const appConfig: ApplicationConfig = {
  providers: [provideLibreGrid(RowGroupingModule, SideBarModule), provideLibreGridMaterialTheme()],
};
```

See [`@libregrid/angular`](./packages/angular/README.md) and
[`@libregrid/material`](./packages/material/README.md) for their focused APIs.

## Status and compatibility

All 26 packages are published to npm under the `@libregrid` scope and share
one lockstep version (the latest release is shown by the [npm badge](https://www.npmjs.com/package/@libregrid/core)
above). Unit, integration, accessibility, and browser tests cover the feature
set. The [publishing guide](./docs/guides/publishing.md) describes how
releases work and lists the remaining steps toward tokenless (trusted
publisher) releases.

- Supported peer dependency: `ag-grid-community >=36.1.0 <37`
- License: [MIT](./LICENSE)
- Known differences and omissions: [gap list](./docs/parity/gap-list.md)
- Migration from `ag-grid-enterprise`: [migration guide](./docs/guides/migration-guide.md)

Excel export ships in `@libregrid/excel-export`. Cell images, Excel
tables and cell notes are not included — see the [gap list](./docs/parity/gap-list.md).
PDF export is not planned. Read the gap list before you plan a migration.

## Try the validation app

This repository includes a docs and validation app. It covers every feature,
including selection and clipboard flows, SSRM pagination, filter controls,
and accessibility modes.

```bash
git clone https://github.com/libregrid/libregrid.git
cd libregrid
npm install
npm run manual:validate
```

Open the local URL printed by Angular. Visit **Manual validation** from the
navigation. The checklist is also available in
[`docs/guides/manual-validation.md`](./docs/guides/manual-validation.md).

## Documentation and support

- [Feature parity and gap list](./docs/parity/gap-list.md) — what is complete, partial, and out of scope
- [Migration guide](./docs/guides/migration-guide.md) — package-by-package migration
- [Manual validation guide](./docs/guides/manual-validation.md) — test the browser demos yourself
- [GitHub issues](https://github.com/libregrid/libregrid/issues) — bugs and feature requests

## Develop from source

LibreGrid uses npm workspaces and requires Node.js `>=20.19.0`.

```bash
npm install
npm run gen:version
npm test
npm run build
npm run verify
```

Read the [clean-room guardrails](./docs/reference/guardrails.md) before you
contribute. LibreGrid must never depend on, install, or inspect
`ag-grid-enterprise`.

## License

MIT — see [`LICENSE`](./LICENSE). Every published package carries its own
copy of the license plus a `NOTICE` file with the relevant copyright and
third-party attribution.
