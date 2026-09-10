import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';
import { AdvancedFilterModule } from '@libregrid/advanced-filter';
import { PivotModule } from '@libregrid/pivot';
import { RowGroupingModule } from '@libregrid/row-grouping';
ModuleRegistry.registerModules([
  AllCommunityModule,
  ServerSideRowModelModule,
  AdvancedFilterModule,
  PivotModule,
  RowGroupingModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
