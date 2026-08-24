import type { SortModelItem } from 'ag-grid-community';
import type { AiColumnInfo } from './structuredSchema';

/** A raw tool call as returned by a provider (`function_calls[0]`). */
export interface RawToolCall {
  name: string;
  arguments?: Record<string, unknown>;
}

/** Upper bound on values in a single set-filter call — beyond it the model is almost certainly hallucinating. */
export const MAX_FILTER_VALUES = 50;

/**
 * The v1 tool catalogue (≤5 — Needle's retrieval head renders at most five).
 * Flat argument shapes only (spike finding B): nested per-column objects are
 * not reliably emitted by the local model. Schemas are built from the live
 * column set so every argument is enum-constrained.
 */
export function buildGridTools(columns: AiColumnInfo[]): Record<string, unknown>[] {
  const colIds = columns.map((c) => c.colId);
  const colIdSchema: Record<string, unknown> = { type: 'string', enum: colIds, description: 'column id' };
  // Only filterable columns may be filtered — same rule `buildStructuredSchema`
  // applies, and `validateToolCall` enforces it if the model ignores the enum.
  const filterColIdSchema: Record<string, unknown> = {
    type: 'string',
    enum: columns.filter((c) => c.filterable).map((c) => c.colId),
    description: 'column id',
  };

  return [
    {
      name: 'setSort',
      description: 'Sort the grid rows by one or more columns, in order.',
      parameters: {
        type: 'object',
        properties: {
          sortModel: {
            type: 'array',
            description: 'columns to sort by, in priority order; empty array clears the sort',
            items: {
              type: 'object',
              properties: {
                colId: colIdSchema,
                sort: { type: 'string', enum: ['asc', 'desc'], description: 'direction; asc = ascending / smallest first' },
              },
              required: ['colId'],
            },
          },
        },
        required: ['sortModel'],
      },
    },
    {
      name: 'setFilters',
      // No "call once per column" hint: `runToolkit` acts on the first call
      // only, so inviting a multi-call answer would just discard the rest.
      description:
        'Keep only the rows whose value in one column is among the given values (set semantics). Filters one column; an empty values array clears that column filter.',
      parameters: {
        type: 'object',
        properties: {
          column: filterColIdSchema,
          values: { type: 'array', description: 'values to keep', maxItems: MAX_FILTER_VALUES },
        },
        required: ['column', 'values'],
      },
    },
    {
      name: 'setColumnVisibility',
      description: 'Show or hide columns by listing the ids of the columns to hide.',
      parameters: {
        type: 'object',
        properties: {
          hiddenColIds: { type: 'array', items: colIdSchema, description: 'column ids to hide; empty array shows all' },
        },
        required: ['hiddenColIds'],
      },
    },
    {
      name: 'resetGrid',
      description: 'Reset the grid state (filters, sort, column visibility) back to defaults.',
      parameters: { type: 'object', properties: {} },
    },
  ];
}

export type ValidatedCall =
  | { ok: true; kind: 'sort'; sortModel: SortModelItem[] }
  | { ok: true; kind: 'filter'; column: string; values: (string | number)[] }
  | { ok: true; kind: 'visibility'; hiddenColIds: string[] }
  | { ok: true; kind: 'reset' };

export interface ValidationFailure {
  ok: false;
  reason: string;
}

type Result = ValidatedCall | ValidationFailure;

function isStringArray(value: unknown, known: Set<string>): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !known.has(item)) return null;
    out.push(item);
  }
  return out;
}

/**
 * Validate a raw provider tool call against the live column set. Hand-rolled
 * on purpose (no `ajv` — dependency policy): the surface is small and fixed.
 */
export function validateToolCall(call: RawToolCall, columns: AiColumnInfo[]): Result {
  const known = new Set(columns.map((c) => c.colId));
  const filterable = new Set(columns.filter((c) => c.filterable).map((c) => c.colId));
  const args = call.arguments ?? {};

  switch (call.name) {
    case 'setSort': {
      if (!Array.isArray(args.sortModel)) return { ok: false, reason: 'sortModel must be an array' };
      const sortModel: SortModelItem[] = [];
      for (const item of args.sortModel) {
        if (typeof item !== 'object' || item === null) return { ok: false, reason: 'sortModel entries must be objects' };
        const entry = item as Record<string, unknown>;
        if (typeof entry.colId !== 'string' || !known.has(entry.colId)) {
          return { ok: false, reason: `unknown column id in sortModel: ${String(entry.colId)}` };
        }
        const sort = entry.sort === undefined ? 'asc' : entry.sort;
        if (sort !== 'asc' && sort !== 'desc') return { ok: false, reason: `invalid sort direction: ${String(sort)}` };
        sortModel.push({ colId: entry.colId, sort });
      }
      return { ok: true, kind: 'sort', sortModel };
    }

    case 'setFilters': {
      if (typeof args.column !== 'string' || !known.has(args.column)) {
        return { ok: false, reason: `unknown column id in setFilters: ${String(args.column)}` };
      }
      if (!filterable.has(args.column)) {
        return { ok: false, reason: `column is not filterable: ${args.column}` };
      }
      if (!Array.isArray(args.values)) return { ok: false, reason: 'values must be an array' };
      if (args.values.length > MAX_FILTER_VALUES) {
        return { ok: false, reason: `too many values (${args.values.length} > ${MAX_FILTER_VALUES})` };
      }
      const values: (string | number)[] = [];
      for (const item of args.values) {
        if (typeof item !== 'string' && typeof item !== 'number') {
          return { ok: false, reason: `values must be strings or numbers, got: ${String(item)}` };
        }
        values.push(item);
      }
      return { ok: true, kind: 'filter', column: args.column, values };
    }

    case 'setColumnVisibility': {
      const hiddenColIds = isStringArray(args.hiddenColIds, known);
      if (hiddenColIds === null) return { ok: false, reason: 'hiddenColIds must be an array of known column ids' };
      return { ok: true, kind: 'visibility', hiddenColIds };
    }

    case 'resetGrid':
      return { ok: true, kind: 'reset' };

    default:
      return { ok: false, reason: `unknown tool: ${call.name}` };
  }
}
