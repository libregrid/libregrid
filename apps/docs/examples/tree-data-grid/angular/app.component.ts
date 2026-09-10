import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
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
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rows = files;
  protected readonly columnDefs: ColDef<FileNode>[] = [
    { field: 'size', aggFunc: 'sum', enableValue: true, type: 'numericColumn' },
  ];
  protected readonly gridOptions: GridOptions<FileNode> = {
    treeData: true,
    getDataPath: ({ path }) => path,
    groupDefaultExpanded: -1,
    rowDragManaged: true,
    suppressMoveWhenRowDragging: true,
    autoGroupColumnDef: { headerName: 'File', rowDrag: true, minWidth: 280 },
    defaultColDef: { flex: 1, minWidth: 120 },
  };
}
