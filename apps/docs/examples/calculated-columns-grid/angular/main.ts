import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { CalculatedColumnsModule } from '@libregrid/calculated-columns';
import { ColumnMenuModule } from '@libregrid/menu';
ModuleRegistry.registerModules([AllCommunityModule, CalculatedColumnsModule, ColumnMenuModule]);

bootstrapApplication(AppComponent).catch(console.error);
