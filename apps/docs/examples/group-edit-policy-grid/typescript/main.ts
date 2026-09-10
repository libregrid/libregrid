import { initialRows, type Workshop } from './data';
import type { GridOptions, IAggFuncParams } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { RowGroupingEditModule } from '@libregrid/row-grouping';
ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, RowGroupingEditModule]);

function roomWindow({ values }: IAggFuncParams): number | null {
  const durations = values.filter((value): value is number => typeof value === 'number');
  return durations.length ? Math.max(...durations) : null;
}
const policyOptions: GridOptions<Workshop> = {
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
function render(): void {}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...policyOptions,
});
render();
