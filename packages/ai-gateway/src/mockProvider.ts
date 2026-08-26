import type { GridStateKey, JsonObject, JsonSchema, ProviderGridOutput } from '@libregrid/ai-protocol';
import { GRID_STATE_KEYS } from '@libregrid/ai-protocol';
import type { GridModelProvider, ModelProviderRequest } from './provider';

export interface MockProviderOptions {
  model?: string;
  resolve?: (request: ModelProviderRequest) => ProviderGridOutput | Promise<ProviderGridOutput>;
}

function ignoredOutput(schema: JsonSchema): ProviderGridOutput {
  const gridStateSchema = (schema.properties as Record<string, unknown> | undefined)?.gridState;
  const features = gridStateSchema && typeof gridStateSchema === 'object' && !Array.isArray(gridStateSchema)
    ? Object.keys(((gridStateSchema as Record<string, unknown>).properties as Record<string, unknown> | undefined) ?? {})
    : [];
  const gridState: JsonObject = {};
  const ignored: GridStateKey[] = [];
  for (const key of features) {
    gridState[key] = null;
    if (GRID_STATE_KEYS.includes(key as GridStateKey)) ignored.push(key as GridStateKey);
  }
  return { gridState, propertiesToIgnore: ignored, explanation: 'Deterministic mock preserved the current grid state.' };
}

export function createMockProvider(options: MockProviderOptions = {}): GridModelProvider {
  return {
    service: 'libregrid-mock',
    model: options.model ?? 'deterministic-v1',
    async complete(request) {
      return {
        output: options.resolve ? await options.resolve(request) : ignoredOutput(request.outputSchema),
        providerRequestId: null,
      };
    },
  };
}
