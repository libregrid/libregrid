import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { RowNumbersModule } from '@libregrid/row-numbers';
import { CellSelectionModule } from '@libregrid/cell-selection';
ModuleRegistry.registerModules([AllCommunityModule, RowNumbersModule, CellSelectionModule]);

bootstrapApplication(AppComponent).catch(console.error);
