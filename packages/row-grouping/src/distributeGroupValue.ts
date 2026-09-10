import type {
  AgColumn,
  ColDef,
  DistributionGetValueParams,
  DistributionSetValueParams,
  GroupRowValueSetterDistribution,
  GroupRowValueSetterDistributionOptions,
  GroupRowValueSetterFunc,
  GroupRowValueSetterOptions,
  GroupRowValueSetterParams,
  IRowNode,
} from 'ag-grid-community';

/**
 * Phase 21 (gap-plan A8) — group row value distribution.
 *
 * The docs describe `distributeGroupValue` as living in the commercial package,
 * which is not a dependency here; it does not exist in `ag-grid-community@36.1.0`
 * either. Per guardrail G2 this implementation is built from the public
 * `GroupRowValueSetter*` types in
 * `ag-grid-community/dist/types/src/entities/colDef-groupRowValueSetter.d.ts`
 * only — no commercial source is consulted.
 *
 * @feature Row Grouping -> Editing Groups
 */

type Strategy = GroupRowValueSetterDistribution;

/** Aggregation functions whose built-in distribution is disabled by default. */
const DEFAULT_DISABLED = new Set(['count', 'min', 'max', 'first', 'last']);

/** Built-in distribution default per aggregation function. */
const BUILT_IN_DEFAULTS: Record<string, Strategy> = {
  sum: 'uniform',
  avg: 'overwrite',
};

/**
 * The column's aggregation function, reduced to the three states the resolution
 * order distinguishes. Read the two fields together:
 *
 * | `name`   | `custom` | meaning                                             |
 * |----------|----------|-----------------------------------------------------|
 * | `'sum'`  | `false`  | a known built-in (`sum`/`avg`), with defaults        |
 * | `'count'`| `false`  | a known built-in whose default is *disabled*         |
 * | `'myAgg'`| `true`   | a named aggregation function this package doesn't know |
 * | `null`   | `true`   | an inline `aggFunc` function (no name to key a record by) |
 * | `null`   | `false`  | no aggregation function at all — a plain column      |
 *
 * `name` is therefore `null` for *two* different reasons, and callers must check
 * `custom` to tell them apart. `null`+`custom` can never match a per-aggFunc
 * record key, which is why those two states resolve through `default` instead.
 */
interface AggFuncInfo {
  /** Resolved aggFunc name usable as a `distribution` record key, or `null` when there is none. */
  name: string | null;
  /** True when the aggFunc is not one of this package's known built-ins. */
  custom: boolean;
}

interface EffectiveOptions {
  precision?: number | false | undefined;
  getValue?: ((params: DistributionGetValueParams) => unknown) | undefined;
  setValue?: ((params: DistributionSetValueParams) => boolean) | undefined;
}

/**
 * @internal — the resolved distribution plan, shared with `RowGroupingEditService`
 * inside this package. Not part of the package's public API.
 */
interface DistributionPlan extends EffectiveOptions {
  kind: 'strategy' | 'callback';
  strategy?: Strategy;
  callback?: GroupRowValueSetterFunc;
}

/** Sentinel: the built-in default for this column's aggregation function applies. */
const BUILT_IN = Symbol('built-in');
/** Sentinel: distribution is suppressed (the cell is not editable). */
const SUPPRESSED = Symbol('suppressed');

type EntryResolution =
  | Strategy
  | boolean
  | null
  | GroupRowValueSetterFunc
  | EffectiveOptions
  | typeof BUILT_IN
  | typeof SUPPRESSED;

/** @internal — resolves the aggregation function of the edited column. */
export function aggFuncInfoFor(col: AgColumn | null | undefined): AggFuncInfo {
  if (!col) return { name: null, custom: false };
  const pivotSource = col.getColDef().pivotValueColumn as AgColumn | undefined;
  if (pivotSource) return aggFuncInfoFor(pivotSource);
  const colDef = col.getColDef() as Record<string, unknown>;
  const declared = col.getAggFunc ? col.getAggFunc() : colDef['aggFunc'];
  if (declared == null) return { name: null, custom: false };
  if (typeof declared === 'function') return { name: null, custom: true };
  const name = String(declared);
  return { name, custom: !(name in BUILT_IN_DEFAULTS) && !DEFAULT_DISABLED.has(name) };
}

/** Built-in default for the aggFunc; disabled for `count`/`min`/`max`/`first`/`last` and custom aggFuncs. */
function builtInDefault(info: AggFuncInfo): Strategy | typeof SUPPRESSED {
  if (info.name == null) return info.custom ? SUPPRESSED : 'overwrite';
  if (DEFAULT_DISABLED.has(info.name)) return SUPPRESSED;
  return BUILT_IN_DEFAULTS[info.name] ?? SUPPRESSED;
}

/**
 * `distribution: true` — built-in defaults plus `'overwrite'` for custom aggFuncs.
 * `count`/`min`/`max`/`first`/`last` stay disabled unless named explicitly.
 */
function builtInOrCustomOverwrite(info: AggFuncInfo): Strategy | typeof SUPPRESSED {
  if (info.name != null && DEFAULT_DISABLED.has(info.name)) return SUPPRESSED;
  if (info.custom) return 'overwrite';
  if (info.name == null) return 'overwrite';
  return BUILT_IN_DEFAULTS[info.name] ?? 'overwrite';
}

/**
 * The strategy for `true` when it acts as an *explicit* enablement — a per-aggFunc
 * record entry (or a `default` entry) of `true`, which the docs describe as
 * enabling `count`/`min`/`max`/`first`/`last`. Those five are disabled by default,
 * so as an explicit entry `true` resolves to `'overwrite'`.
 *
 * Deliberately distinct from `builtInOrCustomOverwrite`: a top-level
 * `distribution: true` is *not* explicit per-aggFunc enablement and keeps
 * suppressing those five names.
 */
function explicitTrue(info: AggFuncInfo): Strategy {
  if (info.name != null && DEFAULT_DISABLED.has(info.name)) return 'overwrite';
  const strategy = builtInOrCustomOverwrite(info);
  return strategy === SUPPRESSED ? 'overwrite' : strategy;
}

function isStrategy(value: unknown): value is Strategy {
  return value === 'uniform' || value === 'percentage' || value === 'increment' || value === 'overwrite';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asOptions(value: unknown): EffectiveOptions {
  if (!isRecord(value)) return {};
  const out: EffectiveOptions = {};
  const precision = value['precision'];
  if (typeof precision === 'number' || precision === false) {
    out.precision = precision;
  }
  if (typeof value['getValue'] === 'function') {
    out.getValue = value['getValue'] as EffectiveOptions['getValue'];
  }
  if (typeof value['setValue'] === 'function') {
    out.setValue = value['setValue'] as EffectiveOptions['setValue'];
  }
  return out;
}

function mergeOptions(parent: EffectiveOptions, child: unknown): EffectiveOptions {
  const own = asOptions(child);
  const out: EffectiveOptions = {};
  const precision = own.precision !== undefined ? own.precision : parent.precision;
  if (precision !== undefined) out.precision = precision;
  const getValue = own.getValue ?? parent.getValue;
  if (getValue) out.getValue = getValue;
  const setValue = own.setValue ?? parent.setValue;
  if (setValue) out.setValue = setValue;
  return out;
}

/**
 * The entry that governs this column, plus whether it counts as *explicit*
 * enablement of that one aggregation function.
 *
 * An entry read out of a `distribution` record — by aggFunc key, or via
 * `default` — is explicit. A top-level `distribution: true`/`false`/strategy, or
 * a column with no `distribution` at all, is not: those fall back to the
 * per-aggFunc built-in defaults, which disable `count`/`min`/`max`/`first`/`last`.
 */
interface PickedEntry {
  entry: EntryResolution;
  explicit: boolean;
}

/**
 * Picks the raw entry that governs this column, applying the documented
 * `distribution` / `default` / implicit-built-in resolution order.
 */
function pickEntry(options: GroupRowValueSetterOptions, info: AggFuncInfo): PickedEntry {
  const dist = options.distribution;

  if (dist === false || dist === null) return { entry: SUPPRESSED, explicit: false };
  if (typeof dist === 'string' || dist === true) return { entry: dist, explicit: false };
  if (isRecord(dist)) return pickRecordEntry(dist, info, options.default);
  // `distribution` omitted: `default` covers only custom aggFuncs; built-ins keep
  // their own defaults.
  if (info.custom && options.default !== undefined) {
    return { entry: options.default as EntryResolution, explicit: true };
  }
  return { entry: BUILT_IN, explicit: false };
}

/**
 * Interprets one record/`default` entry into a concrete plan.
 *
 * `explicit` marks a `true` that came from a per-aggFunc record entry (or a
 * `default` entry) rather than from a top-level `distribution: true`: only the
 * explicit form enables the five default-disabled aggregation functions.
 */
function interpretEntry(
  entry: unknown,
  info: AggFuncInfo,
  parent: EffectiveOptions,
  explicit = false,
): DistributionPlan | null {
  if (entry === SUPPRESSED) return null;
  if (entry === BUILT_IN) {
    const strategy = builtInDefault(info);
    return strategy === SUPPRESSED ? null : { kind: 'strategy', strategy, ...parent };
  }
  if (typeof entry === 'function') {
    return { kind: 'callback', callback: entry as GroupRowValueSetterFunc, ...parent };
  }
  if (entry === true) {
    const strategy = explicit ? explicitTrue(info) : builtInOrCustomOverwrite(info);
    return strategy === SUPPRESSED ? null : { kind: 'strategy', strategy, ...parent };
  }
  if (entry === false || entry === null) return null;
  if (isStrategy(entry)) return { kind: 'strategy', strategy: entry, ...parent };
  if (isRecord(entry)) {
    const merged = mergeOptions(parent, entry);
    const nested = entry['distribution'];
    if (nested === false || nested === null) return null;
    if (nested === true) {
      const strategy = explicit ? explicitTrue(info) : builtInOrCustomOverwrite(info);
      return strategy === SUPPRESSED ? null : { kind: 'strategy', strategy, ...merged };
    }
    if (isStrategy(nested)) return { kind: 'strategy', strategy: nested, ...merged };
    if (isRecord(nested)) {
      // Not part of the documented entry-object type, but tolerate a nested record.
      const picked = pickRecordEntry(nested, info, entry['default']);
      return interpretEntry(picked.entry, info, merged, picked.explicit);
    }
    // Inherit: fall through to the default for this aggFunc.
    const strategy = builtInDefault(info);
    return strategy === SUPPRESSED ? null : { kind: 'strategy', strategy, ...merged };
  }
  return null;
}

/**
 * True for the five aggregation functions whose distribution has no unique
 * inverse: `count`, `min`, `max`, `first`, `last`. They are disabled by default,
 * and — per the docs — the `default` fallback never applies to them: they must
 * be listed explicitly in the `distribution` record.
 */
function isNonDistributable(info: AggFuncInfo): boolean {
  return info.name != null && DEFAULT_DISABLED.has(info.name);
}

/**
 * Picks the entry that governs this aggFunc from a `distribution` record: the
 * per-aggFunc key, else `default` (which may live inside the record or beside it
 * on the parent options), else the built-in default. A named entry (or a
 * `default`) is explicit enablement; the built-in fallback is not.
 */
function pickRecordEntry(
  record: Record<string, unknown>,
  info: AggFuncInfo,
  outerDefault?: unknown,
): PickedEntry {
  const keyed = info.name != null ? record[info.name] : undefined;
  if (keyed !== undefined) return { entry: keyed as EntryResolution, explicit: true };
  // `default` covers unlisted custom aggFuncs and no-aggFunc columns, but never
  // the five non-distributable built-ins — those stay disabled unless named.
  const fallback = isNonDistributable(info) ? undefined : record['default'] !== undefined ? record['default'] : outerDefault;
  if (fallback !== undefined) return { entry: fallback as EntryResolution, explicit: true };
  return { entry: BUILT_IN, explicit: false };
}

/**
 * @internal — resolves the distribution plan for a column from its
 * `groupRowValueSetter` / `groupRowEditable` definition. Returns `null` when
 * distribution is suppressed, which also means the group cell is not editable.
 * Consumed by `RowGroupingEditService`; not part of the package's public API.
 */
export function resolveDistributionPlan(
  col: AgColumn | null | undefined,
  colDef?: ColDef | Record<string, unknown> | null,
): DistributionPlan | null {
  const def = colDef ?? col?.getColDef() ?? {};
  const info = aggFuncInfoFor(col);
  // `groupRowValueSetter` / `groupRowEditable` are already typed on `ColDef`, so
  // they are read through the real property names rather than re-declared here.
  const setter = def.groupRowValueSetter;

  if (setter === false || setter === null) return null;
  if (typeof setter === 'function') return { kind: 'callback', callback: setter as GroupRowValueSetterFunc };
  if (setter === true) {
    const strategy = builtInOrCustomOverwrite(info);
    return strategy === SUPPRESSED ? null : { kind: 'strategy', strategy };
  }
  if (isRecord(setter)) {
    // A record entry (by aggFunc key or via `default`) is the documented
    // *explicit* enablement path, so `true` there turns on the five
    // default-disabled aggregation functions.
    const picked = pickEntry(setter as GroupRowValueSetterOptions, info);
    return interpretEntry(picked.entry, info, asOptions(setter), picked.explicit);
  }
  // Not set: enabled implicitly when `groupRowEditable` is defined, using built-in defaults.
  if (def.groupRowEditable != null) {
    const strategy = builtInDefault(info);
    return strategy === SUPPRESSED ? null : { kind: 'strategy', strategy };
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Distribution arithmetic
 * ------------------------------------------------------------------ */

function unwrapNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('toNumber' in obj && typeof obj.toNumber === 'function') {
      const v = (obj.toNumber as () => unknown)();
      return typeof v === 'number' && !Number.isNaN(v) ? v : null;
    }
    if ('value' in obj) return unwrapNumber(obj['value']);
  }
  return null;
}

/**
 * Auto-detects rounding precision from the column's editor params, per the
 * documented rule: `cellEditorParams.precision`, else `0` when
 * `cellEditorParams.step` is a whole number, else no rounding.
 */
function autoPrecision(col: AgColumn | null | undefined): number | false {
  const params = (col?.getColDef() as Record<string, unknown> | undefined)?.['cellEditorParams'];
  if (!isRecord(params)) return false;
  const precision = params['precision'];
  if (typeof precision === 'number') return precision;
  const step = params['step'];
  if (typeof step === 'number' && Number.isInteger(step)) return 0;
  return false;
}

/** @internal — rounds to `precision` decimals, spreading the remainder so the total matches exactly. */
export function roundAndSpread(values: number[], precision: number): number[] {
  if (values.length === 0) return [];
  const factor = 10 ** precision;
  if (!Number.isFinite(factor) || factor === 0 || values.some((value) => !Number.isFinite(value * factor))) return values;
  const target = Math.round(values.reduce((total, value) => total + value, 0) * factor);
  const units = values.map((value) => Math.round(value * factor));
  let remainder = target - units.reduce((total, unit) => total + unit, 0);
  if (!Number.isSafeInteger(remainder)) return values;
  let index = 0;
  while (remainder !== 0) {
    const direction = remainder > 0 ? 1 : -1;
    const position = index % units.length;
    units[position] = (units[position] ?? 0) + direction;
    remainder -= direction;
    index++;
  }
  return units.map((unit) => unit / factor);
}

interface DistributionContext {
  children: IRowNode[];
  current: (number | null)[];
  newValue: number;
  oldValue: number | null;
  sumLike: boolean;
  count: number;
}

/**
 * The delta an `'increment'` distribution spreads, per the documented rule
 * `newValue − oldValue`.
 *
 * `GroupRowValueSetterParams.oldValue` is typed nullable, and a caller of the
 * public `distributeGroupValue(params, options?)` may pass `null`. The caller
 * supplies a fallback derived from the children: their total for sum and their
 * mean for avg. Supplying oldValue preserves weighted nested-group averages.
 */
function incrementDelta(newValue: number, oldValue: number | null, sum: number): number {
  return newValue - (oldValue ?? sum);
}

function computeIdeals(strategy: Strategy, ctx: DistributionContext): number[] {
  const { children, current, newValue, oldValue, sumLike, count } = ctx;
  const sum = current.reduce<number>((total, value) => total + (value ?? 0), 0);

  switch (strategy) {
    case 'overwrite':
      return children.map(() => newValue);
    case 'uniform':
      // `avg` assigns the edited value to every child so the average equals it.
      return children.map(() => (sumLike ? newValue / count : newValue));
    case 'percentage': {
      const baseline = sumLike ? sum : oldValue ?? sum / count;
      if (baseline === 0 || !Number.isFinite(baseline)) {
        return children.map(() => (sumLike ? newValue / count : newValue));
      }
      return current.map((value) => ((value ?? 0) / baseline) * newValue);
    }
    case 'increment': {
      const delta = incrementDelta(newValue, oldValue, sumLike ? sum : sum / count);
      return current.map((value) => (value ?? 0) + (sumLike ? delta / count : delta));
    }
  }
}

/** Integer rational arithmetic keeps bigint distribution exact above 2^53. */
function distributeBigInts(strategy: Strategy, current: bigint[], value: bigint, oldValue: bigint | null, average: boolean): bigint[] {
  const count = BigInt(current.length);
  const sum = current.reduce((a, b) => a + b, 0n);
  const target = average ? value * count : value;
  if (strategy === 'overwrite') return current.map(() => value);
  let denominator = count;
  let numerators: bigint[];
  if (strategy === 'percentage' && sum !== 0n) {
    denominator = sum;
    numerators = current.map((v) => v * target);
  } else if (strategy === 'increment') {
    const delta = value - (oldValue ?? (average ? sum / count : sum));
    numerators = current.map((v) => v * count + delta * (average ? count : 1n));
  } else {
    numerators = current.map(() => target);
  }
  const roundedQuotient = (numerator: bigint): bigint => {
    const positiveDenominator = denominator < 0n ? -denominator : denominator;
    const n = denominator < 0n ? -numerator : numerator;
    const floor = n / positiveDenominator - (n % positiveDenominator < 0n ? 1n : 0n);
    return floor + ((n - floor * positiveDenominator) * 2n >= positiveDenominator ? 1n : 0n);
  };
  const values = numerators.map(roundedQuotient);
  const total = numerators.reduce((a, b) => a + b, 0n) / denominator;
  let remainder = total - values.reduce((a, b) => a + b, 0n);
  for (let i = 0; remainder !== 0n; i++) {
    const direction = remainder > 0n ? 1n : -1n;
    const index = i % values.length;
    values[index] = values[index]! + direction;
    remainder -= direction;
  }
  return values;
}

function unwrapBigInt(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.round(value));
  if (isRecord(value) && 'value' in value) return unwrapBigInt(value['value']);
  return null;
}

/**
 * @internal — applies a resolved plan, writing distributed values to the group's
 * children. Returns `true` when at least one child value changed. Consumed by
 * `RowGroupingEditService`; not part of the package's public API.
 */
export function applyDistributionPlan(
  params: GroupRowValueSetterParams,
  plan: DistributionPlan,
): boolean {
  if (plan.kind === 'callback') {
    const result = plan.callback?.(params);
    return result == null ? true : !!result;
  }

  const children = (params.aggregatedChildren ?? []).filter((child) => child && !child.destroyed);
  if (children.length === 0) return false;

  const col = params.column as AgColumn;
  const colDef = col.getColDef();
  const common = { api: params.api, context: params.context };
  const readValue = (child: IRowNode): unknown =>
    plan.getValue
      ? plan.getValue({ ...common, node: child, data: child.data, column: col, colDef, groupParams: params })
      : child.getDataValue(col, 'value');

  const rawCurrent = children.map((child) => readValue(child));
  const current = rawCurrent.map((value) => unwrapNumber(value));
  const newValueRaw = params.newValue;
  const bigintValues = typeof newValueRaw === 'bigint' || rawCurrent.some((value) => typeof value === 'bigint');
  const newValue = unwrapNumber(newValueRaw);

  // Non-numeric edits have no meaningful division/scaling; write the value through.
  const strategy: Strategy = newValue == null ? 'overwrite' : plan.strategy ?? 'overwrite';

  let values: unknown[];
  if (newValue == null) {
    values = children.map(() => newValueRaw);
  } else if (bigintValues) {
    values = distributeBigInts(strategy, rawCurrent.map((v) => unwrapBigInt(v) ?? 0n),
      unwrapBigInt(newValueRaw)!, unwrapBigInt(params.oldValue), aggFuncInfoFor(col).name === 'avg');
  } else {
    const info = aggFuncInfoFor(col);
    const ctx: DistributionContext = {
      children,
      current,
      newValue,
      oldValue: unwrapNumber(params.oldValue),
      sumLike: info.name !== 'avg',
      count: children.length,
    };
    const ideals = computeIdeals(strategy, ctx);
    const precision = plan.precision !== undefined ? plan.precision : autoPrecision(col);
    const rounded = precision === false ? ideals : roundAndSpread(ideals, precision);
    values = rounded;
  }

  let changed = false;
  children.forEach((child, index) => {
    const value = values[index];
    const didChange = plan.setValue
      ? plan.setValue({ ...common, node: child, data: child.data, column: col, colDef, value, groupParams: params })
      : child.setDataValue(col, value, 'data');
    if (didChange) changed = true;
  });
  return changed;
}

/**
 * The built-in group row value distribution (the documented
 * `distributeGroupValue(params, options?)`). This is the module's public entry
 * point; every other symbol here is package-private.
 *
 * Strategies: `'uniform'` divides equally (for `avg`, assigns the edited value),
 * `'percentage'` scales children proportionally (falling back to `'uniform'` when
 * the current total is zero), `'increment'` distributes only the delta, and
 * `'overwrite'` writes the edited value to every child.
 *
 * @feature Row Grouping -> Editing Groups
 * @gridOption groupRowValueSetter
 */
export function distributeGroupValue(
  params: GroupRowValueSetterParams,
  options?: GroupRowValueSetterDistributionOptions | GroupRowValueSetterOptions,
): boolean {
  const info = aggFuncInfoFor(params.column as AgColumn);
  const raw = (options ?? {}) as Record<string, unknown>;
  // `explicit` comes from the resolution: a record entry (or `default`) of `true`
  // enables the five default-disabled aggregation functions, while a top-level
  // `distribution: true` keeps suppressing them.
  const picked = pickEntry(raw as GroupRowValueSetterOptions, info);
  const plan = interpretEntry(picked.entry, info, asOptions(raw), picked.explicit);
  if (!plan) return false;
  return applyDistributionPlan(params, plan);
}
