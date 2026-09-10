import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AiToolkitModule } from '@libregrid/ai-toolkit';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { PivotModule } from '@libregrid/pivot';
import { SetFilterModule } from '@libregrid/set-filter';
ModuleRegistry.registerModules([
  AllCommunityModule,
  AiToolkitModule,
  RowGroupingModule,
  PivotModule,
  SetFilterModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
