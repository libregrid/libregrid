// Browser-only mock: four fixed commands, no AI service, persistence or authorisation.
// In production, replace transport with endpoint: '/api/grid-command' in createGridAssistant.
// That server authenticates requests, authorises fields and holds provider credentials.
import type { GridCommandTransport } from '@libregrid/ai-client';
import {
  AI_PROTOCOL,
  type GridCommandRequest,
  type GridCommandSuccess,
  type GridFeature,
  type GridStateKey,
  type JsonObject,
} from '@libregrid/ai-protocol';
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
function schemaProperties(schema: unknown): Record<string, unknown> {
  return isRecord(schema) && isRecord(schema.properties) ? schema.properties : {};
}
function featureNames(request: GridCommandRequest): GridFeature[] {
  const allowed = new Set<GridFeature>([
    'aggregation',
    'filter',
    'sort',
    'pivot',
    'columnVisibility',
    'columnSizing',
    'rowGroup',
  ]);
  return Object.keys(schemaProperties(request.gridSchema)).filter((key): key is GridFeature =>
    allowed.has(key as GridFeature),
  );
}
function filterColumnIds(request: GridCommandRequest): string[] {
  const filterFeature = schemaProperties(request.gridSchema).filter;
  const filterModel = schemaProperties(filterFeature).filterModel;
  return Object.keys(schemaProperties(filterModel));
}
function deterministicOutput(request: GridCommandRequest): GridCommandSuccess {
  const features = featureNames(request);
  const gridState: JsonObject = Object.fromEntries(features.map((feature) => [feature, null]));
  const ignored = new Set<GridStateKey>(features);
  const command = request.command.toLowerCase();
  let explanation =
    'The demo provider did not match a fixture, so it preserved every grid feature.';
  const applyFeature = (feature: GridFeature, value: JsonObject): void => {
    if (!features.includes(feature)) return;
    gridState[feature] = value;
    ignored.delete(feature);
  };

  if (command.includes('over $5,000') || command.includes('over 5000')) {
    const filterModel: JsonObject = Object.fromEntries(
      filterColumnIds(request).map((colId) => [colId, null]),
    );
    filterModel.amountUsd = {
      filterType: 'number',
      type: 'greaterThan',
      filter: 5000,
      filterTo: null,
    };
    filterModel.region = { filterType: 'set', values: ['North America'] };
    filterModel.category = { filterType: 'set', values: ['Hardware'] };
    applyFeature('filter', { filterModel, advancedFilterModel: null });
    explanation = 'Filter sales above $5,000 to North America and the Hardware category.';
  } else if (command.includes('highest first') || command.includes('descending')) {
    applyFeature('sort', { sortModel: [{ colId: 'amountUsd', sort: 'desc', type: 'default' }] });
    explanation = 'Sort Sales amount from highest to lowest.';
  } else if (command.includes('hide') && command.includes('sales rep')) {
    applyFeature('columnVisibility', { hiddenColIds: ['salesRep'] });
    explanation = 'Hide the Sales rep column.';
  } else if (command.includes('group by region')) {
    applyFeature('rowGroup', { groupColIds: ['region'] });
    applyFeature('aggregation', { aggregationModel: [{ colId: 'amountUsd', aggFunc: 'sum' }] });
    explanation = 'Group rows by Region and sum Sales amount.';
  }

  return {
    protocol: AI_PROTOCOL,
    requestId: request.requestId,
    revision: request.revision,
    status: 'ok',
    output: {
      gridState,
      propertiesToIgnore: [...ignored],
      explanation,
    },
    provider: {
      service: 'docs-contract-mock',
      model: 'deterministic-v1',
      providerRequestId: null,
      latencyMs: 0,
    },
  };
}
export const mockTransport: GridCommandTransport = {
  async send(request) {
    return deterministicOutput(request);
  },
};
