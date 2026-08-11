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
  // Phase 1: { path: 'menus', label: 'Menus' }, { path: 'side-bar', label: 'Side bar' }
  // Phase 2: { path: 'row-grouping', label: 'Row grouping' }
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
  { path: '**', redirectTo: '' },
];
