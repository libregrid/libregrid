import type { StructuredSchemaFeature, StructuredSchemaParams } from 'ag-grid-community';
import {
  arraySchema,
  booleanSchema,
  enumSchema,
  literalSchema,
  numberSchema,
  objectSchema,
  refSchema,
  schema,
  stringSchema,
  unionSchema,
  type SchemaBuilder,
  type SchemaLiteral,
  type StructuredJsonSchema,
} from './schemaBuilder';

export type StructuredColumnDataType =
  | 'bigint'
  | 'boolean'
  | 'date'
  | 'dateString'
  | 'dateTime'
  | 'dateTimeString'
  | 'number'
  | 'object'
  | 'text';

export interface SimpleFilterOperatorCapability {
  key: string;
  inputs: 0 | 1 | 2;
}

export interface SimpleFilterCapability {
  kind: 'simple';
  filterType: 'bigint' | 'date' | 'number' | 'text';
  maxNumConditions: number;
  operators: SimpleFilterOperatorCapability[];
  useIsoSeparator?: boolean;
}

export interface SetFilterCapability {
  kind: 'set';
  values?: SchemaLiteral[];
}

export type ColumnFilterCapability = SetFilterCapability | SimpleFilterCapability;

/** A live leaf column reduced to only the facts needed by schema generation. */
export interface StructuredColumnCapability {
  aggregationFunctions: string[];
  colId: string;
  dataType: StructuredColumnDataType;
  filter?: ColumnFilterCapability;
  headerName?: string;
  pivotable: boolean;
  resizable: boolean;
  rowGroupable: boolean;
  sortable: boolean;
}

/** Everything the pure schema generator needs; the grid bean adapter builds it. */
export interface StructuredSchemaInput {
  advancedFilterEnabled: boolean;
  columns: StructuredColumnCapability[];
}

export const STRUCTURED_GRID_FEATURES = [
  'aggregation',
  'filter',
  'sort',
  'pivot',
  'columnVisibility',
  'columnSizing',
  'rowGroup',
] as const satisfies readonly StructuredSchemaFeature[];

const DATE_ONLY_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';
const DATE_TIME_ISO_PATTERN = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$';
const DATE_TIME_SPACE_PATTERN = '^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$';

function descriptionFor(column: StructuredColumnCapability, params?: StructuredSchemaParams): string {
  const override = params?.columns?.[column.colId]?.description;
  const label = override ?? column.headerName ?? column.colId;
  return `${label} (column id: ${column.colId}; data type: ${column.dataType})`;
}

function columnIds(
  columns: readonly StructuredColumnCapability[],
  params: StructuredSchemaParams | undefined,
  description: string,
): SchemaBuilder {
  return unionSchema(columns.map((column) =>
    literalSchema(column.colId).describe(`${description} ${descriptionFor(column, params)}`),
  ));
}

function perColumnVariant<T extends StructuredColumnCapability>(
  columns: readonly T[],
  create: (column: T) => SchemaBuilder,
): SchemaBuilder | undefined {
  if (columns.length === 0) return undefined;
  return unionSchema(columns.map(create));
}

function aggregationSchema(columns: readonly StructuredColumnCapability[], params?: StructuredSchemaParams): SchemaBuilder | undefined {
  const eligible = columns.filter((column) => column.aggregationFunctions.length > 0);
  const item = perColumnVariant(eligible, (column) =>
    objectSchema({
      colId: literalSchema(column.colId),
      aggFunc: enumSchema(column.aggregationFunctions, `Aggregation function supported by ${column.colId}`),
    }, descriptionFor(column, params)),
  );
  if (!item) return undefined;
  return objectSchema(
    { aggregationModel: arraySchema(item) },
    'Aggregation state. Use an empty aggregationModel to clear aggregation.',
  );
}

function sortSchema(columns: readonly StructuredColumnCapability[], params?: StructuredSchemaParams): SchemaBuilder | undefined {
  const eligible = columns.filter((column) => column.sortable);
  if (eligible.length === 0) return undefined;
  return objectSchema(
    {
      sortModel: arraySchema(
        objectSchema({
          colId: columnIds(eligible, params, 'A sortable live column id.'),
          sort: enumSchema(['asc', 'desc'], 'Ascending or descending.'),
          type: enumSchema(['default', 'absolute'], 'Natural or absolute-value sorting.'),
        }),
      ),
    },
    'Sorted columns and directions in priority order. Use an empty sortModel to clear sorting.',
  );
}

function pivotSchema(columns: readonly StructuredColumnCapability[], params?: StructuredSchemaParams): SchemaBuilder | undefined {
  const eligible = columns.filter((column) => column.pivotable);
  if (eligible.length === 0) return undefined;
  const id = columnIds(eligible, params, 'A pivotable live column id.');
  return objectSchema(
    {
      pivotMode: booleanSchema({ description: 'Whether pivot mode is enabled.' }),
      pivotColIds: arraySchema(id),
      pivotSortModel: arraySchema(
        objectSchema({
          colId: id,
          sort: unionSchema([enumSchema(['asc', 'desc']), literalSchema(null)]),
        }),
      ).nullable(),
    },
    'Pivot mode, pivot columns, and optional pivot-label ordering.',
  );
}

function visibilitySchema(columns: readonly StructuredColumnCapability[]): SchemaBuilder | undefined {
  if (columns.length === 0) return undefined;
  return objectSchema(
    { hiddenColIds: arraySchema(refSchema('allColumnIds')) },
    'Column visibility. An empty hiddenColIds array shows every column.',
  );
}

function sizingSchema(columns: readonly StructuredColumnCapability[], params?: StructuredSchemaParams): SchemaBuilder | undefined {
  const eligible = columns.filter((column) => column.resizable);
  const item = perColumnVariant(eligible, (column) => unionSchema([
    objectSchema({
      colId: literalSchema(column.colId),
      width: numberSchema({ minimum: 20, maximum: 10_000, description: 'Width in CSS pixels.' }),
      flex: literalSchema(null),
    }, descriptionFor(column, params)),
    objectSchema({
      colId: literalSchema(column.colId),
      width: literalSchema(null),
      flex: numberSchema({ minimum: 0, maximum: 1_000, description: 'Flex weight.' }),
    }, descriptionFor(column, params)),
  ]));
  if (!item) return undefined;
  return objectSchema(
    {
      columnSizingModel: arraySchema(item),
    },
    'Column widths and flex values. Exactly one of width or flex is non-null for each item.',
  );
}

function rowGroupSchema(columns: readonly StructuredColumnCapability[], params?: StructuredSchemaParams): SchemaBuilder | undefined {
  const eligible = columns.filter((column) => column.rowGroupable);
  if (eligible.length === 0) return undefined;
  return objectSchema(
    { groupColIds: arraySchema(columnIds(eligible, params, 'A row-groupable live column id.')) },
    'Grouped columns in hierarchy order. Use an empty groupColIds array to clear grouping.',
  );
}

function valueSchema(capability: SimpleFilterCapability): SchemaBuilder {
  if (capability.filterType === 'number') return numberSchema();
  if (capability.filterType === 'date') {
    return stringSchema({ pattern: capability.useIsoSeparator ? DATE_TIME_ISO_PATTERN : DATE_TIME_SPACE_PATTERN });
  }
  if (capability.filterType === 'bigint') return stringSchema({ pattern: '^-?\\d+$' });
  return stringSchema();
}

function simpleConditionSchema(
  capability: SimpleFilterCapability,
  operator: SimpleFilterOperatorCapability,
): SchemaBuilder {
  const value = valueSchema(capability);
  const nullValue = literalSchema(null);
  const first = operator.inputs === 0 ? nullValue : value;
  const second = operator.inputs === 2 ? value : nullValue;
  const valueNames = capability.filterType === 'date' ? ['dateFrom', 'dateTo'] as const : ['filter', 'filterTo'] as const;
  return objectSchema({
    filterType: literalSchema(capability.filterType),
    type: literalSchema(operator.key),
    [valueNames[0]]: first,
    [valueNames[1]]: second,
  });
}

function simpleFilterSchema(capability: SimpleFilterCapability): SchemaBuilder {
  const conditions = capability.operators.map((operator) => simpleConditionSchema(capability, operator));
  const single = unionSchema(conditions);
  if (capability.maxNumConditions <= 1) return single;
  const combined = objectSchema({
    filterType: literalSchema(capability.filterType),
    operator: enumSchema(['AND', 'OR']),
    conditions: arraySchema(single, { minItems: 2, maxItems: capability.maxNumConditions }),
  });
  return unionSchema([single, combined]);
}

function setFilterSchema(
  column: StructuredColumnCapability,
  capability: SetFilterCapability,
  params?: StructuredSchemaParams,
): SchemaBuilder {
  const includeValues = params?.columns?.[column.colId]?.includeSetValues === true;
  const concreteValues = capability.values?.filter((value) => value !== null && value !== '');
  const values = includeValues && concreteValues && concreteValues.length > 0
    ? enumSchema(concreteValues, `A set-filter key available for ${column.colId}.`)
    : unionSchema([stringSchema(), literalSchema(null)]);
  return objectSchema({
    filterType: literalSchema('set'),
    values: arraySchema(values),
  }, descriptionFor(column, params));
}

function columnFilterModelSchema(
  columns: readonly StructuredColumnCapability[],
  params?: StructuredSchemaParams,
): SchemaBuilder | undefined {
  const filterable = columns.filter((column) => column.filter !== undefined);
  if (filterable.length === 0) return undefined;
  const properties: Record<string, SchemaBuilder> = {};
  for (const column of filterable) {
    const capability = column.filter;
    if (!capability) continue;
    const model = capability.kind === 'set'
      ? setFilterSchema(column, capability, params)
      : simpleFilterSchema(capability);
    properties[column.colId] = model.describe(descriptionFor(column, params)).nullable();
  }
  return objectSchema(properties, 'Column filter models keyed by live column id. Null clears a column filter.');
}

const ADVANCED_OPERATORS = {
  boolean: [{ key: 'true', inputs: 0 }, { key: 'false', inputs: 0 }],
  scalar: [
    { key: 'equals', inputs: 1 },
    { key: 'notEqual', inputs: 1 },
    { key: 'lessThan', inputs: 1 },
    { key: 'lessThanOrEqual', inputs: 1 },
    { key: 'greaterThan', inputs: 1 },
    { key: 'greaterThanOrEqual', inputs: 1 },
    { key: 'blank', inputs: 0 },
    { key: 'notBlank', inputs: 0 },
  ],
  text: [
    { key: 'equals', inputs: 1 },
    { key: 'notEqual', inputs: 1 },
    { key: 'contains', inputs: 1 },
    { key: 'notContains', inputs: 1 },
    { key: 'startsWith', inputs: 1 },
    { key: 'endsWith', inputs: 1 },
    { key: 'blank', inputs: 0 },
    { key: 'notBlank', inputs: 0 },
  ],
} as const;

function advancedFilterType(dataType: StructuredColumnDataType): string {
  return dataType;
}

function advancedValueSchema(dataType: StructuredColumnDataType): SchemaBuilder {
  if (dataType === 'number') return numberSchema();
  if (dataType === 'bigint') return stringSchema({ pattern: '^-?\\d+$' });
  if (dataType === 'date' || dataType === 'dateString') return stringSchema({ pattern: DATE_ONLY_PATTERN });
  if (dataType === 'dateTime') return stringSchema({ pattern: DATE_TIME_ISO_PATTERN });
  if (dataType === 'dateTimeString') return stringSchema({ pattern: DATE_TIME_SPACE_PATTERN });
  return stringSchema();
}

function advancedLeafSchema(column: StructuredColumnCapability, params?: StructuredSchemaParams): SchemaBuilder {
  const isBoolean = column.dataType === 'boolean';
  const isText = column.dataType === 'text' || column.dataType === 'object';
  const operators = isBoolean ? ADVANCED_OPERATORS.boolean : isText ? ADVANCED_OPERATORS.text : ADVANCED_OPERATORS.scalar;
  return unionSchema(operators.map((operator) => {
    const properties: Record<string, SchemaBuilder> = {
      filterType: literalSchema(advancedFilterType(column.dataType)),
      colId: literalSchema(column.colId),
      type: literalSchema(operator.key),
    };
    if (!isBoolean) {
      properties.filter = operator.inputs === 0 ? literalSchema(null) : advancedValueSchema(column.dataType);
    }
    return objectSchema(properties, descriptionFor(column, params));
  }));
}

function advancedFilterSchema(
  columns: readonly StructuredColumnCapability[],
  params?: StructuredSchemaParams,
): SchemaBuilder | undefined {
  const filterable = columns.filter((column) => column.filter !== undefined);
  if (filterable.length === 0) return undefined;
  const leaf = unionSchema(filterable.map((column) => advancedLeafSchema(column, params)));
  const join = objectSchema({
    filterType: literalSchema('join'),
    type: enumSchema(['AND', 'OR']),
    conditions: arraySchema(refSchema('advancedFilterModel'), { minItems: 2 }),
  });
  return refSchema('advancedFilterModel').define('advancedFilterModel', unionSchema([leaf, join]));
}

function filterSchema(
  input: StructuredSchemaInput,
  params?: StructuredSchemaParams,
): SchemaBuilder | undefined {
  const advanced = input.advancedFilterEnabled ? advancedFilterSchema(input.columns, params) : undefined;
  const column = input.advancedFilterEnabled ? undefined : columnFilterModelSchema(input.columns, params);
  if (!advanced && !column) return undefined;
  return objectSchema({
    filterModel: column?.nullable() ?? literalSchema(null),
    advancedFilterModel: advanced?.nullable() ?? literalSchema(null),
  }, input.advancedFilterEnabled
    ? 'Advanced Filter state. filterModel must be null while Advanced Filter is enabled.'
    : 'Column Filter state. advancedFilterModel must be null while Advanced Filter is disabled.');
}

function addFeature(
  properties: Record<string, SchemaBuilder>,
  feature: StructuredSchemaFeature,
  value: SchemaBuilder | undefined,
  excluded: ReadonlySet<StructuredSchemaFeature>,
): void {
  if (!excluded.has(feature) && value) properties[feature] = value.nullable();
}

/**
 * Builds a strict JSON Schema for the applicable portions of AG Grid's
 * `GridState`. Every advertised top-level feature is required but nullable:
 * a model returns null when it is not changing that feature, and the client
 * translates that intent into `propertiesToIgnore` before applying state.
 */
export function buildStructuredSchema(
  input: StructuredSchemaInput,
  params?: StructuredSchemaParams,
): StructuredJsonSchema {
  const excluded = new Set(params?.exclude ?? []);
  const properties: Record<string, SchemaBuilder> = {};
  addFeature(properties, 'aggregation', aggregationSchema(input.columns, params), excluded);
  addFeature(properties, 'filter', filterSchema(input, params), excluded);
  addFeature(properties, 'sort', sortSchema(input.columns, params), excluded);
  addFeature(properties, 'pivot', pivotSchema(input.columns, params), excluded);
  addFeature(properties, 'columnVisibility', visibilitySchema(input.columns), excluded);
  addFeature(properties, 'columnSizing', sizingSchema(input.columns, params), excluded);
  addFeature(properties, 'rowGroup', rowGroupSchema(input.columns, params), excluded);

  let root = objectSchema(
    properties,
    'Applicable AG Grid state. Return null for any feature the command does not change.',
  );
  if (input.columns.length > 0) {
    const dictionary = input.columns
      .map((column) => `${column.colId}: ${descriptionFor(column, params)}`)
      .join('\n');
    root = root.define('allColumnIds', enumSchema(input.columns.map((column) => column.colId), dictionary));
  }
  return root.toJSON();
}

/** Utility for protocol and provider packages that need this exact dialect. */
export function isStructuredJsonSchema(value: unknown): value is StructuredJsonSchema {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

/** Converts a raw schema fragment into the typed schema dialect. */
export function structuredSchemaFragment(value: StructuredJsonSchema): SchemaBuilder {
  return schema(value);
}
