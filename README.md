# LibreGrid

MIT-licensed feature modules for AG Grid Community, including row grouping,
pivoting, server-side data loading, cell selection, clipboard operations,
Excel export, and charts.

[Documentation and demos](https://libregrid.dev) ·
[Getting started](https://libregrid.dev/getting-started) ·
[Releases](https://github.com/libregrid/libregrid/releases) ·
[Issues](https://github.com/libregrid/libregrid/issues)

## Why LibreGrid

LibreGrid extends AG Grid Community through its module registry. It is useful
when an application needs grouped reports, spreadsheet-style editing, or queries
over server-backed datasets while keeping its grid stack open source. You
continue to use AG Grid's column definitions, options, events, and framework
components.

Install the feature packages you need and register their modules before creating
a grid. Shared LibreGrid dependencies are installed automatically. Some features
also need application code: server-side rows need a datasource, notes need
storage, and AI commands need a server endpoint and model provider.

LibreGrid implements a subset of the advanced feature contracts exposed by AG
Grid Community. It is not a promise of complete AG Grid Enterprise parity. Check
the [known differences](./docs/parity/gap-list.md) and
[migration guide](./docs/guides/migration-guide.md) against the options your
application uses. Current limitations include sticky group rows, group-row
dragging, commercial-only chart types, and Excel images, tables, and cell notes.

## Compatibility

| Dependency          | Supported range                                                                       |
| ------------------- | ------------------------------------------------------------------------------------- |
| `ag-grid-community` | `>=36.1.0 <37`                                                                        |
| `ag-grid-angular`   | Use the same version as `ag-grid-community`                                           |
| Angular integration | Angular `>=20`; also satisfy the chosen `ag-grid-angular` version's peer dependencies |
| Chart packages      | `ag-charts-community >=14.1.0 <15`                                                    |

Keep LibreGrid packages on the same release version. The install commands below
limit AG Grid to its supported major version. LibreGrid uses the Community
runtime; it does not require an AG Grid Enterprise package or license key.

## TypeScript quick start

In an existing browser project with TypeScript and a bundler:

```bash
npm install "ag-grid-community@^36.1.0" @libregrid/row-grouping
```

Add a container with an explicit height to your page. This example assumes the
bundler serves `src/main.ts` as a module:

```html
<div id="grid" style="height: 400px"></div>
<script type="module" src="/src/main.ts"></script>
```

In `src/main.ts`, register the modules and create the grid:

```ts
import { AllCommunityModule, ModuleRegistry, createGrid, themeQuartz } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';

interface Sale {
  country: string;
  product: string;
  sales: number;
}

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

const container = document.querySelector<HTMLElement>('#grid');
if (!container) throw new Error('Grid container not found');

const api = createGrid<Sale>(container, {
  theme: themeQuartz,
  defaultColDef: { flex: 1, minWidth: 120 },
  columnDefs: [
    { field: 'country', rowGroup: true, hide: true },
    { field: 'product' },
    { field: 'sales', aggFunc: 'sum' },
  ],
  rowData: [
    { country: 'Canada', product: 'Notebook', sales: 120 },
    { country: 'Canada', product: 'Pen', sales: 80 },
    { country: 'Japan', product: 'Notebook', sales: 240 },
  ],
  groupDefaultExpanded: 1,
});

// Call api.destroy() when your application removes this grid.
```

Quartz supplies the styles through the theme API; this example does not need
legacy theme CSS imports. `AllCommunityModule` is a convenient starting point.
You can register individual Community modules as you refine your bundle.

## Angular quick start

In an existing Angular application, install the grid component, integration
helper, and feature package:

```bash
npm install "ag-grid-community@^36.1.0" "ag-grid-angular@^36.1.0" @libregrid/angular @libregrid/row-grouping
```

Add the provider to `app.config.ts`, retaining your application's other providers:

```ts
import type { ApplicationConfig } from '@angular/core';
import { AllCommunityModule } from 'ag-grid-community';
import { provideLibreGrid } from '@libregrid/angular';
import { RowGroupingModule } from '@libregrid/row-grouping';

export const appConfig: ApplicationConfig = {
  providers: [provideLibreGrid(AllCommunityModule, RowGroupingModule)],
};
```

Use the grid in a standalone component (`app.component.ts`):

```ts
import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { themeQuartz, type ColDef } from 'ag-grid-community';

interface Sale {
  country: string;
  product: string;
  sales: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular
      style="display: block; height: 400px"
      [theme]="theme"
      [defaultColDef]="defaultColDef"
      [columnDefs]="columnDefs"
      [rowData]="rowData"
      [groupDefaultExpanded]="1"
    />
  `,
})
export class AppComponent {
  readonly theme = themeQuartz;
  readonly defaultColDef: ColDef<Sale> = { flex: 1, minWidth: 120 };
  readonly columnDefs: ColDef<Sale>[] = [
    { field: 'country', rowGroup: true, hide: true },
    { field: 'product' },
    { field: 'sales', aggFunc: 'sum' },
  ];
  readonly rowData: Sale[] = [
    { country: 'Canada', product: 'Notebook', sales: 120 },
    { country: 'Canada', product: 'Pen', sales: 80 },
    { country: 'Japan', product: 'Notebook', sales: 240 },
  ];
}
```

Make sure `main.ts` passes that configuration to bootstrap:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch(console.error);
```

The Angular component manages grid destruction. For grid-state signals and
typed helpers, see [`@libregrid/angular`](./packages/angular/README.md).
The optional [`@libregrid/material`](./packages/material/README.md) package
connects the grid theme to Angular Material.

## Packages

Each link opens the package README with installation, usage, and links to the
relevant live documentation. Installing a package and registering its module
are separate steps; follow the example for the feature combination you use.

### Data organization and loading

| Package                                                                          | Purpose                                                        |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`@libregrid/row-grouping`](./packages/row-grouping/README.md)                   | Grouping, aggregation, totals, and group-value editing         |
| [`@libregrid/pivot`](./packages/pivot/README.md)                                 | Client-side pivot tables                                       |
| [`@libregrid/tree-data`](./packages/tree-data/README.md)                         | Hierarchies defined by row paths                               |
| [`@libregrid/master-detail`](./packages/master-detail/README.md)                 | Nested grids for related records                               |
| [`@libregrid/server-side-row-model`](./packages/server-side-row-model/README.md) | On-demand row blocks and server query integration              |
| [`@libregrid/viewport-row-model`](./packages/viewport-row-model/README.md)       | Application-supplied rows and live updates for visible ranges  |
| [`@libregrid/server-side-selection`](./packages/server-side-selection/README.md) | Provider-backed selection across server-side pages and filters |

### Filtering and search

| Package                                                                    | Purpose                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------- |
| [`@libregrid/set-filter`](./packages/set-filter/README.md)                 | Filter by distinct column values                |
| [`@libregrid/multi-filter`](./packages/multi-filter/README.md)             | Multiple filters on one column                  |
| [`@libregrid/filters-tool-panel`](./packages/filters-tool-panel/README.md) | Column filters in a side panel                  |
| [`@libregrid/advanced-filter`](./packages/advanced-filter/README.md)       | Expressions and a visual builder across columns |
| [`@libregrid/find`](./packages/find/README.md)                             | Find, highlight, and navigate cell text         |

### Selection and editing

| Package                                                                    | Purpose                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------- |
| [`@libregrid/cell-selection`](./packages/cell-selection/README.md)         | Cell ranges and fill handles                        |
| [`@libregrid/clipboard`](./packages/clipboard/README.md)                   | Copy, cut, paste, and delimited text helpers        |
| [`@libregrid/rich-select`](./packages/rich-select/README.md)               | Searchable dropdown cell editor                     |
| [`@libregrid/batch-edit`](./packages/batch-edit/README.md)                 | Stage, commit, or discard a batch of edits          |
| [`@libregrid/calculated-columns`](./packages/calculated-columns/README.md) | Read-only expressions across values in the same row |
| [`@libregrid/formulas`](./packages/formulas/README.md)                     | Cell formulas and A1 references                     |
| [`@libregrid/column-header-edit`](./packages/column-header-edit/README.md) | User-editable column labels                         |
| [`@libregrid/notes`](./packages/notes/README.md)                           | Cell and full-width-row notes                       |

### Grid controls

| Package                                                                    | Purpose                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------- |
| [`@libregrid/menu`](./packages/menu/README.md)                             | Column and context menus                        |
| [`@libregrid/side-bar`](./packages/side-bar/README.md)                     | Tool-panel host                                 |
| [`@libregrid/columns-tool-panel`](./packages/columns-tool-panel/README.md) | Column visibility, grouping, and pivot controls |
| [`@libregrid/status-bar`](./packages/status-bar/README.md)                 | Row counts and selection summaries              |
| [`@libregrid/toolbar`](./packages/toolbar/README.md)                       | Search, grouping controls, and custom actions   |
| [`@libregrid/row-numbers`](./packages/row-numbers/README.md)               | Row-number column and row resize controls       |

### Export and visualization

| Package                                                                  | Purpose                              |
| ------------------------------------------------------------------------ | ------------------------------------ |
| [`@libregrid/excel-export`](./packages/excel-export/README.md)           | Browser-generated Excel workbooks    |
| [`@libregrid/integrated-charts`](./packages/integrated-charts/README.md) | Linked range and cross-filter charts |
| [`@libregrid/sparklines`](./packages/sparklines/README.md)               | Small charts inside cells            |

### AI integration

| Package                                                      | Purpose                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [`@libregrid/ai-toolkit`](./packages/ai-toolkit/README.md)   | Schema generation for live grid capabilities                 |
| [`@libregrid/ai-client`](./packages/ai-client/README.md)     | Browser requests, proposal validation, and state application |
| [`@libregrid/ai-protocol`](./packages/ai-protocol/README.md) | Shared types, validators, JSON Schemas, and OpenAPI contract |
| [`@libregrid/ai-gateway`](./packages/ai-gateway/README.md)   | Server handler, provider adapters, and gateway CLI           |

### Integration and infrastructure

| Package                                                | Purpose                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| [`@libregrid/angular`](./packages/angular/README.md)   | Angular providers, signals, and typed helpers                         |
| [`@libregrid/material`](./packages/material/README.md) | Angular Material theme bridge and renderers                           |
| [`@libregrid/core`](./packages/core/README.md)         | Shared infrastructure installed by feature packages                   |
| [`@libregrid/all`](./packages/all/README.md)           | Convenience exports for a broad feature set; see its dependency notes |

## Documentation and support

The [documentation site](https://libregrid.dev) provides interactive examples.
Use **Show code** above a demo to inspect its starting configuration in
TypeScript or Angular, where applicable.

- [Package catalog](https://libregrid.dev/packages) and [API reference](https://libregrid.dev/api)
- [Known differences and limitations](./docs/parity/gap-list.md)
- [Migration guide](./docs/guides/migration-guide.md)
- [GitHub issues](https://github.com/libregrid/libregrid/issues) — include versions, a minimal reproduction, and expected behavior

## Contributing

This is an npm-workspaces monorepo. For the current Angular docs toolchain, use
Node.js `22.22.3+` on the Node 22 line, or another version supported by Angular 22.

```bash
git clone https://github.com/libregrid/libregrid.git
cd libregrid
npm ci
npm run gen:version
npm run docs
```

`npm run verify` runs lint, tests, builds, and repository checks. The
[manual validation guide](./docs/guides/manual-validation.md) covers browser
workflows; the [publishing guide](./docs/guides/publishing.md) covers releases.

Read the [contribution guardrails](./docs/reference/guardrails.md) before making
changes. Project contributions must not depend on, install, or inspect
`ag-grid-enterprise` code.

## License and attribution

LibreGrid is [MIT licensed](./LICENSE). Package `LICENSE` and `NOTICE` files
record the relevant attribution.

LibreGrid is an independent project and is not affiliated with, endorsed by,
or sponsored by AG Grid Ltd. “AG Grid” is a trademark of AG Grid Ltd.
