import type { Routes } from '@angular/router';

/**
 * One route per feature.
 *
 * Every phase adds its route here, and a working docs route is part of the
 * Definition of Done (standards.md §9). Keep NAV and `routes` in step.
 */
export const NAV: ReadonlyArray<{ path: string; label: string }> = [
  { path: '', label: 'Overview' },
  { path: 'grid', label: 'Grid (Community)' },
  { path: 'menus', label: 'Menus' },
  { path: 'side-bar', label: 'Side bar' },
  { path: 'row-grouping', label: 'Row Grouping' },
];

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./routes/overview').then((m) => m.Overview),
    title: 'LibreGrid — Overview',
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
    path: 'benchmark',
    loadComponent: () => import('./routes/benchmark').then((m) => m.BenchmarkRoute),
    title: 'LibreGrid — Benchmark',
  },
  { path: '**', redirectTo: '' },
];
