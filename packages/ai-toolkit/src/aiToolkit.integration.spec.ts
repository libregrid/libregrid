/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createGrid, ModuleRegistry, AllCommunityModule, type GridApi, type GridOptions } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { AiToolkitModule } from './aiToolkitModule';
import { buildGridTools, validateToolCall, type RawToolCall } from './tools';
import { toolCallToStatePatch } from './applyToolCall';

let api: GridApi | undefined;

beforeAll(() => {
  ModuleRegistry.registerModules([AllCommunityModule, EnterpriseCoreModule, AiToolkitModule]);
});

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

function mountGrid(options: GridOptions = {}): GridApi {
  const el = document.createElement('div');
  el.style.width = '600px';
  el.style.height = '400px';
  document.body.appendChild(el);
  return createGrid(
    el,
    {
      columnDefs: [
        { field: 'name', headerName: 'Name' },
        { field: 'age', headerName: 'Age' },
        { field: 'city', headerName: 'City' },
      ],
      rowData: [
        { name: 'Ada', age: 36, city: 'London' },
        { name: 'Alan', age: 41, city: 'Bletchley' },
        { name: 'Grace', age: 29, city: 'London' },
      ],
      ...options,
    },
  );
}

/** Column state is populated after a layout tick in jsdom. */
async function columnsReady(grid: GridApi): Promise<void> {
  await vi.waitFor(() => expect(Array.isArray(grid.getColumnState())).toBe(true));
}

/** `ColumnState` expresses visibility as the `hide` flag. */
function columnHidden(grid: GridApi, colId: string): boolean | undefined {
  return grid.getColumnState().find((c) => c.colId === colId)?.hide;
}

describe('AiToolkitModule on a live grid', () => {
  it('boots a grid with the module registered', () => {
    api = mountGrid();
    expect(api.getDisplayedRowCount()).toBe(3);
  });

  it('exposes getStructuredSchema built from the live column model', () => {
    api = mountGrid();
    const schema = api.getStructuredSchema() as Record<string, any>;
    expect(schema.properties.sortModel).toBeDefined();
    expect(Object.keys(schema.properties.filterModel.properties).sort()).toEqual(['age', 'city', 'name']);
    expect(schema.properties.hiddenColIds.items.enum).toEqual(['name', 'age', 'city']);

    const narrowed = api.getStructuredSchema({ exclude: ['filter'] }) as Record<string, any>;
    expect(narrowed.properties.filterModel).toBeUndefined();
    expect(narrowed.properties.sortModel).toBeDefined();
  });

  it('builds enum-constrained tools from the live column set', () => {
    const columns = [
      { colId: 'name', headerName: 'Name', filterable: true },
      { colId: 'age', headerName: 'Age', filterable: true },
    ];
    const tools = buildGridTools(columns);
    expect(tools.map((t) => t.name)).toEqual(['setSort', 'setFilters', 'setColumnVisibility', 'resetGrid']);
    const setFilters = tools.find((t) => t.name === 'setFilters') as any;
    expect(setFilters.parameters.properties.column.enum).toEqual(['name', 'age']);
  });

  it('full loop: tool call -> validate -> state patch -> visible effect', async () => {
    api = mountGrid();
    await columnsReady(api);
    const columns = [
      { colId: 'name', headerName: 'Name', filterable: true },
      { colId: 'age', headerName: 'Age', filterable: true },
      { colId: 'city', headerName: 'City', filterable: true },
    ];

    // Hide a column.
    const hide = validateToolCall({ name: 'setColumnVisibility', arguments: { hiddenColIds: ['age'] } } as RawToolCall, columns);
    expect(hide.ok).toBe(true);
    if (hide.ok) api.setState(toolCallToStatePatch(hide));
    await vi.waitFor(() => expect(columnHidden(api, 'age')).toBe(true));

    // Filter patches are asserted in unit tests: jsdom never instantiates the
    // header filter UI, so set-filter models do not round-trip through a live
    // grid here (verified by probe). Sort and visibility do.
    const filter = validateToolCall({ name: 'setFilters', arguments: { column: 'city', values: ['London'] } } as RawToolCall, columns);
    expect(filter.ok).toBe(true);
    if (filter.ok) {
      expect(toolCallToStatePatch(filter)).toEqual({
        filter: { filterModel: { city: { filterType: 'set', values: ['London'] } } },
      });
    }

    // Sort.
    const sort = validateToolCall({ name: 'setSort', arguments: { sortModel: [{ colId: 'age', sort: 'desc' }] } } as RawToolCall, columns);
    expect(sort.ok).toBe(true);
    if (sort.ok) api.setState(toolCallToStatePatch(sort));
    await vi.waitFor(() => expect(api.getColumnState().find((c) => c.colId === 'age')?.sort).toBe('desc'));

    // Reset everything.
    const reset = validateToolCall({ name: 'resetGrid', arguments: {} } as RawToolCall, columns);
    expect(reset.ok).toBe(true);
    if (reset.ok) api.setState(toolCallToStatePatch(reset));
    await vi.waitFor(() => expect(columnHidden(api, 'age')).toBe(false));
    await vi.waitFor(() => expect(api.getColumnState().find((c) => c.colId === 'age')?.sort).toBeNull());
  });

  it('rejects a tool call that names an unknown column', () => {
    const columns = [{ colId: 'name', headerName: 'Name', filterable: true }];
    const result = validateToolCall({ name: 'setFilters', arguments: { column: 'nope', values: ['x'] } } as RawToolCall, columns);
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('unknown column id') });
  });
});
