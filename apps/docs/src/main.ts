import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { AllCommunityModule } from 'ag-grid-community';
import { provideLibreGrid } from '@libregrid/angular';
import { EnterpriseCoreModule } from '@libregrid/core';
import { ContextMenuModule, ColumnMenuModule } from '@libregrid/menu';
import { SideBarModule } from '@libregrid/side-bar';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { PivotModule } from '@libregrid/pivot';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';
import { ViewportRowModelModule } from '@libregrid/viewport-row-model';
import { TreeDataModule } from '@libregrid/tree-data';
import { MasterDetailModule } from '@libregrid/master-detail';
import { ColumnsToolPanelModule, RowGroupingPanelModule } from '@libregrid/columns-tool-panel';
import { SetFilterModule } from '@libregrid/set-filter';
import { MultiFilterModule } from '@libregrid/multi-filter';
import { FiltersToolPanelModule } from '@libregrid/filters-tool-panel';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { ClipboardModule } from '@libregrid/clipboard';
import { StatusBarModule } from '@libregrid/status-bar';
import { ExcelExportModule } from '@libregrid/excel-export';
import { AdvancedFilterModule } from '@libregrid/advanced-filter';
import { FindModule } from '@libregrid/find';
import { ToolbarModule } from '@libregrid/toolbar';
import { RichSelectModule } from '@libregrid/rich-select';
import { IntegratedChartsModule } from '@libregrid/integrated-charts';
import { BatchEditModule } from '@libregrid/batch-edit';
import { SparklinesModule } from '@libregrid/sparklines';
import { provideLibreGridMaterialTheme } from '@libregrid/material';

import { App } from './app/app';
import { routes } from './app/routes';

/**
 * Register grid modules ONCE, before the app bootstraps, through the
 * @libregrid/angular provider. provideLibreGrid uses an APP_INITIALIZER, so
 * every grid created by any route shares this registration.
 *
 * Note this is the application's job, not the library's — no @libregrid
 * package may call registerModules() at module scope, because a package that
 * self-registers can never be tree-shaken out
 * (docs/reference/package-architecture.md §5 rule 3).
 *
 * Feature modules are added here as each phase lands.
 */
bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideLibreGridMaterialTheme(),
    provideLibreGrid(
      AllCommunityModule,
      EnterpriseCoreModule,
      // Phase 1
      ContextMenuModule,
      ColumnMenuModule,
      SideBarModule,
      // Phase 2
      RowGroupingModule,
      // Phase 7
      ServerSideRowModelModule,
      // Phase 9
      ViewportRowModelModule,
      // Phase 10
      TreeDataModule,
      MasterDetailModule,
      // Phase 8
      PivotModule,
      // Phase 3
      ColumnsToolPanelModule,
      RowGroupingPanelModule,
      // Phase 6
      SetFilterModule,
      MultiFilterModule,
      FiltersToolPanelModule,
      // Phase 4
      CellSelectionModule,
      ClipboardModule,
      StatusBarModule,
      // Phase 5
      ExcelExportModule,
      // Phase 11
      AdvancedFilterModule,
      FindModule,
      ToolbarModule,
      RichSelectModule,
      // Phase 12
      IntegratedChartsModule,
      SparklinesModule,
      // Phase 17
      BatchEditModule,
    ),
  ],
}).catch((err) => console.error(err));
