import { initialRows, type Workshop } from './data';
import { Component, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { GridOptions, GroupRowValueSetterParams } from 'ag-grid-community';
import { distributeGroupValue } from '@libregrid/row-grouping';
import { themeQuartz } from 'ag-grid-community';

function allocateByPriority(
  params: GroupRowValueSetterParams<Workshop>,
  reject: (message: string) => void,
): boolean {
  const leaves = params.node.getAggregatedChildren(params.column, true);
  const ordered = [...leaves].sort((a, b) => a.data!.priority - b.data!.priority);
  const requested = Number(params.newValue);
  const capacity = ordered.reduce((total, leaf) => total + leaf.data!.stations * 12, 0);
  if (!Number.isInteger(requested) || requested < 0 || requested > capacity) {
    reject(`Allocation unchanged. Enter a whole number from 0 to ${capacity} places.`);
    return false;
  }
  let remaining = requested;
  let changed = false;
  for (const leaf of ordered) {
    const allocation = Math.min(remaining, leaf.data!.stations * 12);
    remaining -= allocation;
    if (leaf.setDataValue(params.column, allocation, 'data')) changed = true;
  }
  return changed;
}
function orderWholePacks(params: GroupRowValueSetterParams<Workshop>): boolean {
  const requested = Number(params.newValue);
  if (!Number.isFinite(requested) || requested < 0) return false;
  const sessions = params.aggregatedChildren.length;
  if (!sessions) return false;
  // Each session receives complete packs of six kits.
  const order = Math.ceil(requested / (sessions * 6)) * sessions * 6;
  return distributeGroupValue(
    { ...params, newValue: order },
    { distribution: 'uniform', precision: 0 },
  );
}
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly capacityMessage = signal('Capacity is checked before any session is changed.');
  protected readonly capacityOptions: GridOptions<Workshop> = {
    getRowId: ({ data }) => data.id,
    defaultColDef: { flex: 1, minWidth: 110 },
    autoGroupColumnDef: { headerName: 'Venue / session', minWidth: 190 },
    groupDefaultExpanded: -1,
    animateRows: false,
    rowData: structuredClone(initialRows).map((session) => ({
      ...session,
      seats: Math.min(session.seats, session.stations * 12),
    })),
    columnDefs: [
      { field: 'venue', rowGroup: true, hide: true },
      { field: 'session', minWidth: 170 },
      { field: 'stations' },
      { field: 'priority' },
      {
        field: 'seats',
        aggFunc: 'sum',
        groupRowEditable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: { min: 0, precision: 0 },
        editable: false,
        groupRowValueSetter: (params) => {
          this.capacityMessage.set('Capacity is checked before any session is changed.');
          return allocateByPriority(params, (message) => this.capacityMessage.set(message));
        },
      },
      {
        field: 'kits',
        aggFunc: 'sum',
        groupRowEditable: true,
        groupRowValueSetter: orderWholePacks,
      },
    ],
  };
}
