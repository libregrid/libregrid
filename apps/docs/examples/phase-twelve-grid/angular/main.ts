import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { IntegratedChartsModule } from '@libregrid/integrated-charts';
import { CellSelectionModule } from '@libregrid/cell-selection';
ModuleRegistry.registerModules([AllCommunityModule, IntegratedChartsModule, CellSelectionModule]);

bootstrapApplication(AppComponent).catch(console.error);
