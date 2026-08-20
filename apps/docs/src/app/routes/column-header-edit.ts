import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { type ColDef, type ColGroupDef, type GridOptions, type GridApi } from 'ag-grid-community';

import { LibreGridThemeService } from '@libregrid/material';

interface Row {
  name: string;
  country: string;
  sales: number;
}

const NAMES = ['Alice', 'Bruno', 'Carmen', 'Dmitri', 'Elena', 'Farid', 'Grace', 'Hiro', 'Ines', 'Jonas'] as const;
const COUNTRIES = ['United States', 'France', 'Japan', 'Brazil', 'Germany'] as const;

function makeRows(n: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      name: NAMES[i % NAMES.length]!,
      country: COUNTRIES[i % COUNTRIES.length]!,
      sales: Math.round(((i * 7919) % 10000) + 100),
    });
  }
  return rows;
}

@Component({
  selector: 'lgr-column-header-edit-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, MatButtonModule],
  template: `
    <div class="lgr-page">
      <h1>Column Header Edit</h1>
      <p>
        Mark a column or column group <code>headerNameEditable: true</code> and its
        column menu gains an <strong>Edit Column Name</strong> item. The editor
        opens over the header; edited names persist in column / column-group
        state (so <code>resetColumnState()</code> reverts them).
      </p>

      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="lgr-grid-host">
            <ag-grid-angular
              style="width: 100%; height: 100%;"
              [theme]="theme.gridTheme()"
              [columnDefs]="columnDefs"
              [rowData]="rowData()"
              [gridOptions]="gridOptions"
              (gridReady)="onGridReady($event.api)"
              data-testid="column-header-edit-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <h2>Options</h2>
      <div class="lgr-actions">
        <button matButton="tonal" [class.lgr-active]="deferred()" (click)="toggleApplyMode()">
          {{ deferred() ? "applyMode: 'deferred'" : "applyMode: 'live'" }}
        </button>
        <button matButton="tonal" (click)="resetColumnState()">resetColumnState()</button>
      </div>

      <h2>How it works</h2>
      <p>
        Register <code>ColumnHeaderEditModule</code> (and <code>ColumnMenuModule</code>
        for the menu entry). <code>applyMode: 'live'</code> (default) applies every
        keystroke immediately — Escape restores the previous name.
        <code>'deferred'</code> shows Apply / Cancel buttons. Calculated columns
        are never editable; the header being edited is highlighted unless
        <code>columnHeaderEdit.suppressColumnHighlighting</code> is set.
      </p>
    </div>
  `,
})
export class ColumnHeaderEditDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rowData = signal<Row[]>(makeRows(15));
  protected readonly deferred = signal(false);
  private api: GridApi | undefined;

  protected readonly columnDefs: (ColDef<Row> | ColGroupDef<Row>)[] = [
    { field: 'name', headerNameEditable: true, minWidth: 140 },
    {
      groupId: 'where',
      headerName: 'Where & How Much',
      headerNameEditable: true,
      children: [
        { field: 'country', minWidth: 140 },
        { field: 'sales', type: 'numericColumn', minWidth: 110 },
      ],
    },
    {
      // Not editable: no headerNameEditable — the menu item stays hidden.
      colId: 'notes',
      headerName: 'Notes',
      minWidth: 140,
      valueGetter: () => '—',
    },
  ];

  protected readonly gridOptions: GridOptions<Row> = {
    columnHeaderEdit: { applyMode: 'live' },
  } as never;

  onGridReady(gridApi: GridApi): void {
    this.api = gridApi;
  }

  protected toggleApplyMode(): void {
    this.deferred.update((on) => !on);
    this.api?.setGridOption('columnHeaderEdit', { applyMode: this.deferred() ? 'deferred' : 'live' });
  }

  protected resetColumnState(): void {
    this.api?.resetColumnState();
  }
}
