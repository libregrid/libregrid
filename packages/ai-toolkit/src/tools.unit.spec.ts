import { describe, expect, it } from 'vitest';
import { buildGridTools, MAX_FILTER_VALUES, validateToolCall } from './tools';
import type { AiColumnInfo } from './structuredSchema';

const columns: AiColumnInfo[] = [
  { colId: 'country', headerName: 'Country', filterable: true },
  { colId: 'age', headerName: 'Age', filterable: true },
];

/** A grid where one column carries no filter — `setFilters` must not offer it. */
const mixedColumns: AiColumnInfo[] = [
  { colId: 'country', headerName: 'Country', filterable: true },
  { colId: 'notes', headerName: 'Notes', filterable: false },
];

describe('buildGridTools', () => {
  it('emits exactly the four v1 tools, enum-constrained to the live columns', () => {
    const tools = buildGridTools(columns);
    expect(tools.map((t) => t.name)).toEqual(['setSort', 'setFilters', 'setColumnVisibility', 'resetGrid']);
    const sortModel = (tools[0].parameters as any).properties.sortModel;
    expect(sortModel.items.properties.colId.enum).toEqual(['country', 'age']);
    const setFilters = (tools[1].parameters as any).properties;
    expect(setFilters.column.enum).toEqual(['country', 'age']);
    expect((tools[2].parameters as any).properties.hiddenColIds.items.enum).toEqual(['country', 'age']);
  });

  it('handles an empty column set without crashing', () => {
    const tools = buildGridTools([]);
    expect(tools.map((t) => t.name)).toHaveLength(4);
  });
});

describe('buildGridTools filterability', () => {
  it('offers setFilters only on filterable columns, while other tools see them all', () => {
    const tools = buildGridTools(mixedColumns);
    const setFilters = tools.find((t) => t.name === 'setFilters') as any;
    expect(setFilters.parameters.properties.column.enum).toEqual(['country']);
    expect(setFilters.parameters.properties.values.maxItems).toBe(MAX_FILTER_VALUES);
    // Sorting and hiding a non-filterable column are both still legitimate.
    const setSort = tools.find((t) => t.name === 'setSort') as any;
    expect(setSort.parameters.properties.sortModel.items.properties.colId.enum).toEqual(['country', 'notes']);
    const visibility = tools.find((t) => t.name === 'setColumnVisibility') as any;
    expect(visibility.parameters.properties.hiddenColIds.items.enum).toEqual(['country', 'notes']);
  });
});

describe('validateToolCall filterability', () => {
  it('rejects a filter on a known but non-filterable column', () => {
    expect(validateToolCall({ name: 'setFilters', arguments: { column: 'notes', values: ['x'] } }, mixedColumns)).toEqual({
      ok: false,
      reason: 'column is not filterable: notes',
    });
  });

  it('still allows sorting and hiding a non-filterable column', () => {
    expect(validateToolCall({ name: 'setColumnVisibility', arguments: { hiddenColIds: ['notes'] } }, mixedColumns)).toMatchObject({
      ok: true,
      kind: 'visibility',
    });
    expect(validateToolCall({ name: 'setSort', arguments: { sortModel: [{ colId: 'notes', sort: 'asc' }] } }, mixedColumns)).toMatchObject({
      ok: true,
      kind: 'sort',
    });
  });
});

describe('validateToolCall', () => {
  it('accepts a sort call and defaults a missing direction to asc', () => {
    const r = validateToolCall({ name: 'setSort', arguments: { sortModel: [{ colId: 'age' }] } }, columns);
    expect(r).toEqual({ ok: true, kind: 'sort', sortModel: [{ colId: 'age', sort: 'asc' }] });
  });

  it('accepts multi-column sorts in priority order', () => {
    const r = validateToolCall(
      { name: 'setSort', arguments: { sortModel: [{ colId: 'age', sort: 'desc' }, { colId: 'country', sort: 'asc' }] } },
      columns,
    );
    expect(r).toEqual({ ok: true, kind: 'sort', sortModel: [{ colId: 'age', sort: 'desc' }, { colId: 'country', sort: 'asc' }] });
  });

  it('rejects unknown column ids and bad directions with named reasons', () => {
    expect(validateToolCall({ name: 'setSort', arguments: { sortModel: [{ colId: 'nope' }] } }, columns)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('unknown column id'),
    });
    expect(validateToolCall({ name: 'setSort', arguments: { sortModel: [{ colId: 'age', sort: 'sideways' }] } }, columns)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('invalid sort direction'),
    });
  });

  it('accepts a single-column set filter with string and number values', () => {
    const r = validateToolCall({ name: 'setFilters', arguments: { column: 'age', values: [18, 'USA'] } }, columns);
    expect(r).toEqual({ ok: true, kind: 'filter', column: 'age', values: [18, 'USA'] });
  });

  it('rejects unknown columns, non-scalar values and oversized value lists', () => {
    expect(validateToolCall({ name: 'setFilters', arguments: { column: 'nope', values: ['a'] } }, columns)).toMatchObject({ ok: false });
    expect(validateToolCall({ name: 'setFilters', arguments: { column: 'age', values: [{}] } }, columns)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('strings or numbers'),
    });
    const tooMany = Array.from({ length: MAX_FILTER_VALUES + 1 }, (_, i) => i);
    expect(validateToolCall({ name: 'setFilters', arguments: { column: 'age', values: tooMany } }, columns)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('too many values'),
    });
  });

  it('accepts visibility lists of known ids and rejects anything else', () => {
    expect(validateToolCall({ name: 'setColumnVisibility', arguments: { hiddenColIds: ['age'] } }, columns)).toEqual({
      ok: true,
      kind: 'visibility',
      hiddenColIds: ['age'],
    });
    expect(validateToolCall({ name: 'setColumnVisibility', arguments: { hiddenColIds: ['nope'] } }, columns)).toMatchObject({ ok: false });
    expect(validateToolCall({ name: 'setColumnVisibility', arguments: {} }, columns)).toMatchObject({ ok: false });
  });

  it('accepts resetGrid with or without arguments and rejects unknown tools', () => {
    expect(validateToolCall({ name: 'resetGrid' }, columns)).toEqual({ ok: true, kind: 'reset' });
    expect(validateToolCall({ name: 'resetGrid', arguments: {} }, columns)).toEqual({ ok: true, kind: 'reset' });
    expect(validateToolCall({ name: 'destroyTheGrid', arguments: {} }, columns)).toMatchObject({
      ok: false,
      reason: 'unknown tool: destroyTheGrid',
    });
  });
});
