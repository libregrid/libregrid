import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { SideBarModule } from '@libregrid/side-bar';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';
import { FiltersToolPanelModule } from '@libregrid/filters-tool-panel';
import { SetFilterModule } from '@libregrid/set-filter';
import { MultiFilterModule } from '@libregrid/multi-filter';
ModuleRegistry.registerModules([
  AllCommunityModule,
  SideBarModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  SetFilterModule,
  MultiFilterModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
