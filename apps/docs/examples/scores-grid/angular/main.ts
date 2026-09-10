import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([
  AllCommunityModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
