import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { ClipboardModule } from '@libregrid/clipboard';
import { StatusBarModule } from '@libregrid/status-bar';
ModuleRegistry.registerModules([
  AllCommunityModule,
  CellSelectionModule,
  ClipboardModule,
  StatusBarModule,
]);

bootstrapApplication(AppComponent).catch(console.error);
