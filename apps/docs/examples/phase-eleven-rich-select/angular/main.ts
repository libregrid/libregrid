import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { RichSelectModule } from '@libregrid/rich-select';
ModuleRegistry.registerModules([
  AllCommunityModule,
  RichSelectModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
