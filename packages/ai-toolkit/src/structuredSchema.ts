import type { StructuredSchemaColumnParams, StructuredSchemaParams } from 'ag-grid-community';

/** A leaf column as seen by the schema builder. */
export interface AiColumnInfo {
  colId: string;
  headerName?: string;
  /** Whether the column accepts value filters (`colDef.filter !== false`). */
  filterable: boolean;
}

/** Everything the pure builder needs — beans are adapted to this shape. */
export interface StructuredSchemaInput {
  columns: AiColumnInfo[];
  /** Current per-column filter models, for `includeSetValues` hints. */
  currentFilterModel?: Record<string, unknown> | null;
}

/** Features the v1 schema can express (the rest are ignored in `exclude`). */
export const V1_FEATURES = ['filter', 'sort', 'columnVisibility'] as const;

const MAX_SET_VALUES = 8;

function columnEnumSchema(columns: AiColumnInfo[]): Record<string, unknown> {
  return {
    type: 'string',
    enum: columns.map((c) => c.colId),
    description: 'column id',
  };
}

function columnDescription(column: AiColumnInfo, params?: StructuredSchemaColumnParams): string | undefined {
  return params?.description ?? (column.headerName ? `column "${column.headerName}"` : undefined);
}

/** Extract a small set of currently-set values for an `includeSetValues` hint. */
function currentSetValues(entry: unknown): unknown[] | undefined {
  if (Array.isArray(entry)) return entry;
  if (entry && typeof entry === 'object') {
    const values = (entry as Record<string, unknown>).values;
    if (Array.isArray(values)) return values;
  }
  return undefined;
}

function columnFilterSchema(
  column: AiColumnInfo,
  params: StructuredSchemaColumnParams | undefined,
  currentEntry: unknown,
): Record<string, unknown> {
  const values: Record<string, unknown> = { type: 'array', description: 'values to keep (set semantics)' };
  if (params?.includeSetValues) {
    const setValues = currentSetValues(currentEntry);
    if (setValues && setValues.length > 0 && setValues.length <= MAX_SET_VALUES) {
      values.items = { enum: setValues };
      values.description = `values to keep; currently set: ${JSON.stringify(setValues)}`;
    }
  }
  return {
    type: 'object',
    description: columnDescription(column, params),
    properties: { values },
    required: ['values'],
  };
}

/**
 * Build the JSON schema of the grid state the AI Toolkit can apply (v1:
 * filter, sort, column visibility). `params.exclude` removes whole sections;
 * per-column `description`/`includeSetValues` narrow the hints. Flat on
 * purpose — nested per-column objects are unreliable for small local models
 * (spike finding B).
 */
export function buildStructuredSchema(
  input: StructuredSchemaInput,
  params?: StructuredSchemaParams,
): Record<string, unknown> {
  const exclude = new Set(params?.exclude ?? []);
  const colParams = params?.columns ?? {};

  const properties: Record<string, unknown> = {};

  if (!exclude.has('sort')) {
    properties.sortModel = {
      type: 'array',
      description: 'column sort order; empty array or omitted clears the sort',
      items: {
        type: 'object',
        properties: {
          colId: columnEnumSchema(input.columns),
          sort: { type: 'string', enum: ['asc', 'desc'], description: 'direction; asc = ascending / smallest first' },
        },
        required: ['colId'],
      },
    };
  }

  if (!exclude.has('filter')) {
    const filterable = input.columns.filter((c) => c.filterable);
    properties.filterModel = {
      type: 'object',
      description: 'per-column value filters; omit a column to leave its filter unchanged',
      properties: Object.fromEntries(
        filterable.map((c) => [c.colId, columnFilterSchema(c, colParams[c.colId], input.currentFilterModel?.[c.colId])]),
      ),
    };
  }

  if (!exclude.has('columnVisibility')) {
    properties.hiddenColIds = {
      type: 'array',
      description: 'column ids to hide; empty array or omitted shows all columns',
      items: columnEnumSchema(input.columns),
    };
  }

  return {
    type: 'object',
    description: 'grid state to apply; omit a section to leave it unchanged',
    properties,
  };
}
