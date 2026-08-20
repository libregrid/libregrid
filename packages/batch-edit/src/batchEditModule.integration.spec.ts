/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type BatchEditingStoppedEvent,
  type CellValueChangedEvent,
  type ColDef,
  type GridApi,
  type IRowNode,
} from 'ag-grid-community';
import { BatchEditModule } from './batchEditModule';

interface Row {
  a: number;
  b: string;
}

function makeData(): Row[] {
  return [
    { a: 1, b: 'one' },
    { a: 2, b: 'two' },
    { a: 3, b: 'three' },
  ];
}

function defaultDefs(): ColDef<Row>[] {
  return [
    { field: 'a', editable: true, minWidth: 120 },
    { field: 'b', editable: true, minWidth: 120 },
  ];
}

let host: HTMLElement | undefined;
let api: GridApi<Row> | undefined;

async function makeGrid(
  columnDefs: ColDef<Row>[] = defaultDefs(),
  extra: Record<string, unknown> = {},
): Promise<GridApi<Row>> {
  ModuleRegistry.registerModules([AllCommunityModule, BatchEditModule]);
  host = document.createElement('div');
  document.body.appendChild(host);
  const grid = createGrid<Row>(host, {
    columnDefs,
    rowData: makeData(),
    getRowId: (params) => `row-${params.data.a}`,
    ...extra,
  });
  api = grid;
  await vi.waitFor(() => expect(host?.querySelectorAll('.ag-row').length).toBeGreaterThanOrEqual(3));
  return grid;
}

function cell(row: number, colId: string): HTMLElement {
  const rowEl = host?.querySelectorAll('.ag-row')[row];
  const el = rowEl?.querySelector<HTMLElement>(`.ag-cell[col-id="${colId}"]`);
  if (!el) {
    throw new Error(`cell ${row}/${colId} not found`);
  }
  return el;
}

function rowEl(row: number): HTMLElement {
  const el = host?.querySelectorAll('.ag-row')[row];
  if (!el) {
    throw new Error(`row ${row} not found`);
  }
  return el as HTMLElement;
}

function rowNode(index: number): IRowNode<Row> {
  const node = api?.getRowNode(`row-${index + 1}`);
  if (!node) {
    throw new Error(`row ${index} not found`);
  }
  return node;
}

afterEach(() => {
  api?.destroy();
  api = undefined;
  host?.remove();
  host = undefined;
  document.body.replaceChildren();
});

describe('BatchEditModule (integration)', () => {
  it('stages pending values without touching row data and marks the cell', async () => {
    const grid = await makeGrid();
    expect(grid.isBatchEditing()).toBe(false);

    grid.startBatchEdit();
    expect(grid.isBatchEditing()).toBe(true);

    rowNode(0).setDataValue('a', 100);
    // The row data is untouched while the value is staged.
    expect(grid.getRowNode('row-1')!.data!.a).toBe(1);
    await vi.waitFor(() => expect(cell(0, 'a').classList.contains('ag-cell-batch-edit')).toBe(true));
    expect(cell(1, 'a').classList.contains('ag-cell-batch-edit')).toBe(false);

    grid.cancelBatchEdit();
    expect(grid.isBatchEditing()).toBe(false);
    // The API contract: the batch is over and the row data was never written.
    // Community engine v36.1.0 additionally keeps already-staged values (editor closed) in the
    // edit model after a cancel — the cell keeps displaying them; documented in
    // docs/parity/batch-edit.md. Only open editors are reverted by the engine on cancel.
    expect(grid.getRowNode('row-1')!.data!.a).toBe(1);
  });

  it('defers value-changed events until commit, then fires them from the batch', async () => {
    const started: unknown[] = [];
    const stopped: BatchEditingStoppedEvent<Row>[] = [];
    const cellChanges: CellValueChangedEvent<Row>[] = [];
    const grid = await makeGrid(defaultDefs(), {
      onBatchEditingStarted: (e: unknown) => started.push(e),
      onBatchEditingStopped: (e: BatchEditingStoppedEvent<Row>) => stopped.push(e),
      onCellValueChanged: (e: CellValueChangedEvent<Row>) => cellChanges.push(e),
    });

    grid.startBatchEdit();
    rowNode(0).setDataValue('a', 100);
    rowNode(1).setDataValue('b', 'edited');

    // The start event fires lazily on the first write; everything else waits.
    await vi.waitFor(() => expect(started.length).toBe(1));
    expect(stopped).toHaveLength(0);
    expect(cellChanges).toHaveLength(0);
    expect(grid.getRowNode('row-1')!.data!.a).toBe(1);
    expect(grid.getRowNode('row-2')!.data!.b).toBe('two');

    grid.commitBatchEdit();
    await vi.waitFor(() => expect(stopped.length).toBe(1));
    expect(grid.isBatchEditing()).toBe(false);
    expect(grid.getRowNode('row-1')!.data!.a).toBe(100);
    expect(grid.getRowNode('row-2')!.data!.b).toBe('edited');
    expect(cellChanges).toHaveLength(2);
    // The stopped event carries the commit's change list — that is how a listener associates the
    // flushed value changes with the batch commit. (The deferred cellValueChanged events themselves
    // carry no `from` field in v36.1.0, and the d.ts `changes: CellValueChange[]` type does not
    // match the runtime records — see docs/parity/batch-edit.md.)
    const changes = stopped[0]!.changes as unknown as {
      rowIndex: number;
      columnId: string;
      oldValue: unknown;
      newValue: unknown;
    }[];
    expect(changes).toHaveLength(2);
    expect(changes.map((c) => c.rowIndex).sort()).toEqual([0, 1]);
    expect(changes.find((c) => c.rowIndex === 0)!.newValue).toBe(100);
    expect(changes.find((c) => c.rowIndex === 1)!.newValue).toBe('edited');
  });

  it('fires batchEditingStarted on the first write, not on startBatchEdit', async () => {
    const started: unknown[] = [];
    const grid = await makeGrid(defaultDefs(), {
      onBatchEditingStarted: (e: unknown) => started.push(e),
    });

    grid.startBatchEdit();
    expect(started).toHaveLength(0);

    rowNode(0).setDataValue('a', 10);
    await vi.waitFor(() => expect(started.length).toBe(1));

    grid.cancelBatchEdit();
    expect(started).toHaveLength(1);
  });

  it('an empty batch (no edits) fires neither started nor stopped', async () => {
    const events: string[] = [];
    const grid = await makeGrid(defaultDefs(), {
      onBatchEditingStarted: () => events.push('started'),
      onBatchEditingStopped: () => events.push('stopped'),
    });

    grid.startBatchEdit();
    expect(grid.isBatchEditing()).toBe(true);
    grid.commitBatchEdit();
    expect(grid.isBatchEditing()).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('cancel discards every staged edit and stops with an empty change list', async () => {
    const stopped: BatchEditingStoppedEvent<Row>[] = [];
    const grid = await makeGrid(defaultDefs(), {
      onBatchEditingStopped: (e: BatchEditingStoppedEvent<Row>) => stopped.push(e),
    });

    grid.startBatchEdit();
    rowNode(0).setDataValue('a', 100);
    rowNode(1).setDataValue('b', 'x');
    rowNode(2).setDataValue('a', 300);

    grid.cancelBatchEdit();
    await vi.waitFor(() => expect(stopped.length).toBe(1));
    expect(grid.isBatchEditing()).toBe(false);
    expect(stopped[0]!.changes).toHaveLength(0);
    expect(grid.getRowNode('row-1')!.data!.a).toBe(1);
    expect(grid.getRowNode('row-2')!.data!.b).toBe('two');
    expect(grid.getRowNode('row-3')!.data!.a).toBe(3);
  });

  it('commit and cancel outside a batch are safe no-ops', async () => {
    const events: string[] = [];
    const grid = await makeGrid(defaultDefs(), {
      onBatchEditingStarted: () => events.push('started'),
      onBatchEditingStopped: () => events.push('stopped'),
    });

    grid.commitBatchEdit();
    grid.cancelBatchEdit();

    expect(grid.isBatchEditing()).toBe(false);
    expect(events).toHaveLength(0);
    expect(grid.getRowNode('row-1')!.data!.a).toBe(1);
  });
  it('stages several rows and columns together and commits them in one pass', async () => {
    const grid = await makeGrid();

    grid.startBatchEdit();
    rowNode(0).setDataValue('a', 11);
    rowNode(0).setDataValue('b', 'one-11');
    rowNode(1).setDataValue('a', 22);
    rowNode(2).setDataValue('b', 'three-22');

    await vi.waitFor(() => expect(cell(0, 'a').classList.contains('ag-cell-batch-edit')).toBe(true));
    await vi.waitFor(() => expect(cell(0, 'b').classList.contains('ag-cell-batch-edit')).toBe(true));
    await vi.waitFor(() => expect(cell(1, 'a').classList.contains('ag-cell-batch-edit')).toBe(true));
    await vi.waitFor(() => expect(cell(2, 'b').classList.contains('ag-cell-batch-edit')).toBe(true));

    // Nothing has reached the row data yet.
    expect(grid.getRowNode('row-1')!.data!.a).toBe(1);
    expect(grid.getRowNode('row-3')!.data!.b).toBe('three');

    grid.commitBatchEdit();
    await vi.waitFor(() => expect(grid.getRowNode('row-1')!.data!.a).toBe(11));
    expect(grid.getRowNode('row-1')!.data!.b).toBe('one-11');
    expect(grid.getRowNode('row-2')!.data!.a).toBe(22);
    expect(grid.getRowNode('row-3')!.data!.b).toBe('three-22');
    expect(grid.isBatchEditing()).toBe(false);
  });

  it('keeps the batch open in block mode while an invalid edit is staged', async () => {
    const grid = await makeGrid(
      [
        {
          field: 'a',
          editable: true,
          minWidth: 120,
          // v36 edit validation: the rule lives on cellEditorParams (the pre-v36
          // colDef.validateEditValue is not honored by the community engine).
          cellEditorParams: {
            getValidationErrors: (params: { value: unknown }) =>
              Number(params.value) < 0 ? ['Value must be zero or greater'] : null,
          },
        },
        { field: 'b', editable: true, minWidth: 120 },
      ],
      { invalidEditValueMode: 'block' },
    );

    grid.startBatchEdit();
    await grid.startEditingCell({ rowIndex: 0, colKey: 'a' });
    await vi.waitFor(() => expect(cell(0, 'a').querySelector('input')).not.toBeNull());
    (cell(0, 'a').querySelector('input') as HTMLInputElement).value = '-5';
    grid.stopEditing();

    // Block mode holds: the editor stays open, nothing is staged.
    await vi.waitFor(() => expect(cell(0, 'a').querySelector('input')).not.toBeNull());

    grid.commitBatchEdit();
    // The commit is rejected by the held invalid edit; the batch stays open.
    expect(grid.isBatchEditing()).toBe(true);
    expect(grid.getRowNode('row-1')!.data!.a).toBe(1);

    // A cancel reverts the open editor and ends the batch.
    grid.cancelBatchEdit();
    expect(grid.isBatchEditing()).toBe(false);
    expect(grid.getRowNode('row-1')!.data!.a).toBe(1);
  });

  it('lets the commit through once a held invalid edit is corrected', async () => {
    const grid = await makeGrid(
      [
        {
          field: 'a',
          editable: true,
          minWidth: 120,
          // v36 edit validation: the rule lives on cellEditorParams (the pre-v36
          // colDef.validateEditValue is not honored by the community engine).
          cellEditorParams: {
            getValidationErrors: (params: { value: unknown }) =>
              Number(params.value) < 0 ? ['Value must be zero or greater'] : null,
          },
        },
        { field: 'b', editable: true, minWidth: 120 },
      ],
      { invalidEditValueMode: 'block' },
    );

    grid.startBatchEdit();
    await grid.startEditingCell({ rowIndex: 0, colKey: 'a' });
    await vi.waitFor(() => expect(cell(0, 'a').querySelector('input')).not.toBeNull());
    const input = cell(0, 'a').querySelector('input') as HTMLInputElement;
    // jsdom does not fire `input` on `.value = ...`; the engine only observes the
    // new value when the DOM input event is dispatched (real browsers do this
    // while the user types).
    input.value = '-5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    grid.stopEditing();

    grid.commitBatchEdit();
    expect(grid.isBatchEditing()).toBe(true);

    // Correct the value, stop the editor again, then commit.
    input.value = '7';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    grid.stopEditing();
    grid.commitBatchEdit();
    await vi.waitFor(() => expect(grid.isBatchEditing()).toBe(false));
    expect(grid.getRowNode('row-1')!.data!.a).toBe(7);
  });

  it('marks the row when a whole row is edited inside a batch', async () => {
    // The engine keys `ag-row-batch-edit` off the grid-level `editType: 'fullRow'` option.
    const grid = await makeGrid(defaultDefs(), { editType: 'fullRow' });

    grid.startBatchEdit();
    await grid.startEditingCell({ rowIndex: 0, colKey: 'a' });

    await vi.waitFor(() => expect(rowEl(0).classList.contains('ag-row-batch-edit')).toBe(true));
    expect(rowEl(1).classList.contains('ag-row-batch-edit')).toBe(false);

    grid.commitBatchEdit();
    await vi.waitFor(() => expect(rowEl(0).classList.contains('ag-row-batch-edit')).toBe(false));
    // Closing the editors without value changes commits nothing.
    expect(grid.getRowNode('row-1')!.data!.a).toBe(1);
    expect(grid.isBatchEditing()).toBe(false);
  });
});
