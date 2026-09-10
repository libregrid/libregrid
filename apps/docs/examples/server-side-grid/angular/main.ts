import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';
ModuleRegistry.registerModules([AllCommunityModule, ServerSideRowModelModule]);

bootstrapApplication(AppComponent).catch(console.error);
