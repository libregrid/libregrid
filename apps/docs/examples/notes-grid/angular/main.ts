import { bootstrapApplication } from '@angular/platform-browser';
import { ModuleRegistry } from 'ag-grid-community';
import { AppComponent } from './app.component';
import { AllCommunityModule } from 'ag-grid-community';
import { NotesModule } from '@libregrid/notes';
import { ContextMenuModule } from '@libregrid/menu';
ModuleRegistry.registerModules([AllCommunityModule, NotesModule, ContextMenuModule]);

bootstrapApplication(AppComponent).catch(console.error);
