// Browser-only mock data. Reloading loses changes. In production, replace the mock
// with an authenticated service that validates and authorises reads and writes.
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
import { createGrid, ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { NotesModule } from '@libregrid/notes';
import { ContextMenuModule } from '@libregrid/menu';
ModuleRegistry.registerModules([AllCommunityModule, NotesModule, ContextMenuModule]);
interface Row {
  name: string;
  region: string;
  sales: number;
}
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
const rows = [
  {
    name: 'Alice',
    region: 'North',
    sales: 100,
  },
  {
    name: 'Bruno',
    region: 'South',
    sales: 8019,
  },
  {
    name: 'Carmen',
    region: 'East',
    sales: 5938,
  },
  {
    name: 'Dmitri',
    region: 'West',
    sales: 3857,
  },
  {
    name: 'Elena',
    region: 'North',
    sales: 1776,
  },
  {
    name: 'Farid',
    region: 'South',
    sales: 9695,
  },
  {
    name: 'Grace',
    region: 'East',
    sales: 7614,
  },
  {
    name: 'Hiro',
    region: 'West',
    sales: 5533,
  },
];
const source = new InMemoryNotesSource();
let trigger: 'hover' | 'click' = 'hover';
let gridApi: GridApi | undefined;
const columnDefs: ColDef<Row>[] = [
  { field: 'name', minWidth: 140 },
  { field: 'region', minWidth: 110 },
  { field: 'sales', type: 'numericColumn', minWidth: 110, suppressNoteActions: true },
];
const gridOptions: GridOptions<Row> = {
  getRowId: (params) => `row-${params.data.name}`,
  notesDataSource: source,
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
function onGridReady(readyApi: GridApi): void {
  gridApi = readyApi;
}
function toggleTrigger(): void {
  const next = trigger === 'hover' ? 'click' : 'hover';
  trigger = next;
  render();
  gridApi?.setGridOption('noteTrigger', next);
}
function addNoteToFirstRow(): void {
  const node = gridApi?.getRowNode('row-Alice');
  if (node === undefined) {
    return;
  }
  gridApi?.setNote({
    rowNode: node,
    column: 'name',
    note: {
      text: `Added from the toolbar at ${new Date().toLocaleTimeString()}.`,
      author: 'Docs demo',
      createdAt: new Date().toISOString(),
    },
  });
}
function clearAllNotes(): void {
  source.clearAll();
  gridApi?.refreshNotes();
}
function render(): void {
  document.querySelector('#action-0')!.textContent =
    `${trigger === 'hover' ? 'noteTrigger: hover' : 'noteTrigger: click'}`;
  document.querySelector('#status-trigger')!.textContent = trigger == null ? '' : String(trigger);
}
document.querySelector('#action-0')!.addEventListener('click', () => {
  toggleTrigger();
  render();
});
document.querySelector('#action-1')!.addEventListener('click', () => {
  addNoteToFirstRow();
  render();
});
document.querySelector('#action-2')!.addEventListener('click', () => {
  clearAllNotes();
  render();
});
createGrid(document.querySelector<HTMLElement>('#grid')!, {
  ...gridOptions,
  columnDefs: columnDefs,
  rowData: rows,
  onGridReady: (event) => {
    onGridReady(event.api);
    render();
  },
});
render();
