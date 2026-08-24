/**
 * @libregrid/all — convenience barrel for quick starts and demos.
 *
 * Flat re-exports only. No logic, no side effects, no registration — see
 * package-architecture.md §8. Prefer importing individual feature packages
 * so a consumer bundle contains exactly the features it uses.
 */
export * from '@libregrid/core';

export { BatchEditModule } from '@libregrid/batch-edit';
export type { BatchEditGridApi } from '@libregrid/batch-edit';

export {
  ColumnMenuFactory,
  ColumnMenuModule,
  ContextMenuModule,
  ContextMenuService,
  DEFAULT_COLUMN_MENU_ITEMS,
  DEFAULT_CONTEXT_MENU_ITEMS,
  MenuItemMapper,
  MenuItemRegistry,
  MenuUtils,
  registerMenuItem,
  registerMenuItems,
  registerMenuRenderer,
} from '@libregrid/menu';
export type {
  MenuActionParams,
  MenuItemContribution,
  MenuItemFactory,
  MenuKind,
  MenuRenderer,
  MenuRenderRequest,
  MenuRenderResult,
} from '@libregrid/menu';

export {
  NOTE_MARKER_CLASS,
  NotesDataService,
  NotesFeature,
  NotesModule,
  NotesService,
  attachNotePopupResize,
  buildNotePopup,
  keyForParams,
  notesCss,
  syncNotePopupContent,
} from '@libregrid/notes';
export type { NoteTarget, NotePopupDom } from '@libregrid/notes';

export {
  registerSideBarRenderer,
  registerToolPanel,
  SideBarModule,
  SideBarService,
} from '@libregrid/side-bar';
export type { SideBarRenderer, SideBarRenderRequest } from '@libregrid/side-bar';

export {
  LibreGridThemeService,
  MaterialRichSelectCellEditor,
  MaterialStatusBarComponent,
  buildGridTheme,
  createMaterialColumnsToolPanelDragDropAdapter,
  installMaterialColumnsToolPanelDragDrop,
  installMaterialRichSelectCellEditor,
  installMaterialSideBarRenderer,
  provideLibreGridMaterialTheme,
} from '@libregrid/material';
export type { ThemeMode } from '@libregrid/material';

export {
  AggFuncService,
  AggregationStage,
  AutoGenColsService,
  ExpansionService,
  FilterAggregateStage,
  FlattenStage,
  FooterService,
  GroupCellRenderer,
  GroupFilterStage,
  GroupSortStage,
  GroupStage,
  RowGroupColsService,
  RowGroupingModule,
  ShowRowGroupColsService,
  ShowRowGroupColsValueService,
  ShowValuesAsService,
  ValueColsService,
} from '@libregrid/row-grouping';

export {
  ColumnsToolPanel,
  ColumnsToolPanelModule,
  RowGroupingPanel,
  RowGroupingPanelModule,
  registerColumnsToolPanelDragDropAdapter,
} from '@libregrid/columns-tool-panel';
export type { ColumnsToolPanelDragDropAdapter } from '@libregrid/columns-tool-panel';

export {
  CellSelectionModule,
  RangeModel,
  RangeService,
  fillSeries,
  normalise,
} from '@libregrid/cell-selection';
export type { CellRangeModel } from '@libregrid/cell-selection';

export { RowNumbersModule, RowNumbersService } from '@libregrid/row-numbers';

export { ColumnHeaderEditModule, ColumnHeaderEditService } from '@libregrid/column-header-edit';


export {
  ClipboardModule,
  ClipboardService,
  GridClipboardService,
  fromDelimited,
  toDelimited,
} from '@libregrid/clipboard';

export { ExcelExportModule } from '@libregrid/excel-export';

export {
  AggregationPanel,
  FilteredRowCountPanel,
  SelectedRowCountPanel,
  StatusBarModule,
  StatusBarService,
  TotalAndFilteredRowCountPanel,
  TotalRowCountPanel,
  aggregate,
} from '@libregrid/status-bar';
export type { StatusMetrics } from '@libregrid/status-bar';

export { SetFilter, SetFilterHandler, SetFilterModule } from '@libregrid/set-filter';
export { MultiFilter, MultiFilterHandler, MultiFilterModule } from '@libregrid/multi-filter';
export {
  FiltersToolPanel,
  FiltersToolPanelModule,
  SelectableFilter,
  SimpleFilter,
} from '@libregrid/filters-tool-panel';
export type {
  SelectableFilterModel,
  SimpleFilterModel,
  SimpleFilterParams,
  SimpleFilterType,
} from '@libregrid/filters-tool-panel';

export {
  ServerSideLoadingCellRenderer,
  ServerSideRowModel,
  ServerSideRowModelModule,
  SsrmExpandListener,
  SsrmFilterListener,
  SsrmListenerUtils,
  SsrmSortService,
} from '@libregrid/server-side-row-model';
export {
  ServerSideSelectionModule,
  ServerSideSelectionService,
  SsrmSelectionService,
  ssrmSelectionCss,
} from '@libregrid/server-side-selection';
export type {
  SelectionOp,
  SelectionSpec,
  SelectionTerm,
  ServerSideSelectionProvider,
  SsrmSelectionOptions,
} from '@libregrid/server-side-selection';

export {
  PivotColDefService,
  PivotColsService,
  PivotModule,
  PivotResultColsService,
  PivotStage,
  createGeneratedPivotDefs,
  generatedPivotColumnId,
  pivotKeyForValue,
} from '@libregrid/pivot';

export { ViewportRowModel, ViewportRowModelModule } from '@libregrid/viewport-row-model';
export { TreeDataModule, TreeDataService } from '@libregrid/tree-data';
export {
  DetailCellRenderer,
  MasterDetailModule,
  MasterDetailService,
} from '@libregrid/master-detail';

export {
  AdvancedFilterExpressionService,
  AdvancedFilterModule,
  AdvancedFilterService,
  AdvancedSettingsMenuFactory,
  evaluateAdvancedFilterModel,
  parseAdvancedFilterExpression,
  serialiseAdvancedFilterModel,
} from '@libregrid/advanced-filter';
export type { ColumnKind, ExpressionColumn, ExpressionError } from '@libregrid/advanced-filter';

export { FindCellRenderer, FindModule, FindService } from '@libregrid/find';
export { RichSelectCellEditor, RichSelectModule } from '@libregrid/rich-select';

export {
  AgChartsCommunityProvider,
  AgChartsExports,
  ChartCrossFilterService,
  ChartMenuListFactory,
  ChartMenuItemMapper,
  ChartMenuService,
  ChartService,
  ChartTranslation,
  EnterpriseChartProxyFactory,
  IntegratedChartsModule,
  chartOptionsFor,
} from '@libregrid/integrated-charts';
export type {
  ChartDataSet,
  ChartInstance,
  ChartProvider,
  ChartProviderOptions,
} from '@libregrid/integrated-charts';

export { SparklineCellRenderer, SparklinesModule } from '@libregrid/sparklines';

export {
  AiToolkitModule,
  NeedleWasmProvider,
  OpenAiCompatibleProvider,
  buildGridTools,
  getStructuredSchema,
  runToolkit,
  toolCallToStatePatch,
  validateToolCall,
} from '@libregrid/ai-toolkit';
export type { AiProvider, AiRequest, RawToolCall, ValidatedCall } from '@libregrid/ai-toolkit';

export {
  createColumnDefs,
  createGridApiSignals,
  defineGridOptions,
  provideLibreGrid,
  registerLibreGridModules,
  withCommunityModules,
} from '@libregrid/angular';
export type { GridApiSignals } from '@libregrid/angular';
