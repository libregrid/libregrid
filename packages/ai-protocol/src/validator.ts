import {
  AI_PROTOCOL,
  GRID_FEATURES,
  GRID_STATE_KEYS,
  type GridCommandRequest,
  type GridCommandResponse,
  type GridStateKey,
  type JsonObject,
  type JsonSchema,
  type ProviderGridOutput,
  type ValidationIssue,
  type ValidationResult,
} from './types';
import { buildProviderOutputSchema } from './providerSchema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

function unknownKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): ValidationIssue[] {
  const accepted = new Set(allowed);
  return Object.keys(value)
    .filter((key) => !accepted.has(key))
    .map((key) => issue(`${path}.${key}`, 'is not allowed'));
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function resolveReference(root: JsonSchema, reference: string): JsonSchema | undefined {
  if (!reference.startsWith('#/$defs/')) return undefined;
  const name = reference.slice('#/$defs/'.length);
  const definitions = root.$defs;
  if (!isRecord(definitions)) return undefined;
  const target = definitions[name];
  return isRecord(target) ? target : undefined;
}

function matchesType(type: string, value: unknown): boolean {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isRecord(value);
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  return typeof value === type;
}

function validateAt(
  schema: JsonSchema,
  value: unknown,
  root: JsonSchema,
  path: string,
  depth: number,
): ValidationIssue[] {
  if (depth > 64) return [issue(path, 'exceeded maximum validation depth')];
  if (typeof schema.$ref === 'string') {
    const resolved = resolveReference(root, schema.$ref);
    return resolved ? validateAt(resolved, value, root, path, depth + 1) : [issue(path, `unresolved reference ${schema.$ref}`)];
  }
  if (Array.isArray(schema.anyOf)) {
    if (schema.anyOf.some((option) => isRecord(option) && validateAt(option, value, root, path, depth + 1).length === 0)) return [];
    return [issue(path, 'did not match any allowed schema variant')];
  }
  if ('const' in schema && !sameJson(schema.const, value)) return [issue(path, `must equal ${JSON.stringify(schema.const)}`)];
  if (Array.isArray(schema.enum) && !schema.enum.some((allowed) => sameJson(allowed, value))) {
    return [issue(path, 'must be one of the allowed values')];
  }
  const types = typeof schema.type === 'string' ? [schema.type] : Array.isArray(schema.type) ? schema.type : [];
  if (types.length > 0 && !types.some((type) => typeof type === 'string' && matchesType(type, value))) {
    return [issue(path, `must be ${types.join(' or ')}`)];
  }
  if (isRecord(value) && (schema.type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object')))) {
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((key): key is string => typeof key === 'string') : [];
    const issues: ValidationIssue[] = [];
    for (const key of required) if (!(key in value)) issues.push(issue(`${path}.${key}`, 'is required'));
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!(key in properties)) issues.push(issue(`${path}.${key}`, 'is not allowed'));
    }
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (key in value && isRecord(propertySchema)) {
        issues.push(...validateAt(propertySchema, value[key], root, `${path}.${key}`, depth + 1));
      }
    }
    return issues;
  }
  if (Array.isArray(value) && schema.type === 'array') {
    const issues: ValidationIssue[] = [];
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) issues.push(issue(path, `must contain at least ${schema.minItems} items`));
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) issues.push(issue(path, `must contain at most ${schema.maxItems} items`));
    if (isRecord(schema.items)) value.forEach((entry, index) => issues.push(...validateAt(schema.items as JsonSchema, entry, root, `${path}[${index}]`, depth + 1)));
    return issues;
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) return [issue(path, `must be >= ${schema.minimum}`)];
    if (typeof schema.maximum === 'number' && value > schema.maximum) return [issue(path, `must be <= ${schema.maximum}`)];
  }
  if (typeof value === 'string' && typeof schema.pattern === 'string') {
    try {
      if (!new RegExp(schema.pattern).test(value)) return [issue(path, `must match ${schema.pattern}`)];
    } catch {
      return [issue(path, 'schema contains an invalid pattern')];
    }
  }
  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) return [issue(path, `must contain at least ${schema.minLength} characters`)];
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) return [issue(path, `must contain at most ${schema.maxLength} characters`)];
  }
  return [];
}

export function validateJsonSchemaInstance(schema: JsonSchema, value: unknown): ValidationResult<unknown> {
  const issues = validateAt(schema, value, schema, '$', 0);
  return issues.length === 0 ? { ok: true, value } : { ok: false, issues };
}

function inspectStrictSchema(schema: JsonSchema, root: JsonSchema, path: string, seen: Set<JsonSchema>): ValidationIssue[] {
  if (seen.has(schema)) return [];
  seen.add(schema);
  if (typeof schema.$ref === 'string') {
    const resolved = resolveReference(root, schema.$ref);
    return resolved ? inspectStrictSchema(resolved, root, path, seen) : [issue(path, `unresolved or non-local reference ${schema.$ref}`)];
  }
  const issues: ValidationIssue[] = [];
  if (schema.type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object'))) {
    const props = isRecord(schema.properties) ? schema.properties : {};
    if (schema.additionalProperties !== false) issues.push(issue(path, 'object schema must set additionalProperties to false'));
    const required = Array.isArray(schema.required) ? schema.required : [];
    if (!sameJson([...required].sort(), Object.keys(props).sort())) issues.push(issue(path, 'object schema must require every property'));
  }
  for (const key of ['properties', '$defs'] as const) {
    const collection = schema[key];
    if (isRecord(collection)) {
      for (const [name, child] of Object.entries(collection)) if (isRecord(child)) issues.push(...inspectStrictSchema(child, root, `${path}.${key}.${name}`, seen));
    }
  }
  if (isRecord(schema.items)) issues.push(...inspectStrictSchema(schema.items, root, `${path}.items`, seen));
  if (Array.isArray(schema.anyOf)) {
    schema.anyOf.forEach((child, index) => {
      if (isRecord(child)) issues.push(...inspectStrictSchema(child, root, `${path}.anyOf[${index}]`, seen));
    });
  }
  return issues;
}

export function validateGridSchema(schema: unknown): ValidationResult<JsonSchema> {
  if (!isRecord(schema)) return { ok: false, issues: [issue('$.gridSchema', 'must be an object')] };
  const issues: ValidationIssue[] = [];
  if (schema.type !== 'object') issues.push(issue('$.gridSchema.type', 'root must be an object schema'));
  if (!isRecord(schema.properties)) issues.push(issue('$.gridSchema.properties', 'must be an object'));
  else {
    for (const key of Object.keys(schema.properties)) if (!GRID_FEATURES.includes(key as typeof GRID_FEATURES[number])) {
      issues.push(issue(`$.gridSchema.properties.${key}`, 'is not a supported AI grid feature'));
    }
  }
  issues.push(...inspectStrictSchema(schema, schema, '$.gridSchema', new Set()));
  return issues.length === 0 ? { ok: true, value: schema } : { ok: false, issues };
}

export function validateGridCommandRequest(value: unknown): ValidationResult<GridCommandRequest> {
  if (!isRecord(value)) return { ok: false, issues: [issue('$', 'request must be an object')] };
  const issues: ValidationIssue[] = [];
  issues.push(...unknownKeys(value, ['protocol', 'requestId', 'revision', 'command', 'gridSchema', 'currentState', 'context'], '$'));
  if (value.protocol !== AI_PROTOCOL) issues.push(issue('$.protocol', `must equal ${AI_PROTOCOL}`));
  for (const key of ['requestId', 'revision', 'command'] as const) {
    if (typeof value[key] !== 'string' || value[key].trim() === '') issues.push(issue(`$.${key}`, 'must be a non-empty string'));
  }
  if (typeof value.requestId === 'string' && value.requestId.length > 128) issues.push(issue('$.requestId', 'must contain at most 128 characters'));
  if (typeof value.revision === 'string' && value.revision.length > 128) issues.push(issue('$.revision', 'must contain at most 128 characters'));
  if (typeof value.command === 'string' && value.command.length > 4000) issues.push(issue('$.command', 'must contain at most 4000 characters'));
  if (!isRecord(value.currentState)) issues.push(issue('$.currentState', 'must be an object'));
  if (!isRecord(value.context)) issues.push(issue('$.context', 'must be an object'));
  else {
    issues.push(...unknownKeys(value.context, ['currentPage', 'density', 'pageSize', 'totalRecordCount', 'facts'], '$.context'));
    for (const key of ['currentPage', 'pageSize', 'totalRecordCount'] as const) {
      const entry = value.context[key];
      if (entry !== undefined && (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0)) issues.push(issue(`$.context.${key}`, 'must be a non-negative integer'));
    }
    if (value.context.pageSize === 0) issues.push(issue('$.context.pageSize', 'must be greater than zero'));
    if (value.context.density !== undefined && typeof value.context.density !== 'string') issues.push(issue('$.context.density', 'must be a string'));
    if (value.context.facts !== undefined && !isRecord(value.context.facts)) issues.push(issue('$.context.facts', 'must be an object'));
  }
  const schemaResult = validateGridSchema(value.gridSchema);
  if (!schemaResult.ok) issues.push(...schemaResult.issues);
  return issues.length === 0 ? { ok: true, value: value as unknown as GridCommandRequest } : { ok: false, issues };
}

export function validateProviderGridOutput(
  request: GridCommandRequest,
  value: unknown,
): ValidationResult<ProviderGridOutput> {
  const result = validateJsonSchemaInstance(buildProviderOutputSchema(request.gridSchema), value);
  if (!result.ok) return result as ValidationResult<ProviderGridOutput>;
  const raw = value as ProviderGridOutput;
  const ignored = new Set<GridStateKey>(raw.propertiesToIgnore);
  for (const [feature, featureValue] of Object.entries(raw.gridState)) {
    if (!GRID_STATE_KEYS.includes(feature as GridStateKey)) continue;
    if (featureValue === null) ignored.add(feature as GridStateKey);
    else if (ignored.has(feature as GridStateKey)) {
      return { ok: false, issues: [issue(`$.propertiesToIgnore`, `cannot ignore non-null gridState feature ${feature}`)] };
    }
  }
  return { ok: true, value: { ...raw, propertiesToIgnore: GRID_STATE_KEYS.filter((key) => ignored.has(key)) } };
}

export function validateGridCommandResponse(
  request: GridCommandRequest,
  value: unknown,
): ValidationResult<GridCommandResponse> {
  if (!isRecord(value)) return { ok: false, issues: [issue('$', 'response must be an object')] };
  const issues: ValidationIssue[] = [];
  if (value.protocol !== AI_PROTOCOL) issues.push(issue('$.protocol', `must equal ${AI_PROTOCOL}`));
  if (value.requestId !== request.requestId) issues.push(issue('$.requestId', 'does not match request'));
  if (value.revision !== request.revision) issues.push(issue('$.revision', 'does not match request'));
  if (value.status === 'ok') {
    issues.push(...unknownKeys(value, ['protocol', 'requestId', 'revision', 'status', 'output', 'provider'], '$'));
    const output = validateProviderGridOutput(request, value.output);
    if (!output.ok) issues.push(...output.issues.map((entry) => ({ ...entry, path: `$.output${entry.path.slice(1)}` })));
    if (!isRecord(value.provider)) issues.push(issue('$.provider', 'must be an object'));
    else {
      issues.push(...unknownKeys(value.provider, ['service', 'model', 'providerRequestId', 'latencyMs'], '$.provider'));
      if (typeof value.provider.service !== 'string' || value.provider.service === '') issues.push(issue('$.provider.service', 'must be a non-empty string'));
      if (typeof value.provider.model !== 'string' || value.provider.model === '') issues.push(issue('$.provider.model', 'must be a non-empty string'));
      if (value.provider.providerRequestId !== null && typeof value.provider.providerRequestId !== 'string') issues.push(issue('$.provider.providerRequestId', 'must be a string or null'));
      if (typeof value.provider.latencyMs !== 'number' || value.provider.latencyMs < 0) issues.push(issue('$.provider.latencyMs', 'must be a non-negative number'));
    }
  } else if (value.status === 'error') {
    issues.push(...unknownKeys(value, ['protocol', 'requestId', 'revision', 'status', 'error'], '$'));
    if (!isRecord(value.error) || typeof value.error.code !== 'string' || typeof value.error.message !== 'string' || typeof value.error.retryable !== 'boolean') {
      issues.push(issue('$.error', 'must contain code, message, and retryable'));
    } else {
      issues.push(...unknownKeys(value.error, ['code', 'message', 'retryable'], '$.error'));
      const codes = ['BAD_REQUEST', 'MODEL_REFUSAL', 'PROVIDER_ERROR', 'RATE_LIMITED', 'TIMEOUT', 'INVALID_PROVIDER_OUTPUT', 'INTERNAL_ERROR'];
      if (!codes.includes(value.error.code)) issues.push(issue('$.error.code', 'is not a supported error code'));
    }
  } else issues.push(issue('$.status', 'must be ok or error'));
  return issues.length === 0 ? { ok: true, value: value as unknown as GridCommandResponse } : { ok: false, issues };
}

export function asJsonObject(value: unknown): JsonObject {
  if (!isRecord(value)) throw new Error('ai-protocol: expected a JSON object');
  return value as JsonObject;
}
