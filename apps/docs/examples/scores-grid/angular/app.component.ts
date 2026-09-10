import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef } from 'ag-grid-community';
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly columnDefs: ColDef[] = [{ field: 'label' }, { field: 'score' }];
  readonly rowData = [
    { label: 'A', score: 1 },
    { label: 'B', score: 2 },
  ];
}
