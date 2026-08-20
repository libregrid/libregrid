import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DocsCodeExampleComponent, type DocsCodeExample } from '../docs';

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
  { name: '@libregrid/batch-edit', modules: 'BatchEdit', exports: 'BatchEditModule, BatchEditService', notes: 'Stage, review, commit, or discard a coordinated set of cell edits.' },
  { name: '@libregrid/calculated-columns', modules: 'CalculatedColumns', exports: 'CalculatedColumnsModule, CalculatedColumnsService, CalculatedColumnFormulaService', notes: 'Read-only formulas and an authoring dialog for derived values.' },
  { name: '@libregrid/column-header-edit', modules: 'ColumnHeaderEdit', exports: 'ColumnHeaderEditModule, ColumnHeaderEditService', notes: 'Rename headers directly in a grid workspace.' },
  { name: '@libregrid/set-filter', modules: 'SetFilter', exports: 'SetFilterModule, SetFilter, SetFilterHandler', notes: 'Virtualised set filter.' },
  { name: '@libregrid/multi-filter', modules: 'MultiFilter', exports: 'MultiFilterModule, MultiFilter, MultiFilterHandler', notes: 'Composable multi filter.' },
  { name: '@libregrid/filters-tool-panel', modules: 'FiltersToolPanel', exports: 'FiltersToolPanelModule, FiltersToolPanel', notes: 'Filters tool panel.' },
  { name: '@libregrid/server-side-row-model', modules: 'ServerSideRowModel', exports: 'ServerSideRowModelModule, ServerSideRowModel, ServerSideLoadingCellRenderer, SsrmExpandListener, SsrmFilterListener, SsrmListenerUtils, SsrmSortService', notes: 'Flat and hierarchical SSRM stores, pivot, analytical requests.' },
  { name: '@libregrid/server-side-selection', modules: 'ServerSideSelection', exports: 'ServerSideSelectionModule, SsrmSelectionService, ServerSideSelectionProvider', notes: 'Durable, filter-aware selection stored in application systems rather than grid memory.' },
  { name: '@libregrid/pivot', modules: 'Pivot', exports: 'PivotModule, PivotStage, PivotColsService, PivotResultColsService, PivotColDefService, createGeneratedPivotDefs', notes: 'Client-side pivot over the CSRM.' },
  { name: '@libregrid/viewport-row-model', modules: 'ViewportRowModel', exports: 'ViewportRowModelModule, ViewportRowModel', notes: 'Push-driven viewport row model.' },
  { name: '@libregrid/tree-data', modules: 'TreeData', exports: 'TreeDataModule, TreeDataService', notes: 'Tree data source shapes and managed reparenting.' },
  { name: '@libregrid/master-detail', modules: 'MasterDetail', exports: 'MasterDetailModule, MasterDetailService, DetailCellRenderer', notes: 'Nested detail grids with caching.' },
  { name: '@libregrid/advanced-filter', modules: 'AdvancedFilter', exports: 'AdvancedFilterModule, AdvancedFilterService, parseAdvancedFilterExpression, serialiseAdvancedFilterModel, evaluateAdvancedFilterModel', notes: 'Serialisable advanced filter expressions.' },
  { name: '@libregrid/find', modules: 'Find', exports: 'FindModule, FindService, FindCellRenderer', notes: 'Rendered-cell find navigation.' },
  { name: '@libregrid/rich-select', modules: 'RichSelect', exports: 'RichSelectModule, RichSelectCellEditor', notes: 'Virtualised rich-select cell editor.' },
  { name: '@libregrid/integrated-charts', modules: 'IntegratedCharts', exports: 'IntegratedChartsModule, ChartService, ChartCrossFilterService, AgChartsCommunityProvider, chartOptionsFor', notes: 'Range/pivot/cross-filter charts on ag-charts-community (MIT).' },
  { name: '@libregrid/sparklines', modules: 'Sparklines', exports: 'SparklinesModule, SparklineCellRenderer', notes: 'In-cell sparklines.' },
  { name: '@libregrid/excel-export', modules: 'ExcelExport', exports: 'ExcelExportModule, ExcelExportService', notes: 'Create Excel workbooks from grid rows, ranges, and sheets.' },
  { name: '@libregrid/notes', modules: 'Notes', exports: 'NotesModule, NotesService', notes: 'Attach visible notes to cells for operational hand-offs.' },
  { name: '@libregrid/row-numbers', modules: 'RowNumbers', exports: 'RowNumbersModule, RowNumberService', notes: 'Stable, configurable row numbering and resize affordances.' },
  { name: '@libregrid/toolbar', modules: 'Toolbar', exports: 'ToolbarModule, ToolbarService', notes: 'A framework-neutral toolbar contract for grid actions.' },
  { name: '@libregrid/angular', modules: '—', exports: 'provideLibreGrid, registerLibreGridModules, createGridApiSignals, defineGridOptions, createColumnDefs, withCommunityModules', notes: 'Angular signal ergonomics and typed helpers.' },
  { name: '@libregrid/all', modules: '—', exports: 'every module above', notes: 'Convenience barrel — for quick starts and demos only.' },
];

type PackageCategory = 'Foundation' | 'Analyze' | 'Data systems' | 'Workspace' | 'Visualize';

const CATEGORIES: readonly (PackageCategory | 'All')[] = [
  'All', 'Foundation', 'Analyze', 'Data systems', 'Workspace', 'Visualize',
];

const CATEGORY_BY_PACKAGE: Readonly<Record<string, PackageCategory>> = {
  '@libregrid/core': 'Foundation', '@libregrid/angular': 'Foundation', '@libregrid/material': 'Foundation', '@libregrid/all': 'Foundation',
  '@libregrid/row-grouping': 'Analyze', '@libregrid/pivot': 'Analyze', '@libregrid/set-filter': 'Analyze', '@libregrid/multi-filter': 'Analyze', '@libregrid/filters-tool-panel': 'Analyze', '@libregrid/advanced-filter': 'Analyze', '@libregrid/find': 'Analyze',
  '@libregrid/server-side-row-model': 'Data systems', '@libregrid/server-side-selection': 'Data systems', '@libregrid/viewport-row-model': 'Data systems',
  '@libregrid/menu': 'Workspace', '@libregrid/side-bar': 'Workspace', '@libregrid/columns-tool-panel': 'Workspace', '@libregrid/cell-selection': 'Workspace', '@libregrid/clipboard': 'Workspace', '@libregrid/status-bar': 'Workspace', '@libregrid/batch-edit': 'Workspace', '@libregrid/calculated-columns': 'Workspace', '@libregrid/column-header-edit': 'Workspace', '@libregrid/tree-data': 'Workspace', '@libregrid/master-detail': 'Workspace', '@libregrid/rich-select': 'Workspace', '@libregrid/notes': 'Workspace', '@libregrid/row-numbers': 'Workspace', '@libregrid/toolbar': 'Workspace',
  '@libregrid/integrated-charts': 'Visualize', '@libregrid/sparklines': 'Visualize', '@libregrid/excel-export': 'Visualize',
};

const GUIDE_BY_PACKAGE: Readonly<Record<string, string>> = {
  '@libregrid/core': 'getting-started', '@libregrid/angular': 'angular', '@libregrid/material': 'material', '@libregrid/all': 'getting-started',
  '@libregrid/menu': 'menus', '@libregrid/side-bar': 'side-bar', '@libregrid/toolbar': 'toolbar', '@libregrid/row-grouping': 'row-grouping', '@libregrid/pivot': 'pivot', '@libregrid/columns-tool-panel': 'columns', '@libregrid/cell-selection': 'selection', '@libregrid/clipboard': 'selection', '@libregrid/status-bar': 'selection', '@libregrid/batch-edit': 'batch-edit', '@libregrid/calculated-columns': 'calculated-columns', '@libregrid/column-header-edit': 'column-header-edit', '@libregrid/row-numbers': 'row-numbers', '@libregrid/notes': 'notes', '@libregrid/set-filter': 'filters', '@libregrid/multi-filter': 'filters', '@libregrid/filters-tool-panel': 'filters', '@libregrid/advanced-filter': 'advanced-filter-find', '@libregrid/find': 'advanced-filter-find', '@libregrid/rich-select': 'advanced-filter-find', '@libregrid/server-side-row-model': 'server-side-advanced', '@libregrid/server-side-selection': 'server-side-selection', '@libregrid/viewport-row-model': 'viewport', '@libregrid/tree-data': 'tree-data', '@libregrid/master-detail': 'master-detail', '@libregrid/integrated-charts': 'charts', '@libregrid/sparklines': 'sparklines', '@libregrid/excel-export': 'excel-export',
};

const BACKEND_PACKAGES = new Set(['@libregrid/server-side-row-model', '@libregrid/server-side-selection', '@libregrid/viewport-row-model', '@libregrid/master-detail']);

function registrationExports(entry: PackageEntry): string[] {
  return entry.exports.split(', ').filter((value) => value.endsWith('Module'));
}

function examplesFor(entry: PackageEntry): readonly DocsCodeExample[] {
  if (entry.name === '@libregrid/material') {
    return [{ id: 'material', label: 'Application bootstrap', language: 'TypeScript', filename: 'main.ts', description: 'Install this once at the Angular application composition root.', code: `import { provideLibreGridMaterialTheme } from '@libregrid/material';\n\nbootstrapApplication(AppComponent, {\n  providers: [provideLibreGridMaterialTheme()],\n});` }];
  }
  if (entry.name === '@libregrid/angular') {
    return [{ id: 'angular', label: 'Application bootstrap', language: 'TypeScript', filename: 'main.ts', description: 'Register the feature modules your application has deliberately chosen.', code: `import { provideLibreGrid } from '@libregrid/angular';\nimport { RowGroupingModule } from '@libregrid/row-grouping';\n\nbootstrapApplication(AppComponent, {\n  providers: [provideLibreGrid(RowGroupingModule)],\n});` }];
  }
  if (entry.name === '@libregrid/all') {
    return [{ id: 'all', label: 'Convenience barrel', language: 'TypeScript', filename: 'main.ts', description: 'It re-exports individual modules for evaluation. You must still name the modules to register; switch to direct feature packages before production.', code: `import { provideLibreGrid, RowGroupingModule, SetFilterModule } from '@libregrid/all';\n\nbootstrapApplication(AppComponent, {\n  providers: [provideLibreGrid(RowGroupingModule, SetFilterModule)],\n});` }];
  }
  const modules = registrationExports(entry);
  return [{ id: 'register', label: 'Angular setup', language: 'TypeScript', filename: 'main.ts', description: 'Install the package, then register its module once before any grid mounts.', code: `npm install ${entry.name}\n\nimport { provideLibreGrid } from '@libregrid/angular';\nimport { ${modules.join(', ')} } from '${entry.name}';\n\nbootstrapApplication(AppComponent, {\n  providers: [provideLibreGrid(${modules.join(', ')})],\n});` }];
}

/** Developer-facing integration reference: choose a capability, register it deliberately, then follow the live guide for behavior. */
@Component({
  selector: 'lgr-api-reference',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, DocsCodeExampleComponent],
  styles: `
    .purpose { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%, 15rem),1fr)); gap:.75rem; margin:1.5rem 0; }
    .purpose article { padding:1rem; border-radius:14px; background:var(--mat-sys-surface-container-low); border:1px solid var(--mat-sys-outline-variant); } .purpose h2 { margin:0; font-size:1rem; } .purpose p { margin:.35rem 0 0; font-size:.86rem; color:var(--mat-sys-on-surface-variant); }
    .controls { display:flex; flex-wrap:wrap; gap:.65rem; align-items:center; margin:1.5rem 0 .75rem; } .search { min-width:min(100%, 17rem); flex:1 1 17rem; } .categories { display:flex; flex-wrap:wrap; gap:.4rem; }
    .category.is-active { color:var(--mat-sys-on-secondary-container); background:var(--mat-sys-secondary-container); } .result-count { color:var(--mat-sys-on-surface-variant); font-size:.86rem; }
    .reference { display:grid; grid-template-columns:minmax(0,1fr); gap:1rem; align-items:start; } .package-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%, 15rem),1fr)); gap:.75rem; }
    .package { min-height:12rem; padding:1rem; border:1px solid var(--mat-sys-outline-variant); border-radius:14px; background:var(--mat-sys-surface-container-low); color:var(--mat-sys-on-surface); text-align:start; font:inherit; cursor:pointer; } .package:hover { border-color:var(--mat-sys-primary); } .package.is-selected { border-color:var(--mat-sys-primary); outline:1px solid var(--mat-sys-primary); background:color-mix(in srgb, var(--mat-sys-primary) 8%, var(--mat-sys-surface-container-low)); }
    .package code { display:inline-block; font-size:.78rem; overflow-wrap:anywhere; text-align:left; } .package h2 { margin:.7rem 0 .35rem; font-size:1rem; } .package p { margin:0; color:var(--mat-sys-on-surface-variant); font-size:.84rem; line-height:1.5; } .boundary { display:block; margin-top:.8rem; color:var(--mat-sys-primary); font-size:.72rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
    .detail { position:sticky; top:1rem; } .detail mat-card-content { padding:1.25rem; } .detail h2 { margin:0; overflow-wrap:anywhere; } .detail-lead { margin:.55rem 0 1rem; color:var(--mat-sys-on-surface-variant); } dl { display:grid; grid-template-columns:7rem minmax(0,1fr); gap:.55rem .75rem; margin:1rem 0; font-size:.86rem; } dt { color:var(--mat-sys-on-surface-variant); } dd { min-width:0; margin:0; overflow-wrap:anywhere; } .detail-actions { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1rem; }
    @media (min-width:1080px) { .reference { grid-template-columns:minmax(0,1.35fr) minmax(22rem,.65fr); } .package-list { grid-template-columns:repeat(2,minmax(0,1fr)); } } @media (max-width:700px) { dl { grid-template-columns:1fr; gap:.2rem; } .detail { position:static; } }
  `,
  template: `
    <div class="lgr-page">
      <p class="lgr-eyebrow">Developer and technical-lead reference</p>
      <h1>Choose, register, and operate LibreGrid capabilities</h1>
      <p>
        This is not a product tour or a dump of internal symbols. It is the implementation map for people adding LibreGrid to an application: choose a package by the job it solves, copy the registration point, then open the live guide for behavior and backend boundaries. Product Managers should start in the <a routerLink="/packages">Package Catalog</a>.
      </p>
      <section class="purpose" aria-label="How to use this reference">
        <article><h2>1. Choose by customer job</h2><p>Search a need such as “durable selection” or “exports,” not an internal class name.</p></article>
        <article><h2>2. Register once</h2><p>Every selected package shows the application-composition snippet developers can copy.</p></article>
        <article><h2>3. Validate the boundary</h2><p>Data-system packages are marked so teams know where their API or persistence layer begins.</p></article>
      </section>
      <div class="controls">
        <mat-form-field class="search" appearance="outline" subscriptSizing="dynamic"><mat-label>Search a customer job, package, module, or export</mat-label><mat-icon matPrefix>search</mat-icon><input matInput type="search" [value]="query()" (input)="query.set($any($event.target).value)" /></mat-form-field>
        <div class="categories" aria-label="Package category">
          @for (category of categories; track category) { <button matButton="text" type="button" class="category" [class.is-active]="categoryFilter() === category" [attr.aria-pressed]="categoryFilter() === category" (click)="categoryFilter.set(category)">{{ category }}</button> }
        </div>
      </div>
      <p class="result-count" aria-live="polite">{{ filteredPackages().length }} packages match. Select one to see its integration path.</p>
      <div class="reference">
        <div class="package-list" aria-label="LibreGrid package choices">
          @for (entry of filteredPackages(); track entry.name) {
            <button type="button" class="package" [class.is-selected]="selectedPackage().name === entry.name" [attr.aria-pressed]="selectedPackage().name === entry.name" (click)="select(entry)">
              <code>{{ entry.name }}</code><h2>{{ categoryFor(entry) }}</h2><p>{{ entry.notes }}</p><span class="boundary">{{ boundaryFor(entry) }}</span>
            </button>
          } @empty { <p>No packages match that search. Try a customer outcome or module name.</p> }
        </div>
        <aside class="detail" aria-live="polite"><mat-card appearance="outlined"><mat-card-content>
          <h2><code>{{ selectedPackage().name }}</code></h2><p class="detail-lead">{{ selectedPackage().notes }}</p>
          <dl><dt>Use when</dt><dd>{{ useWhen(selectedPackage()) }}</dd><dt>Registered modules</dt><dd><code>{{ selectedPackage().modules }}</code></dd><dt>Public surface</dt><dd>{{ selectedPackage().exports }}</dd><dt>System boundary</dt><dd>{{ boundaryFor(selectedPackage()) }}</dd></dl>
          <lgr-docs-code-example heading="Add this package" [examples]="selectedExamples()" />
          <div class="detail-actions"><a matButton="tonal" [routerLink]="'/' + guideFor(selectedPackage())">Open live guide <mat-icon>arrow_forward</mat-icon></a><a matButton="text" routerLink="/getting-started">Registration guide</a></div>
        </mat-card-content></mat-card></aside>
      </div>
    </div>
  `,
})
export class ApiReference {
  protected readonly categories = CATEGORIES;
  protected readonly query = signal('');
  protected readonly categoryFilter = signal<PackageCategory | 'All'>('All');
  protected readonly selectedPackage = signal<PackageEntry>(PACKAGES[0]!);
  protected readonly filteredPackages = computed(() => {
    const query = this.query().trim().toLowerCase();
    const category = this.categoryFilter();
    return PACKAGES.filter((entry) => (category === 'All' || this.categoryFor(entry) === category) && (!query || [entry.name, entry.modules, entry.exports, entry.notes, this.categoryFor(entry), this.boundaryFor(entry)].join(' ').toLowerCase().includes(query)));
  });
  protected readonly selectedExamples = computed(() => examplesFor(this.selectedPackage()));

  protected select(entry: PackageEntry): void { this.selectedPackage.set(entry); }
  protected categoryFor(entry: PackageEntry): PackageCategory { return CATEGORY_BY_PACKAGE[entry.name] ?? 'Workspace'; }
  protected guideFor(entry: PackageEntry): string { return GUIDE_BY_PACKAGE[entry.name] ?? 'getting-started'; }
  protected boundaryFor(entry: PackageEntry): string { return BACKEND_PACKAGES.has(entry.name) ? 'Frontend + your data systems' : 'Frontend integration'; }
  protected useWhen(entry: PackageEntry): string { return entry.notes; }
}
