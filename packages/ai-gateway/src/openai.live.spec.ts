/** @vitest-environment jsdom */
import { expect, it } from 'vitest';
import { AllCommunityModule, ModuleRegistry, createGrid } from 'ag-grid-community';
import { AdvancedFilterModule } from '@libregrid/advanced-filter';
import { AiToolkitModule } from '@libregrid/ai-toolkit';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { PivotModule } from '@libregrid/pivot';
import { SetFilterModule } from '@libregrid/set-filter';
import {
  AI_PROTOCOL,
  revisionFor,
  type GridCommandRequest,
  type GridCommandResponse,
  type GridCommandSuccess,
  type JsonObject,
  type JsonSchema,
  type ProviderGridOutput,
} from '@libregrid/ai-protocol';
import { createGridCommandHandler } from './gateway';
import { createOpenAiResponsesProvider } from './openAiResponsesProvider';

ModuleRegistry.registerModules([
  AllCommunityModule,
  AdvancedFilterModule,
  AiToolkitModule,
  RowGroupingModule,
  PivotModule,
  SetFilterModule,
]);

const live = process.env.OPENAI_API_KEY ? it : it.skip;

function captureGrid(options: { advanced?: boolean; seeded?: boolean } = {}): {
  currentState: JsonObject;
  gridSchema: JsonSchema;
} {
  const host = document.createElement('div');
  host.style.width = '800px';
  host.style.height = '400px';
  document.body.append(host);
  const api = createGrid(host, {
    columnDefs: [
      { field: 'order', headerName: 'Sales order', cellDataType: 'text', filter: 'agTextColumnFilter' },
      { field: 'amountUsd', headerName: 'Sales amount (USD)', cellDataType: 'number', filter: 'agNumberColumnFilter', enableValue: true },
      { field: 'region', headerName: 'Sales region', cellDataType: 'text', filter: 'agSetColumnFilter', filterParams: { values: ['North America', 'Europe'] }, enableRowGroup: true, enablePivot: true },
      { field: 'category', headerName: 'Product category', cellDataType: 'text', filter: 'agSetColumnFilter', filterParams: { values: ['Hardware', 'Software License'] }, enableRowGroup: true, enablePivot: true },
    ],
    defaultColDef: { sortable: true, resizable: true },
    enableAdvancedFilter: options.advanced === true,
    rowData: [
      { order: 'SO-1', amountUsd: 7_800, region: 'North America', category: 'Hardware' },
      { order: 'SO-2', amountUsd: 3_100, region: 'North America', category: 'Software License' },
      { order: 'SO-3', amountUsd: 5_450, region: 'Europe', category: 'Hardware' },
    ],
  });

  if (options.seeded) {
    api.setFilterModel({
      amountUsd: { filterType: 'number', type: 'greaterThan', filter: 1_000 },
      region: { filterType: 'set', values: ['Europe'] },
    });
    api.applyColumnState({
      state: [
        { colId: 'amountUsd', sort: 'asc' },
        { colId: 'order', hide: true },
      ],
    });
  }

  const gridSchema = api.getStructuredSchema({
    columns: {
      amountUsd: { description: 'The sales order total in US dollars' },
      region: { description: 'Sales territory', includeSetValues: true },
      category: { description: 'Hardware or Software License', includeSetValues: true },
    },
  }) as JsonSchema;
  const currentState = JSON.parse(JSON.stringify(api.getState())) as JsonObject;
  api.destroy();
  host.remove();
  return { currentState, gridSchema };
}

function expectFeature(output: ProviderGridOutput, feature: string, ...fragments: string[]): void {
  const value = JSON.stringify(output.gridState[feature]);
  expect(value, `Expected ${feature} output in ${JSON.stringify(output)}`).not.toBe('null');
  for (const fragment of fragments) expect(value).toContain(fragment);
}

function expectPreserved(output: ProviderGridOutput): void {
  expect(Object.values(output.gridState).every((value) => value === null)).toBe(true);
  expect(output.propertiesToIgnore.length).toBe(Object.keys(output.gridState).length);
}

it('constructs the synthetic ordinary, seeded, and advanced live-grid fixtures locally', () => {
  const ordinary = captureGrid();
  const seeded = captureGrid({ seeded: true });
  const advanced = captureGrid({ advanced: true });
  expect(JSON.stringify(ordinary.gridSchema)).toContain('amountUsd');
  expect(JSON.stringify(ordinary.gridSchema)).toContain('North America');
  expect(JSON.stringify(seeded.currentState)).toContain('greaterThan');
  expect(JSON.stringify(seeded.currentState)).toContain('Europe');
  expect(JSON.stringify(advanced.gridSchema)).toContain('advancedFilterModel');
});

live('validates the complete LibreGrid contract battery against OpenAI Responses', async () => {
  const ordinary = captureGrid();
  const seeded = captureGrid({ seeded: true });
  const advanced = captureGrid({ advanced: true });
  const provider = createOpenAiResponsesProvider({
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-5.6',
  });
  const handler = createGridCommandHandler({ provider, timeoutMs: 120_000 });

  async function complete(
    requestId: string,
    command: string,
    fixture = ordinary,
  ): Promise<GridCommandSuccess> {
    const context = { totalRecordCount: 120_000, density: 'compact' };
    const request: GridCommandRequest = {
      protocol: AI_PROTOCOL,
      requestId,
      revision: revisionFor({ ...fixture, context }),
      command,
      gridSchema: fixture.gridSchema,
      currentState: fixture.currentState,
      context,
    };
    const response = await handler(new Request('http://localhost/v1/grid-command', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    }));
    const payload = await response.json() as GridCommandResponse;
    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload.status, JSON.stringify(payload)).toBe('ok');
    if (payload.status !== 'ok') throw new Error(JSON.stringify(payload));
    expect(payload.provider).toMatchObject({
      service: 'openai-responses',
      model: process.env.OPENAI_MODEL ?? 'gpt-5.6',
    });
    return payload;
  }

  const compound = await complete(
    'openai-live-compound-filter',
    'Show me all sales over 5000 dollars from North America but only hardware, not software license sales.',
  );
  expectFeature(compound.output, 'filter', 'greaterThan', '5000', 'North America', 'Hardware');

  const sort = await complete('openai-live-sort', 'Sort sales amount from highest to lowest and preserve everything else.');
  expectFeature(sort.output, 'sort', 'amountUsd', 'desc', 'default');

  const aggregation = await complete('openai-live-aggregation', 'Aggregate Sales amount using sum and preserve everything else.');
  expectFeature(aggregation.output, 'aggregation', 'amountUsd', 'sum');

  const pivot = await complete('openai-live-pivot', 'Enable pivot mode and pivot by Sales region. Preserve everything else.');
  expectFeature(pivot.output, 'pivot', 'true', 'region');

  const rowGroup = await complete('openai-live-row-group', 'Group rows by Product category and preserve everything else.');
  expectFeature(rowGroup.output, 'rowGroup', 'category');

  const sizing = await complete('openai-live-column-sizing', 'Set the Sales amount column width to 180 pixels and preserve everything else.');
  expectFeature(sizing.output, 'columnSizing', 'amountUsd', '180');

  const visibility = await complete('openai-live-visibility', 'Hide the Sales order column and preserve everything else.');
  expectFeature(visibility.output, 'columnVisibility', 'order');

  const clear = await complete(
    'openai-live-clear',
    'Clear all filters and sorting, and show every hidden column. Preserve everything else.',
    seeded,
  );
  expectFeature(clear.output, 'filter', 'filterModel');
  expectFeature(clear.output, 'sort', 'sortModel');
  expectFeature(clear.output, 'columnVisibility', 'hiddenColIds');
  expect(JSON.stringify(clear.output.gridState.sort)).toContain('[]');
  expect(JSON.stringify(clear.output.gridState.columnVisibility)).toContain('[]');

  const preserve = await complete('openai-live-preserve', 'Do not change the grid. Leave every current setting exactly as it is.', seeded);
  expectPreserved(preserve.output);

  const unsupported = await complete('openai-live-unsupported', 'Export this grid to PDF and email it to the CFO.');
  expectPreserved(unsupported.output);

  const advancedFilter = await complete(
    'openai-live-advanced-filter',
    'Use an advanced filter for sales amount over 5000 AND region containing North.',
    advanced,
  );
  expectFeature(advancedFilter.output, 'filter', 'advancedFilterModel', 'join', 'AND', 'amountUsd', 'greaterThan', '5000', 'region', 'contains', 'North');
}, 10 * 60_000);
