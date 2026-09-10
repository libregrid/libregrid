import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { BatchEditModule } from '@libregrid/batch-edit';
ModuleRegistry.registerModules([AllCommunityModule, BatchEditModule]);

bootstrapApplication(AppComponent).catch(console.error);
