import { describe, expect, it, vi } from 'vitest';
import type { GridApi, GridState } from 'ag-grid-community';
import { AI_PROTOCOL, type GridCommandRequest } from '@libregrid/ai-protocol';
import { createGridAssistant, GridAssistantError } from './assistant';
import { createHttpGridCommandTransport, GridCommandTransportError } from './transport';

const gridSchema = {
  type: 'object',
  properties: {
    sort: {
      type: ['object', 'null'],
      properties: {
        sortModel: {
          type: 'array',
          items: {
            type: 'object',
            properties: { colId: { const: 'sales' }, sort: { enum: ['asc', 'desc'] } },
            required: ['colId', 'sort'],
            additionalProperties: false,
          },
        },
      },
      required: ['sortModel'],
      additionalProperties: false,
    },
    columnVisibility: {
      type: ['object', 'null'],
      properties: { hiddenColIds: { type: 'array', items: { enum: ['sales', 'notes'] } } },
      required: ['hiddenColIds'],
      additionalProperties: false,
    },
  },
  required: ['sort', 'columnVisibility'],
  additionalProperties: false,
};

function harness() {
  let state: GridState = {
    sort: { sortModel: [] },
    columnVisibility: { hiddenColIds: [] },
    pagination: { page: 2, pageSize: 50 },
  };
  const setState = vi.fn();
  const api = {
    getDisplayedRowCount: () => 800,
    getState: () => structuredClone(state),
    getStructuredSchema: () => structuredClone(gridSchema),
    setState,
  } as unknown as GridApi;
  return { api, setState, mutate(next: GridState) { state = next; } };
}

function success(request: GridCommandRequest): unknown {
  return {
    protocol: AI_PROTOCOL,
    requestId: request.requestId,
    revision: request.revision,
    status: 'ok',
    output: {
      gridState: {
        sort: { sortModel: [{ colId: 'sales', sort: 'desc' }] },
        columnVisibility: null,
      },
      propertiesToIgnore: ['columnVisibility'],
      explanation: 'Sort sales from highest to lowest.',
    },
    provider: { service: 'mock', model: 'deterministic', providerRequestId: null, latencyMs: 1 },
  };
}

describe('createGridAssistant', () => {
  it('captures the full state and runtime context in a versioned request', () => {
    const { api } = harness();
    const assistant = createGridAssistant({
      api,
      requestId: () => 'fixed-id',
      transport: { send: async () => ({}) },
      context: { density: 'compact' },
    });
    const request = assistant.prepare('sort sales highest first');
    expect(request.protocol).toBe(AI_PROTOCOL);
    expect(request.requestId).toBe('fixed-id');
    expect(request.currentState.pagination).toEqual({ page: 2, pageSize: 50 });
    expect(request.context).toEqual({ currentPage: 2, pageSize: 50, totalRecordCount: 800, density: 'compact' });
  });

  it('returns a dry-run diff and applies only non-ignored advertised state', async () => {
    const { api, setState } = harness();
    const assistant = createGridAssistant({ api, transport: { send: async (request) => success(request) } });
    const proposal = await assistant.run('sort sales highest first');
    expect(setState).not.toHaveBeenCalled();
    expect(proposal.changes).toEqual([{
      feature: 'sort',
      before: { sortModel: [] },
      after: { sortModel: [{ colId: 'sales', sort: 'desc' }] },
    }]);
    const result = proposal.apply();
    expect(result.applied).toBe(true);
    expect(setState).toHaveBeenCalledOnce();
    const [applied, ignored] = setState.mock.calls[0] as [GridState, string[]];
    expect(applied).toEqual({ sort: { sortModel: [{ colId: 'sales', sort: 'desc' }] } });
    expect(ignored).toContain('filter');
    expect(ignored).toContain('columnVisibility');
    expect(ignored).not.toContain('sort');
  });

  it('refuses to apply after any schema/state revision change', async () => {
    const { api, mutate } = harness();
    const assistant = createGridAssistant({ api, transport: { send: async (request) => success(request) } });
    const proposal = await assistant.run('sort sales highest first');
    mutate({ sort: { sortModel: [{ colId: 'sales', sort: 'asc' }] } });
    expect(proposal.isStale()).toBe(true);
    expect(() => proposal.apply()).toThrowError(GridAssistantError);
    expect(() => proposal.apply()).toThrowError(/grid changed/);
  });

  it('preserves nested state keys that are intentionally absent from the model schema', async () => {
    const filterSchema = {
      type: 'object',
      properties: {
        filter: {
          type: ['object', 'null'],
          properties: {
            filterModel: { type: 'object', properties: {}, required: [], additionalProperties: false },
            advancedFilterModel: { type: 'null' },
          },
          required: ['filterModel', 'advancedFilterModel'],
          additionalProperties: false,
        },
      },
      required: ['filter'],
      additionalProperties: false,
    };
    const setState = vi.fn();
    const current = {
      filter: {
        filterModel: {},
        columnFilterState: { sales: { expanded: true } },
        selectableFilters: { sales: 1 },
      },
    } as unknown as GridState;
    const api = {
      getDisplayedRowCount: () => 1,
      getState: () => structuredClone(current),
      getStructuredSchema: () => structuredClone(filterSchema),
      setState,
    } as unknown as GridApi;
    const assistant = createGridAssistant({
      api,
      transport: {
        send: async (request) => ({
          protocol: AI_PROTOCOL,
          requestId: request.requestId,
          revision: request.revision,
          status: 'ok',
          output: {
            gridState: { filter: { filterModel: {}, advancedFilterModel: null } },
            propertiesToIgnore: [],
            explanation: 'Clear active predicates while preserving filter UI state.',
          },
          provider: { service: 'mock', model: 'mock', providerRequestId: null, latencyMs: 0 },
        }),
      },
    });
    (await assistant.run('clear filters')).apply();
    expect(setState).toHaveBeenCalledWith({
      filter: {
        filterModel: {},
        advancedFilterModel: null,
        columnFilterState: { sales: { expanded: true } },
        selectableFilters: { sales: 1 },
      },
    }, expect.any(Array));
  });

  it('rejects malformed or cross-request gateway responses before creating a proposal', async () => {
    const { api } = harness();
    const assistant = createGridAssistant({ api, transport: { send: async (request) => ({ ...success(request) as object, requestId: 'wrong' }) } });
    await expect(assistant.run('sort sales')).rejects.toMatchObject({ code: 'INVALID_GATEWAY_RESPONSE' });
  });

  it('surfaces typed gateway failures without touching the grid', async () => {
    const { api, setState } = harness();
    const assistant = createGridAssistant({
      api,
      transport: {
        send: async (request) => ({
          protocol: AI_PROTOCOL,
          requestId: request.requestId,
          revision: request.revision,
          status: 'error',
          error: { code: 'RATE_LIMITED', message: 'try later', retryable: true },
        }),
      },
    });
    await expect(assistant.execute('sort sales')).rejects.toMatchObject({ code: 'GATEWAY_REJECTED' });
    expect(setState).not.toHaveBeenCalled();
  });
});

describe('HTTP transport', () => {
  it('posts JSON to the stable same-origin endpoint', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    const transport = createHttpGridCommandTransport({ fetch });
    const request = { protocol: AI_PROTOCOL } as GridCommandRequest;
    await expect(transport.send(request)).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith('/v1/grid-command', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify(request),
    }));
  });

  it('reports non-JSON responses as transport errors', async () => {
    const transport = createHttpGridCommandTransport({
      fetch: async () => new Response('upstream exploded', { status: 502 }),
    });
    await expect(transport.send({} as GridCommandRequest)).rejects.toBeInstanceOf(GridCommandTransportError);
  });
});
