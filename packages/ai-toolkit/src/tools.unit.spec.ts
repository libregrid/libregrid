import { describe, expect, it } from 'vitest';
import type { BeanCollection } from 'ag-grid-community';
import { applyToolCall, toolCallToStatePatch } from './applyToolCall';
import { buildGridTools, MAX_FILTER_VALUES, validateToolCall } from './tools';
import type { AiColumnInfo } from './structuredSchema';

const columns: AiColumnInfo[] = [
  { colId: 'country', headerName: 'Country', filterable: true },
  { colId: 'age', headerName: 'Age', filterable: true },
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

describe('toolCallToStatePatch', () => {
  it('maps each kind to the GridState section it owns', () => {
    expect(toolCallToStatePatch({ ok: true, kind: 'sort', sortModel: [{ colId: 'age', sort: 'asc' }] })).toEqual({
      sort: { sortModel: [{ colId: 'age', sort: 'asc' }] },
    });
    expect(toolCallToStatePatch({ ok: true, kind: 'filter', column: 'country', values: ['USA'] })).toEqual({
      filter: { filterModel: { country: { filterType: 'set', values: ['USA'] } } },
    });
    expect(toolCallToStatePatch({ ok: true, kind: 'visibility', hiddenColIds: ['age'] })).toEqual({
      columnVisibility: { hiddenColIds: ['age'] },
    });
    expect(toolCallToStatePatch({ ok: true, kind: 'reset' })).toEqual({
      sort: { sortModel: [] },
      filter: { filterModel: {} },
      columnVisibility: { hiddenColIds: [] },
    });
  });

  it('maps an empty values list to a null (clear) entry', () => {
    expect(toolCallToStatePatch({ ok: true, kind: 'filter', column: 'age', values: [] })).toEqual({
      filter: { filterModel: { age: null } },
    });
  });
});

describe('applyToolCall', () => {
  function fakeBeans(setState: ReturnType<typeof vi.fn>, filterModel: Record<string, unknown> | null = null): BeanCollection {
    return {
      stateSvc: { setState },
      filterManager: { getFilterModel: () => filterModel },
    } as unknown as BeanCollection;
  }

  it('routes every kind through stateSvc.setState', () => {
    const setState = vi.fn();
    applyToolCall(fakeBeans(setState), { ok: true, kind: 'reset' });
    expect(setState).toHaveBeenCalledTimes(1);
    expect(setState.mock.calls[0][0]).toEqual({
      sort: { sortModel: [] },
      filter: { filterModel: {} },
      columnVisibility: { hiddenColIds: [] },
    });
  });

  it('merges a single-column filter over the current model without wiping other columns', () => {
    const setState = vi.fn();
    applyToolCall(fakeBeans(setState, { country: { filterType: 'set', values: ['USA'] } }), {
      ok: true,
      kind: 'filter',
      column: 'age',
      values: [18],
    });
    expect(setState.mock.calls[0][0]).toEqual({
      filter: { filterModel: { country: { filterType: 'set', values: ['USA'] }, age: { filterType: 'set', values: [18] } } },
    });
  });

  it('clears a column filter on an empty values list, keeping the rest', () => {
    const setState = vi.fn();
    applyToolCall(fakeBeans(setState, { country: { filterType: 'set', values: ['USA'] }, age: null }), {
      ok: true,
      kind: 'filter',
      column: 'age',
      values: [],
    });
    expect(setState.mock.calls[0][0]).toEqual({ filter: { filterModel: { country: { filterType: 'set', values: ['USA'] } } } });
  });

  it('works without a filterManager bean (no merge source)', () => {
    const setState = vi.fn();
    const beans = fakeBeans(setState);
    delete (beans as Record<string, unknown>).filterManager;
    applyToolCall(beans, { ok: true, kind: 'filter', column: 'age', values: [18] });
    expect(setState.mock.calls[0][0]).toEqual({ filter: { filterModel: { age: { filterType: 'set', values: [18] } } } });
  });

  it('throws a named error when stateSvc is missing', () => {
    const beans = {} as BeanCollection;
    expect(() => applyToolCall(beans, { ok: true, kind: 'reset' })).toThrowError(/stateSvc bean missing/);
  });
});
