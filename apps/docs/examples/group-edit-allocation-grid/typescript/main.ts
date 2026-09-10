import { initialRows, type Workshop } from './data';
import type {
  ColDef,
  GridApi,
  GridOptions,
  GroupRowValueSetterDistribution,
} from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { RowGroupingEditModule } from '@libregrid/row-grouping';
ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, RowGroupingEditModule]);

let allocationApi: GridApi<Workshop> | undefined;
let allocationStrategy: GroupRowValueSetterDistribution = 'uniform';
function allocationColumns(): ColDef<Workshop>[] {
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
      groupRowValueSetter: { distribution: allocationStrategy, precision: 0 },
    },
  ];
}
function changeStrategy(strategy: GroupRowValueSetterDistribution): void {
  allocationStrategy = strategy;
  allocationApi?.setGridOption('columnDefs', allocationColumns());
  resetAllocation();
}
function resetAllocation(): void {
  allocationApi?.stopEditing(true);
  allocationApi?.setGridOption('rowData', structuredClone(initialRows));
}
const allocationOptions: GridOptions<Workshop> = {
  rowData: structuredClone(initialRows),
  getRowId: ({ data }) => data.id,
  defaultColDef: { flex: 1, minWidth: 110 },
  autoGroupColumnDef: { headerName: 'Venue / session', minWidth: 190 },
  groupDefaultExpanded: -1,
  animateRows: false,
  columnDefs: allocationColumns(),
};
function render(): void {}
document.querySelector('#action-0')!.addEventListener('click', () => {
  resetAllocation();
  render();
});
document.querySelector('#input-1')!.addEventListener('change', (event) => {
  changeStrategy((event.target as HTMLSelectElement).value as GroupRowValueSetterDistribution);
  render();
});
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...allocationOptions,
  onGridReady: (event) => {
    allocationApi = event.api;
    render();
  },
});
render();
