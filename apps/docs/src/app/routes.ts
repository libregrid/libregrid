import type { Routes } from '@angular/router';

/**
 * One route per feature.
 *
 * Every phase adds its route here, and a working docs route is part of the
 * Definition of Done (standards.md §9). Keep NAV and `routes` in step.
 */
export const NAV: ReadonlyArray<{ path: string; label: string }> = [
  { path: '', label: 'Overview' },
  { path: 'validation', label: 'Manual validation' },
  { path: 'grid', label: 'Grid (Community)' },
  { path: 'menus', label: 'Menus' },
  { path: 'side-bar', label: 'Side bar' },
  { path: 'row-grouping', label: 'Row Grouping' },
  { path: 'pivot', label: 'Pivot' },
  { path: 'columns', label: 'Columns' },
  { path: 'filters', label: 'Filters' },
  { path: 'selection', label: 'Selection & Clipboard' },
  { path: 'excel-export', label: 'Excel Export' },
  { path: 'server-side', label: 'Server-side rows' },
  { path: 'server-side-advanced', label: 'SSRM Advanced' },
  { path: 'viewport', label: 'Viewport rows' },
  { path: 'tree-data', label: 'Tree Data' },
  { path: 'master-detail', label: 'Master / Detail' },
  { path: 'advanced-filter-find', label: 'Advanced Filter & Find' },
  { path: 'charts', label: 'Charts & Sparklines' },
  { path: 'angular', label: 'Angular' },
  { path: 'api', label: 'API Reference' },
];

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./routes/overview').then((m) => m.Overview),
    title: 'LibreGrid — Overview',
  },
  {
    path: 'validation',
    loadComponent: () => import('./routes/manual-validation').then((m) => m.ManualValidation),
    title: 'LibreGrid — Manual Validation',
  },
  {
    path: 'grid',
    loadComponent: () => import('./routes/grid-demo').then((m) => m.GridDemo),
    title: 'LibreGrid — Grid',
  },
  {
    path: 'menus',
    loadComponent: () => import('./routes/menus-demo').then((m) => m.MenusDemo),
    title: 'LibreGrid — Menus',
  },
  {
    path: 'side-bar',
    loadComponent: () => import('./routes/side-bar-demo').then((m) => m.SideBarDemo),
    title: 'LibreGrid — Side Bar',
  },
  {
    path: 'row-grouping',
    loadComponent: () => import('./routes/row-grouping').then((m) => m.RowGroupingDemo),
    title: 'LibreGrid — Row Grouping',
  },
  {
    path: 'pivot',
    loadComponent: () => import('./routes/pivot').then((m) => m.PivotDemo),
    title: 'LibreGrid — Pivot',
  },
  {
    path: 'columns',
    loadComponent: () => import('./routes/columns').then((m) => m.ColumnsDemo),
    title: 'LibreGrid — Columns',
  },
  {
    path: 'filters',
    loadComponent: () => import('./routes/filters').then((m) => m.FiltersDemo),
    title: 'LibreGrid — Filters',
  },
  {
    path: 'selection',
    loadComponent: () => import('./routes/selection').then((m) => m.SelectionDemo),
    title: 'LibreGrid — Selection & Clipboard',
  },
  {
    path: 'excel-export',
    loadComponent: () => import('./routes/excel-export').then((m) => m.ExcelExportDemo),
    title: 'LibreGrid — Excel Export',
  },
  {
    path: 'server-side',
    loadComponent: () =>
      import('./routes/server-side-row-model').then((m) => m.ServerSideRowModelDemo),
    title: 'LibreGrid — Server-Side Row Model',
  },
  {
    path: 'server-side-advanced',
    loadComponent: () =>
      import('./routes/server-side-advanced').then((m) => m.ServerSideAdvancedDemo),
    title: 'LibreGrid — SSRM Advanced',
  },
  {
    path: 'viewport',
    loadComponent: () => import('./routes/viewport-row-model').then((m) => m.ViewportRowModelDemo),
    title: 'LibreGrid — Viewport Row Model',
  },
  {
    path: 'tree-data',
    loadComponent: () => import('./routes/tree-data').then((m) => m.TreeDataDemo),
    title: 'LibreGrid — Tree Data',
  },
  {
    path: 'master-detail',
    loadComponent: () => import('./routes/master-detail').then((m) => m.MasterDetailDemo),
    title: 'LibreGrid — Master Detail',
  },
  {
    path: 'advanced-filter-find',
    loadComponent: () =>
      import('./routes/advanced-filter-find').then((m) => m.AdvancedFilterFindDemo),
    title: 'LibreGrid — Advanced Filter & Find',
  },
  {
    path: 'charts',
    loadComponent: () => import('./routes/charts').then((m) => m.ChartsDemo),
    title: 'LibreGrid — Charts & Sparklines',
  },
  {
    path: 'benchmark',
    loadComponent: () => import('./routes/benchmark').then((m) => m.BenchmarkRoute),
    title: 'LibreGrid — Benchmark',
  },
  {
    path: 'angular',
    loadComponent: () => import('./routes/angular').then((m) => m.AngularDemo),
    title: 'LibreGrid — Angular',
  },
  {
    path: 'api',
    loadComponent: () => import('./routes/api').then((m) => m.ApiReference),
    title: 'LibreGrid — API Reference',
  },
  { path: '**', redirectTo: '' },
];
