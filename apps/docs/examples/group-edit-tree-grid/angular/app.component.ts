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
  protected readonly treeOptions: GridOptions<{ id: string; path: string[]; places: number }> = {
    treeData: true,
    getDataPath: ({ path }) => path,
    getRowId: ({ data }) => data.id,
    rowData: [
      { id: 'bench', path: ['Open studio', 'Carving', 'Bench'], places: 12 },
      { id: 'press', path: ['Open studio', 'Printing', 'Press'], places: 8 },
      { id: 'rollers', path: ['Open studio', 'Printing', 'Rollers'], places: 16 },
    ],
    columnDefs: [
      {
        field: 'places',
        aggFunc: 'sum',
        groupRowEditable: true,
        groupRowValueSetter: { precision: 0 },
        flex: 1,
      },
    ],
    groupDefaultExpanded: -1,
    autoGroupColumnDef: { headerName: 'Event / activity / station', minWidth: 300 },
  };
}
