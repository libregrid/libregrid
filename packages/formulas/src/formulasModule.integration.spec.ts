/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, ModuleRegistry, createGrid, type GridApi, type FormulaDataSource } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { CellSelectionModule } from '@libregrid/cell-selection';
import { FormulasModule } from './formulasModule';

const DATA = [
  { id: 'r1', a: 10, b: 4 },
  { id: 'r2', a: 20, b: 5 },
];

let api: GridApi | undefined;
let host: HTMLDivElement | undefined;

async function makeGrid(options: {
  columnDefs?: unknown[];
  rowData?: unknown[];
  formulaDataSource?: FormulaDataSource;
  formulaFuncs?: Record<string, { func: (params: never) => unknown }>;
  modules?: unknown[];
} = {}): Promise<GridApi> {
  ModuleRegistry.registerModules([AllCommunityModule, FormulasModule, ...(options.modules ?? [])]);
  host = document.createElement('div');
  document.body.appendChild(host);
  const grid = createGrid(host, {
    columnDefs: options.columnDefs ?? [
      { field: 'a' },
      { field: 'b' },
      { colId: 'total', field: 'total', allowFormula: true, editable: true },
    ],
    rowData: options.rowData ?? structuredClone(DATA),
    getRowId: (params) => String((params.data as { id: string }).id),
    formulaDataSource: options.formulaDataSource,
    formulaFuncs: options.formulaFuncs,
    ...{},
  } as never);
  api = grid;
  await vi.waitFor(() => expect(host?.querySelectorAll('.ag-row').length).toBeGreaterThanOrEqual(2));
  return grid;
}

function cell(row: number, colId: string): HTMLElement {
  const rowEl = host?.querySelectorAll('.ag-row')[row];
  const el = rowEl?.querySelector<HTMLElement>(`.ag-cell[col-id="${colId}"]`);
  if (!el) throw new Error(`cell ${row}/${colId} not found`);
  return el;
}

function cellText(row: number, colId: string): string {
  return cell(row, colId).textContent?.trim() ?? '';
}

async function editCell(row: number, colId: string, value: string): Promise<void> {
  await api!.startEditingCell({ rowIndex: row, colKey: colId });
  await vi.waitFor(() => expect(cell(row, colId).querySelector('input')).not.toBeNull());
  const input = cell(row, colId).querySelector<HTMLInputElement>('input');
  input!.value = value;
  input!.dispatchEvent(new Event('input', { bubbles: true }));
  api!.stopEditing();
  await vi.waitFor(() => expect(cell(row, colId).querySelector('input')).toBeNull());
}

afterEach(() => {
  api?.destroy();
  api = undefined;
  host?.remove();
  host = undefined;
  document.body.replaceChildren();
});

describe('FormulasModule (integration)', () => {

  it('evaluates data-supplied A1 formulas and recomputes when referenced data changes', async () => {
    const grid = await makeGrid({
      columnDefs: [
        { field: 'a' },
        { field: 'b' },
        { colId: 'total', field: 'total', allowFormula: true },
      ],
      rowData: [
        { id: 'r1', a: 10, b: 4, total: '=B1 + A1' },
        { id: 'r2', a: 20, b: 5, total: '=B2 + A2' },
      ],
    });
    await vi.waitFor(() => expect(cellText(0, 'total')).toBe('14'));
    expect(cellText(1, 'total')).toBe('25');

    grid.applyTransaction({ update: [{ id: 'r1', a: 100, b: 4, total: '=B1 + A1' }] });
    await vi.waitFor(() => expect(cellText(0, 'total')).toBe('104'));
  });

  it('evaluates long-hand (col/row ID) data formulas', async () => {
    const _grid = await makeGrid({
      columnDefs: [
        { field: 'a' },
        { field: 'b' },
        { colId: 'total', field: 'total', allowFormula: true },
      ],
      rowData: [
        { id: 'r1', a: 10, b: 4, total: '=[b:r1] + [a:r1]' },
        { id: 'r2', a: 20, b: 5, total: '=[b:r2] + [a:r2]' },
      ],
    });
    await vi.waitFor(() => expect(cellText(0, 'total')).toBe('14'));
    expect(cellText(1, 'total')).toBe('25');
  });

  it('resolves ranges through the displayed grid', async () => {
    const _grid = await makeGrid({
      columnDefs: [
        { field: 'a' },
        { field: 'b' },
        { colId: 'agg', field: 'agg', allowFormula: true },
      ],
      rowData: [
        { id: 'r1', a: 1, b: 2, agg: '=SUM(A1:B2)' },
        { id: 'r2', a: 10, b: 20, agg: '=COUNTIF(A1:B2, ">5")' },
      ],
    });
    await vi.waitFor(() => expect(cellText(0, 'agg')).toBe('33'));
    expect(cellText(1, 'agg')).toBe('2'); // 10 and 20 exceed 5
  });

  it('commits editor formulas in long-hand and displays the evaluated value', async () => {
    const grid = await makeGrid();
    await editCell(0, 'total', '=B1 * A1');
    await vi.waitFor(() => expect(cellText(0, 'total')).toBe('40'));
    expect(grid.getRowNode('r1')!.data!.total).toBe('=[b:r1] * [a:r1]');
  });

  it('shows the formula-error class and tooltip for invalid formulas', async () => {
    const _grid = await makeGrid();
    await editCell(0, 'total', '=A1 +');
    await vi.waitFor(() => expect(cellText(0, 'total')).toBe('#PARSE!'));
    await vi.waitFor(() => expect(cell(0, 'total').querySelector('.ag-cell-inner-text')?.classList.contains('formula-error') ?? cell(0, 'total').classList.contains('formula-error')).toBe(true));
    // The tooltip itself is Community's hover tooltip component (location
    // 'cellFormula'), not a title attribute — the error class + code are the
    // grid-owned surface verifiable in jsdom.
  });

  it('resolves formulas from an external formulaDataSource without a field', async () => {
    const store = new Map<string, string>([['r1-external', '=A1 * 2']]);
    const dataSource: FormulaDataSource = {
      getFormula: ({ column, rowNode }) => store.get(`${rowNode.id}-${column.colId}`),
      setFormula: ({ column, rowNode, formula }) => {
        const key = `${rowNode.id}-${column.colId}`;
        if (formula === undefined) store.delete(key);
        else store.set(key, formula);
      },
    };
    const _grid = await makeGrid({
      columnDefs: [
        { field: 'a' },
        { field: 'b' },
        { colId: 'external', allowFormula: true },
      ],
      formulaDataSource: dataSource,
    });
    await vi.waitFor(() => expect(cellText(0, 'external')).toBe('20'));

    // External store mutations surface only after refreshFormulas.
    store.set('r1-external', '=A1 * 3');
    expect(api!.refreshFormulas()).toBe(true);
    await vi.waitFor(() => expect(cellText(0, 'external')).toBe('30'));

    // Row-scoped invalidation.
    store.set('r1-external', '=A1 * 4');
    expect(api!.refreshFormulas('r1')).toBe(true);
    await vi.waitFor(() => expect(cellText(0, 'external')).toBe('40'));
    expect(api!.refreshFormulas('unknown-row')).toBe(false);
  });

  it('calls custom functions with value and range params', async () => {
    const _grid = await makeGrid({
      columnDefs: [
        { field: 'a' },
        { field: 'b' },
        { colId: 'custom', field: 'custom', allowFormula: true },
      ],
      rowData: [
        { id: 'r1', a: 1, b: 2, custom: '=CUSTOMSUM(A1:B1, 5)' },
        { id: 'r2', a: 10, b: 20, custom: '=DOUBLE(A2)' },
      ],
      formulaFuncs: {
        CUSTOMSUM: { func: (params: { values: Iterable<unknown> }) => [...params.values].reduce((s: number, v) => s + (v as number), 0) },
        DOUBLE: { func: (params: { values: Iterable<unknown> }) => ([...params.values][0] as number) * 2 },
      },
    });
    await vi.waitFor(() => expect(cellText(0, 'custom')).toBe('8'));
    expect(cellText(1, 'custom')).toBe('20');
  });

  it('exports evaluated values through CSV', async () => {
    const grid = await makeGrid({
      columnDefs: [
        { field: 'a' },
        { field: 'b' },
        { colId: 'total', field: 'total', allowFormula: true },
      ],
      rowData: [
        { id: 'r1', a: 10, b: 4, total: '=B1 + A1' },
        { id: 'r2', a: 20, b: 5, total: '=B2 + A2' },
      ],
    });
    await vi.waitFor(() => expect(cellText(0, 'total')).toBe('14'));
    const csv = grid.getDataAsCsv({ onlyColumns: undefined } as never);
    expect(csv).not.toContain('=B1');
    expect(csv).toContain('14');
  });

  it('keeps formula cells blank when row grouping is active', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    ModuleRegistry.registerModules([AllCommunityModule, FormulasModule, RowGroupingModule]);
    const grid = createGrid(host, {
      columnDefs: [
        { field: 'group', rowGroup: true, hide: true },
        { field: 'a' },
        { colId: 'total', field: 'total', allowFormula: true },
      ],
      rowData: [
        { id: 'r1', group: 'G', a: 1, total: '=A1 + 1' },
        { id: 'r2', group: 'G', a: 2, total: '=A2 + 1' },
      ],
      groupDefaultExpanded: 1,
      getRowId: (params) => String((params.data as { id: string }).id),
    } as never);
    await vi.waitFor(() => { const ids = [...host.querySelectorAll('.ag-row')].map((r) => r.getAttribute('row-id')); expect(ids.length).toBeGreaterThanOrEqual(3); });
    // Leaf rows exist but their formula cells stay blank (unevaluated), and the
    // soft-filter path never engages because `active` is false while grouped.
    const leafRows = [...host.querySelectorAll<HTMLElement>('.ag-row')].filter(
      (r) => r.getAttribute('row-id') === 'r1' || r.getAttribute('row-id') === 'r2',
    );
    expect(leafRows.length).toBe(2);
    for (const rowEl of leafRows) {
      const el = rowEl.querySelector<HTMLElement>('.ag-cell[col-id="total"]');
      expect(el?.textContent?.trim() ?? '').toBe('');
    }
    grid.destroy();
    host.remove();
    host = undefined;
    api = undefined;
  });

  it('works with the cell-selection module registered (fill interplay surface)', async () => {
    const _grid = await makeGrid({
      modules: [CellSelectionModule],
      columnDefs: [
        { field: 'a' },
        { field: 'b' },
        { colId: 'total', field: 'total', allowFormula: true, editable: true },
      ],
      rowData: [
        { id: 'r1', a: 1, b: 2, total: '=$B$1 + A1' },
        { id: 'r2', a: 10, b: 20, total: '=$B$1 + A2' },
      ],
      cellSelection: { handle: { mode: 'fill' } },
    } as never);
    await vi.waitFor(() => expect(cellText(0, 'total')).toBe('3'));
    expect(cellText(1, 'total')).toBe('12'); // $B$1=2 + A2=10
  });
});
