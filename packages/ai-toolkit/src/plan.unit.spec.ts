import { describe, expect, it } from 'vitest';
import { buildAiEnvironment } from './environment';
import { decodePlan } from './decodePlan';
import { validatePlan } from './validatePlan';
import { compilePlan } from './compilePlan';
import { operatorsFor, type AiFilterKind } from './capabilities';
import { revisionOf, type AiColumnSnapshot, type AiGridSnapshot } from './gridSnapshot';
import type { RawToolCall } from './tools';

function column(colId: string, overrides: Partial<AiColumnSnapshot> = {}): AiColumnSnapshot {
  const dataType = overrides.dataType ?? 'text';
  const kind = (overrides.filter === null ? null : (overrides.filter?.kind ?? (dataType === 'boolean' ? 'set' : dataType))) as AiFilterKind | null;
  return {
    colId,
    headerName: colId,
    dataType,
    sortable: true,
    hideable: true,
    filter: kind ? { kind, operators: operatorsFor(kind) } : null,
    ...overrides,
  };
}

function snapshot(columns: AiColumnSnapshot[], extra: Partial<AiGridSnapshot> = {}): AiGridSnapshot {
  return { columns, currentFilterModel: {}, hiddenColIds: [], revision: revisionOf(columns), ...extra };
}

const grid = snapshot([
  column('sales', { dataType: 'number' }),
  column('location'),
  column('due', { dataType: 'date' }),
  column('locked', { hideable: false }),
  column('unsortable', { sortable: false }),
  column('nofilter', { filter: null }),
]);
const env = buildAiEnvironment(grid);

/** Reference for a column id, as the model would see it. */
function ref(colId: string): string {
  for (const [reference, id] of env.columnRefs) if (id === colId) return reference;
  throw new Error(`no reference for ${colId}`);
}

function decode(calls: RawToolCall[]) {
  return decodePlan(calls, env);
}

describe('decodePlan', () => {
  it('resolves references and folds several calls into one plan', () => {
    const result = decode([
      { name: 'setFilter', arguments: { conditions: [{ column: ref('sales'), operator: 'gt', operands: [1000] }] } },
      { name: 'setSort', arguments: { sortModel: [{ column: ref('sales'), direction: 'desc' }] } },
      { name: 'setColumnVisibility', arguments: { hide: [ref('location')] } },
    ]);
    expect(result).toEqual({
      ok: true,
      plan: {
        version: 1,
        filter: [{ columnId: 'sales', operator: 'gt', operands: [1000] }],
        sort: [{ columnId: 'sales', direction: 'desc' }],
        visibility: { hide: ['location'] },
      },
    });
  });

  it('defaults a missing sort direction to ascending', () => {
    const result = decode([{ name: 'setSort', arguments: { sortModel: [{ column: ref('sales') }] } }]);
    expect(result).toMatchObject({ ok: true, plan: { sort: [{ columnId: 'sales', direction: 'asc' }] } });
  });

  it('accepts a bare scalar where a small model omits the operand array', () => {
    const result = decode([
      { name: 'setFilter', arguments: { conditions: [{ column: ref('location'), operator: 'eq', operands: 'Boston' }] } },
    ]);
    expect(result).toMatchObject({ ok: true, plan: { filter: [{ operands: ['Boston'] }] } });
  });

  it('rejects a hallucinated column reference', () => {
    const result = decode([{ name: 'setSort', arguments: { sortModel: [{ column: 'c99' }] } }]);
    expect(result).toEqual({ ok: false, reason: 'unknown column reference: c99' });
  });

  it('rejects an unknown tool', () => {
    expect(decode([{ name: 'dropTable', arguments: {} }])).toEqual({ ok: false, reason: 'unknown tool: dropTable' });
  });

  it('treats an empty condition list as clearing the filter', () => {
    expect(decode([{ name: 'setFilter', arguments: { conditions: [] } }])).toMatchObject({ ok: true, plan: { filter: [] } });
  });
});

describe('validatePlan', () => {
  it('accepts a well-formed multi-condition plan', () => {
    expect(
      validatePlan(
        {
          version: 1,
          filter: [
            { columnId: 'sales', operator: 'gt', operands: [1000] },
            { columnId: 'location', operator: 'eq', operands: ['New York'] },
          ],
        },
        grid,
      ),
    ).toEqual({ ok: true });
  });

  it('rejects an operator the column does not support', () => {
    expect(validatePlan({ version: 1, filter: [{ columnId: 'location', operator: 'gt', operands: ['x'] }] }, grid)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('operator gt is not available'),
    });
  });

  it('rejects an operand whose JSON type does not match the column', () => {
    expect(validatePlan({ version: 1, filter: [{ columnId: 'sales', operator: 'gt', operands: ['1000'] }] }, grid)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('is not a valid number'),
    });
  });

  it('enforces operand arity', () => {
    expect(validatePlan({ version: 1, filter: [{ columnId: 'sales', operator: 'between', operands: [1] }] }, grid)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('between expects 2 operand(s)'),
    });
    expect(validatePlan({ version: 1, filter: [{ columnId: 'sales', operator: 'isBlank', operands: [1] }] }, grid)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('isBlank expects 0 operand(s)'),
    });
  });

  it('rejects filtering, sorting or hiding a column that does not allow it', () => {
    expect(validatePlan({ version: 1, filter: [{ columnId: 'nofilter', operator: 'eq', operands: ['a'] }] }, grid)).toMatchObject({
      ok: false,
      reason: 'column is not filterable: nofilter',
    });
    expect(validatePlan({ version: 1, sort: [{ columnId: 'unsortable', direction: 'asc' }] }, grid)).toMatchObject({
      ok: false,
      reason: 'column is not sortable: unsortable',
    });
    // `lockVisible` only blocks Community's UI, never its API — so the promise
    // is only real if the toolkit enforces it.
    expect(validatePlan({ version: 1, visibility: { hide: ['locked'] } }, grid)).toMatchObject({
      ok: false,
      reason: 'column visibility is locked: locked',
    });
  });

  it('rejects contradictory visibility', () => {
    expect(validatePlan({ version: 1, visibility: { hide: ['sales'], show: ['sales'] } }, grid)).toMatchObject({
      ok: false,
      reason: expect.stringContaining('both hidden and shown'),
    });
  });

  it('rejects two conditions on one column — v1 compiles one per column', () => {
    expect(
      validatePlan(
        {
          version: 1,
          filter: [
            { columnId: 'sales', operator: 'gt', operands: [1] },
            { columnId: 'sales', operator: 'lt', operands: [9] },
          ],
        },
        grid,
      ),
    ).toMatchObject({ ok: false, reason: expect.stringContaining('more than one condition') });
  });

  it('enforces size limits', () => {
    const many = Array.from({ length: 9 }, () => ({ columnId: 'sales', operator: 'gt' as const, operands: [1] }));
    expect(validatePlan({ version: 1, filter: many }, grid, { maxConditions: 8 })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('too many filter conditions'),
    });
  });
});

describe('compilePlan', () => {
  it('emits one typed filter model per column', () => {
    const patch = compilePlan(
      {
        version: 1,
        filter: [
          { columnId: 'sales', operator: 'gt', operands: [1000] },
          { columnId: 'location', operator: 'contains', operands: ['York'] },
        ],
      },
      grid,
    );
    expect(patch.filter).toEqual({
      filterModel: {
        sales: { filterType: 'number', type: 'greaterThan', filter: 1000 },
        location: { filterType: 'text', type: 'contains', filter: 'York' },
      },
    });
  });

  it('emits a range model for between', () => {
    const patch = compilePlan({ version: 1, filter: [{ columnId: 'sales', operator: 'between', operands: [10, 20] }] }, grid);
    expect(patch.filter).toEqual({ filterModel: { sales: { filterType: 'number', type: 'inRange', filter: 10, filterTo: 20 } } });
  });

  it('converts dates to the wire format Community reads', () => {
    const patch = compilePlan({ version: 1, filter: [{ columnId: 'due', operator: 'gte', operands: ['2026-01-31'] }] }, grid);
    expect(patch.filter).toEqual({
      filterModel: { due: { filterType: 'date', type: 'greaterThanOrEqual', dateFrom: '2026-01-31 00:00:00', dateTo: null } },
    });
  });

  it('leaves sections the plan did not mention untouched', () => {
    const patch = compilePlan({ version: 1, sort: [{ columnId: 'sales', direction: 'asc' }] }, grid);
    expect(patch.filter).toBeUndefined();
    expect(patch.columnVisibility).toBeUndefined();
    expect(patch.sort).toEqual({ sortModel: [{ colId: 'sales', sort: 'asc' }] });
  });

  it('adds to the columns already hidden rather than replacing them', () => {
    const withHidden = snapshot(grid.columns, { hiddenColIds: ['location'] });
    const patch = compilePlan({ version: 1, visibility: { hide: ['sales'] } }, withHidden);
    expect((patch.columnVisibility?.hiddenColIds ?? []).sort()).toEqual(['location', 'sales']);
  });

  it('clears every section on reset', () => {
    expect(compilePlan({ version: 1, reset: true }, grid)).toEqual({
      sort: { sortModel: [] },
      filter: { filterModel: {} },
      columnVisibility: { hiddenColIds: [] },
    });
  });
});
