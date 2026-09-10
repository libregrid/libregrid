import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { AdvancedFilterModule } from '@libregrid/advanced-filter';
import { FindModule } from '@libregrid/find';
ModuleRegistry.registerModules([
  AllCommunityModule,
  AdvancedFilterModule,
  FindModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
