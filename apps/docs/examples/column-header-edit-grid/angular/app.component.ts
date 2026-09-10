import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { type ColDef, type ColGroupDef, type GridOptions, type GridApi } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  name: string;
  country: string;
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
      country: 'United States',
      sales: 100,
    },
    {
      name: 'Bruno',
      country: 'France',
      sales: 8019,
    },
    {
      name: 'Carmen',
      country: 'Japan',
      sales: 5938,
    },
    {
      name: 'Dmitri',
      country: 'Brazil',
      sales: 3857,
    },
    {
      name: 'Elena',
      country: 'Germany',
      sales: 1776,
    },
    {
      name: 'Farid',
      country: 'United States',
      sales: 9695,
    },
    {
      name: 'Grace',
      country: 'France',
      sales: 7614,
    },
    {
      name: 'Hiro',
      country: 'Japan',
      sales: 5533,
    },
  ]);
  protected readonly deferred = signal(false);
  private api: GridApi | undefined;
  protected readonly columnDefs: (ColDef<Row> | ColGroupDef<Row>)[] = [
    { field: 'name', headerNameEditable: true, minWidth: 140 },
    {
      groupId: 'where',
      headerName: 'Where & How Much',
      headerNameEditable: true,
      children: [
        { field: 'country', minWidth: 140 },
        { field: 'sales', type: 'numericColumn', minWidth: 110 },
      ],
    },
    {
      // Not editable: no headerNameEditable — the menu item stays hidden.
      colId: 'notes',
      headerName: 'Notes',
      minWidth: 140,
      valueGetter: () => '—',
    },
  ];
  protected readonly gridOptions: GridOptions<Row> = {
    columnHeaderEdit: { applyMode: 'live' },
  } as never;
  onGridReady(gridApi: GridApi): void {
    this.api = gridApi;
  }
  protected toggleApplyMode(): void {
    this.deferred.update((on) => !on);
    this.api?.setGridOption('columnHeaderEdit', {
      applyMode: this.deferred() ? 'deferred' : 'live',
    });
  }
  protected resetColumnState(): void {
    this.api?.resetColumnState();
  }
}
