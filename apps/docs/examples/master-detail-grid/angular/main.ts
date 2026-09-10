import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { MasterDetailModule } from '@libregrid/master-detail';
ModuleRegistry.registerModules([AllCommunityModule, MasterDetailModule]);

bootstrapApplication(AppComponent).catch(console.error);
