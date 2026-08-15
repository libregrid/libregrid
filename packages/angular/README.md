# @libregrid/angular

Angular integration for LibreGrid. Register modules declaratively before
your app bootstraps. Mirror grid state into `Signal`s. Get typed identity
helpers for `GridOptions` and column definitions.

This package has no AG Grid Enterprise equivalent. It's LibreGrid's own
Angular ergonomics layer, independent of which feature packages you use.

## Install

```bash
npm install ag-grid-community ag-grid-angular @angular/core @libregrid/angular
```

Requires `ag-grid-community >=36.1.0 <37` and `@angular/core` as peer
dependencies. Add whichever `@libregrid/*` feature packages you need
alongside it.

## Usage

### Register modules once, at bootstrap

`provideLibreGrid` registers modules through an `APP_INITIALIZER`. Every
`ag-grid-angular` grid in your application shares one registration. No
package may call `registerModules()` itself. Registration is the
application's job, not the library's.

```ts
import { ApplicationConfig } from '@angular/core';
import { AllCommunityModule } from 'ag-grid-community';
import { provideLibreGrid } from '@libregrid/angular';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { SideBarModule } from '@libregrid/side-bar';

export const appConfig: ApplicationConfig = {
  providers: [
    provideLibreGrid(AllCommunityModule, RowGroupingModule, SideBarModule),
  ],
};
```

`withCommunityModules(...)` saves you the `AllCommunityModule` import if you
want every Community module available:

```ts
import { provideLibreGrid, withCommunityModules } from '@libregrid/angular';
import { RowGroupingModule } from '@libregrid/row-grouping';

provideLibreGrid(...withCommunityModules(RowGroupingModule));
```

### Mirror grid state into signals

`createGridApiSignals` keeps `Signal`s for displayed row count, selected
rows, and the filter model in sync with the grid. It re-subscribes whenever
the underlying `GridApi` changes. Call it from a component constructor or
field initializer. Its listeners clean up automatically when that injection
context is destroyed.

```ts
import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';
import { createGridApiSignals } from '@libregrid/angular';

interface Row {
  name: string;
}

@Component({
  selector: 'app-grid',
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular [rowData]="rowData" [columnDefs]="columnDefs" (gridReady)="onGridReady($event)" />
    <p>{{ state.displayedRowCount() }} rows displayed</p>
  `,
})
export class GridComponent {
  readonly rowData: Row[] = [{ name: 'Widget' }];
  readonly columnDefs = [{ field: 'name' }];

  private readonly api = signal<GridApi<Row> | undefined>(undefined);
  protected readonly state = createGridApiSignals(this.api);

  onGridReady(event: GridReadyEvent<Row>): void {
    this.api.set(event.api);
  }
}
```

### Typed `GridOptions` and column-def helpers

`defineGridOptions` and `createColumnDefs` are identity functions that exist
purely to anchor type inference on a literal. `GridOptions<TData>` and
`ColDef<TData>[]` type errors then surface where you write the config,
instead of at the point of use:

```ts
import { defineGridOptions, createColumnDefs } from '@libregrid/angular';

interface Row {
  country: string;
  sales: number;
}

const columnDefs = createColumnDefs<Row>([
  { field: 'country', rowGroup: true, hide: true },
  { field: 'sales', aggFunc: 'sum' },
]);

const gridOptions = defineGridOptions<Row>({ columnDefs });
```

## API

| Export | Purpose |
| --- | --- |
| `provideLibreGrid(...modules)` | `EnvironmentProviders` that registers modules via `APP_INITIALIZER`. |
| `registerLibreGridModules(modules)` | Imperative equivalent — calls `ModuleRegistry.registerModules(modules)` directly. |
| `withCommunityModules(...modules)` | Prepends `AllCommunityModule` to a module list. |
| `createGridApiSignals(apiSignal)` | Mirrors displayed row count, selected rows, and filter model into `Signal`s. |
| `defineGridOptions<TData>(options)` | Typed identity helper for a `GridOptions` literal. |
| `createColumnDefs<TData>(defs)` | Typed identity helper for a column-definition array literal. |

## Learn more

- [LibreGrid README](https://github.com/libregrid/libregrid#readme) — full package list and quick start
- [`@libregrid/material`](https://github.com/libregrid/libregrid/blob/main/packages/material/README.md) — Angular Material theme bridge, pairs naturally with this package

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
