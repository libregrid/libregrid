import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
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
  { name: '@libregrid/ai-toolkit', modules: 'AiToolkit', exports: 'AiToolkitModule (registers GridApi.getStructuredSchema)', notes: 'Pure, live-grid generation of a strict seven-feature GridState schema. No model, transport, or credential code.' },
  { name: '@libregrid/ai-protocol', modules: '—', exports: 'AI_PROTOCOL, buildProviderOutputSchema, buildProviderPrompt, validateGridCommandRequest, validateGridCommandResponse, revisionFor', notes: 'Language-neutral request/response contract, runtime validator, JSON Schemas, and OpenAPI 3.1 document.' },
  { name: '@libregrid/ai-client', modules: '—', exports: 'createGridAssistant, createHttpGridCommandTransport, GridAssistantError', notes: 'Browser capture, gateway transport, local revalidation, dry-run diff, stale-state detection, and safe explicit apply.' },
  { name: '@libregrid/ai-gateway', modules: '—', exports: 'createGridCommandHandler, createOpenAiResponsesProvider, createMockProvider, listenNodeGateway', notes: 'Server-only provider port, validated HTTP gateway, OpenAI Responses adapter, mock, CLI, and container.' },
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
  { name: '@libregrid/toolbar', modules: 'Toolbar', exports: 'ToolbarModule, registerToolbarItem', notes: 'A framework-neutral toolbar contract for grid actions.' },
  { name: '@libregrid/angular', modules: '—', exports: 'provideLibreGrid, registerLibreGridModules, createGridApiSignals, defineGridOptions, createColumnDefs, withCommunityModules', notes: 'Angular signal ergonomics and typed helpers.' },
  { name: '@libregrid/all', modules: '—', exports: 'every module above', notes: 'Convenience barrel — for quick starts and demos only.' },
];

type PackageCategory = 'Foundation' | 'Analyze' | 'Data systems' | 'Workspace' | 'Visualize';

const CATEGORIES: readonly (PackageCategory | 'All')[] = [
  'All', 'Foundation', 'Analyze', 'Data systems', 'Workspace', 'Visualize',
];

const CATEGORY_BY_PACKAGE: Readonly<Record<string, PackageCategory>> = {
  '@libregrid/core': 'Foundation', '@libregrid/angular': 'Foundation', '@libregrid/material': 'Foundation', '@libregrid/all': 'Foundation', '@libregrid/ai-protocol': 'Foundation',
  '@libregrid/row-grouping': 'Analyze', '@libregrid/pivot': 'Analyze', '@libregrid/set-filter': 'Analyze', '@libregrid/multi-filter': 'Analyze', '@libregrid/filters-tool-panel': 'Analyze', '@libregrid/advanced-filter': 'Analyze', '@libregrid/find': 'Analyze', '@libregrid/ai-toolkit': 'Analyze', '@libregrid/ai-client': 'Analyze',
  '@libregrid/server-side-row-model': 'Data systems', '@libregrid/server-side-selection': 'Data systems', '@libregrid/viewport-row-model': 'Data systems', '@libregrid/ai-gateway': 'Data systems',
  '@libregrid/menu': 'Workspace', '@libregrid/side-bar': 'Workspace', '@libregrid/columns-tool-panel': 'Workspace', '@libregrid/cell-selection': 'Workspace', '@libregrid/clipboard': 'Workspace', '@libregrid/status-bar': 'Workspace', '@libregrid/batch-edit': 'Workspace', '@libregrid/calculated-columns': 'Workspace', '@libregrid/column-header-edit': 'Workspace', '@libregrid/tree-data': 'Workspace', '@libregrid/master-detail': 'Workspace', '@libregrid/rich-select': 'Workspace', '@libregrid/notes': 'Workspace', '@libregrid/row-numbers': 'Workspace', '@libregrid/toolbar': 'Workspace',
  '@libregrid/integrated-charts': 'Visualize', '@libregrid/sparklines': 'Visualize', '@libregrid/excel-export': 'Visualize',
};

const GUIDE_BY_PACKAGE: Readonly<Record<string, string>> = {
  '@libregrid/core': 'getting-started', '@libregrid/angular': 'angular', '@libregrid/material': 'material', '@libregrid/all': 'getting-started',
  '@libregrid/menu': 'menus', '@libregrid/side-bar': 'side-bar', '@libregrid/toolbar': 'toolbar', '@libregrid/row-grouping': 'row-grouping', '@libregrid/pivot': 'pivot', '@libregrid/columns-tool-panel': 'columns', '@libregrid/cell-selection': 'selection', '@libregrid/clipboard': 'selection', '@libregrid/status-bar': 'selection', '@libregrid/batch-edit': 'batch-edit', '@libregrid/calculated-columns': 'calculated-columns', '@libregrid/ai-toolkit': 'ai-toolkit', '@libregrid/ai-protocol': 'ai-toolkit', '@libregrid/ai-client': 'ai-toolkit', '@libregrid/ai-gateway': 'ai-toolkit', '@libregrid/column-header-edit': 'column-header-edit', '@libregrid/row-numbers': 'row-numbers', '@libregrid/notes': 'notes', '@libregrid/set-filter': 'filters', '@libregrid/multi-filter': 'filters', '@libregrid/filters-tool-panel': 'filters', '@libregrid/advanced-filter': 'advanced-filter-find', '@libregrid/find': 'advanced-filter-find', '@libregrid/rich-select': 'advanced-filter-find', '@libregrid/server-side-row-model': 'server-side-advanced', '@libregrid/server-side-selection': 'server-side-selection', '@libregrid/viewport-row-model': 'viewport', '@libregrid/tree-data': 'tree-data', '@libregrid/master-detail': 'master-detail', '@libregrid/integrated-charts': 'charts', '@libregrid/sparklines': 'sparklines', '@libregrid/excel-export': 'excel-export',
};

const BACKEND_PACKAGES = new Set(['@libregrid/server-side-row-model', '@libregrid/server-side-selection', '@libregrid/viewport-row-model', '@libregrid/master-detail', '@libregrid/ai-gateway']);

function registrationExports(entry: PackageEntry): string[] {
  return entry.exports.split(', ').filter((value) => value.endsWith('Module'));
}

function slug(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}

function setupExampleFor(entry: PackageEntry): DocsCodeExample {
  if (entry.name === '@libregrid/ai-protocol') {
    return { id: 'protocol', label: 'Contract validation', language: 'TypeScript', filename: 'gateway.ts', description: 'Use the same versioned envelope on either side of the HTTP boundary; non-TypeScript servers can generate from the shipped OpenAPI document.', code: `import { validateGridCommandRequest } from '@libregrid/ai-protocol';

const result = validateGridCommandRequest(await request.json());
if (!result.ok) return Response.json(result.issues, { status: 400 });` };
  }
  if (entry.name === '@libregrid/ai-client') {
    return { id: 'client', label: 'Browser proposal', language: 'TypeScript', filename: 'grid-assistant.ts', description: 'Generate and review a locally revalidated proposal before applying it.', code: `import { createGridAssistant } from '@libregrid/ai-client';

const assistant = createGridAssistant({ api, endpoint: '/v1/grid-command' });
const proposal = await assistant.run(command);
showDiff(proposal.changes);
proposal.apply();` };
  }
  if (entry.name === '@libregrid/ai-gateway') {
    return { id: 'gateway', label: 'Server gateway', language: 'TypeScript', filename: 'ai-route.ts', description: 'Keep the provider key and model choice on the authenticated server.', code: `import { createGridCommandHandler, createOpenAiResponsesProvider } from '@libregrid/ai-gateway';

export const handle = createGridCommandHandler({
  provider: createOpenAiResponsesProvider({
    apiKey: () => secrets.OPENAI_API_KEY,
    model: 'gpt-5.6',
  }),
});` };
  }
  if (entry.name === '@libregrid/material') {
    return { id: 'material', label: 'Application bootstrap', language: 'TypeScript', filename: 'main.ts', description: 'Install this once at the Angular application composition root.', code: `import { provideLibreGridMaterialTheme } from '@libregrid/material';\n\nbootstrapApplication(AppComponent, {\n  providers: [provideLibreGridMaterialTheme()],\n});` };
  }
  if (entry.name === '@libregrid/angular') {
    return { id: 'angular', label: 'Application bootstrap', language: 'TypeScript', filename: 'main.ts', description: 'Register the feature modules your application has deliberately chosen.', code: `import { provideLibreGrid } from '@libregrid/angular';\nimport { RowGroupingModule } from '@libregrid/row-grouping';\n\nbootstrapApplication(AppComponent, {\n  providers: [provideLibreGrid(RowGroupingModule)],\n});` };
  }
  if (entry.name === '@libregrid/all') {
    return { id: 'all', label: 'Convenience barrel', language: 'TypeScript', filename: 'main.ts', description: 'It re-exports individual modules for evaluation. You must still name the modules to register; switch to direct feature packages before production.', code: `import { provideLibreGrid, RowGroupingModule, SetFilterModule } from '@libregrid/all';\n\nbootstrapApplication(AppComponent, {\n  providers: [provideLibreGrid(RowGroupingModule, SetFilterModule)],\n});` };
  }
  const modules = registrationExports(entry);
  return { id: 'register', label: 'Angular setup', language: 'TypeScript', filename: 'main.ts', description: 'Install the package, then register its module once before any grid mounts.', code: `npm install ${entry.name}\n\nimport { provideLibreGrid } from '@libregrid/angular';\nimport { ${modules.join(', ')} } from '${entry.name}';\n\nbootstrapApplication(AppComponent, {\n  providers: [provideLibreGrid(${modules.join(', ')})],\n});` };
}

/** Small, realistic usage snippets keyed by package; entries omitted here render only their setup tab. */
const IN_USE_EXAMPLES: Readonly<Record<string, Omit<DocsCodeExample, 'id' | 'label'>>> = {
  '@libregrid/core': { language: 'TypeScript', filename: 'flag-cell-renderer.component.ts', description: 'Foundation helpers let a renderer reach a feature bean without a hard dependency on that feature package.', code: `import { asBean, getUntypedBean } from '@libregrid/core';

// Reach a feature bean from inside a renderer without importing its package.
const untyped = getUntypedBean(context, 'notesService');
const notes = asBean<NotesServiceLike>(untyped);
notes.getNote(params.node, params.column.getId());` },
  '@libregrid/menu': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Contribute an application action to the grid context menu registry.', code: `import { registerMenuItem } from '@libregrid/menu';

registerMenuItem('context', {
  id: 'flag-order',
  label: 'Flag for review',
  action: (params) => this.reviewQueue.add(params.node.data),
});` },
  '@libregrid/side-bar': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Host an application panel inside the grid side bar.', code: `import { registerToolPanel } from '@libregrid/side-bar';

registerToolPanel({
  id: 'field-picker',
  label: 'Fields',
  component: FieldPickerComponent,
});` },
  '@libregrid/material': { language: 'TypeScript', filename: 'main.ts', description: 'Opt the side bar and rich-select editor into the Material renderers after the theme provider installs.', code: `import { installMaterialRichSelectCellEditor, installMaterialSideBarRenderer } from '@libregrid/material';

// Call once after provideLibreGridMaterialTheme() at the composition root.
installMaterialSideBarRenderer();
installMaterialRichSelectCellEditor();` },
  '@libregrid/row-grouping': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Group orders by region and aggregate revenue directly in the column definitions.', code: `columnDefs = [
  { field: 'region', rowGroup: true, hide: true },
  { field: 'revenue', aggFunc: 'sum' },
  { field: 'orders', aggFunc: 'count' },
];
autoGroupColumnDef = { headerName: 'Region', minWidth: 220 };` },
  '@libregrid/columns-tool-panel': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Expose column management and the row-group drop zone in the grid side bar.', code: `gridOptions = {
  sideBar: {
    toolPanels: [{ id: 'columns', label: 'Columns', component: ColumnsToolPanel }],
    defaultToolPanel: 'columns',
  },
};` },
  '@libregrid/cell-selection': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Turn on range selection and read the active ranges back from the grid API.', code: `gridOptions = { cellSelection: true };

copySelection() {
  // Ranges surface on the grid API once the module is registered.
  const ranges = this.api.getCellRanges() ?? [];
  if (!ranges.length) return;
  this.report.recordRange(ranges[0]);
}` },
  '@libregrid/clipboard': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Parse Excel-shaped TSV back into rows when the user pastes.', code: `import { fromDelimited } from '@libregrid/clipboard';

gridOptions = {
  enableClipboard: true,
  processDataFromClipboard: (params) => fromDelimited(params.data),
};` },
  '@libregrid/status-bar': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Compose row-count and aggregation readouts in the grid status bar.', code: `gridOptions = {
  statusBar: {
    panels: [
      { component: TotalAndFilteredRowCountPanel },
      { component: SelectedRowCountPanel },
      { component: AggregationPanel, params: { aggFuncs: ['sum', 'avg'] } },
    ],
  },
};` },
  '@libregrid/batch-edit': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Stage a coordinated edit and commit it as one reviewable unit.', code: `applyPriceUpdate(rows: IRowNode[], price: number) {
  this.api.startBatchEdit(); // staged edits stay visible, uncommitted
  for (const row of rows) row.setDataValue('price', price);
  this.api.commitBatchEdit(); // or cancelBatchEdit() to roll them back
}` },
  '@libregrid/calculated-columns': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Derive a read-only margin column from existing fields.', code: `gridOptions = {
  calculatedColumns: true,
  columnDefs: [
    { field: 'revenue' },
    { field: 'cost' },
    { colId: 'margin', headerName: 'Margin', calculatedExpression: '[revenue] - [cost]', cellDataType: 'number' },
  ],
};` },
  '@libregrid/ai-toolkit': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Capture the strict seven-feature state snapshot the assistant contract expects.', code: `sendToAssistant(command: string) {
  // Registration adds getStructuredSchema() to every grid API.
  const state = this.api.getStructuredSchema();
  this.transport.send({ command, state });
}` },
  '@libregrid/ai-protocol': { language: 'TypeScript', filename: 'gateway.ts', description: 'Compose the prompt, output schema, and revision for a single provider call.', code: `import { buildProviderOutputSchema, buildProviderPrompt, revisionFor } from '@libregrid/ai-protocol';

// Model-facing artifacts derive from the same envelope the client validates.
const revision = revisionFor(state);
const prompt = buildProviderPrompt(command, state);
const outputSchema = buildProviderOutputSchema();` },
  '@libregrid/ai-client': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Apply a revalidated proposal and handle a stale-grid refusal explicitly.', code: `import { GridAssistantError, createGridAssistant, createHttpGridCommandTransport } from '@libregrid/ai-client';

const transport = createHttpGridCommandTransport('/v1/grid-command');
const assistant = createGridAssistant({ api, transport });
try {
  (await assistant.run(command)).apply();
} catch (error) {
  if (error instanceof GridAssistantError) this.showStaleStateNotice();
}` },
  '@libregrid/ai-gateway': { language: 'TypeScript', filename: 'ai-route.ts', description: 'Run the validated gateway locally against the deterministic mock provider.', code: `import { createGridCommandHandler, createMockProvider, listenNodeGateway } from '@libregrid/ai-gateway';

// Deterministic local development — no model key required.
const handler = createGridCommandHandler({ provider: createMockProvider() });
listenNodeGateway(handler, { port: 8787 });` },
  '@libregrid/column-header-edit': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Let users rename headers in place on the columns that opt in.', code: `columnDefs = [
  // headerNameEditable enables the inline rename affordance on this column.
  { field: 'product', headerNameEditable: true },
  { field: 'region', headerNameEditable: true },
  { field: 'revenue' },
];` },
  '@libregrid/set-filter': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Filter order status with a virtualised value list.', code: `columnDefs = [
  {
    field: 'status',
    filter: SetFilter,
    filterParams: { values: ['Open', 'In review', 'Closed'] },
  },
];` },
  '@libregrid/multi-filter': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Compose a number condition and a value list on the same column.', code: `columnDefs = [
  {
    field: 'price',
    filter: MultiFilter,
    filterParams: { filters: [{ filter: 'agNumberColumnFilter' }, { filter: SetFilter }] },
  },
];` },
  '@libregrid/filters-tool-panel': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Expose every column filter in a dedicated side-bar panel.', code: `gridOptions = {
  sideBar: {
    toolPanels: [{ id: 'filters', label: 'Filters', component: FiltersToolPanel }],
  },
};` },
  '@libregrid/server-side-row-model': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Page orders from your API through the server-side datasource.', code: `gridOptions = { rowModelType: 'serverSide' };

datasource = {
  getRows: (params) =>
    this.orders.query(params.request).subscribe(({ rows, total }) =>
      params.success({ rowData: rows, rowCount: total })),
};` },
  '@libregrid/server-side-selection': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Persist selection in application systems so it survives filters and reloads.', code: `// The provider is the app-owned persistence seam; calls are keyed per tab.
const selectionProvider: ServerSideSelectionProvider = {
  getSpec: ({ gridId, tabId }) => this.selectionStore.getSpec(gridId, tabId),
  applyOps: ({ gridId, tabId, ops }) => this.selectionStore.applyOps(gridId, tabId, ops),
  resolveSelected: ({ gridId, tabId, rowIds, groupRoutes }) =>
    this.selectionStore.resolve(gridId, tabId, rowIds, groupRoutes),
};
gridOptions = {
  rowModelType: 'serverSide',
  ssrmSelection: { provider: selectionProvider, tabId: this.tabId },
};` },
  '@libregrid/pivot': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Pivot revenue by region and quarter entirely in the browser.', code: `columnDefs = [
  { field: 'region', pivot: true },
  { field: 'quarter', pivot: true },
  { field: 'revenue', aggFunc: 'sum' },
];
gridOptions = { pivotMode: true };` },
  '@libregrid/viewport-row-model': { language: 'TypeScript', filename: 'ticker-grid.component.ts', description: 'Push a live tick stream into the viewport row model.', code: `gridOptions = { rowModelType: 'viewport' };

onGridReady(event: GridReadyEvent) {
  event.api.setViewportDatasource({
    init: (params) => this.ticks.subscribe((rows) => params.setRowData(rows)),
  });
}` },
  '@libregrid/tree-data': { language: 'TypeScript', filename: 'org-grid.component.ts', description: 'Render a path hierarchy and let managed row drags reparent nodes.', code: `gridOptions = {
  treeData: true,
  getDataPath: (data) => data.path,
  rowDragManaged: true, // dropping a row reparents it
  suppressMoveWhenRowDragging: true,
  autoGroupColumnDef: { headerName: 'Team', rowDrag: true, minWidth: 240 },
};` },
  '@libregrid/master-detail': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Expand an order into a cached line-item detail grid.', code: `gridOptions = {
  masterDetail: true,
  detailCellRenderer: DetailCellRenderer,
  detailCellRendererParams: {
    detailGridOptions: { columnDefs: this.lineItemCols },
    getDetailRowData: (params) => params.success(params.data.lines),
  },
};` },
  '@libregrid/advanced-filter': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Round-trip an advanced filter view through its serialised expression form.', code: `import { parseAdvancedFilterExpression, serialiseAdvancedFilterModel } from '@libregrid/advanced-filter';

saveView = () => serialiseAdvancedFilterModel(this.api.getAdvancedFilterModel());
loadView(saved: string) {
  this.api.setAdvancedFilterModel(parseAdvancedFilterExpression(saved));
}` },
  '@libregrid/find': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Search rendered cells and step through the matches.', code: `gridOptions = { findOptions: { caseSensitive: false } };

search(term: string) {
  // The search value is a grid option; matches update as you type.
  this.api.setGridOption('findSearchValue', term);
  this.api.findNext();
}` },
  '@libregrid/rich-select': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Edit the owner cell with a virtualised rich-select list.', code: `columnDefs = [
  {
    field: 'owner',
    editable: true,
    cellEditor: RichSelectCellEditor,
    cellEditorParams: { values: this.teamMembers, searchHighlight: true },
  },
];` },
  '@libregrid/integrated-charts': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Chart a selected revenue range with the integrated chart service.', code: `gridOptions = { enableCharts: true };

chartSelectedRange() {
  this.api.createRangeChart({
    chartType: 'groupedColumn',
    cellRange: { columns: ['quarter', 'revenue'] },
  });
}` },
  '@libregrid/sparklines': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: "Render each row's trend array as an in-cell line sparkline.", code: `columnDefs = [
  {
    field: 'trend',
    headerName: '12-month trend',
    cellRenderer: SparklineCellRenderer,
    cellRendererParams: { sparklineOptions: { type: 'line' } },
  },
];` },
  '@libregrid/excel-export': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: "Write the grid's rows to a named Excel workbook.", code: `exportQuarter() {
  this.api.exportDataAsExcel({ fileName: 'q3-orders.xlsx' });
  // or exportMultipleSheetsAsExcel(...) for multi-tab workbooks
}` },
  '@libregrid/notes': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Store cell notes in your own system through the notes data source.', code: `// Every read and write goes through your data source; the grid stores nothing itself.
gridOptions = {
  getRowId: (params) => params.data.id,
  notesDataSource: {
    getNote: ({ rowNode, column }) => this.store.get(rowNode.id + '::' + column.getColId()),
    setNote: ({ rowNode, column, note }) =>
      note !== undefined
        ? this.store.set(rowNode.id + '::' + column.getColId(), note)
        : this.store.delete(rowNode.id + '::' + column.getColId()),
  },
};` },
  '@libregrid/row-numbers': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Number rows stably and let a click on a number select the row.', code: `gridOptions = {
  rowNumbers: { enableRowResizer: true }, // drag handle on each number cell
  cellSelection: true, // clicking a row number selects the whole row
};` },
  '@libregrid/toolbar': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Register grid actions against the shared toolbar contract.', code: `import { registerToolbarItem } from '@libregrid/toolbar';

registerToolbarItem('exportQuarter', ({ api }) => {
  const gui = document.createElement('button');
  gui.textContent = 'Export quarter';
  gui.addEventListener('click', () => api.exportDataAsExcel());
  return { gui };
});` },
  '@libregrid/angular': { language: 'TypeScript', filename: 'orders-grid.component.ts', description: 'Bind grid state to signals inside a feature component.', code: `import { createGridApiSignals, defineGridOptions } from '@libregrid/angular';

protected readonly options = defineGridOptions<Order>({ columnDefs: orderCols });
protected readonly grid = createGridApiSignals<Order>();

readonly selectedCount = computed(() => this.grid.selectedRows().length);` },
  // '@libregrid/all' intentionally has no usage tab: the barrel is registration-only and in-use snippets live on the feature packages.
};

function examplesFor(entry: PackageEntry): readonly DocsCodeExample[] {
  const setup = setupExampleFor(entry);
  const inUse = IN_USE_EXAMPLES[entry.name];
  return inUse ? [setup, { id: 'in-use', label: 'In use', ...inUse }] : [setup];
}

/** Developer-facing integration reference: choose a capability, register it deliberately, then follow the live guide for behavior. */
@Component({
  selector: 'lgr-api-reference',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, DocsCodeExampleComponent],
  styles: `
    .purpose { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%, 15rem),1fr)); gap:.75rem; margin:1.5rem 0; }
    .purpose article { padding:1rem; border-radius:var(--lgr-radius-md); background:var(--mat-sys-surface-container-low); border:1px solid var(--mat-sys-outline-variant); } .purpose h2 { margin:0; font-size:1rem; } .purpose p { margin:.35rem 0 0; font-size:.86rem; color:var(--mat-sys-on-surface-variant); }
    .controls { display:flex; flex-wrap:wrap; gap:.65rem; align-items:center; margin:1.5rem 0 .75rem; } .search { min-width:min(100%, 17rem); flex:1 1 17rem; } .categories { display:flex; flex-wrap:wrap; gap:.4rem; }
    .category.is-active { color:var(--mat-sys-on-secondary-container); background:var(--mat-sys-secondary-container); } .result-count { color:var(--mat-sys-on-surface-variant); font-size:.86rem; }
    .package-list { list-style:none; margin:0; padding:0; border:1px solid var(--mat-sys-outline-variant); border-radius:var(--lgr-radius-md); overflow:hidden; }
    .package-row { background:var(--mat-sys-surface-container-low); } .package-row + .package-row { border-top:1px solid var(--mat-sys-outline-variant); }
    .package { display:flex; flex-wrap:wrap; align-items:baseline; gap:.35rem 1rem; width:100%; padding:.7rem 1rem; border:0; background:transparent; color:var(--mat-sys-on-surface); text-align:start; font:inherit; cursor:pointer; } .package:hover { background:var(--mat-sys-surface-container); } .package.is-selected { background:color-mix(in srgb, var(--mat-sys-primary) 8%, var(--mat-sys-surface-container-low)); box-shadow:inset 3px 0 0 var(--mat-sys-primary); }
    .package code { font-size:.85rem; font-weight:600; overflow-wrap:anywhere; } .package-category { color:var(--mat-sys-on-surface-variant); font-size:.72rem; font-weight:600; letter-spacing:.05em; text-transform:uppercase; } .package-notes { flex:1 1 20rem; margin:0; color:var(--mat-sys-on-surface-variant); font-size:.86rem; } .boundary { margin-left:auto; color:var(--mat-sys-primary); font-size:.72rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
    .chevron { align-self:center; margin-left:.25rem; color:var(--mat-sys-on-surface-variant); transition:transform .2s ease, color .2s ease; } .package.is-selected .chevron { transform:rotate(180deg); color:var(--mat-sys-primary); }
    .package-empty { margin:0; padding:.9rem 1rem; color:var(--mat-sys-on-surface-variant); }
    .detail-wrap { display:grid; grid-template-rows:0fr; transition:grid-template-rows .22s ease; } .detail-wrap.is-open { grid-template-rows:1fr; }
    .detail-clip { overflow:hidden; min-height:0; }
    .detail { padding:1.25rem; border-top:1px solid var(--mat-sys-outline-variant); background:var(--mat-sys-surface-container); } .detail h2 { margin:0; overflow-wrap:anywhere; } .detail-lead { margin:.55rem 0 1rem; color:var(--mat-sys-on-surface-variant); } dl { display:grid; grid-template-columns:7rem minmax(0,1fr); gap:.55rem .75rem; margin:1rem 0; font-size:.86rem; } dt { color:var(--mat-sys-on-surface-variant); } dd { min-width:0; margin:0; overflow-wrap:anywhere; } .detail-actions { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1rem; }
    @media (max-width:700px) { dl { grid-template-columns:1fr; gap:.2rem; } }
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
      <p class="result-count" aria-live="polite">{{ filteredPackages().length }} packages match. Select a package to expand its integration path.</p>
      <ul class="package-list" aria-label="LibreGrid package choices">
        @for (entry of filteredPackages(); track entry.name) {
          <li class="package-row">
            <button type="button" class="package" [attr.id]="barId(entry)" [class.is-selected]="isExpanded(entry)" [attr.aria-expanded]="isExpanded(entry)" [attr.aria-controls]="detailId(entry)" (click)="toggle(entry)">
              <code>{{ entry.name }}</code><span class="package-category">{{ categoryFor(entry) }}</span><p class="package-notes">{{ entry.notes }}</p><span class="boundary">{{ boundaryFor(entry) }}</span><mat-icon class="chevron" aria-hidden="true">expand_more</mat-icon>
            </button>
            <div class="detail-wrap" [class.is-open]="isExpanded(entry)">
              <div class="detail-clip">
                @if (isExpanded(entry)) {
                  <div class="detail" role="region" [attr.id]="detailId(entry)" [attr.aria-labelledby]="barId(entry)">
                    <h2><code>{{ entry.name }}</code></h2><p class="detail-lead">{{ entry.notes }}</p>
                    <dl><dt>Use when</dt><dd>{{ useWhen(entry) }}</dd><dt>Registered modules</dt><dd><code>{{ entry.modules }}</code></dd><dt>Public surface</dt><dd>{{ entry.exports }}</dd><dt>System boundary</dt><dd>{{ boundaryFor(entry) }}</dd></dl>
                    <lgr-docs-code-example heading="Integration examples" [examples]="examplesFor(entry)" />
                    <div class="detail-actions"><a matButton="tonal" [routerLink]="'/' + guideFor(entry)">Open live guide <mat-icon>arrow_forward</mat-icon></a><a matButton="text" routerLink="/getting-started">Registration guide</a></div>
                  </div>
                }
              </div>
            </div>
          </li>
        } @empty { <li><p class="package-empty">No packages match that search. Try a customer outcome or module name.</p></li> }
      </ul>
    </div>
  `,
})
export class ApiReference {
  protected readonly categories = CATEGORIES;
  protected readonly query = signal('');
  protected readonly categoryFilter = signal<PackageCategory | 'All'>('All');
  protected readonly expandedName = signal<string | null>(null);
  protected readonly filteredPackages = computed(() => {
    const query = this.query().trim().toLowerCase();
    const category = this.categoryFilter();
    return PACKAGES.filter((entry) => (category === 'All' || this.categoryFor(entry) === category) && (!query || [entry.name, entry.modules, entry.exports, entry.notes, this.categoryFor(entry), this.boundaryFor(entry)].join(' ').toLowerCase().includes(query)));
  });
  private readonly examplesCache = new Map<string, readonly DocsCodeExample[]>();

  /** Accordion: opening a bar collapses the previous one; clicking the open bar closes it. */
  protected toggle(entry: PackageEntry): void {
    this.expandedName.update((current) => (current === entry.name ? null : entry.name));
  }
  protected isExpanded(entry: PackageEntry): boolean { return this.expandedName() === entry.name; }
  /** Memoized so re-renders of the expanded panel reuse the same example arrays. */
  protected examplesFor(entry: PackageEntry): readonly DocsCodeExample[] {
    let examples = this.examplesCache.get(entry.name);
    if (!examples) {
      examples = examplesFor(entry);
      this.examplesCache.set(entry.name, examples);
    }
    return examples;
  }
  protected barId(entry: PackageEntry): string { return 'api-bar-' + slug(entry.name); }
  protected detailId(entry: PackageEntry): string { return 'api-detail-' + slug(entry.name); }
  protected categoryFor(entry: PackageEntry): PackageCategory { return CATEGORY_BY_PACKAGE[entry.name] ?? 'Workspace'; }
  protected guideFor(entry: PackageEntry): string { return GUIDE_BY_PACKAGE[entry.name] ?? 'getting-started'; }
  protected boundaryFor(entry: PackageEntry): string { return BACKEND_PACKAGES.has(entry.name) ? 'Frontend + your data systems' : 'Frontend integration'; }
  protected useWhen(entry: PackageEntry): string { return entry.notes; }
}
