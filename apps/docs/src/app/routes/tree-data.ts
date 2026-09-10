import { DocsDemoComponent } from '../docs/docs-demo';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import { DocsFeaturePageComponent } from '../docs';

interface FileNode { id: string; path: string[]; size: number; }
const files: FileNode[] = [
  { id: 'readme', path: ['Workspace', 'README.md'], size: 4 },
  { id: 'app', path: ['Workspace', 'apps', 'docs.ts'], size: 18 },
  { id: 'tree', path: ['Workspace', 'packages', 'tree-data', 'index.ts'], size: 11 },
  { id: 'filler-child', path: ['Workspace', 'packages', 'generated', 'schema.ts'], size: 7 },
];

@Component({ selector: 'lgr-tree-data-demo', changeDetection: ChangeDetectionStrategy.OnPush, imports: [DocsDemoComponent, AgGridAngular, MatCardModule, DocsFeaturePageComponent], template: `
  <lgr-docs-feature-page path="tree-data"><p>Rows carry their own paths. Missing intermediates become filler groups; aggregation and filtering use the same grouping pipeline as row groups.</p>
  <lgr-docs-demo demoId="tree-data-grid">
<mat-card appearance="outlined"><mat-card-content><ag-grid-angular style="width:100%;height:520px" [theme]="theme.gridTheme()" [rowData]="rows" [columnDefs]="columnDefs" [gridOptions]="gridOptions" data-testid="tree-data-grid" /></mat-card-content></mat-card>
</lgr-docs-demo>
  <p>Enable managed drag on the auto-group column to reparent rows. Drops onto a leaf make that leaf a group while preserving its own data.</p></lgr-docs-feature-page>
` })
export class TreeDataDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rows = files;
  protected readonly columnDefs: ColDef<FileNode>[] = [{ field: 'size', aggFunc: 'sum', enableValue: true, type: 'numericColumn' }];
  protected readonly gridOptions: GridOptions<FileNode> = { treeData: true, getDataPath: ({ path }) => path, groupDefaultExpanded: -1, rowDragManaged: true, suppressMoveWhenRowDragging: true, autoGroupColumnDef: { headerName: 'File', rowDrag: true, minWidth: 280 }, defaultColDef: { flex: 1, minWidth: 120 } };
}
