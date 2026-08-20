/**
 * @vitest-environment jsdom
 *
 * Integration tests for `@libregrid/server-side-selection`: the module's
 * `selectionSvc` registration on SSRM grids, op capture, hydration,
 * eviction re-resolution, tab isolation, and the spec-level controls.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type GridApi,
  type IServerSideDatasource,
  type RowNode,
} from 'ag-grid-community';
import { ServerSideSelectionModule } from './serverSideSelectionModule';
import type {
  SelectionOp,
  SelectionSpec,
  SelectionTerm,
  SsrmSelectionService,
} from './types';

// ---------------------------------------------------------------------------
// In-memory provider — the app-side contract, implemented for tests.
//
// `all` terms match every row (the test datasource is single-filter);
// `group` terms match rows whose route starts with the term route.
// Exceptions/additions refine per row (R3), route exceptions per group.
// ---------------------------------------------------------------------------

interface Trade {
  id: string;
  name: string;
  desk?: string;
}

interface ProviderRow {
  id: string;
  route?: string[];
}

function createMemoryProvider(rows: ProviderRow[]) {
  let terms: SelectionTerm[] = [];
  const additions = new Set<string>();
  const exceptions = new Set<string>();
  const routeExceptions = new Set<string>();
  const ops: SelectionOp[] = [];

  const routeKey = (route: string[] | undefined): string | undefined =>
    route === undefined ? undefined : route.join('|');

  const matchesTerm = (row: ProviderRow): boolean => {
    for (const term of terms) {
      if (term.type === 'all') {
        return true;
      }
      const rowRoute = row.route;
      if (rowRoute !== undefined && rowRoute.length >= term.route.length) {
        const covered = term.route.every((key, i) => rowRoute[i] === key);
        if (covered) {
          return true;
        }
      }
    }
    return false;
  };

  const rowSelected = (row: ProviderRow): boolean => {
    const rowRoute = routeKey(row.route);
    return (
      (matchesTerm(row) || additions.has(row.id)) &&
      !exceptions.has(row.id) &&
      (rowRoute === undefined || !routeExceptions.has(rowRoute))
    );
  };

  const groupSelected = (groupRoute: string[]): boolean => {
    if (routeExceptions.has(groupRoute.join('|'))) {
      return false;
    }
    return terms.some(
      (term) =>
        term.type === 'group' &&
        term.route.length <= groupRoute.length &&
        term.route.every((key, i) => groupRoute[i] === key),
    );
  };

  return {
    ops,
    provider: {
      async getSpec(): Promise<SelectionSpec> {
        return { terms: [...terms], selectedCount: rows.filter(rowSelected).length };
      },
      async applyOps(params: { gridId: string; tabId: string; ops: SelectionOp[] }): Promise<void> {
        for (const op of params.ops) {
          ops.push(op);
          switch (op.op) {
            case 'selectAll':
              terms.push({ type: 'all', filter: op.filter });
              exceptions.clear();
              routeExceptions.clear();
              break;
            case 'deselectAll':
              terms = [];
              additions.clear();
              exceptions.clear();
              routeExceptions.clear();
              break;
            case 'select':
              for (const id of op.ids) {
                exceptions.delete(id);
                additions.add(id);
              }
              break;
            case 'deselect':
              for (const id of op.ids) {
                additions.delete(id);
                exceptions.add(id);
              }
              break;
            case 'selectGroup':
              terms.push({ type: 'group', route: op.route });
              routeExceptions.delete(op.route.join('|'));
              break;
            case 'deselectGroup':
              routeExceptions.add(op.route.join('|'));
              break;
          }
        }
      },
      async resolveSelected(params: {
        gridId: string;
        tabId: string;
        rowIds: string[];
        groupRoutes: string[];
      }): Promise<Record<string, boolean>> {
        const result: Record<string, boolean> = {};
        const byId = new Map(rows.map((row) => [row.id, row]));
        for (const id of params.rowIds) {
          const row = byId.get(id);
          result[id] = row !== undefined ? rowSelected(row) : false;
        }
        for (const key of params.groupRoutes) {
          result[key] = groupSelected(key.split('|'));
        }
        return result;
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Grid harness (mirrors the SSRM package's partial-grid fixture: 100 rows,
// 2-row blocks, a 2-block cache, page size 2).
// ---------------------------------------------------------------------------

let api: GridApi<Trade> | undefined;
let element: HTMLElement | undefined;

afterEach(() => {
  api?.destroy();
  api = undefined;
  element?.remove();
  element = undefined;
});

function flatDatasource(): IServerSideDatasource<Trade> {
  return {
    getRows(params) {
      const start = params.request.startRow ?? 0;
      params.success({
        rowData: Array.from({ length: 2 }, (_, offset) => ({
          id: String(start + offset),
          name: `Row ${start + offset}`,
        })),
        rowCount: 100,
      });
    },
  };
}

function createSelectionGrid(gridOptions: Record<string, unknown> = {}) {
  const rows: ProviderRow[] = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
  const { provider, ops } = createMemoryProvider(rows);
  const service = new Promise<SsrmSelectionService>((resolve) => {
    // `onReady` fires once the first hydration completes — the app's mount
    // seam, and the tests' synchronization point.
    const ssrmSelection = {
      provider,
      tabId: 'tab-a',
      opDebounceMillis: 5,
      onReady: (svc: SsrmSelectionService) => resolve(svc),
    };
    element = document.createElement('div');
    element.style.height = '200px';
    document.body.appendChild(element);
    api = createGrid(element, {
      rowModelType: 'serverSide',
      cacheBlockSize: 2,
      maxBlocksInCache: 2,
      rowSelection: { mode: 'multiRow', selectAll: 'currentPage' },
      columnDefs: [{ field: 'name' }],
      getRowId: (params) => params.data.id,
      serverSideDatasource: flatDatasource(),
      pagination: true,
      paginationPageSize: 2,
      paginationPageSizeOptions: [2],
      ssrmSelection,
      ...gridOptions,
    });
  });
  return { service, ops, element: () => element! };
}

function node(id: string): RowNode {
  return api!.getRowNode(id) as RowNode;
}

async function loadedRow(id: string): Promise<RowNode> {
  const row = await vi.waitFor(() => {
    const n = api!.getRowNode(id);
    expect(n).not.toBeNull();
    return n!;
  });
  return row as RowNode;
}

function goToPage(page: number): void {
  (api as unknown as { paginationGoToPage: (page: number) => void }).paginationGoToPage(page);
}

describe('ServerSideSelectionModule', () => {
  it('registers a working selection service on an SSRM grid (no feature option needed)', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideSelectionModule]);
    element = document.createElement('div');
    document.body.appendChild(element);
    api = createGrid(element, {
      rowModelType: 'serverSide',
      rowSelection: { mode: 'multiRow', selectAll: 'currentPage' },
      columnDefs: [{ field: 'name' }],
      getRowId: (params) => params.data.id,
      serverSideDatasource: flatDatasource(),
    });

    const row = await vi.waitFor(() => {
      const n = api?.getRowNode('0');
      expect(n).toBeDefined();
      return n!;
    });
    // Community's RowSelectionModule is row-model-gated: without this
    // package the call below would be a silent no-op (no selectionSvc bean).
    api?.setNodesSelected({ nodes: [row], newValue: true, source: 'api' });
    expect(row.isSelected()).toBe(true);
  });

  it('captures row selections as `select` ops and ignores hydration flips', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideSelectionModule]);
    const { service: svcPromise, ops } = createSelectionGrid();
    const svc = await svcPromise; // first row hydration completed, nothing selected
    await loadedRow('0');

    // User path: a checkbox flip is captured as a `select` op.
    api!.setNodesSelected({ nodes: [node('0')], newValue: true, source: 'checkboxSelected' });
    await vi.waitFor(() =>
      expect(ops).toEqual([{ op: 'select', ids: ['0'] }]),
    );

    // Spec-level control: Select All (filtered) → one deduped `selectAll`
    // op for every loaded row it flips.
    svc.selectAllFiltered();
    await vi.waitFor(() =>
      expect(ops.filter((op) => op.op === 'selectAll')).toHaveLength(1),
    );
    // The provider now holds the term: the spec count covers all 100 rows.
    await vi.waitFor(() => expect(svc.getSpec()?.selectedCount).toBe(100));
    const spec = svc.getSpec();
    expect(spec?.terms).toHaveLength(1);
    expect(spec?.terms[0]?.type).toBe('all');
  });

  it('deselectAll clears the whole spec', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideSelectionModule]);
    const { service: svcPromise, ops } = createSelectionGrid();
    const svc = await svcPromise;
    await loadedRow('0');

    svc.selectAllFiltered();
    await vi.waitFor(() => expect(ops.some((op) => op.op === 'selectAll')).toBe(true));
    svc.deselectAll();
    await vi.waitFor(() => expect(ops).toContainEqual({ op: 'deselectAll' }));
    await vi.waitFor(() =>
      expect(svc.getSpec()).toEqual({ terms: [], selectedCount: 0 }),
    );
  });

  it('hydrates loaded rows from the provider when they materialise', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideSelectionModule]);
    const rows: ProviderRow[] = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
    const { provider, ops } = createMemoryProvider(rows);
    // Pre-seed: rows 0-1 selected out-of-band (e.g. another tab's user).
    await provider.applyOps({
      gridId: 'seed',
      tabId: 'tab-a',
      ops: [{ op: 'select', ids: ['0', '1'] }],
    });

    element = document.createElement('div');
    element.style.height = '200px';
    document.body.appendChild(element);
    const service = new Promise<SsrmSelectionService>((resolve) => {
      api = createGrid(element, {
        rowModelType: 'serverSide',
        rowSelection: { mode: 'multiRow', selectAll: 'currentPage' },
        columnDefs: [{ field: 'name' }],
        getRowId: (params) => params.data.id,
        serverSideDatasource: flatDatasource(),
        ssrmSelection: { provider, tabId: 'tab-a', opDebounceMillis: 5, onReady: resolve },
      });
    });
    const svc = await service;

    await vi.waitFor(() => {
      expect(api!.getRowNode('0')?.isSelected()).toBe(true);
      expect(api!.getRowNode('1')?.isSelected()).toBe(true);
    });
    // Hydration uses source 'api' — it never produces ops; the only op is
    // the out-of-band seed from before the grid existed.
    expect(ops).toEqual([{ op: 'select', ids: ['0', '1'] }]);
    expect(svc).toBeDefined();
  });

  it('re-resolves evicted rows from the provider when requested again', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideSelectionModule]);
    const { service: svcPromise, ops } = createSelectionGrid();
    await svcPromise;
    await loadedRow('0');

    api!.setNodesSelected({ nodes: [node('0')], newValue: true, source: 'rowClicked' });
    await vi.waitFor(() => expect(ops).toEqual([{ op: 'select', ids: ['0'] }]));

    // Evict block 0 by loading pages 2 and 4 (the cache holds 2 blocks).
    goToPage(2);
    await vi.waitFor(() => expect(api!.getCacheBlockState()['2']).toBeDefined());
    goToPage(4);
    await vi.waitFor(() => expect(api!.getCacheBlockState()['4']).toBeDefined());
    await vi.waitFor(() => expect(api!.getCacheBlockState()['0']).toBeUndefined());

    // Block 0 re-materialises row 0 selected: the working copy was purged
    // with the block, and hydration re-resolves from the spec.
    goToPage(0);
    await vi.waitFor(() => expect(api!.getRowNode('0')?.isSelected()).toBe(true));
  });

  it('promotes leaf selections under a group to the group route (R5)', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideSelectionModule]);
    const rows: ProviderRow[] = [
      { id: 'north-1', route: ['North'] },
      { id: 'north-2', route: ['North'] },
      { id: 'south-1', route: ['South'] },
    ];
    const { provider, ops } = createMemoryProvider(rows);
    element = document.createElement('div');
    element.style.height = '200px';
    document.body.appendChild(element);
    const service = new Promise<SsrmSelectionService>((resolve) => {
      api = createGrid(element, {
        rowModelType: 'serverSide',
        rowSelection: { mode: 'multiRow', selectAll: 'currentPage' },
        columnDefs: [{ field: 'desk', rowGroup: true }, { field: 'name' }],
        getRowId: (params) => params.data.id,
        serverSideDatasource: {
          getRows(params) {
            if (params.request.groupKeys.length === 0) {
              params.success({
                rowData: [{ desk: 'North' }, { desk: 'South' }],
                rowCount: 2,
              });
            } else {
              const key = params.request.groupKeys[0];
              const desk =
                typeof key === 'string' ? key : (key as { field?: string } | undefined)?.field;
              const groupRows = rows.filter((row) => row.route?.[0] === desk);
              params.success({
                rowData: groupRows.map((row) => ({ id: row.id, desk, name: row.id })),
                rowCount: groupRows.length,
              });
            }
          },
        },
        ssrmSelection: { provider, tabId: 'tab-a', opDebounceMillis: 5, onReady: resolve },
      });
    });
    await service;

    // Expand the first group (North), then select a leaf inside it.
    await vi.waitFor(() => expect(api!.getDisplayedRowCount()).toBe(2));
    const north = api!.getDisplayedRowAtIndex(0) as RowNode;
    north.setExpanded(true);
    await vi.waitFor(() => expect(api!.getRowNode('north-1')).not.toBeNull());

    api!.setNodesSelected({ nodes: [node('north-1')], newValue: true, source: 'rowClicked' });
    await vi.waitFor(() => expect(ops).toEqual([{ op: 'selectGroup', route: ['North'] }]));
  });

  it('warns when a column sets checkboxSelection alongside the row checkbox', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ServerSideSelectionModule]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rows: ProviderRow[] = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
    const { provider } = createMemoryProvider(rows);
    element = document.createElement('div');
    element.style.height = '200px';
    document.body.appendChild(element);
    api = createGrid(element, {
      rowModelType: 'serverSide',
      rowSelection: { mode: 'multiRow', selectAll: 'currentPage' },
      columnDefs: [{ field: 'name', checkboxSelection: true }],
      getRowId: (params) => params.data.id,
      serverSideDatasource: flatDatasource(),
      ssrmSelection: { provider, tabId: 'tab-a', opDebounceMillis: 5 },
    });
    // The row-selection API already renders the row checkbox; a column-level
    // `checkboxSelection` would be a redundant second control for the same
    // selection, so the service warns on boot.
    await vi.waitFor(() =>
      expect(
        warn.mock.calls.some((args) => String(args[0]).includes('redundant second')),
      ).toBe(true),
    );
    warn.mockRestore();
  });
});
