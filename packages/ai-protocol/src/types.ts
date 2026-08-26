export const AI_PROTOCOL = 'libregrid.ai/v1' as const;

export const GRID_FEATURES = [
  'aggregation',
  'filter',
  'sort',
  'pivot',
  'columnVisibility',
  'columnSizing',
  'rowGroup',
] as const;

export type GridFeature = typeof GRID_FEATURES[number];

export const GRID_STATE_KEYS = [
  'aggregation',
  'columnGroup',
  'columnOrder',
  'columnPinning',
  'columnSizing',
  'columnVisibility',
  'columnHeaderName',
  'filter',
  'focusedCell',
  'pagination',
  'rowPinning',
  'pivot',
  'cellSelection',
  'rowGroup',
  'rowGroupExpansion',
  'ssrmRowGroupExpansion',
  'rowSelection',
  'scroll',
  'sideBar',
  'sort',
  'showValuesAs',
  'userColumns',
] as const;

export type GridStateKey = typeof GRID_STATE_KEYS[number];
export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export type JsonSchema = Record<string, unknown>;

export interface GridCommandContext {
  currentPage?: number;
  density?: string;
  pageSize?: number;
  totalRecordCount?: number;
  facts?: JsonObject;
}

export interface GridCommandRequest {
  protocol: typeof AI_PROTOCOL;
  requestId: string;
  revision: string;
  command: string;
  gridSchema: JsonSchema;
  currentState: JsonObject;
  context: GridCommandContext;
}

export interface ProviderGridOutput {
  gridState: JsonObject;
  propertiesToIgnore: GridStateKey[];
  explanation: string;
}

export interface ProviderMetadata {
  service: string;
  model: string;
  providerRequestId: string | null;
  latencyMs: number;
}

export interface GridCommandSuccess {
  protocol: typeof AI_PROTOCOL;
  requestId: string;
  revision: string;
  status: 'ok';
  output: ProviderGridOutput;
  provider: ProviderMetadata;
}

export type GridCommandErrorCode =
  | 'BAD_REQUEST'
  | 'MODEL_REFUSAL'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'INVALID_PROVIDER_OUTPUT'
  | 'INTERNAL_ERROR';

export interface GridCommandFailure {
  protocol: typeof AI_PROTOCOL;
  requestId: string;
  revision: string;
  status: 'error';
  error: {
    code: GridCommandErrorCode;
    message: string;
    retryable: boolean;
  };
}

export type GridCommandResponse = GridCommandSuccess | GridCommandFailure;

export interface ProviderPrompt {
  system: string;
  user: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };
