# @libregrid/angular

Register LibreGrid modules during Angular bootstrap, expose grid state as
signals, and define typed grid options. Use this package alongside
`ag-grid-angular`, which supplies the grid component.

[Documentation and examples](https://libregrid.dev/angular)

## Install

In an existing Angular application:

```bash
npm install "ag-grid-community@^36.1.0" "ag-grid-angular@^36.1.0" @libregrid/angular @libregrid/row-grouping
```

The integration requires Angular core `>=20` and AG Grid Community
`>=36.1.0 <37`. Match `ag-grid-angular` to your AG Grid Community version and
satisfy that wrapper's Angular peer dependencies. The row-grouping package is
included here for the example; substitute your own feature modules as needed.

## Usage

Register Community and LibreGrid modules before the application creates grids.
Add the provider to `app.config.ts`, keeping any other application providers:

```ts
import type { ApplicationConfig } from '@angular/core';
import { AllCommunityModule } from 'ag-grid-community';
import { provideLibreGrid } from '@libregrid/angular';
import { RowGroupingModule } from '@libregrid/row-grouping';

export const appConfig: ApplicationConfig = {
  providers: [provideLibreGrid(AllCommunityModule, RowGroupingModule)],
};
```

In `app.component.ts`:

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

In `main.ts`:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch(console.error);
```

`provideLibreGrid` performs application-wide registration during bootstrap.
It does not add Community modules automatically. Either pass
`AllCommunityModule` explicitly, as above, or use
`provideLibreGrid(...withCommunityModules(RowGroupingModule))`.

## Observe grid state with signals

`createGridApiSignals` exposes displayed row count, selected rows, and the
filter model. Call it in an Angular injection context; listeners are cleaned up
when that context is destroyed and updated when the API signal changes.

The following component can be used with the bootstrap configuration above:

```ts
import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { createGridApiSignals } from '@libregrid/angular';

interface Row {
  name: string;
}

@Component({
  selector: 'app-grid-summary',
  standalone: true,
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular
      style="display: block; height: 400px"
      [rowData]="rowData"
      [columnDefs]="columnDefs"
      (gridReady)="onGridReady($event)"
    />
    <p>{{ state.displayedRowCount() }} rows displayed</p>
  `,
})
export class GridSummaryComponent {
  readonly rowData: Row[] = [{ name: 'Notebook' }, { name: 'Pen' }];
  readonly columnDefs: ColDef<Row>[] = [{ field: 'name', filter: true }];
  private readonly api = signal<GridApi<Row> | undefined>(undefined);
  protected readonly state = createGridApiSignals(this.api);

  onGridReady(event: GridReadyEvent<Row>): void {
    this.api.set(event.api);
  }
}
```

## API

| Export                              | Purpose                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `provideLibreGrid(...modules)`      | Register modules through Angular environment providers |
| `registerLibreGridModules(modules)` | Register an array imperatively                         |
| `withCommunityModules(...modules)`  | Prepend `AllCommunityModule` to the supplied list      |
| `createGridApiSignals(apiSignal)`   | Observe row count, selection, and filters              |
| `defineGridOptions<TData>(options)` | Type-check a grid-options literal                      |
| `createColumnDefs<TData>(defs)`     | Type-check a column-definition array                   |

The last two helpers return their arguments unchanged. Ordinary
`GridOptions<TData>` and `ColDef<TData>[]` annotations work equally well.

For Angular Material theming, see [`@libregrid/material`](../material/README.md).

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
