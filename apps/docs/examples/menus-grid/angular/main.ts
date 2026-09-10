import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { ContextMenuModule } from '@libregrid/menu';
import { ColumnMenuModule } from '@libregrid/menu';
ModuleRegistry.registerModules([AllCommunityModule, ContextMenuModule, ColumnMenuModule]);

bootstrapApplication(AppComponent).catch(console.error);
