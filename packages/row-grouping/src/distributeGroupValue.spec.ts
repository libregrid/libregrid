import { describe, it, expect, vi } from 'vitest';
import type { AgColumn, GroupRowValueSetterOptions, GroupRowValueSetterParams } from 'ag-grid-community';
import { distributeGroupValue, roundAndSpread } from './distributeGroupValue';

interface FakeChild {
  data: Record<string, unknown>;
  destroyed: boolean;
  writes: unknown[];
  getDataValue: () => unknown;
  setDataValue: (col: unknown, value: unknown, source?: string) => boolean;
}

function makeChild(value: unknown, result = true): FakeChild {
  const writes: unknown[] = [];
  return {
    data: { sales: value },
    destroyed: false,
    writes,
    getDataValue: () => value,
    setDataValue: (_col, newValue) => {
      writes.push(newValue);
      return result;
    },
  };
}

function makeColumn(opts: { aggFunc?: unknown; cellEditorParams?: Record<string, unknown> } = {}): AgColumn {
  const colDef: Record<string, unknown> = { field: 'sales' };
  if (opts.aggFunc !== undefined) colDef['aggFunc'] = opts.aggFunc;
  if (opts.cellEditorParams !== undefined) colDef['cellEditorParams'] = opts.cellEditorParams;
  return {
    getColDef: () => colDef,
    getAggFunc: () => colDef['aggFunc'] ?? null,
  } as unknown as AgColumn;
}

function makeParams(
  column: AgColumn,
  children: FakeChild[],
  newValue: unknown,
  oldValue: unknown = null,
): GroupRowValueSetterParams {
  return {
    api: {},
    context: {},
    column,
    colDef: column.getColDef(),
    oldValue,
    newValue,
    node: {},
    data: null,
    eventSource: 'edit',
    valueChanged: true,
    aggregatedChildren: children,
  } as unknown as GroupRowValueSetterParams;
}

const writesOf = (children: FakeChild[]) => children.map((c) => c.writes);

describe('roundAndSpread', () => {
  it('spreads the rounding remainder so the total matches exactly', () => {
    expect(roundAndSpread([10 / 3, 10 / 3, 10 / 3], 0)).toEqual([4, 3, 3]);
  });

  it('honours a two-decimal precision', () => {
    expect(roundAndSpread([10 / 3, 10 / 3, 10 / 3], 2)).toEqual([3.34, 3.33, 3.33]);
  });

  it('is exact when the remainder is negative', () => {
    const result = roundAndSpread([2.5, 2.5], 0);
    expect(result.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('returns an empty array for no values', () => {
    expect(roundAndSpread([], 0)).toEqual([]);
  });
});

describe('distributeGroupValue — strategies', () => {
  it('uses overwrite after the active aggregation is removed', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    column.getAggFunc = () => null;
    const children = [makeChild(10), makeChild(20)];
    distributeGroupValue(makeParams(column, children, 50));
    expect(writesOf(children)).toEqual([[50], [50]]);
  });

  it('percentage preserves the edited average', () => {
    const column = makeColumn({ aggFunc: 'avg' });
    const children = [makeChild(100), makeChild(300)];
    distributeGroupValue(makeParams(column, children, 100, 200), { distribution: 'percentage' });
    expect(writesOf(children)).toEqual([[50], [150]]);
  });

  it('distributes bigint totals without losing integer precision', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(0n), makeChild(0n)];
    distributeGroupValue(makeParams(column, children, 9007199254740993n));
    expect(writesOf(children)).toEqual([[4503599627370496n], [4503599627370497n]]);
  });

  it('uniform divides the edited value equally among children (sum)', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(100), makeChild(200), makeChild(50)];
    expect(distributeGroupValue(makeParams(column, children, 300), {})).toBe(true);
    expect(writesOf(children)).toEqual([[100], [100], [100]]);
  });

  it('uniform assigns the edited value to every child for avg', () => {
    const column = makeColumn({ aggFunc: 'avg' });
    const children = [makeChild(100), makeChild(200)];
    // avg's built-in default is 'overwrite', so uniform must be requested.
    distributeGroupValue(makeParams(column, children, 300), { distribution: 'uniform' });
    expect(writesOf(children)).toEqual([[300], [300]]);
  });

  it('percentage scales children proportionally, preserving weights', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(100), makeChild(300)];
    distributeGroupValue(makeParams(column, children, 200), { distribution: 'percentage' });
    expect(writesOf(children)).toEqual([[50], [150]]);
  });

  it('percentage falls back to uniform when the current total is zero', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(0), makeChild(0)];
    distributeGroupValue(makeParams(column, children, 10), { distribution: 'percentage' });
    expect(writesOf(children)).toEqual([[5], [5]]);
  });

  it('increment distributes only the delta, split for sum', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(100), makeChild(200)];
    distributeGroupValue(makeParams(column, children, 400, 300), { distribution: 'increment' });
    expect(writesOf(children)).toEqual([[150], [250]]);
  });

  it('increment adds the full delta to every child for avg', () => {
    const column = makeColumn({ aggFunc: 'avg' });
    const children = [makeChild(100), makeChild(200)];
    distributeGroupValue(makeParams(column, children, 200, 150), { distribution: 'increment' });
    expect(writesOf(children)).toEqual([[150], [250]]);
  });

  it('increment uses the documented newValue − oldValue delta', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    // oldValue is supplied, so the children's total must not be consulted for the
    // delta: 300 → 400 is +100 even though the children total 500.
    const children = [makeChild(200), makeChild(300)];
    distributeGroupValue(makeParams(column, children, 400, 300), { distribution: 'increment' });
    expect(writesOf(children)).toEqual([[250], [350]]);
  });

  it('increment falls back to the children total when oldValue is null', () => {
    // A direct `distributeGroupValue(params, options?)` caller may omit oldValue.
    // For `sum` the group's previous value *is* the children's total, so the delta
    // is unchanged: 300 → 400 is still +100.
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(100), makeChild(200)];
    distributeGroupValue(makeParams(column, children, 400, null), { distribution: 'increment' });
    expect(writesOf(children)).toEqual([[150], [250]]);
  });

  it('overwrite writes the edited value to every child', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(1), makeChild(2)];
    distributeGroupValue(makeParams(column, children, 7), { distribution: 'overwrite' });
    expect(writesOf(children)).toEqual([[7], [7]]);
  });
});

describe('distributeGroupValue — defaults by aggregation function', () => {
  it('sum defaults to uniform', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(70), makeChild(30)];
    distributeGroupValue(makeParams(column, children, 100), {});
    expect(writesOf(children)).toEqual([[50], [50]]);
  });

  it('avg defaults to overwrite', () => {
    const column = makeColumn({ aggFunc: 'avg' });
    const children = [makeChild(70), makeChild(30)];
    distributeGroupValue(makeParams(column, children, 42), {});
    expect(writesOf(children)).toEqual([[42], [42]]);
  });

  it('a column without an aggFunc defaults to overwrite', () => {
    const column = makeColumn();
    const children = [makeChild(70), makeChild(30)];
    distributeGroupValue(makeParams(column, children, 42), {});
    expect(writesOf(children)).toEqual([[42], [42]]);
  });

  it.each(['count', 'min', 'max', 'first', 'last'])(
    '%s is disabled by default',
    (aggFunc) => {
      const column = makeColumn({ aggFunc });
      const children = [makeChild(1), makeChild(2)];
      expect(distributeGroupValue(makeParams(column, children, 3), {})).toBe(false);
      expect(writesOf(children)).toEqual([[], []]);
    },
  );

  it('a custom aggFunc is disabled by default but enabled by distribution:true', () => {
    const column = makeColumn({ aggFunc: 'myAgg' });
    const children = [makeChild(1), makeChild(2)];
    expect(distributeGroupValue(makeParams(column, children, 3), {})).toBe(false);
    expect(writesOf(children)).toEqual([[], []]);

    const enabled = [makeChild(1), makeChild(2)];
    distributeGroupValue(makeParams(column, enabled, 3), { distribution: true });
    expect(writesOf(enabled)).toEqual([[3], [3]]);
  });

  it('distribution:true keeps count disabled unless named explicitly', () => {
    const column = makeColumn({ aggFunc: 'count' });
    const children = [makeChild(1), makeChild(2)];
    expect(distributeGroupValue(makeParams(column, children, 3), { distribution: true })).toBe(false);
    expect(writesOf(children)).toEqual([[], []]);
  });

  it('an explicit per-aggFunc entry enables a disabled aggregation function', () => {
    const column = makeColumn({ aggFunc: 'count' });
    const children = [makeChild(1), makeChild(2)];
    distributeGroupValue(makeParams(column, children, 3), { distribution: { count: 'overwrite' } });
    expect(writesOf(children)).toEqual([[3], [3]]);
  });

  it.each(['count', 'min', 'max', 'first', 'last'])(
    'an explicit per-aggFunc entry of `true` enables %s',
    (aggFunc) => {
      const column = makeColumn({ aggFunc });
      const children = [makeChild(1), makeChild(2)];
      expect(
        distributeGroupValue(makeParams(column, children, 3), {
          distribution: { [aggFunc]: true },
        }),
      ).toBe(true);
      expect(writesOf(children)).toEqual([[3], [3]]);
    },
  );

  it.each(['count', 'min', 'max', 'first', 'last'])(
    '`default` does not enable the non-distributable aggFunc %s (must be listed explicitly)',
    (aggFunc) => {
      // Docs: "Non-distributable functions (count, min, max, first, last) are
      // NOT affected by `default` and must always be listed explicitly."
      const column = makeColumn({ aggFunc });
      const children = [makeChild(1), makeChild(2)];
      expect(
        distributeGroupValue(makeParams(column, children, 3), {
          distribution: { sum: 'uniform' },
          default: 'overwrite',
        }),
      ).toBe(false);
      expect(writesOf(children)).toEqual([[], []]);
    },
  );

  it('`default` applies to a custom aggFunc unlisted in the record', () => {
    const column = makeColumn({ aggFunc: 'myAgg' });
    const children = [makeChild(1), makeChild(2)];
    distributeGroupValue(makeParams(column, children, 3), {
      distribution: { sum: 'uniform' },
      default: 'overwrite',
    });
    expect(writesOf(children)).toEqual([[3], [3]]);
  });

  it('`default` applies to a no-aggFunc column unlisted in the record', () => {
    const column = makeColumn();
    const children = [makeChild(1), makeChild(2)];
    distributeGroupValue(makeParams(column, children, 3), {
      distribution: { sum: 'uniform' },
      default: 'overwrite',
    });
    expect(writesOf(children)).toEqual([[3], [3]]);
  });

  it('`default` alone does not enable a built-in disabled aggregation function', () => {
    // Documented: with `distribution` omitted, `default` covers only custom aggFuncs.
    const column = makeColumn({ aggFunc: 'count' });
    const children = [makeChild(1), makeChild(2)];
    expect(distributeGroupValue(makeParams(column, children, 3), { default: true })).toBe(false);
    expect(writesOf(children)).toEqual([[], []]);
  });

  it('an explicit entry object of { distribution: true } enables a disabled aggregation function', () => {
    const column = makeColumn({ aggFunc: 'min' });
    const children = [makeChild(1), makeChild(2)];
    distributeGroupValue(makeParams(column, children, 3), {
      distribution: { min: { distribution: true } },
    });
    expect(writesOf(children)).toEqual([[3], [3]]);
  });

  it('an explicit per-aggFunc entry of `true` still routes sum through its built-in default', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(70), makeChild(30)];
    distributeGroupValue(makeParams(column, children, 100), { distribution: { sum: true } });
    expect(writesOf(children)).toEqual([[50], [50]]);
  });
});

describe('distributeGroupValue — record and default resolution', () => {
  it('routes per-aggFunc record entries', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(100), makeChild(300)];
    distributeGroupValue(makeParams(column, children, 200), {
      distribution: { sum: 'percentage' },
    });
    expect(writesOf(children)).toEqual([[50], [150]]);
  });

  it('falls back to `default` for an unmatched aggFunc in a record', () => {
    const column = makeColumn({ aggFunc: 'avg' });
    const children = [makeChild(1), makeChild(2)];
    distributeGroupValue(makeParams(column, children, 9), {
      distribution: { sum: 'percentage' },
      default: 'overwrite',
    });
    expect(writesOf(children)).toEqual([[9], [9]]);
  });

  it('ignores `default` for built-in aggFuncs when distribution is omitted', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(70), makeChild(30)];
    // distribution omitted → built-in default for sum wins over `default`.
    distributeGroupValue(makeParams(column, children, 100), { default: 'overwrite' });
    expect(writesOf(children)).toEqual([[50], [50]]);
  });

  it('applies `default` to custom aggFuncs when distribution is omitted', () => {
    const column = makeColumn({ aggFunc: 'myAgg' });
    const children = [makeChild(1), makeChild(2)];
    distributeGroupValue(makeParams(column, children, 4), { default: 'overwrite' });
    expect(writesOf(children)).toEqual([[4], [4]]);
  });

  it('suppresses via distribution:false and via a record entry of false', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const a = [makeChild(1), makeChild(2)];
    expect(distributeGroupValue(makeParams(column, a, 3), { distribution: false })).toBe(false);
    expect(writesOf(a)).toEqual([[], []]);

    const b = [makeChild(1), makeChild(2)];
    expect(
      distributeGroupValue(makeParams(column, b, 3), { distribution: { sum: false } }),
    ).toBe(false);
    expect(writesOf(b)).toEqual([[], []]);
  });

  it('honours an entry-level options object and inherits from the parent', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(10 / 3), makeChild(10 / 3), makeChild(10 / 3)];
    distributeGroupValue(makeParams(column, children, 10), {
      distribution: { sum: { distribution: 'uniform', precision: 0 } },
    });
    expect(writesOf(children)).toEqual([[4], [3], [3]]);
  });
});

describe('distributeGroupValue — precision', () => {
  it('uses an explicit precision and spreads the remainder', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(0), makeChild(0), makeChild(0)];
    distributeGroupValue(makeParams(column, children, 10), { precision: 0 });
    expect(writesOf(children)).toEqual([[4], [3], [3]]);
  });

  it('auto-detects precision from cellEditorParams.precision', () => {
    const column = makeColumn({ aggFunc: 'sum', cellEditorParams: { precision: 2 } });
    const children = [makeChild(0), makeChild(0), makeChild(0)];
    distributeGroupValue(makeParams(column, children, 10), {});
    expect(writesOf(children)).toEqual([[3.34], [3.33], [3.33]]);
  });

  it('auto-detects integer rounding from a whole-number cellEditorParams.step', () => {
    const column = makeColumn({ aggFunc: 'sum', cellEditorParams: { step: 1 } });
    const children = [makeChild(0), makeChild(0), makeChild(0)];
    distributeGroupValue(makeParams(column, children, 10), {});
    expect(writesOf(children)).toEqual([[4], [3], [3]]);
  });

  it('precision:false disables rounding', () => {
    const column = makeColumn({ aggFunc: 'sum', cellEditorParams: { precision: 2 } });
    const children = [makeChild(0), makeChild(0), makeChild(0)];
    distributeGroupValue(makeParams(column, children, 10), { precision: false });
    expect(writesOf(children)[0]?.[0]).toBeCloseTo(10 / 3, 10);
  });

  it('distributes bigint values as integers', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(1n), makeChild(2n)];
    distributeGroupValue(makeParams(column, children, 9n), {});
    expect(writesOf(children)).toEqual([[4n], [5n]]);
  });
});

describe('distributeGroupValue — write path and edge cases', () => {
  it('uses getValue/setValue overrides', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const writes: unknown[] = [];
    const children = [makeChild(0), makeChild(0)];
    // Typed as the documented options object — no assertion needed.
    const options: GroupRowValueSetterOptions = {
      getValue: vi.fn(() => 100),
      setValue: vi.fn((params) => {
        writes.push(params.value);
        return true;
      }),
    };
    distributeGroupValue(makeParams(column, children, 100), options);
    expect(options.getValue).toHaveBeenCalledTimes(2);
    expect(writes).toEqual([50, 50]);
  });

  it('reports false when no child value changed', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild(1, false), makeChild(2, false)];
    expect(distributeGroupValue(makeParams(column, children, 4), {})).toBe(false);
  });

  it('returns false with no children', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    expect(distributeGroupValue(makeParams(column, [], 5), {})).toBe(false);
  });

  it('writes a non-numeric edit through to every child', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const children = [makeChild('a'), makeChild('b')];
    distributeGroupValue(makeParams(column, children, 'new'), {});
    expect(writesOf(children)).toEqual([['new'], ['new']]);
  });

  it('skips destroyed children', () => {
    const column = makeColumn({ aggFunc: 'sum' });
    const alive = makeChild(0);
    const gone = { ...makeChild(0), destroyed: true };
    distributeGroupValue(makeParams(column, [alive, gone], 10), {});
    expect(alive.writes).toEqual([10]);
    expect(gone.writes).toEqual([]);
  });
});
