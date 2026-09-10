import { Component } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef } from 'ag-grid-community';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  country: string;
  sales: number;
  status: string;
}
const rows: Row[] = [
  { country: 'United Kingdom', sales: 120, status: 'Draft' },
  { country: 'United States', sales: 240, status: 'Published' },
  { country: 'Japan', sales: 300, status: 'Review' },
  { country: 'Germany', sales: 180, status: 'Draft' },
];
@Component({
  selector: 'example-app',
  imports: [AgGridAngular],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly rowData = rows;
  protected readonly richColumns: ColDef<Row>[] = [
    { field: 'country' },
    {
      field: 'status',
      editable: true,
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: Array.from({ length: 10_000 }, (_, index) =>
          index < 3 ? ['Draft', 'Published', 'Review'][index] : `Status ${index}`,
        ),
        allowTyping: true,
        filterList: true,
        searchType: 'matchAny',
        highlightMatch: true,
      },
    },
  ];
}
