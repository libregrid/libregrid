import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';
import { ServerSideSelectionModule } from '@libregrid/server-side-selection';
ModuleRegistry.registerModules([
  AllCommunityModule,
  ServerSideRowModelModule,
  ServerSideSelectionModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
