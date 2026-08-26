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
  type JsonObject,
  type JsonSchema,
} from '@libregrid/ai-protocol';
import { createGridCommandHandler } from './gateway';
import { createOpenAiChatCompletionsProvider } from './openAiChatCompletionsProvider';

ModuleRegistry.registerModules([
  AllCommunityModule,
  AdvancedFilterModule,
  AiToolkitModule,
  RowGroupingModule,
  PivotModule,
  SetFilterModule,
]);

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

const live = process.env.OPENROUTER_API_KEY ? it : it.skip;

const COMMANDS = [
  'Show hardware sales over $5,000',
  'Sort the sales amount from highest to lowest',
  'Group the rows by sales region',
  'Pivot product category across sales region',
  'Total the sales amount',
  'Hide the sales rep column',
  'Size the columns to fit their content',
  'Clear every filter',
  'Leave the grid exactly as it is',
  'Order me a pizza',
  'Show sales in North America over $1,000 that closed after March 2026',
];

function handler() {
  return createGridCommandHandler({
    provider: createOpenAiChatCompletionsProvider({
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      model: process.env.OPENROUTER_MODEL ?? 'openrouter/free',
      baseUrl: 'https://openrouter.ai/api/v1',
      requireParameters: true,
      referer: 'https://libregrid.dev',
      title: 'LibreGrid conformance',
    }),
    timeoutMs: 60_000,
  });
}

function request(command: string, captured: { currentState: JsonObject; gridSchema: JsonSchema }): GridCommandRequest {
  return {
    protocol: AI_PROTOCOL,
    requestId: `openrouter-${command.slice(0, 12)}`,
    revision: revisionFor({ gridSchema: captured.gridSchema, currentState: captured.currentState }),
    command,
    gridSchema: captured.gridSchema,
    currentState: captured.currentState,
    context: {},
  };
}

for (const command of COMMANDS) {
  live(`holds the schema for: ${command}`, { timeout: 90_000 }, async () => {
    const captured = captureGrid({ advanced: command.includes('closed after') });
    const response = await handler()(new Request('http://localhost/v1/grid-command', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request(command, captured)),
    }));
    const body = (await response.json()) as GridCommandResponse;

    // A refusal for the unsupported intent is a pass. A schema violation is not.
    if (command === 'Order me a pizza') {
      expect(body.status === 'ok' || body.status === 'error').toBe(true);
      return;
    }
    if (body.status !== 'ok') {
      throw new Error(`${command} -> ${body.error.code}: ${body.error.message}`);
    }
    expect(body.status).toBe('ok');
  });
}
