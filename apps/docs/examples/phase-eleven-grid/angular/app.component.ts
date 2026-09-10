import { Component, ViewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
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
  @ViewChild('advancedParent') private advancedParent!: ElementRef<HTMLElement>;
  protected findText = '';
  protected matches = 0;
  private api: GridApi<Row> | undefined;
  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'country' },
    { field: 'sales', cellDataType: 'number' },
    {
      field: 'status',
      getFindText: ({ value }) =>
        value === 'Published' ? 'Live' : value == null ? null : String(value),
    },
  ];
  protected readonly gridOptions: GridOptions<Row> = {
    enableAdvancedFilter: true,
    advancedFilterBuilderParams: { showMoveButtons: true, minWidth: 520 },
    findOptions: { caseSensitive: false },
  };
  protected ready(api: GridApi<Row>): void {
    this.api = api;
    api.setGridOption('advancedFilterParent', this.advancedParent.nativeElement);
    api.addEventListener('findChanged', () => (this.matches = api.findGetTotalMatches()));
  }
  protected showBuilder(): void {
    this.api?.showAdvancedFilterBuilder();
  }
  protected clearFilter(): void {
    this.api?.setAdvancedFilterModel(null);
  }
  protected setFind(value: string): void {
    this.findText = value;
    this.api?.setGridOption('findSearchValue', value);
    this.matches = this.api?.findGetTotalMatches() ?? 0;
  }
  protected next(): void {
    this.api?.findNext();
  }
}
