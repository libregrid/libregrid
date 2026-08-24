import { describe, expect, it, vi } from 'vitest';
import type { BeanCollection } from 'ag-grid-community';
import { applyToolCall, toolCallToStatePatch } from './applyToolCall';

describe('toolCallToStatePatch', () => {
  it('maps each kind to its state section', () => {
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

  it('merges a filter over the supplied current model', () => {
    const patch = toolCallToStatePatch({ ok: true, kind: 'filter', column: 'age', values: [18] }, {
      country: { filterType: 'set', values: ['USA'] },
    });
    expect(patch).toEqual({
      filter: { filterModel: { country: { filterType: 'set', values: ['USA'] }, age: { filterType: 'set', values: [18] } } },
    });
  });

  it('drops the column key on an empty values list, keeping the rest', () => {
    const patch = toolCallToStatePatch({ ok: true, kind: 'filter', column: 'age', values: [] }, {
      country: { filterType: 'set', values: ['USA'] },
      age: { filterType: 'set', values: [18] },
    });
    expect(patch).toEqual({ filter: { filterModel: { country: { filterType: 'set', values: ['USA'] } } } });
  });

  it('does not mutate the caller’s filter model', () => {
    const current = { country: { filterType: 'set', values: ['USA'] } };
    toolCallToStatePatch({ ok: true, kind: 'filter', column: 'age', values: [18] }, current);
    expect(current).toEqual({ country: { filterType: 'set', values: ['USA'] } });
  });

  it('treats an omitted current model as "no other filters"', () => {
    expect(toolCallToStatePatch({ ok: true, kind: 'filter', column: 'age', values: [] })).toEqual({
      filter: { filterModel: {} },
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
