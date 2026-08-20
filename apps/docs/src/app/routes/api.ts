import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

interface PackageEntry {
  name: string;
  modules: string;
  exports: string;
  notes: string;
}

const PACKAGES: PackageEntry[] = [
  { name: '@libregrid/core', modules: 'EnterpriseCore', exports: 'EnterpriseCoreModule, assertSingleCoreInstance, asBean, getUntypedBean', notes: 'Shared infrastructure; a dependency of every feature module.' },
  { name: '@libregrid/menu', modules: 'ContextMenu, ColumnMenu', exports: 'ContextMenuModule, ColumnMenuModule, MenuItemRegistry, registerMenuItem, registerMenuItems, registerMenuRenderer, DEFAULT_CONTEXT_MENU_ITEMS, DEFAULT_COLUMN_MENU_ITEMS', notes: 'Framework-neutral menu shells with a registry for feature contributions.' },
  { name: '@libregrid/side-bar', modules: 'SideBar', exports: 'SideBarModule, SideBarService, registerToolPanel, registerSideBarRenderer', notes: 'Side-bar host for tool panels.' },
  { name: '@libregrid/material', modules: '—', exports: 'LibreGridThemeService, provideLibreGridMaterialTheme, installMaterialSideBarRenderer, MaterialStatusBarComponent, installMaterialRichSelectCellEditor, createMaterialColumnsToolPanelDragDropAdapter', notes: 'Angular Material theme bridge and renderers. No Enterprise module equivalent.' },
  { name: '@libregrid/row-grouping', modules: 'RowGrouping', exports: 'RowGroupingModule, GroupCellRenderer, AggFuncService, GroupStage, FlattenStage, FooterService, ShowValuesAsService', notes: 'Grouping, aggregation, totals, show-values-as.' },
  { name: '@libregrid/columns-tool-panel', modules: 'ColumnsToolPanel, RowGroupingPanel', exports: 'ColumnsToolPanelModule, RowGroupingPanelModule, ColumnsToolPanel, RowGroupingPanel, registerColumnsToolPanelDragDropAdapter', notes: 'Columns tool panel plus the standalone row-group panel.' },
  { name: '@libregrid/cell-selection', modules: 'CellSelection', exports: 'CellSelectionModule, RangeService, RangeModel, fillSeries, normalise', notes: 'Cell ranges and the fill handle.' },
  { name: '@libregrid/clipboard', modules: 'Clipboard', exports: 'ClipboardModule, ClipboardService, GridClipboardService, fromDelimited, toDelimited', notes: 'Excel-compatible TSV copy/cut/paste.' },
  { name: '@libregrid/status-bar', modules: 'StatusBar', exports: 'StatusBarModule, StatusBarService, aggregate, TotalRowCountPanel, TotalAndFilteredRowCountPanel, FilteredRowCountPanel, SelectedRowCountPanel, AggregationPanel', notes: 'Status panels with a Material shell in @libregrid/material.' },
  { name: '@libregrid/set-filter', modules: 'SetFilter', exports: 'SetFilterModule, SetFilter, SetFilterHandler', notes: 'Virtualised set filter.' },
  { name: '@libregrid/multi-filter', modules: 'MultiFilter', exports: 'MultiFilterModule, MultiFilter, MultiFilterHandler', notes: 'Composable multi filter.' },
  { name: '@libregrid/filters-tool-panel', modules: 'FiltersToolPanel', exports: 'FiltersToolPanelModule, FiltersToolPanel', notes: 'Filters tool panel.' },
  { name: '@libregrid/server-side-row-model', modules: 'ServerSideRowModel', exports: 'ServerSideRowModelModule, ServerSideRowModel, ServerSideLoadingCellRenderer, SsrmExpandListener, SsrmFilterListener, SsrmListenerUtils, SsrmSortService', notes: 'Flat and hierarchical SSRM stores, pivot, analytical requests.' },
  { name: '@libregrid/pivot', modules: 'Pivot', exports: 'PivotModule, PivotStage, PivotColsService, PivotResultColsService, PivotColDefService, createGeneratedPivotDefs', notes: 'Client-side pivot over the CSRM.' },
  { name: '@libregrid/viewport-row-model', modules: 'ViewportRowModel', exports: 'ViewportRowModelModule, ViewportRowModel', notes: 'Push-driven viewport row model.' },
  { name: '@libregrid/tree-data', modules: 'TreeData', exports: 'TreeDataModule, TreeDataService', notes: 'Tree data source shapes and managed reparenting.' },
  { name: '@libregrid/master-detail', modules: 'MasterDetail', exports: 'MasterDetailModule, MasterDetailService, DetailCellRenderer', notes: 'Nested detail grids with caching.' },
  { name: '@libregrid/advanced-filter', modules: 'AdvancedFilter', exports: 'AdvancedFilterModule, AdvancedFilterService, parseAdvancedFilterExpression, serialiseAdvancedFilterModel, evaluateAdvancedFilterModel', notes: 'Serialisable advanced filter expressions.' },
  { name: '@libregrid/find', modules: 'Find', exports: 'FindModule, FindService, FindCellRenderer', notes: 'Rendered-cell find navigation.' },
  { name: '@libregrid/rich-select', modules: 'RichSelect', exports: 'RichSelectModule, RichSelectCellEditor', notes: 'Virtualised rich-select cell editor.' },
  { name: '@libregrid/integrated-charts', modules: 'IntegratedCharts', exports: 'IntegratedChartsModule, ChartService, ChartCrossFilterService, AgChartsCommunityProvider, chartOptionsFor', notes: 'Range/pivot/cross-filter charts on ag-charts-community (MIT).' },
  { name: '@libregrid/sparklines', modules: 'Sparklines', exports: 'SparklinesModule, SparklineCellRenderer', notes: 'In-cell sparklines.' },
  { name: '@libregrid/angular', modules: '—', exports: 'provideLibreGrid, registerLibreGridModules, createGridApiSignals, defineGridOptions, createColumnDefs, withCommunityModules', notes: 'Angular signal ergonomics and typed helpers.' },
  { name: '@libregrid/all', modules: '—', exports: 'every module above', notes: 'Convenience barrel — for quick starts and demos only.' },
];

/** Curated API reference: every package, its registered module names, and its public surface. */
@Component({
  selector: 'lgr-api-reference',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatTableModule],
  template: `
    <div class="lgr-page">
      <h1>API Reference</h1>
      <p>
        Every package and its public surface. Beans are internal and deliberately not listed —
        see <code>docs/reference/api-seams.md</code> for the bean pattern. The migration guide
        maps each AG Grid Enterprise module to the package that replaces it.
      </p>
      <mat-card appearance="outlined">
        <mat-card-content class="lgr-table-scroll">
          <table mat-table [dataSource]="packages" aria-label="LibreGrid packages">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Package</th>
              <td mat-cell *matCellDef="let entry"><code>{{ entry.name }}</code></td>
            </ng-container>
            <ng-container matColumnDef="modules">
              <th mat-header-cell *matHeaderCellDef>Modules</th>
              <td mat-cell *matCellDef="let entry"><code>{{ entry.modules }}</code></td>
            </ng-container>
            <ng-container matColumnDef="exports">
              <th mat-header-cell *matHeaderCellDef>Public exports</th>
              <td mat-cell *matCellDef="let entry">{{ entry.exports }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ApiReference {
  protected readonly packages = PACKAGES;
  protected readonly columns = ['name', 'modules', 'exports'] as const;
}

