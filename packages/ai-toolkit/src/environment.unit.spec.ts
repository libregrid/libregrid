import { describe, expect, it } from 'vitest';
import {
  buildAiEnvironment,
  estimateContextTokens,
  estimateEnvironmentTokens,
  estimateToolsTokens,
  DEFAULT_MAX_ENVIRONMENT_TOKENS,
} from './environment';
import calibration from './__fixtures__/tokenCalibration.json';
import { operatorsFor } from './capabilities';
import { revisionOf, type AiColumnSnapshot, type AiGridSnapshot } from './gridSnapshot';

function column(overrides: Partial<AiColumnSnapshot> & { colId: string }): AiColumnSnapshot {
  const dataType = overrides.dataType ?? 'text';
  return {
    headerName: overrides.colId,
    dataType,
    sortable: true,
    hideable: true,
    filter: { kind: dataType === 'number' ? 'number' : 'text', operators: operatorsFor(dataType === 'number' ? 'number' : 'text') },
    ...overrides,
  };
}

function snapshot(columns: AiColumnSnapshot[]): AiGridSnapshot {
  return { columns, currentFilterModel: {}, hiddenColIds: [], revision: revisionOf(columns) };
}

const grid = snapshot([
  column({ colId: 'sales', headerName: 'Sales', dataType: 'number' }),
  column({ colId: 'location', headerName: 'Location' }),
]);

describe('buildAiEnvironment', () => {
  it('describes every actionable column on one line with its capabilities', () => {
    const env = buildAiEnvironment(grid);
    expect(env.context).toBe(
      [
        'Grid columns:',
        'c0 | id=sales | header=Sales | type=number | filter:eq,neq,gt,gte,lt,lte,between,isBlank,isNotBlank | sort | hide',
        'c1 | id=location | header=Location | type=text | filter:eq,neq,contains,notContains,startsWith,endsWith,isBlank,isNotBlank | sort | hide',
      ].join('\n'),
    );
  });

  it('maps request-local references back to real column ids', () => {
    const env = buildAiEnvironment(grid);
    expect([...env.columnRefs]).toEqual([
      ['c0', 'sales'],
      ['c1', 'location'],
    ]);
  });

  it('is deterministic — the same snapshot yields byte-identical output', () => {
    const first = buildAiEnvironment(grid);
    const second = buildAiEnvironment(grid);
    expect(first.context).toBe(second.context);
    expect(JSON.stringify(first.tools)).toBe(JSON.stringify(second.tools));
  });

  it('scopes each tool enum to the columns that tool can act on', () => {
    const mixed = snapshot([
      column({ colId: 'a', filter: null, sortable: true, hideable: true }),
      column({ colId: 'b', sortable: false, hideable: false }),
    ]);
    const tools = buildAiEnvironment(mixed).tools;
    const byName = new Map(tools.map((t) => [t.name as string, t as any]));
    // 'a' has no filter, 'b' does; 'b' is neither sortable nor hideable.
    expect(byName.get('setFilter').parameters.properties.conditions.items.properties.column.enum).toEqual(['c1']);
    expect(byName.get('setSort').parameters.properties.sortModel.items.properties.column.enum).toEqual(['c0']);
    expect(byName.get('setColumnVisibility').parameters.properties.hide.items.enum).toEqual(['c0']);
  });

  it('omits a tool entirely when no column supports it', () => {
    const noFilters = snapshot([column({ colId: 'a', filter: null })]);
    expect(buildAiEnvironment(noFilters).tools.map((t) => t.name)).toEqual([
      'setSort',
      'setColumnVisibility',
      'resetGrid',
    ]);
  });

  it('always offers resetGrid, even on a grid with no actionable columns', () => {
    expect(buildAiEnvironment(snapshot([])).tools.map((t) => t.name)).toEqual(['resetGrid']);
  });

  it('drops the least relevant columns when a wide grid exceeds the token budget', () => {
    const wide = snapshot(
      Array.from({ length: 40 }, (_, i) => column({ colId: `column_number_${i}`, headerName: `Column Header ${i}` })),
    );
    const env = buildAiEnvironment(wide, { prompt: 'sort by Column Header 7' });

    expect(env.omittedColIds.length).toBeGreaterThan(0);
    // The column the prompt names must survive the cull.
    expect([...env.columnRefs.values()]).toContain('column_number_7');
    expect(estimateEnvironmentTokens(env.context, JSON.stringify(env.tools))).toBeLessThanOrEqual(
      DEFAULT_MAX_ENVIRONMENT_TOKENS,
    );
  });

  it('keeps surviving columns in the grid’s own order after a cull', () => {
    const wide = snapshot(
      Array.from({ length: 40 }, (_, i) => column({ colId: `col${i}`, headerName: `Header ${i}` })),
    );
    const kept = [...buildAiEnvironment(wide, { prompt: 'header 30 and header 2' }).columnRefs.values()];
    const indices = kept.map((id) => Number(id.replace('col', '')));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it('carries the snapshot revision so a stale response can be detected', () => {
    expect(buildAiEnvironment(grid).revision).toBe(grid.revision);
  });
});

describe('token estimation', () => {
  // Ground truth produced by the SentencePiece tokenizer shipped with the
  // needle package, over environments this builder generated. Regenerate with
  // tools/ai-fixtures/generate.mjs if the environment format changes.
  it('never under-estimates the real tokenizer on measured environments', () => {
    for (const sample of calibration) {
      expect(estimateContextTokens(sample.context)).toBeGreaterThanOrEqual(sample.contextTokens);
      expect(estimateToolsTokens(sample.toolsJson)).toBeGreaterThanOrEqual(sample.toolsTokens);
    }
  });

  it('stays within a useful margin — a wildly pessimistic estimate culls columns needlessly', () => {
    const ratios = calibration.map(
      (sample) => estimateEnvironmentTokens(sample.context, sample.toolsJson) / (sample.contextTokens + sample.toolsTokens),
    );
    const worst = Math.max(...ratios);
    expect(worst).toBeLessThan(1.35);
  });

  it('grows with input length', () => {
    expect(estimateContextTokens('a'.repeat(400))).toBeGreaterThan(estimateContextTokens('a'.repeat(100)));
  });
});
