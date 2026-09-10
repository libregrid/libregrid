import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { TreeDataModule } from '@libregrid/tree-data';
ModuleRegistry.registerModules([AllCommunityModule, TreeDataModule]);

bootstrapApplication(AppComponent).catch(console.error);
