import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { PivotModule } from '@libregrid/pivot';
import { ColumnsToolPanelModule } from '@libregrid/columns-tool-panel';
ModuleRegistry.registerModules([AllCommunityModule, PivotModule, ColumnsToolPanelModule]);

bootstrapApplication(AppComponent).catch(console.error);
