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
  protected readonly equipmentOptions: GridOptions<Workshop> = {
    rowData: structuredClone(initialRows),
    getRowId: ({ data }) => data.id,
    defaultColDef: { flex: 1, minWidth: 110 },
    autoGroupColumnDef: { headerName: 'Venue / session', minWidth: 190 },
    groupDefaultExpanded: -1,
    animateRows: false,
    columnDefs: [
      { field: 'venue', rowGroup: true, hide: true },
      { field: 'session', minWidth: 170 },
      { field: 'stations' },
      {
        field: 'seats',
        aggFunc: 'sum',
        editable: true,
        groupRowEditable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, precision: 0 },
        groupRowValueSetter: {
          distribution: 'percentage',
          precision: 0,
          getValue: ({ data }) => data?.stations ?? 0,
          setValue: ({ node, value }) => node.setDataValue('seats', value, 'data'),
        },
      },
    ],
  };
}
