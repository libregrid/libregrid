/**
 * Public Docs metadata. Navigation, page headers, package discovery, and the
 * API catalog read from this file so a feature cannot quietly disappear from
 * one surface while remaining in another.
 */
export interface DocsFeature {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly section: DocsSectionId;
  readonly packages: readonly string[];
  readonly outcome: string;
  readonly boundary: 'Browser' | 'Backend' | 'Both';
  readonly keywords?: readonly string[];
  readonly internal?: boolean;
}

export type DocsSectionId =
  'start' | 'explore' | 'server' | 'organize' | 'edit' | 'customize' | 'visualize' | 'reference';

export interface DocsSection {
  readonly id: DocsSectionId;
  readonly label: string;
}

export const DOCS_SECTIONS: readonly DocsSection[] = [
  { id: 'start', label: 'Start here' },
  { id: 'explore', label: 'Explore and analyze' },
  { id: 'server', label: 'Server and live data' },
  { id: 'organize', label: 'Organize and inspect' },
  { id: 'edit', label: 'Edit and collaborate' },
  { id: 'customize', label: 'Customize the workspace' },
  { id: 'visualize', label: 'Visualize and export' },
  { id: 'reference', label: 'Integrate and reference' },
];

export const DOCS_FEATURES: readonly DocsFeature[] = [
  {
    path: '',
    label: 'Overview',
    icon: 'grid_view',
    section: 'start',
    packages: [],
    outcome: 'Evaluate LibreGrid by the customer job you need to solve.',
    boundary: 'Browser',
    keywords: ['home', 'evaluate', 'packages', 'migration'],
  },
  {
    path: 'getting-started',
    label: 'Getting started',
    icon: 'rocket_launch',
    section: 'start',
    packages: ['@libregrid/core'],
    outcome: 'Install only the features your application needs.',
    boundary: 'Browser',
    keywords: ['install', 'quick start', 'registration'],
  },
  {
    path: 'packages',
    label: 'Package catalog',
    icon: 'inventory_2',
    section: 'start',
    packages: [],
    outcome: 'Compare package value, dependencies, and integration boundaries.',
    boundary: 'Browser',
    keywords: ['catalog', 'compare', 'dependencies'],
  },
  {
    path: 'grid',
    label: 'Grid baseline',
    icon: 'table_chart',
    section: 'start',
    packages: [],
    outcome: 'Start with AG Grid Community and add only the capabilities you need.',
    boundary: 'Browser',
    keywords: ['community', 'starter'],
  },
  {
    path: 'row-grouping',
    label: 'Row Grouping',
    icon: 'folder',
    section: 'explore',
    packages: ['@libregrid/row-grouping'],
    outcome: 'Turn detailed rows into expandable totals and analysis.',
    boundary: 'Browser',
    keywords: ['aggregate', 'totals'],
  },
  {
    path: 'pivot',
    label: 'Pivot',
    icon: 'pivot_table_chart',
    section: 'explore',
    packages: ['@libregrid/pivot'],
    outcome: 'Build cross-tab reports directly from operational rows.',
    boundary: 'Browser',
    keywords: ['report', 'quarterly'],
  },
  {
    path: 'columns',
    label: 'Columns',
    icon: 'view_column',
    section: 'explore',
    packages: ['@libregrid/columns-tool-panel'],
    outcome: 'Let users tailor the information they see and save their workspace.',
    boundary: 'Both',
    keywords: ['preferences', 'layout'],
  },
  {
    path: 'filters',
    label: 'Filters',
    icon: 'filter_alt',
    section: 'explore',
    packages: ['@libregrid/set-filter', '@libregrid/multi-filter', '@libregrid/filters-tool-panel'],
    outcome: 'Help users narrow a dataset with clear, reusable filter state.',
    boundary: 'Both',
    keywords: ['set filter', 'multi filter', 'tool panel'],
  },
  {
    path: 'advanced-filter-find',
    label: 'Advanced Filter & Find',
    icon: 'manage_search',
    section: 'explore',
    packages: ['@libregrid/advanced-filter', '@libregrid/find', '@libregrid/rich-select'],
    outcome: 'Build expressive saved filters and find visible values quickly.',
    boundary: 'Both',
    keywords: ['expression', 'search', 'rich select'],
  },
  {
    path: 'server-side',
    label: 'Server-Side Rows',
    icon: 'cloud',
    section: 'server',
    packages: ['@libregrid/server-side-row-model'],
    outcome: 'Browse huge datasets in bounded server-backed blocks.',
    boundary: 'Both',
    keywords: ['ssrm', 'large data', 'datasource'],
  },
  {
    path: 'server-side-advanced',
    label: 'SSRM Analytics',
    icon: 'analytics',
    section: 'server',
    packages: [
      '@libregrid/server-side-row-model',
      '@libregrid/advanced-filter',
      '@libregrid/pivot',
    ],
    outcome: 'Filter, group, aggregate, and pivot large data on the server.',
    boundary: 'Both',
    keywords: ['ssrm advanced', 'query', 'backend', 'pivot'],
  },
  {
    path: 'server-side-selection',
    label: 'Server-Side Selection',
    icon: 'playlist_add_check',
    section: 'server',
    packages: ['@libregrid/server-side-selection'],
    outcome: 'Keep a durable selection across filters, pages, and sessions.',
    boundary: 'Both',
    keywords: ['ss selection', 'working set', 'spec'],
  },
  {
    path: 'viewport',
    label: 'Viewport Rows',
    icon: 'visibility',
    section: 'server',
    packages: ['@libregrid/viewport-row-model'],
    outcome: 'Stream live updates only for the rows a user can see.',
    boundary: 'Both',
    keywords: ['live feed', 'websocket', 'stream'],
  },
  {
    path: 'tree-data',
    label: 'Tree Data',
    icon: 'account_tree',
    section: 'organize',
    packages: ['@libregrid/tree-data'],
    outcome: 'Represent and reorganize data that already has a hierarchy.',
    boundary: 'Both',
    keywords: ['hierarchy', 'reparent'],
  },
  {
    path: 'master-detail',
    label: 'Master / Detail',
    icon: 'view_agenda',
    section: 'organize',
    packages: ['@libregrid/master-detail'],
    outcome: 'Inspect child records without losing the parent context.',
    boundary: 'Both',
    keywords: ['orders', 'detail grid'],
  },
  {
    path: 'calculated-columns',
    label: 'Calculated Columns',
    icon: 'functions',
    section: 'organize',
    packages: ['@libregrid/calculated-columns'],
    outcome: 'Let users analyze derived values without changing source rows.',
    boundary: 'Both',
    keywords: ['formula', 'derived'],
  },
  {
    path: 'selection',
    label: 'Selection & Clipboard',
    icon: 'select_all',
    section: 'edit',
    packages: ['@libregrid/cell-selection', '@libregrid/clipboard', '@libregrid/status-bar'],
    outcome: 'Deliver spreadsheet-like range editing and copy/paste.',
    boundary: 'Browser',
    keywords: ['fill handle', 'copy', 'paste', 'status'],
  },
  {
    path: 'row-numbers',
    label: 'Row Numbers',
    icon: 'format_list_numbered',
    section: 'edit',
    packages: ['@libregrid/row-numbers'],
    outcome: 'Make dense tables easier to scan and operate like a spreadsheet.',
    boundary: 'Browser',
  },
  {
    path: 'column-header-edit',
    label: 'Column Header Edit',
    icon: 'title',
    section: 'edit',
    packages: ['@libregrid/column-header-edit'],
    outcome: 'Let users name their own workspace without changing data.',
    boundary: 'Both',
    keywords: ['rename', 'preferences'],
  },
  {
    path: 'notes',
    label: 'Cell Notes',
    icon: 'sticky_note_2',
    section: 'edit',
    packages: ['@libregrid/notes'],
    outcome: 'Keep contextual decisions attached to the cell or row they explain.',
    boundary: 'Both',
    keywords: ['comments', 'collaboration'],
  },
  {
    path: 'batch-edit',
    label: 'Batch Edit',
    icon: 'edit_note',
    section: 'edit',
    packages: ['@libregrid/batch-edit'],
    outcome: 'Stage many changes, validate them, then commit once.',
    boundary: 'Both',
    keywords: ['bulk edit', 'transaction'],
  },
  {
    path: 'menus',
    label: 'Menus',
    icon: 'menu',
    section: 'customize',
    packages: ['@libregrid/menu'],
    outcome: 'Put the right application actions next to the selected data.',
    boundary: 'Browser',
    keywords: ['context menu', 'column menu', 'commands'],
  },
  {
    path: 'side-bar',
    label: 'Side Bar',
    icon: 'vertical_split',
    section: 'customize',
    packages: ['@libregrid/side-bar'],
    outcome: 'Give users self-service tools without leaving the grid.',
    boundary: 'Browser',
    keywords: ['tool panel', 'workspace'],
  },
  {
    path: 'toolbar',
    label: 'Toolbar',
    icon: 'build',
    section: 'customize',
    packages: ['@libregrid/toolbar'],
    outcome: 'Make high-frequency grid tasks available in one predictable place.',
    boundary: 'Browser',
    keywords: ['quick filter', 'actions'],
  },
  {
    path: 'charts',
    label: 'Integrated Charts',
    icon: 'insert_chart',
    section: 'visualize',
    packages: ['@libregrid/integrated-charts'],
    outcome: 'Turn selected grid data into a linked visual analysis.',
    boundary: 'Browser',
    keywords: ['chart', 'cross filter'],
  },
  {
    path: 'sparklines',
    label: 'Sparklines',
    icon: 'show_chart',
    section: 'visualize',
    packages: ['@libregrid/sparklines'],
    outcome: 'Scan trend direction directly in a dense grid.',
    boundary: 'Browser',
    keywords: ['trend', 'in-cell chart'],
  },
  {
    path: 'excel-export',
    label: 'Excel Export',
    icon: 'file_download',
    section: 'visualize',
    packages: ['@libregrid/excel-export'],
    outcome: 'Export polished, shareable reports without rebuilding data.',
    boundary: 'Browser',
    keywords: ['xlsx', 'workbook'],
  },
  {
    path: 'angular',
    label: 'Angular',
    icon: 'code',
    section: 'reference',
    packages: ['@libregrid/angular'],
    outcome: 'Use LibreGrid with typed helpers and Angular signals.',
    boundary: 'Browser',
    keywords: ['framework', 'signals', 'providers'],
  },
  {
    path: 'material',
    label: 'Material',
    icon: 'palette',
    section: 'reference',
    packages: ['@libregrid/material'],
    outcome: 'Make LibreGrid feel native to an Angular Material application.',
    boundary: 'Browser',
    keywords: ['theme', 'renderers', 'density'],
  },
  {
    path: 'api',
    label: 'API Reference',
    icon: 'api',
    section: 'reference',
    packages: [],
    outcome: 'Find the package, module, and public API required for an integration.',
    boundary: 'Browser',
    keywords: ['reference', 'exports'],
  },
];

export function featureForPath(path: string): DocsFeature | undefined {
  return DOCS_FEATURES.find((feature) => feature.path === path);
}

export function featuresForSection(section: DocsSectionId): readonly DocsFeature[] {
  return DOCS_FEATURES.filter((feature) => feature.section === section && !feature.internal);
}
