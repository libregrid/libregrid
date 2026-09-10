import { Component, computed, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { GridApi } from 'ag-grid-community';
import { createColumnDefs, createGridApiSignals, defineGridOptions } from '@libregrid/angular';
import { themeQuartz } from 'ag-grid-community';
interface Row {
  name: string;
  score: number;
}
const ROW_DATA: Row[] = [
  { name: 'Ada', score: 97 },
  { name: 'Grace', score: 91 },
  { name: 'Barbara', score: 84 },
  { name: 'Margaret', score: 79 },
];
@Component({
  selector: 'example-app',
  imports: [AgGridAngular, MatFormFieldModule, MatInputModule],
  templateUrl: './app.component.html',
  styleUrl: './styles.css',
})
export class AppComponent {
  readonly theme = themeQuartz;
  protected readonly api = signal<GridApi<Row> | undefined>(undefined);
  protected readonly state = createGridApiSignals(this.api);
  protected readonly filterCount = computed(() => Object.keys(this.state.filterModel()).length);
  protected readonly gridOptions = defineGridOptions<Row>({
    columnDefs: createColumnDefs<Row>([
      // Row + header checkboxes come from the row-selection API below —
      // the column-level `checkboxSelection` properties are deprecated and
      // would render a redundant second checkbox per row.
      { field: 'name', filter: 'agTextColumnFilter' },
      { field: 'score', type: 'numericColumn' },
    ]),
    rowData: ROW_DATA,
    rowSelection: { mode: 'multiRow', headerCheckbox: true },
    // Deterministic DOM for accessibility scans: row animations leave rows
    // mid-fade with near-zero opacity, which axe reports as contrast failures.
    animateRows: false,
  });
  protected applyFilter(value: string): void {
    this.api()?.setFilterModel(
      value.trim()
        ? { name: { filterType: 'text', type: 'startsWith', filter: value.trim() } }
        : {},
    );
  }
}
