import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { FiltersToolPanelModule } from '@libregrid/filters-tool-panel';
import { SetFilterModule } from '@libregrid/set-filter';
import { MultiFilterModule } from '@libregrid/multi-filter';
ModuleRegistry.registerModules([
  AllCommunityModule,
  FiltersToolPanelModule,
  SetFilterModule,
  MultiFilterModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
