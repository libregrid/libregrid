import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { GridApi } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';
import { createColumnDefs, createGridApiSignals, defineGridOptions } from '@libregrid/angular';

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

/**
 * Demonstrates @libregrid/angular: typed options helpers, the grid-ready API
 * signal, and reactive mirrors of grid state. Every LibreGrid module used by
 * this app is registered in main.ts through provideLibreGrid(...).
 */
@Component({
  selector: 'lgr-angular-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, MatChipsModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="lgr-page">
      <h1>Angular integration</h1>
      <p>
        <code>@libregrid/angular</code> adds signal ergonomics on top of the module set. This
        application registers every LibreGrid module through
        <code>provideLibreGrid(...)</code> in <code>main.ts</code> instead of calling
        <code>ModuleRegistry.registerModules</code> by hand. The state chips below are mirrored
        from the grid through <code>createGridApiSignals(...)</code> — they update as you filter
        and select. Typing in the filter box calls <code>setFilterModel</code>; the chips reflect
        what the grid reports back.
      </p>
      <mat-form-field appearance="outline">
        <mat-label>Filter by name</mat-label>
        <input matInput type="text" placeholder="e.g. Ada" (input)="applyFilter($any($event.target).value)" data-testid="angular-filter-input" />
      </mat-form-field>
      <mat-chip-set aria-label="Mirrored grid state">
        <mat-chip>Displayed rows: {{ state.displayedRowCount() }}</mat-chip>
        <mat-chip>Selected: {{ state.selectedRows().length }}</mat-chip>
        <mat-chip>Filters active: {{ filterCount() }}</mat-chip>
        <mat-chip>Revision: {{ state.revision() }}</mat-chip>
      </mat-chip-set>
      <mat-card appearance="outlined">
        <mat-card-content>
          <ag-grid-angular
            style="width: 100%; height: 420px"
            [theme]="theme.gridTheme()"
            [gridOptions]="gridOptions"
            (gridReady)="api.set($event.api)"
            data-testid="angular-grid"
          />
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class AngularDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly api = signal<GridApi<Row> | undefined>(undefined);
  protected readonly state = createGridApiSignals(this.api);
  protected readonly filterCount = computed(() => Object.keys(this.state.filterModel()).length);
  protected readonly gridOptions = defineGridOptions<Row>({
    columnDefs: createColumnDefs<Row>([
      { field: 'name', filter: 'agTextColumnFilter', checkboxSelection: true, headerCheckboxSelection: true },
      { field: 'score' },
    ]),
    rowData: ROW_DATA,
    rowSelection: { mode: 'multiRow' },
    // Deterministic DOM for accessibility scans: row animations leave rows
    // mid-fade with near-zero opacity, which axe reports as contrast failures.
    animateRows: false,
  });

  protected applyFilter(value: string): void {
    this.api()?.setFilterModel(value.trim() ? { name: { filterType: 'text', type: 'startsWith', filter: value.trim() } } : {});
  }
}
