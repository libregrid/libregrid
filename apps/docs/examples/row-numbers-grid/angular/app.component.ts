import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { type ColDef, type GridOptions, type GridApi } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  name: string;
  region: string;
  sales: number;
}

@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rowData = signal<Row[]>([
    {
      name: 'Alice',
      region: 'North',
      sales: 100,
    },
    {
      name: 'Bruno',
      region: 'South',
      sales: 8019,
    },
    {
      name: 'Carmen',
      region: 'East',
      sales: 5938,
    },
    {
      name: 'Dmitri',
      region: 'West',
      sales: 3857,
    },
    {
      name: 'Elena',
      region: 'North',
      sales: 1776,
    },
    {
      name: 'Farid',
      region: 'South',
      sales: 9695,
    },
    {
      name: 'Grace',
      region: 'East',
      sales: 7614,
    },
    {
      name: 'Hiro',
      region: 'West',
      sales: 5533,
    },
  ]);
  protected readonly rowNumbers = signal(true);
  protected readonly enableRowResizer = signal(true);
  protected readonly cellSelection = signal(true);
  private api: GridApi | undefined;
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'name', minWidth: 140 },
    { field: 'region', minWidth: 110 },
    { field: 'sales', type: 'numericColumn', minWidth: 110 },
  ];
  protected readonly gridOptions: GridOptions<Row> = {
    rowNumbers: { enableRowResizer: true },
    cellSelection: true,
  } as never;
  onGridReady(gridApi: GridApi): void {
    this.api = gridApi;
  }
  protected toggleRowNumbers(): void {
    this.rowNumbers.update((on) => !on);
    this.api?.setGridOption(
      'rowNumbers',
      this.rowNumbers() ? { enableRowResizer: this.enableRowResizer() } : false,
    );
  }
  protected toggleRowResizer(): void {
    this.enableRowResizer.update((on) => !on);
    this.api?.setGridOption('rowNumbers', {
      enableRowResizer: this.enableRowResizer(),
    });
  }
  protected toggleCellSelection(): void {
    this.cellSelection.update((on) => !on);
    this.api?.setGridOption('cellSelection', this.cellSelection());
  }
}
