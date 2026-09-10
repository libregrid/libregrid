import { initialRows, type Workshop } from './data';
import type { GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { RowGroupingEditModule } from '@libregrid/row-grouping';
ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, RowGroupingEditModule]);

const equipmentOptions: GridOptions<Workshop> = {
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
function render(): void {}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...equipmentOptions,
});
render();
