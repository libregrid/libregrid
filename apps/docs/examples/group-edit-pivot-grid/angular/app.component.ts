import { initialRows, type Workshop } from './data';
import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { GridOptions } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';

@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly pivotOptions: GridOptions<Workshop> = {
    rowData: structuredClone(initialRows),
    getRowId: ({ data }) => data.id,
    defaultColDef: { flex: 1, minWidth: 110 },
    autoGroupColumnDef: { headerName: 'Venue / session', minWidth: 190 },
    groupDefaultExpanded: -1,
    animateRows: false,
    pivotMode: true,
    columnDefs: [
      { field: 'venue', rowGroup: true, hide: true },
      { field: 'craft', rowGroup: true, hide: true },
      { field: 'shift', pivot: true },
      {
        field: 'seats',
        aggFunc: 'sum',
        editable: true,
        groupRowEditable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, precision: 0 },
      },
    ],
  };
}
