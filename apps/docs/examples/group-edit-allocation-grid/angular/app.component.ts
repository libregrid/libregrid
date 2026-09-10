import { initialRows, type Workshop } from './data';
import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type {
  ColDef,
  GridApi,
  GridOptions,
  GroupRowValueSetterDistribution,
} from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';

@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected allocationApi: GridApi<Workshop> | undefined;
  private strategy: GroupRowValueSetterDistribution = 'uniform';
  private allocationColumns(): ColDef<Workshop>[] {
    return [
      { field: 'venue', rowGroup: true, hide: true },
      { field: 'session', minWidth: 170 },
      {
        field: 'seats',
        aggFunc: 'sum',
        editable: true,
        groupRowEditable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, precision: 0 },
        groupRowValueSetter: { distribution: this.strategy, precision: 0 },
      },
    ];
  }
  protected changeStrategy(strategy: GroupRowValueSetterDistribution): void {
    this.strategy = strategy;
    this.allocationApi?.setGridOption('columnDefs', this.allocationColumns());
    this.resetAllocation();
  }
  protected resetAllocation(): void {
    this.allocationApi?.stopEditing(true);
    this.allocationApi?.setGridOption('rowData', structuredClone(initialRows));
  }
  protected readonly allocationOptions: GridOptions<Workshop> = {
    rowData: structuredClone(initialRows),
    getRowId: ({ data }) => data.id,
    defaultColDef: { flex: 1, minWidth: 110 },
    autoGroupColumnDef: { headerName: 'Venue / session', minWidth: 190 },
    groupDefaultExpanded: -1,
    animateRows: false,
    columnDefs: this.allocationColumns(),
  };
}
