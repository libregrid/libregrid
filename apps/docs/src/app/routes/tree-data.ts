import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface FileNode { id: string; path: string[]; size: number; }
const files: FileNode[] = [
  { id: 'readme', path: ['Workspace', 'README.md'], size: 4 },
  { id: 'app', path: ['Workspace', 'apps', 'docs.ts'], size: 18 },
  { id: 'tree', path: ['Workspace', 'packages', 'tree-data', 'index.ts'], size: 11 },
  { id: 'filler-child', path: ['Workspace', 'packages', 'generated', 'schema.ts'], size: 7 },
];

@Component({ selector: 'lgr-tree-data-demo', changeDetection: ChangeDetectionStrategy.OnPush, imports: [AgGridAngular, MatCardModule], template: `
  <div class="lgr-page"><h1>Tree Data</h1><p>Rows carry their own paths. Missing intermediates become filler groups; aggregation and filtering use the same grouping pipeline as row groups.</p>
  <mat-card appearance="outlined"><mat-card-content><ag-grid-angular style="width:100%;height:520px" [theme]="theme.gridTheme()" [rowData]="rows" [columnDefs]="columnDefs" [gridOptions]="gridOptions" data-testid="tree-data-grid" /></mat-card-content></mat-card>
  <p>Enable managed drag on the auto-group column to reparent rows. Drops onto a leaf make that leaf a group while preserving its own data.</p></div>
` })
export class TreeDataDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rows = files;
  protected readonly columnDefs: ColDef<FileNode>[] = [{ field: 'size', aggFunc: 'sum', enableValue: true, type: 'numericColumn' }];
  protected readonly gridOptions: GridOptions<FileNode> = { treeData: true, getDataPath: ({ path }) => path, groupDefaultExpanded: -1, rowDragManaged: true, suppressMoveWhenRowDragging: true, autoGroupColumnDef: { headerName: 'File', rowDrag: true, minWidth: 280 }, defaultColDef: { flex: 1, minWidth: 120 } };
}
