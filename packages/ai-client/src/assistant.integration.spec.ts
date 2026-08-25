/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { AllCommunityModule, ModuleRegistry, createGrid, type GridApi } from 'ag-grid-community';
import { AiToolkitModule } from '@libregrid/ai-toolkit';
import { AI_PROTOCOL, type GridFeature, type GridStateKey, type JsonObject } from '@libregrid/ai-protocol';
import { createGridAssistant } from './assistant';

ModuleRegistry.registerModules([AllCommunityModule, AiToolkitModule]);

let api: GridApi | undefined;

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

describe('GridAssistant live-grid application', () => {
  it('changes one advertised feature while preserving ignored and unrelated state', async () => {
    const host = document.createElement('div');
    host.style.width = '800px';
    host.style.height = '400px';
    document.body.append(host);
    api = createGrid(host, {
      columnDefs: [
        { field: 'sales', sortable: true },
        { field: 'internalNotes', sortable: true },
      ],
      rowData: [{ sales: 20, internalNotes: 'a' }, { sales: 10, internalNotes: 'b' }],
      pagination: true,
      paginationPageSize: 1,
    });
    api.applyColumnState({ state: [{ colId: 'sales', sort: 'desc' }] });
    api.paginationGoToPage(1);

    const before = api.getState();
    const assistant = createGridAssistant({
      api,
      transport: {
        send: async (request) => {
          const properties = request.gridSchema.properties as Record<string, unknown>;
          const features = Object.keys(properties) as GridFeature[];
          const gridState: JsonObject = Object.fromEntries(features.map((feature) => [feature, null]));
          gridState.columnVisibility = { hiddenColIds: ['internalNotes'] };
          const ignored = features.filter((feature): feature is GridStateKey => feature !== 'columnVisibility');
          return {
            protocol: AI_PROTOCOL,
            requestId: request.requestId,
            revision: request.revision,
            status: 'ok',
            output: { gridState, propertiesToIgnore: ignored, explanation: 'Hide internal notes.' },
            provider: { service: 'integration-mock', model: 'deterministic', providerRequestId: null, latencyMs: 0 },
          };
        },
      },
    });

    const proposal = await assistant.run('Hide internal notes');
    expect(api.getColumn('internalNotes')?.isVisible()).toBe(true);
    proposal.apply();

    const after = api.getState();
    expect(api.getColumn('internalNotes')?.isVisible()).toBe(false);
    expect(after.sort).toEqual(before.sort);
    expect(after.pagination).toEqual(before.pagination);
    expect(after.columnOrder).toEqual(before.columnOrder);
  });
});
