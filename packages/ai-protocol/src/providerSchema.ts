import {
  GRID_FEATURES,
  GRID_STATE_KEYS,
  type GridCommandRequest,
  type JsonSchema,
  type ProviderPrompt,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

/**
 * Wraps the grid's dynamic state schema in the stable provider-output
 * envelope. Grid `$defs` are hoisted so local `#/$defs/...` references keep
 * resolving after composition.
 */
export function buildProviderOutputSchema(gridSchema: JsonSchema): JsonSchema {
  if (gridSchema.type !== 'object' || !isRecord(gridSchema.properties)) {
    throw new Error('ai-protocol: gridSchema must be a root object schema');
  }
  const { $defs, ...gridState } = gridSchema;
  const includedFeatures = Object.keys(gridSchema.properties)
    .filter((key) => GRID_STATE_KEYS.includes(key as typeof GRID_STATE_KEYS[number]));
  const ignoreItems = includedFeatures.length > 0
    ? { type: 'string', enum: includedFeatures }
    : { type: 'string' };
  const result: JsonSchema = {
    type: 'object',
    properties: {
      gridState,
      propertiesToIgnore: {
        type: 'array',
        items: ignoreItems,
        maxItems: includedFeatures.length,
        description: 'GridState keys that must remain untouched. Include every nullable gridState feature returned as null.',
      },
      explanation: {
        type: 'string',
        maxLength: 2000,
        description: 'A short user-facing explanation of the proposed grid changes.',
      },
    },
    required: ['gridState', 'propertiesToIgnore', 'explanation'],
    additionalProperties: false,
  };
  if (isRecord($defs) && Object.keys($defs).length > 0) result.$defs = $defs;
  return result;
}

export function buildProviderPrompt(request: GridCommandRequest): ProviderPrompt {
  const applicable = isRecord(request.gridSchema.properties)
    ? Object.keys(request.gridSchema.properties).filter((key) => GRID_FEATURES.includes(key as typeof GRID_FEATURES[number]))
    : [];
  return {
    system: [
      'You translate one natural-language command into AG Grid state.',
      'Use only column ids and capabilities allowed by the supplied strict output schema.',
      'Preserve current state unless the command asks to change it.',
      'For every applicable feature not changed by the command, return null and include that feature in propertiesToIgnore.',
      'Never invent row values, columns, operators, aggregation functions, or unsupported state.',
      'If the command is impossible or ambiguous, preserve every feature and explain why.',
    ].join(' '),
    user: JSON.stringify({
      command: request.command,
      applicableFeatures: applicable,
      currentState: request.currentState,
      context: request.context,
    }),
  };
}
