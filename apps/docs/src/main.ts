import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { ContextMenuModule, ColumnMenuModule } from '@libregrid/menu';
import { SideBarModule } from '@libregrid/side-bar';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { provideLibreGridMaterialTheme } from '@libregrid/material';

import { App } from './app/app';
import { routes } from './app/routes';

/**
 * Register grid modules ONCE, at bootstrap.
 *
 * Note this is the application's job, not the library's — no @libregrid
 * package may call registerModules() at module scope, because a package that
 * self-registers can never be tree-shaken out
 * (docs/reference/package-architecture.md §5 rule 3).
 *
 * Feature modules are added here as each phase lands.
 */
ModuleRegistry.registerModules([
  AllCommunityModule,
  EnterpriseCoreModule,
  // Phase 1
  ContextMenuModule,
  ColumnMenuModule,
  SideBarModule,
  // Phase 2
  RowGroupingModule,
]);

bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideLibreGridMaterialTheme(),
  ],
}).catch((err) => console.error(err));
