import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { PivotModule } from '@libregrid/pivot';
ModuleRegistry.registerModules([
  AllCommunityModule,
  ColumnsToolPanelModule,
  RowGroupingModule,
  PivotModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
