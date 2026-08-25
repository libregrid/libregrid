export type SchemaLiteral = string | number | boolean | null;

type SchemaType = 'array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string';

/**
 * The deliberately small JSON Schema dialect emitted by the AI Toolkit.
 * It is accepted by OpenAI strict structured outputs and is also usable by
 * other providers that implement the common JSON Schema subset.
 */
export interface StructuredJsonSchema {
  $defs?: Record<string, StructuredJsonSchema>;
  $ref?: string;
  additionalProperties?: false;
  anyOf?: StructuredJsonSchema[];
  const?: SchemaLiteral;
  description?: string;
  enum?: SchemaLiteral[];
  exclusiveMaximum?: number;
  exclusiveMinimum?: number;
  format?: string;
  items?: StructuredJsonSchema;
  maximum?: number;
  maxItems?: number;
  minimum?: number;
  minItems?: number;
  multipleOf?: number;
  pattern?: string;
  properties?: Record<string, StructuredJsonSchema>;
  required?: string[];
  type?: SchemaType | SchemaType[];
}

function cloneSchema(schema: StructuredJsonSchema): StructuredJsonSchema {
  return structuredClone(schema);
}

function literalType(value: Exclude<SchemaLiteral, null>): 'boolean' | 'number' | 'string' {
  switch (typeof value) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'string':
      return 'string';
  }
}

function mergeDefinitions(
  target: Map<string, StructuredJsonSchema>,
  source: ReadonlyMap<string, StructuredJsonSchema>,
): void {
  for (const [name, schema] of source) {
    const existing = target.get(name);
    if (existing && JSON.stringify(existing) !== JSON.stringify(schema)) {
      throw new Error(`ai-toolkit: conflicting JSON Schema definition "${name}"`);
    }
    target.set(name, cloneSchema(schema));
  }
}

function isNullSchema(value: StructuredJsonSchema): boolean {
  return value.type === 'null'
    || value.const === null
    || (Array.isArray(value.enum) && value.enum.length === 1 && value.enum[0] === null);
}

/** Internal fluent value used to keep `$defs` hoisted at the schema root. */
export class SchemaBuilder {
  readonly #schema: StructuredJsonSchema;
  readonly #definitions = new Map<string, StructuredJsonSchema>();

  constructor(schema: StructuredJsonSchema, definitions?: ReadonlyMap<string, StructuredJsonSchema>) {
    this.#schema = cloneSchema(schema);
    if (definitions) mergeDefinitions(this.#definitions, definitions);
  }

  nullable(): SchemaBuilder {
    if (this.#schema.$ref) return unionSchema([this, literalSchema(null)]);
    if (this.#schema.anyOf) {
      if (this.#schema.anyOf.some(isNullSchema)) return new SchemaBuilder(this.#schema, this.#definitions);
      return new SchemaBuilder(
        { ...this.#schema, anyOf: [...this.#schema.anyOf, literalSchema(null).toDefinitionJSON()] },
        this.#definitions,
      );
    }
    const currentType = this.#schema.type;
    if (typeof currentType === 'string') {
      return new SchemaBuilder({ ...this.#schema, type: [currentType] }, this.#definitions).withNullType();
    }
    return this.withNullType();
  }

  describe(description: string): SchemaBuilder {
    return new SchemaBuilder({ ...this.#schema, description }, this.#definitions);
  }

  define(name: string, value: SchemaBuilder): SchemaBuilder {
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) {
      throw new Error(`ai-toolkit: invalid JSON Schema definition name "${name}"`);
    }
    const next = new SchemaBuilder(this.#schema, this.#definitions);
    const definition = value.toDefinitionJSON();
    const existing = next.#definitions.get(name);
    if (existing && JSON.stringify(existing) !== JSON.stringify(definition)) {
      throw new Error(`ai-toolkit: conflicting JSON Schema definition "${name}"`);
    }
    next.#definitions.set(name, definition);
    mergeDefinitions(next.#definitions, value.#definitions);
    return next;
  }

  toJSON(): StructuredJsonSchema {
    const result = cloneSchema(this.#schema);
    if (this.#definitions.size > 0) {
      result.$defs = Object.fromEntries(
        [...this.#definitions.entries()].map(([name, definition]) => [name, cloneSchema(definition)]),
      );
    }
    return result;
  }

  toDefinitionJSON(): StructuredJsonSchema {
    return cloneSchema(this.#schema);
  }

  definitions(): ReadonlyMap<string, StructuredJsonSchema> {
    return this.#definitions;
  }

  private withNullType(): SchemaBuilder {
    const currentType = this.#schema.type;
    if (Array.isArray(currentType)) {
      const types = currentType.includes('null')
        ? currentType
        : [...currentType, 'null' as const];
      return new SchemaBuilder({ ...this.#schema, type: types }, this.#definitions);
    }
    return unionSchema([this, literalSchema(null)]);
  }
}

export function schema(value: StructuredJsonSchema): SchemaBuilder {
  return new SchemaBuilder(value);
}

export function stringSchema(options: Omit<StructuredJsonSchema, 'type'> = {}): SchemaBuilder {
  return schema({ type: 'string', ...options });
}

export function numberSchema(options: Omit<StructuredJsonSchema, 'type'> = {}): SchemaBuilder {
  return schema({ type: 'number', ...options });
}

export function booleanSchema(options: Omit<StructuredJsonSchema, 'type'> = {}): SchemaBuilder {
  return schema({ type: 'boolean', ...options });
}

export function enumSchema(values: readonly SchemaLiteral[], description?: string): SchemaBuilder {
  if (values.length === 0) throw new Error('ai-toolkit: enum schemas require at least one value');
  const nonNullValues = values.filter((value): value is Exclude<SchemaLiteral, null> => value !== null);
  const first = nonNullValues[0];
  const type = first === undefined ? undefined : literalType(first);
  if (type && nonNullValues.some((value) => literalType(value) !== type)) {
    throw new Error('ai-toolkit: enum schemas require values of one JSON type');
  }
  const result: StructuredJsonSchema = { enum: [...values] };
  if (type) result.type = values.includes(null) ? [type, 'null'] : type;
  else result.type = 'null';
  if (description) result.description = description;
  return schema(result);
}

export function literalSchema(value: SchemaLiteral): SchemaBuilder {
  const result: StructuredJsonSchema = { enum: [value], type: value === null ? 'null' : literalType(value) };
  return schema(result);
}

export function arraySchema(
  items: SchemaBuilder,
  options: Omit<StructuredJsonSchema, 'items' | 'type'> = {},
): SchemaBuilder {
  const result = new SchemaBuilder({ type: 'array', items: items.toDefinitionJSON(), ...options }, items.definitions());
  return result;
}

export function objectSchema(
  properties: Readonly<Record<string, SchemaBuilder>>,
  description?: string,
): SchemaBuilder {
  const definitions = new Map<string, StructuredJsonSchema>();
  for (const value of Object.values(properties)) mergeDefinitions(definitions, value.definitions());
  const result: StructuredJsonSchema = {
    type: 'object',
    properties: Object.fromEntries(
      Object.entries(properties).map(([name, value]) => [name, value.toDefinitionJSON()]),
    ),
    required: Object.keys(properties),
    additionalProperties: false,
  };
  if (description) result.description = description;
  return new SchemaBuilder(result, definitions);
}

export function unionSchema(options: readonly SchemaBuilder[]): SchemaBuilder {
  if (options.length === 0) throw new Error('ai-toolkit: union schemas require at least one option');
  const definitions = new Map<string, StructuredJsonSchema>();
  for (const option of options) mergeDefinitions(definitions, option.definitions());
  return new SchemaBuilder({ anyOf: options.map((option) => option.toDefinitionJSON()) }, definitions);
}

export function refSchema(name: string): SchemaBuilder {
  return schema({ $ref: `#/$defs/${name}` });
}
