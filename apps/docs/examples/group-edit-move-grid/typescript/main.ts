import { initialRows, type Workshop } from './data';
import type { GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { RowGroupingEditModule } from '@libregrid/row-grouping';
ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, RowGroupingEditModule]);

const moveOptions: GridOptions<Workshop> = {
  rowData: structuredClone(initialRows),
  getRowId: ({ data }) => data.id,
  defaultColDef: { flex: 1, minWidth: 110 },
  autoGroupColumnDef: { headerName: 'Venue / session', minWidth: 190 },
  groupDefaultExpanded: -1,
  animateRows: false,
  refreshAfterGroupEdit: true,
  columnDefs: [
    { field: 'venue', rowGroup: true, hide: false, editable: true },
    { field: 'session', minWidth: 170 },
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
function render(): void {}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...moveOptions,
});
render();
