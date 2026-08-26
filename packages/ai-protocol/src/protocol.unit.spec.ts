import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  AI_PROTOCOL,
  buildProviderOutputSchema,
  buildProviderPrompt,
  revisionFor,
  validateGridCommandRequest,
  validateGridCommandResponse,
  validateJsonSchemaInstance,
  validateProviderGridOutput,
  type GridCommandRequest,
  type JsonSchema,
} from './index';

const gridSchema: JsonSchema = {
  type: 'object',
  properties: {
    filter: {
      anyOf: [
        {
          type: 'object',
          properties: {
            filterModel: { $ref: '#/$defs/filterModel' },
            advancedFilterModel: { const: null },
          },
          required: ['filterModel', 'advancedFilterModel'],
          additionalProperties: false,
        },
        { const: null },
      ],
    },
    sort: {
      type: ['object', 'null'],
      properties: {
        sortModel: {
          type: 'array',
          items: {
            type: 'object',
            properties: { colId: { const: 'revenue' }, sort: { enum: ['asc', 'desc'] } },
            required: ['colId', 'sort'],
            additionalProperties: false,
          },
        },
      },
      required: ['sortModel'],
      additionalProperties: false,
    },
  },
  required: ['filter', 'sort'],
  additionalProperties: false,
  $defs: {
    filterModel: {
      type: 'object',
      properties: { revenue: { type: ['number', 'null'] } },
      required: ['revenue'],
      additionalProperties: false,
    },
  },
};

function request(): GridCommandRequest {
  const currentState = { filter: { filterModel: {} }, sort: { sortModel: [] } };
  return {
    protocol: AI_PROTOCOL,
    requestId: 'request-123',
    revision: revisionFor({ gridSchema: gridSchema as never, currentState }),
    command: 'Show revenue over 5000 and sort highest first',
    gridSchema,
    currentState,
    context: { totalRecordCount: 1_000 },
  };
}

describe('provider schema composition', () => {
  it('hoists dynamic definitions to the envelope root and stays strict', () => {
    const result = buildProviderOutputSchema(gridSchema);
    expect(result.$defs).toEqual(gridSchema.$defs);
    expect((result.properties as Record<string, unknown>).gridState).not.toHaveProperty('$defs');
    expect(result.required).toEqual(['gridState', 'propertiesToIgnore', 'explanation']);
    expect(result.additionalProperties).toBe(false);
  });

  it('gives an empty grid a zero-length ignore array without an empty enum', () => {
    const result = buildProviderOutputSchema({
      type: 'object', properties: {}, required: [], additionalProperties: false,
    });
    const ignore = ((result.properties as Record<string, unknown>).propertiesToIgnore as Record<string, unknown>);
    expect(ignore.maxItems).toBe(0);
    expect(ignore.items).not.toHaveProperty('enum');
  });

  it('builds a provider-neutral prompt without credentials or a model name', () => {
    const prompt = buildProviderPrompt(request());
    expect(prompt.system).toContain('Preserve current state');
    expect(prompt.user).toContain('Show revenue over 5000');
    expect(prompt.user).not.toMatch(/api.?key|gpt-|claude/i);
  });
});

describe('runtime validation', () => {
  it('keeps the language-neutral JSON conformance fixtures executable', () => {
    const fixture = (name: string): unknown => JSON.parse(readFileSync(
      new URL(`../fixtures/${name}`, import.meta.url),
      'utf8',
    )) as unknown;
    const fixtureRequest = fixture('grid-command.valid.request.json');
    const validRequest = validateGridCommandRequest(fixtureRequest);
    expect(validRequest.ok).toBe(true);
    if (validRequest.ok) expect(validateGridCommandResponse(
      validRequest.value,
      fixture('grid-command.valid.response.json'),
    ).ok).toBe(true);
  });

  it('accepts the versioned strict request and rejects unsupported schema features', () => {
    expect(validateGridCommandRequest(request()).ok).toBe(true);
    expect(validateGridCommandRequest({
      ...request(),
      gridSchema: {
        ...gridSchema,
        properties: { ...gridSchema.properties as object, pagination: { const: null } },
        required: ['filter', 'sort', 'pagination'],
      },
    }).ok).toBe(false);
  });

  it('validates provider output and automatically ignores null features', () => {
    const result = validateProviderGridOutput(request(), {
      gridState: {
        filter: {
          filterModel: { revenue: 5000 },
          advancedFilterModel: null,
        },
        sort: null,
      },
      propertiesToIgnore: [],
      explanation: 'Filter revenue; leave sorting unchanged.',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.propertiesToIgnore).toContain('sort');
  });

  it('rejects invented columns and malformed operands through the dynamic schema', () => {
    const result = validateProviderGridOutput(request(), {
      gridState: {
        filter: { filterModel: { invented: 12 }, advancedFilterModel: null },
        sort: { sortModel: [{ colId: 'profit', sort: 'sideways' }] },
      },
      propertiesToIgnore: [],
      explanation: 'bad',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.path).toContain('gridState');
  });

  it('rejects a stale or cross-request response envelope', () => {
    const result = validateGridCommandResponse(request(), {
      protocol: AI_PROTOCOL,
      requestId: 'different-request',
      revision: request().revision,
      status: 'error',
      error: { code: 'BAD_REQUEST', message: 'bad request', retryable: false },
    });
    expect(result.ok).toBe(false);
  });

  it('supports recursive local definitions with a depth guard', () => {
    const recursive: JsonSchema = {
      $ref: '#/$defs/node',
      $defs: {
        node: {
          anyOf: [
            { const: null },
            {
              type: 'object',
              properties: { value: { type: 'string' }, next: { $ref: '#/$defs/node' } },
              required: ['value', 'next'],
              additionalProperties: false,
            },
          ],
        },
      },
    };
    expect(validateJsonSchemaInstance(recursive, { value: 'a', next: { value: 'b', next: null } }).ok).toBe(true);
  });
});
