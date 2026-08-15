# LibreGrid

> Enterprise-grade grid features for [AG Grid Community](https://www.npmjs.com/package/ag-grid-community), delivered as open-source modules.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

LibreGrid is for teams using `ag-grid-community` who need advanced data-grid
capabilities without replacing their existing grid. It plugs into the Community
module registry, so you keep your grid instance, column definitions, events,
and familiar grid options while registering only the features your application
uses.

LibreGrid is an independent open-source project. It is not affiliated with,
endorsed by, or sponsored by AG Grid Ltd. “AG Grid” is a trademark of AG Grid Ltd.

## What you get

LibreGrid provides modular implementations for the most commonly requested
advanced grid capabilities:

| Area          | Features                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| Data shaping  | Row grouping, aggregation, pivoting, tree data, master/detail            |
| Large data    | Server-side row model, viewport row model, SSRM pagination               |
| Filtering     | Set Filter, Multi Filter, Filters Tool Panel, Advanced Filter, Find      |
| Interaction   | Cell-range selection, fill handle, clipboard copy/cut/paste, Rich Select |
| Grid UI       | Context and column menus, side bar, columns tool panel, status bar       |
| Visualisation | Integrated charts and sparklines                                         |
| Angular       | Angular module registration helpers, signals, and Material theme bridge  |

Every feature is a separate package. Import only what you need for a smaller
bundle; [`@libregrid/all`](./packages/all/README.md) is available for prototypes
and demos.

## Status and compatibility

LibreGrid’s 1.0 release is prepared and its feature set is covered by unit,
integration, accessibility, and browser tests. Public npm publication is the
remaining release operation. Until that happens, use this repository directly
for evaluation or development.

Maintainers can follow the [publishing guide](./docs/guides/publishing.md) to
make the first release and configure subsequent tokenless releases.

- Supported peer dependency: `ag-grid-community >=36.1.0 <37`
- Licence: [MIT](./LICENSE)
- Known differences and omissions: [honest gap list](./docs/parity/gap-list.md)
- Migration from `ag-grid-enterprise`: [migration guide](./docs/guides/migration-guide.md)

Notably, Excel export is not shipped and PDF export is not planned. Read the
gap list before committing to a migration.

## Quick start

Once the packages are published, install AG Grid Community and the LibreGrid
feature packages you need:

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

Feature modules bring along the shared LibreGrid core automatically. Add more
packages and modules as your grid needs grow:

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

The [migration guide](./docs/guides/migration-guide.md) maps each supported
Enterprise module to its LibreGrid package.

## Angular

For Angular applications, `@libregrid/angular` registers modules during
bootstrap. `@libregrid/material` is optional and maps Angular Material 3 tokens
onto the grid’s Quartz theme.

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

## Choose packages by feature

| Need                                         | Package                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Group, aggregate, or pivot client-side rows  | `@libregrid/row-grouping`, `@libregrid/pivot`                                                                     |
| Load large server-backed data sets           | `@libregrid/server-side-row-model`                                                                                |
| Provide filter controls                      | `@libregrid/set-filter`, `@libregrid/multi-filter`, `@libregrid/filters-tool-panel`, `@libregrid/advanced-filter` |
| Let users select, fill, copy, or paste cells | `@libregrid/cell-selection`, `@libregrid/clipboard`                                                               |
| Add menus, panels, or grid chrome            | `@libregrid/menu`, `@libregrid/side-bar`, `@libregrid/columns-tool-panel`, `@libregrid/status-bar`                |
| Work with hierarchical or related records    | `@libregrid/tree-data`, `@libregrid/master-detail`                                                                |
| Search/edit/display data                     | `@libregrid/find`, `@libregrid/rich-select`, `@libregrid/sparklines`                                              |
| Create charts                                | `@libregrid/integrated-charts`                                                                                    |
| Use Angular or Angular Material              | `@libregrid/angular`, `@libregrid/material`                                                                       |

## Try the validation app

This repository includes a hands-on docs and validation app covering every
feature, including selection/clipboard flows, SSRM pagination, filter controls,
and accessibility modes.

```bash
git clone https://github.com/libregrid/libregrid.git
cd libregrid
npm install
npm run manual:validate
```

Open the local URL printed by Angular, then visit **Manual validation** from the
navigation. The checklist is also available in
[`docs/guides/manual-validation.md`](./docs/guides/manual-validation.md).

## Documentation and support

- [Migration guide](./docs/guides/migration-guide.md) — package-by-package migration
- [Feature parity and gap list](./docs/parity/gap-list.md) — what is complete, partial, and out of scope
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

Contributors should also read the
[clean-room guardrails](./docs/reference/guardrails.md). LibreGrid must never
depend on, install, or inspect `ag-grid-enterprise`.

## Licence

MIT — see [`LICENSE`](./LICENSE). LibreGrid preserves the relevant copyright
notice in each package’s `NOTICE` file.
