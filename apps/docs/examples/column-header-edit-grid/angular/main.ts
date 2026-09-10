import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { ColumnHeaderEditModule } from '@libregrid/column-header-edit';
import { ColumnMenuModule } from '@libregrid/menu';
ModuleRegistry.registerModules([AllCommunityModule, ColumnHeaderEditModule, ColumnMenuModule]);

bootstrapApplication(AppComponent).catch(console.error);
