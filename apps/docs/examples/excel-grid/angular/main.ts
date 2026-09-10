import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { ExcelExportModule } from '@libregrid/excel-export';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { ContextMenuModule } from '@libregrid/menu';
ModuleRegistry.registerModules([
  AllCommunityModule,
  ExcelExportModule,
  RowGroupingModule,
  ContextMenuModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
