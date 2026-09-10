import type { ColDef, GridOptions } from 'ag-grid-community';
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { TreeDataModule } from '@libregrid/tree-data';
ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule]);
interface FileNode {
  id: string;
  path: string[];
  size: number;
}
const files: FileNode[] = [
  { id: 'readme', path: ['Workspace', 'README.md'], size: 4 },
  { id: 'app', path: ['Workspace', 'apps', 'docs.ts'], size: 18 },
  { id: 'tree', path: ['Workspace', 'packages', 'tree-data', 'index.ts'], size: 11 },
  { id: 'filler-child', path: ['Workspace', 'packages', 'generated', 'schema.ts'], size: 7 },
];
const rows = files;
const columnDefs: ColDef<FileNode>[] = [
  { field: 'size', aggFunc: 'sum', enableValue: true, type: 'numericColumn' },
];
const gridOptions: GridOptions<FileNode> = {
  treeData: true,
  getDataPath: ({ path }) => path,
  groupDefaultExpanded: -1,
  rowDragManaged: true,
  suppressMoveWhenRowDragging: true,
  autoGroupColumnDef: { headerName: 'File', rowDrag: true, minWidth: 280 },
  defaultColDef: { flex: 1, minWidth: 120 },
};
function render(): void {}
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
  rowData: rows,
});
render();
