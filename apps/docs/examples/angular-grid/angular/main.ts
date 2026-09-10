import { bootstrapApplication } from '@angular/platform-browser';
import { AllCommunityModule } from 'ag-grid-community';
import { provideLibreGrid } from '@libregrid/angular';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [provideLibreGrid(AllCommunityModule)],
}).catch(console.error);
