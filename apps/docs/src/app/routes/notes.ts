import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {
  type ColDef,
  type FullWidthNotesDataSource,
  type FullWidthNotesDataSourceGetNoteParams,
  type FullWidthNotesDataSourceSetNoteParams,
  type GridApi,
  type GridOptions,
  type Note,
  type NotesDataSourceFullWidthRowNoteParams,
  type NotesDataSourceNoteParams,
} from 'ag-grid-community';

import { LibreGridThemeService } from '@libregrid/material';

interface Row {
  name: string;
  region: string;
  sales: number;
}

const NAMES = [
  'Alice',
  'Bruno',
  'Carmen',
  'Dmitri',
  'Elena',
  'Farid',
  'Grace',
  'Hiro',
  'Ines',
  'Jonas',
] as const;
const REGIONS = ['North', 'South', 'East', 'West'] as const;

function makeRows(): Row[] {
  const rows: Row[] = [];
  let total = 0;
  for (let i = 0; i < NAMES.length; i++) {
    const sales = Math.round(((i * 7919) % 10000) + 100);
    total += sales;
    rows.push({ name: NAMES[i]!, region: REGIONS[i % REGIONS.length]!, sales });
  }
  rows.push({ name: 'Totals', region: '', sales: total });
  return rows;
}

/**
 * In-memory notes data source with full-width row support. Keys are
 * `rowId::colId` for cells and `rowId::__fullWidth__` for full-width rows.
 */
class InMemoryNotesSource implements FullWidthNotesDataSource {
  readonly supportsFullWidthRows = true;
  private readonly notes = new Map<string, Note>();

  init(): void {}

  destroy(): void {
    this.notes.clear();
  }

  getNote(params: FullWidthNotesDataSourceGetNoteParams): Note | undefined {
    return this.notes.get(keyOf(params));
  }

  setNote(params: FullWidthNotesDataSourceSetNoteParams): void {
    const key = keyOf(params);
    if (params.note !== undefined) {
      this.notes.set(key, params.note);
    } else {
      this.notes.delete(key);
    }
  }

  /** Seed demo content before the grid renders. */
  seed(notes: Record<string, Note>): void {
    for (const [key, note] of Object.entries(notes)) {
      this.notes.set(key, note);
    }
  }

  /** Remove every note (demo convenience). */
  clearAll(): void {
    this.notes.clear();
  }
}

function keyOf(params: NotesDataSourceNoteParams | NotesDataSourceFullWidthRowNoteParams): string {
  if ('location' in params && params.location === 'fullWidthRow') {
    return `${params.rowNode.id ?? ''}::__fullWidth__`;
  }
  return `${params.rowNode.id ?? ''}::${params.column.getColId()}`;
}

@Component({
  selector: 'lgr-notes-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular, MatCardModule, MatButtonModule],
  template: `
    <div class="lgr-page">
      <h1>Cell Notes</h1>
      <p>
        Hover (or click, when the trigger is set to click) a cell that carries a note to
        open the note popup. Notes can be created and edited from the popup, from the
        context menu (<em>Add Note</em> / <em>Edit Note</em> / <em>Remove Note</em>), or
        with <code>Shift+F2</code>. Cells with a note show a small dot. The
        <code>sales</code> column sets <code>suppressNoteActions: true</code>, so notes
        there are only ever viewable. The footer <em>Totals</em> row is a full-width row
        with its own note.
      </p>

      <mat-card appearance="outlined">
        <mat-card-content>
          <div class="lgr-grid-host">
            <ag-grid-angular
              style="width: 100%; height: 100%;"
              [theme]="theme.gridTheme()"
              [columnDefs]="columnDefs"
              [rowData]="rows"
              [gridOptions]="gridOptions"
              (gridReady)="onGridReady($event.api)"
              data-testid="notes-grid"
            />
          </div>
        </mat-card-content>
      </mat-card>

      <h2>Options</h2>
      <div class="lgr-actions">
        <button mat-stroked-button [class.lgr-active]="trigger() !== 'hover'" (click)="toggleTrigger()">
          {{ trigger() === 'hover' ? 'noteTrigger: hover' : 'noteTrigger: click' }}
        </button>
        <button mat-stroked-button (click)="addNoteToFirstRow()">Add note to first row</button>
        <button mat-stroked-button (click)="clearAllNotes()">Clear all notes</button>
      </div>

      <h2>How it works</h2>
      <p>
        Register <code>NotesModule</code> and set a <code>notesDataSource</code> on the
        grid. The grid stores nothing itself: every read and write goes through your
        data source, and the reserved <code>notesSvc</code> / <code>notesDataSvc</code>
        beans wire the community cell and full-width-row note hooks, the
        <code>lgr-cell-has-note</code> markers, the note popup, and the
        <code>note</code> context-menu item.
      </p>
    </div>
  `,
})
export class NotesDemo {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly rows = makeRows();
  protected readonly source = new InMemoryNotesSource();
  protected readonly trigger = signal<'hover' | 'click'>('hover');
  private api: GridApi | undefined;

  protected readonly columnDefs: ColDef<Row>[] = [
    { field: 'name', minWidth: 140 },
    { field: 'region', minWidth: 110 },
    { field: 'sales', type: 'numericColumn', minWidth: 110, suppressNoteActions: true },
  ];

  protected readonly gridOptions: GridOptions<Row> = {
    getRowId: (params) => `row-${params.data.name}`,
    notesDataSource: this.source,
    noteTrigger: 'hover',
    isFullWidthRow: (params) => params.rowNode.id === 'row-Totals',
    fullWidthCellRenderer: (params: { data: Row }) => {
      const el = document.createElement('div');
      el.style.cssText =
        'display:flex;align-items:center;height:100%;padding:0 12px;font-weight:600;';
      el.textContent = `Totals — ${params.data.sales.toLocaleString()} across all regions`;
      return el;
    },
  };

  constructor() {
    this.source.seed({
      'row-Alice::name': {
        text: 'Alice is on sabbatical until next quarter — redirect her deals to Ines.',
        author: 'Ada',
        createdAt: '2026-01-05T09:30:00.000Z',
      },
      'row-Bruno::name': {
        text: "Do not reassign Bruno's region without HR approval.",
        author: 'Ada',
        readOnly: true,
      },
      'row-Totals::__fullWidth__': {
        text: 'Totals row — notes work here too.',
        author: 'Ada',
      },
    });
  }

  onGridReady(gridApi: GridApi): void {
    this.api = gridApi;
  }

  protected toggleTrigger(): void {
    const next = this.trigger() === 'hover' ? 'click' : 'hover';
    this.trigger.set(next);
    this.api?.setGridOption('noteTrigger', next);
  }

  protected addNoteToFirstRow(): void {
    const node = this.api?.getRowNode('row-Alice');
    if (node === undefined) {
      return;
    }
    this.api?.setNote({
      rowNode: node,
      column: 'name',
      note: {
        text: `Added from the toolbar at ${new Date().toLocaleTimeString()}.`,
        author: 'Docs demo',
        createdAt: new Date().toISOString(),
      },
    });
  }

  protected clearAllNotes(): void {
    this.source.clearAll();
    this.api?.refreshNotes();
  }
}
