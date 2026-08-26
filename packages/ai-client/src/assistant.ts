import type { GridApi, GridState, GridStateKey, StructuredSchemaParams } from 'ag-grid-community';
import {
  AI_PROTOCOL,
  GRID_STATE_KEYS,
  revisionFor,
  validateGridCommandRequest,
  validateGridCommandResponse,
  type GridCommandContext,
  type GridCommandFailure,
  type GridCommandRequest,
  type GridCommandSuccess,
  type JsonObject,
  type JsonSchema,
  type JsonValue,
} from '@libregrid/ai-protocol';
import { createHttpGridCommandTransport, type GridCommandTransport, type HttpGridCommandTransportOptions } from './transport';

export type GridAssistantErrorCode =
  | 'INVALID_COMMAND'
  | 'INVALID_GRID_SCHEMA'
  | 'INVALID_GATEWAY_RESPONSE'
  | 'GATEWAY_REJECTED'
  | 'STALE_GRID';

export class GridAssistantError extends Error {
  constructor(
    readonly code: GridAssistantErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'GridAssistantError';
  }
}

export interface GridAssistantOptions extends HttpGridCommandTransportOptions {
  api: GridApi;
  transport?: GridCommandTransport;
  schema?: StructuredSchemaParams;
  context?: GridCommandContext | (() => GridCommandContext);
  requestId?: () => string;
}

export interface GridStateChange {
  feature: GridStateKey;
  before: JsonValue | undefined;
  after: JsonValue;
}

export interface GridApplyResult {
  applied: true;
  ignored: GridStateKey[];
  changes: GridStateChange[];
}

export interface GridCommandProposal {
  readonly request: GridCommandRequest;
  readonly response: GridCommandSuccess;
  readonly changes: GridStateChange[];
  apply(): GridApplyResult;
  isStale(): boolean;
}

export interface GridAssistant {
  prepare(command: string): GridCommandRequest;
  run(command: string, options?: { signal?: AbortSignal }): Promise<GridCommandProposal>;
  execute(command: string, options?: { signal?: AbortSignal }): Promise<GridApplyResult>;
}

let requestSequence = 0;

function defaultRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  requestSequence += 1;
  return `libregrid-${Date.now().toString(36)}-${requestSequence.toString(36)}`;
}

function jsonCloneObject(value: unknown, label: string): JsonObject {
  try {
    const json = JSON.stringify(value);
    const result = JSON.parse(json) as unknown;
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error(`${label} is not an object`);
    return result as JsonObject;
  } catch (cause) {
    throw new GridAssistantError('INVALID_GRID_SCHEMA', `ai-client: ${label} is not JSON serializable`, cause);
  }
}

function contextFor(api: GridApi, configured: GridAssistantOptions['context']): GridCommandContext {
  const supplied = typeof configured === 'function' ? configured() : configured;
  const state = api.getState();
  const pagination = state.pagination;
  const defaults: GridCommandContext = { totalRecordCount: api.getDisplayedRowCount() };
  if (pagination?.page !== undefined) defaults.currentPage = pagination.page;
  if (pagination?.pageSize !== undefined) defaults.pageSize = pagination.pageSize;
  return { ...defaults, ...supplied };
}

function snapshot(api: GridApi, schemaParams: StructuredSchemaParams | undefined, context: GridCommandContext): {
  gridSchema: JsonSchema;
  currentState: JsonObject;
  revision: string;
} {
  const gridSchema = jsonCloneObject(api.getStructuredSchema(schemaParams), 'grid schema') as JsonSchema;
  const currentState = jsonCloneObject(api.getState(), 'grid state');
  const revision = revisionFor({ gridSchema: gridSchema as JsonValue, currentState, context: context as JsonValue });
  return { gridSchema, currentState, revision };
}

function includedFeatures(schema: JsonSchema): GridStateKey[] {
  const properties = schema.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return [];
  return GRID_STATE_KEYS.filter((key) => key in properties);
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

/** Preserve nested state keys that the generated schema deliberately does not expose. */
function stateFeatureForApply(before: JsonValue | undefined, after: JsonValue): JsonValue {
  return isJsonObject(before) && isJsonObject(after) ? { ...before, ...after } : after;
}

function proposalChanges(request: GridCommandRequest, response: GridCommandSuccess): GridStateChange[] {
  const ignored = new Set(response.output.propertiesToIgnore);
  return includedFeatures(request.gridSchema)
    .filter((feature) => !ignored.has(feature))
    .map((feature) => ({
      feature,
      before: request.currentState[feature],
      after: response.output.gridState[feature] ?? null,
    }));
}

function failureMessage(failure: GridCommandFailure): string {
  return `${failure.error.code}: ${failure.error.message}`;
}

export function createGridAssistant(options: GridAssistantOptions): GridAssistant {
  const transport = options.transport ?? createHttpGridCommandTransport(options);
  const makeRequest = options.requestId ?? defaultRequestId;

  function prepare(command: string): GridCommandRequest {
    if (typeof command !== 'string' || command.trim() === '') {
      throw new GridAssistantError('INVALID_COMMAND', 'ai-client: command must be a non-empty string');
    }
    const context = contextFor(options.api, options.context);
    const captured = snapshot(options.api, options.schema, context);
    const request: GridCommandRequest = {
      protocol: AI_PROTOCOL,
      requestId: makeRequest(),
      revision: captured.revision,
      command: command.trim(),
      gridSchema: captured.gridSchema,
      currentState: captured.currentState,
      context,
    };
    const validation = validateGridCommandRequest(request);
    if (!validation.ok) throw new GridAssistantError('INVALID_GRID_SCHEMA', 'ai-client: generated request is invalid', validation.issues);
    return request;
  }

  function currentRevision(request: GridCommandRequest): string {
    return snapshot(options.api, options.schema, request.context).revision;
  }

  async function run(command: string, runOptions: { signal?: AbortSignal } = {}): Promise<GridCommandProposal> {
    const request = prepare(command);
    const rawResponse = await transport.send(request, runOptions.signal);
    const validation = validateGridCommandResponse(request, rawResponse);
    if (!validation.ok) {
      throw new GridAssistantError('INVALID_GATEWAY_RESPONSE', 'ai-client: gateway response failed protocol validation', validation.issues);
    }
    if (validation.value.status === 'error') {
      throw new GridAssistantError('GATEWAY_REJECTED', failureMessage(validation.value), validation.value.error);
    }
    const response = validation.value;
    const changes = proposalChanges(request, response);
    const isStale = (): boolean => currentRevision(request) !== request.revision;
    return {
      request,
      response,
      changes,
      isStale,
      apply(): GridApplyResult {
        if (isStale()) throw new GridAssistantError('STALE_GRID', 'ai-client: the grid changed while the command was running');
        const included = new Set(includedFeatures(request.gridSchema));
        const ignored = new Set<GridStateKey>(response.output.propertiesToIgnore);
        for (const key of GRID_STATE_KEYS) if (!included.has(key)) ignored.add(key);
        const state: Record<string, JsonValue> = {};
        for (const [key, value] of Object.entries(response.output.gridState)) {
          if (value !== null && !ignored.has(key as GridStateKey)) {
            state[key] = stateFeatureForApply(request.currentState[key], value);
          }
        }
        const orderedIgnored = GRID_STATE_KEYS.filter((key) => ignored.has(key));
        options.api.setState(state as GridState, orderedIgnored as GridStateKey[]);
        return { applied: true, ignored: orderedIgnored, changes };
      },
    };
  }

  return {
    prepare,
    run,
    async execute(command, runOptions) {
      return (await run(command, runOptions)).apply();
    },
  };
}
