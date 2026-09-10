import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { SparklinesModule } from '@libregrid/sparklines';
ModuleRegistry.registerModules([AllCommunityModule, SparklinesModule]);

bootstrapApplication(AppComponent).catch(console.error);
