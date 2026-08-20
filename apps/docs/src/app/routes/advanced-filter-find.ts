import { ChangeDetectionStrategy, Component, ViewChild, inject } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { ColDef, GridApi, GridOptions } from 'ag-grid-community';
import { LibreGridThemeService } from '@libregrid/material';

interface Row { country: string; sales: number; status: string; }
const rows: Row[] = [
  { country: 'United Kingdom', sales: 120, status: 'Draft' }, { country: 'United States', sales: 240, status: 'Published' },
  { country: 'Japan', sales: 300, status: 'Review' }, { country: 'Germany', sales: 180, status: 'Draft' },
];
@Component({
  selector: 'lgr-advanced-filter-find-demo', changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatButtonModule, MatCardModule],
  template: `
  <div class="lgr-page lgr-advanced-filter-find-page"><h1>Advanced Filter, Find & Rich Select</h1>
    <p>Expressions and the visual builder use one serialisable Advanced Filter model. Find highlights each rendered match and wraps through the results.</p>
    <mat-card appearance="outlined"><mat-card-content>
      <div class="lgr-actions lgr-advanced-filter-toolbar">
        <button mat-flat-button (click)="showBuilder()">Open advanced builder</button>
        <button mat-stroked-button (click)="clearFilter()">Clear filter</button>
        <label class="lgr-find-control">Find <input data-testid="phase-eleven-find" [value]="findText" (input)="setFind($any($event.target).value)" placeholder="Find text"></label>
        <button mat-stroked-button (click)="next()">Next match</button>
        <span class="lgr-match-count" aria-live="polite">{{ matches }} matches</span>
      </div>
      <div #advancedParent class="lgr-advanced-filter-builder-host" data-testid="phase-eleven-filter-parent"></div>
      <div class="lgr-grid-host"><ag-grid-angular style="width:100%;height: 100%;" [theme]="theme.gridTheme()" [columnDefs]="columnDefs" [rowData]="rowData" [gridOptions]="gridOptions" (gridReady)="ready($event.api)" data-testid="phase-eleven-grid" /></div>
    </mat-card-content></mat-card>
    <h2>Rich Select editor</h2><p>Double-click Status, search, and press Enter. The option viewport stays small even with thousands of values.</p>
    <mat-card appearance="outlined"><mat-card-content><div class="lgr-grid-host"><ag-grid-angular style="width:100%;height:220px" [theme]="theme.gridTheme()" [columnDefs]="richColumns" [rowData]="rowData" data-testid="phase-eleven-rich-select" /></div></mat-card-content></mat-card>
  </div>`,
})
export class AdvancedFilterFindDemo {
  protected readonly theme = inject(LibreGridThemeService); protected readonly rowData = rows;
  @ViewChild('advancedParent') private advancedParent!: ElementRef<HTMLElement>;
  protected findText = ''; protected matches = 0; private api: GridApi<Row> | undefined;
  protected readonly columnDefs: ColDef<Row>[] = [{ field: 'country' }, { field: 'sales', cellDataType: 'number' }, { field: 'status', getFindText: ({ value }) => value === 'Published' ? 'Live' : value == null ? null : String(value) }];
  protected readonly richColumns: ColDef<Row>[] = [{ field: 'country' }, { field: 'status', editable: true, cellEditor: 'agRichSelectCellEditor', cellEditorParams: { values: Array.from({ length: 10_000 }, (_, index) => index < 3 ? ['Draft', 'Published', 'Review'][index] : `Status ${index}`), allowTyping: true, filterList: true, searchType: 'matchAny', highlightMatch: true } }];
  protected readonly gridOptions: GridOptions<Row> = { enableAdvancedFilter: true, advancedFilterBuilderParams: { showMoveButtons: true, minWidth: 520 }, findOptions: { caseSensitive: false } };
  protected ready(api: GridApi<Row>): void { this.api = api; api.setGridOption('advancedFilterParent', this.advancedParent.nativeElement); api.addEventListener('findChanged', () => this.matches = api.findGetTotalMatches()); }
  protected showBuilder(): void { this.api?.showAdvancedFilterBuilder(); }
  protected clearFilter(): void { this.api?.setAdvancedFilterModel(null); }
  protected setFind(value: string): void { this.findText = value; this.api?.setGridOption('findSearchValue', value); this.matches = this.api?.findGetTotalMatches() ?? 0; }
  protected next(): void { this.api?.findNext(); }
}
