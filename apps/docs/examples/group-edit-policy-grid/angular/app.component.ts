import { initialRows, type Workshop } from './data';
import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { GridOptions, IAggFuncParams } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';

function roomWindow({ values }: IAggFuncParams): number | null {
  const durations = values.filter((value): value is number => typeof value === 'number');
  return durations.length ? Math.max(...durations) : null;
}
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly policyOptions: GridOptions<Workshop> = {
    rowData: structuredClone(initialRows),
    getRowId: ({ data }) => data.id,
    autoGroupColumnDef: { headerName: 'Venue / session', minWidth: 190 },
    groupDefaultExpanded: -1,
    animateRows: false,
    aggFuncs: { roomWindow },
    defaultColDef: {
      flex: 1,
      minWidth: 110,
      editable: true,
      groupRowEditable: ({ node }) => node.key === 'Foundry',
      groupRowValueSetter: {
        precision: 0,
        distribution: { sum: 'increment', min: false },
        default: 'overwrite',
      },
    },
    columnDefs: [
      { field: 'venue', rowGroup: true, hide: true, editable: false },
      { field: 'session', minWidth: 170, editable: false },
      { field: 'seats', aggFunc: 'sum' },
      {
        field: 'minutes',
        aggFunc: 'avg',
        groupRowValueSetter: { distribution: { avg: 'overwrite' } },
      },
      { field: 'briefing', minWidth: 150 },
      { field: 'stations', headerName: 'Minimum stations', aggFunc: 'min', minWidth: 160 },
      {
        field: 'minutes',
        colId: 'roomWindow',
        headerName: 'Room window',
        aggFunc: 'roomWindow',
        minWidth: 145,
      },
    ],
  };
}
