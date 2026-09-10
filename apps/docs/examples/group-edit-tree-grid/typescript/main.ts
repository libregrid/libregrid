import type { GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { RowGroupingEditModule } from '@libregrid/row-grouping';
import { TreeDataModule } from '@libregrid/tree-data';
ModuleRegistry.registerModules([
  AllCommunityModule,
  RowGroupingModule,
  RowGroupingEditModule,
  TreeDataModule,
]);
const treeOptions: GridOptions<{
  id: string;
  path: string[];
  places: number;
}> = {
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
function render(): void {}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...treeOptions,
});
render();
