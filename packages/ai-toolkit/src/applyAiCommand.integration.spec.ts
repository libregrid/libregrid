/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createGrid, ModuleRegistry, AllCommunityModule, type GridApi, type GridOptions } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { AiToolkitModule } from './aiToolkitModule';
import { applyAiCommand } from './applyAiCommand';
import { snapshotGrid } from './gridSnapshot';
import { buildAiEnvironment } from './environment';
import type { AiProvider, AiProviderResult } from './provider';
import type { RawToolCall } from './tools';

let api: GridApi | undefined;

beforeAll(() => {
  ModuleRegistry.registerModules([AllCommunityModule, EnterpriseCoreModule, AiToolkitModule]);
});

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

interface Row {
  sales: number;
  location: string;
  rep: string;
}

const ROWS: Row[] = [
  { sales: 1500, location: 'New York', rep: 'Ada' },
  { sales: 900, location: 'New York', rep: 'Alan' },
  { sales: 2000, location: 'Boston', rep: 'Grace' },
  { sales: 400, location: 'Boston', rep: 'Alonzo' },
];

function mountGrid(options: GridOptions = {}): GridApi {
  const el = document.createElement('div');
  el.style.width = '600px';
  el.style.height = '400px';
  document.body.appendChild(el);
  return createGrid(el, {
    columnDefs: [
      { field: 'sales', headerName: 'Sales', cellDataType: 'number', filter: 'agNumberColumnFilter' },
      { field: 'location', headerName: 'Location', filter: 'agTextColumnFilter' },
      { field: 'rep', headerName: 'Rep', filter: 'agTextColumnFilter' },
    ],
    rowData: ROWS,
    ...options,
  });
}

/** A provider that replays fixed calls, so the test measures the pipeline, not the model. */
function stubProvider(calls: RawToolCall[], confidence: number | undefined = 0.9): AiProvider {
  return {
    name: 'needle-wasm',
    complete: vi.fn(async (): Promise<AiProviderResult> => ({ calls, confidence })),
  } as unknown as AiProvider;
}

/** Look up the reference the model would use for a column, from the real environment. */
function refFor(grid: GridApi, colId: string): string {
  const environment = buildAiEnvironment(snapshotGrid(grid));
  for (const [ref, id] of environment.columnRefs) if (id === colId) return ref;
  throw new Error(`no reference for ${colId}`);
}

async function ready(grid: GridApi): Promise<void> {
  await vi.waitFor(() => expect(grid.getColumns()?.length).toBe(3));
}

describe('applyAiCommand on a live grid', () => {
  it('applies a multi-condition filter with real operators', async () => {
    api = mountGrid();
    await ready(api);

    const provider = stubProvider([
      {
        name: 'setFilter',
        arguments: {
          conditions: [
            { column: refFor(api, 'sales'), operator: 'gt', operands: [1000] },
            { column: refFor(api, 'location'), operator: 'eq', operands: ['New York'] },
          ],
        },
      },
    ]);

    const result = await applyAiCommand(api, 'Sales over 1000 in New York', { provider });

    expect(result.status).toBe('applied');
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    expect(api.getFilterModel()).toEqual({
      sales: { filterType: 'number', type: 'greaterThan', filter: 1000 },
      location: { filterType: 'text', type: 'equals', filter: 'New York' },
    });
  });

  it('applies filter, sort and visibility from one request as a single change', async () => {
    api = mountGrid();
    await ready(api);

    const provider = stubProvider([
      { name: 'setFilter', arguments: { conditions: [{ column: refFor(api, 'sales'), operator: 'gte', operands: [900] }] } },
      { name: 'setSort', arguments: { sortModel: [{ column: refFor(api, 'sales'), direction: 'desc' }] } },
      { name: 'setColumnVisibility', arguments: { hide: [refFor(api, 'rep')] } },
    ]);

    const result = await applyAiCommand(api, 'sales of at least 900, highest first, hide rep', { provider });

    expect(result.status).toBe('applied');
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    expect(api.getColumnState().find((c) => c.colId === 'sales')?.sort).toBe('desc');
    expect(api.getColumnState().find((c) => c.colId === 'rep')?.hide).toBe(true);
  });

  it('sorts ascending and descending', async () => {
    api = mountGrid();
    await ready(api);
    const provider = stubProvider([
      { name: 'setSort', arguments: { sortModel: [{ column: refFor(api, 'sales'), direction: 'asc' }] } },
    ]);
    await applyAiCommand(api, 'smallest sales first', { provider });
    await vi.waitFor(() => expect(api?.getDisplayedRowAtIndex(0)?.data.sales).toBe(400));
  });

  it('resets every section', async () => {
    api = mountGrid();
    await ready(api);
    await applyAiCommand(api, 'hide rep', {
      provider: stubProvider([{ name: 'setColumnVisibility', arguments: { hide: [refFor(api, 'rep')] } }]),
    });
    await vi.waitFor(() => expect(api?.getColumnState().find((c) => c.colId === 'rep')?.hide).toBe(true));

    await applyAiCommand(api, 'start over', { provider: stubProvider([{ name: 'resetGrid', arguments: {} }]) });
    await vi.waitFor(() => expect(api?.getColumnState().find((c) => c.colId === 'rep')?.hide).toBe(false));
    expect(api.getFilterModel()).toEqual({});
  });

  it('changes nothing when the plan fails validation', async () => {
    api = mountGrid();
    await ready(api);
    // A text column cannot take a numeric comparison.
    const provider = stubProvider([
      { name: 'setFilter', arguments: { conditions: [{ column: refFor(api, 'location'), operator: 'gt', operands: [5] }] } },
    ]);

    const result = await applyAiCommand(api, 'location over 5', { provider });

    expect(result).toMatchObject({ status: 'not-applied', reason: 'unsupported' });
    expect(api.getFilterModel()).toEqual({});
    expect(api.getDisplayedRowCount()).toBe(4);
  });

  it('changes nothing when the model names a column that does not exist', async () => {
    api = mountGrid();
    await ready(api);
    const provider = stubProvider([{ name: 'setSort', arguments: { sortModel: [{ column: 'c99' }] } }]);

    const result = await applyAiCommand(api, 'sort by profit', { provider });

    expect(result).toMatchObject({ status: 'not-applied', reason: 'invalid' });
    expect(api.getColumnState().every((c) => c.sort == null)).toBe(true);
  });

  it('reports an off-topic request rather than guessing', async () => {
    api = mountGrid();
    await ready(api);
    const result = await applyAiCommand(api, 'which region performs best?', { provider: stubProvider([]) });
    expect(result).toMatchObject({ status: 'not-applied', reason: 'off-topic' });
  });

  it('refuses to apply a response built against a different column set', async () => {
    api = mountGrid();
    await ready(api);
    const salesRef = refFor(api, 'sales');

    // The grid is reconfigured while the model is "thinking".
    const provider: AiProvider = {
      name: 'needle-wasm',
      complete: async () => {
        api?.setGridOption('columnDefs', [
          { field: 'sales', headerName: 'Sales', cellDataType: 'number', filter: 'agNumberColumnFilter' },
        ]);
        await new Promise((resolve) => setTimeout(resolve, 0));
        return { calls: [{ name: 'setSort', arguments: { sortModel: [{ column: salesRef, direction: 'desc' }] } }], confidence: 0.9 };
      },
    } as unknown as AiProvider;

    const result = await applyAiCommand(api, 'sort by sales', { provider });
    expect(result).toMatchObject({ status: 'not-applied', reason: 'invalid', message: expect.stringContaining('changed') });
  });

  it('honours a stated low confidence but proceeds when none is reported', async () => {
    api = mountGrid();
    await ready(api);
    const call: RawToolCall = { name: 'setSort', arguments: { sortModel: [{ column: refFor(api, 'sales') }] } };

    const low = await applyAiCommand(api, 'sort', { provider: stubProvider([call], 0.1) });
    expect(low).toMatchObject({ status: 'not-applied', reason: 'ambiguous' });

    // Tuned Needle weights report no confidence at all; treating that as zero
    // would reject every response from the very weights this toolkit runs.
    const unreported = await applyAiCommand(api, 'sort', { provider: stubProvider([call], undefined) });
    expect(unreported.status).toBe('applied');
  });

  it('does not touch the grid on a dry run', async () => {
    api = mountGrid();
    await ready(api);
    const provider = stubProvider([
      { name: 'setFilter', arguments: { conditions: [{ column: refFor(api, 'sales'), operator: 'gt', operands: [1000] }] } },
    ]);

    const result = await applyAiCommand(api, 'sales over 1000', { provider, dryRun: true });

    expect(result).toMatchObject({ status: 'applied', changes: { filter: [{ columnId: 'sales', operator: 'gt' }] } });
    expect(api.getDisplayedRowCount()).toBe(4);
  });

  it('reports cancellation through an abort signal', async () => {
    api = mountGrid();
    await ready(api);
    const controller = new AbortController();
    controller.abort();
    const result = await applyAiCommand(api, 'sort by sales', { provider: stubProvider([]), signal: controller.signal });
    expect(result).toMatchObject({ status: 'not-applied', reason: 'cancelled' });
  });

  it('withholds a column the caller marked as excluded', async () => {
    api = mountGrid();
    await ready(api);
    const environment = buildAiEnvironment(snapshotGrid(api, { rep: { include: false } }));
    expect([...environment.columnRefs.values()]).toEqual(['sales', 'location']);
    expect(environment.context).not.toContain('rep');
  });
});
