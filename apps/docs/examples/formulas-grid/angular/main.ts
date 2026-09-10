import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { FormulasModule } from '@libregrid/formulas';
import { CellSelectionModule } from '@libregrid/cell-selection';
ModuleRegistry.registerModules([AllCommunityModule, FormulasModule, CellSelectionModule]);

bootstrapApplication(AppComponent).catch(console.error);
