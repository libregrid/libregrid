import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

bootstrapApplication(AppComponent).catch(console.error);
