import { BeanStub, _warnOnce, type NamedBean } from 'ag-grid-community';
import type {
  AgColumn,
  IAggFunc,
  IAggFuncParams,
  IAggFuncResult,
  IAggFuncService,
} from 'ag-grid-community';

type AggValue = number | bigint | null;

function isAggResult(value: unknown): value is IAggFuncResult<AggValue> {
  return typeof value === 'object' && value !== null && 'toString' in value;
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (isAggResult(value)) {
    const v = value.toNumber?.() ?? value.value;
    return typeof v === 'number' ? v : v == null ? null : Number(v);
  }
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  return null;
}

function makeResult(value: number, count: number): IAggFuncResult<number> {
  return {
    value,
    count,
    toString: () => String(value),
    toNumber: () => value,
  };
}

function sum(values: unknown[]): number | null {
  let total = 0;
  let found = false;
  for (const v of values) {
    const n = toNumber(v);
    if (n != null) {
      total += n;
      found = true;
    }
  }
  return found ? total : null;
}

function min(values: unknown[]): number | null {
  let result: number | null = null;
  for (const v of values) {
    const n = toNumber(v);
    if (n != null && (result == null || n < result)) result = n;
  }
  return result;
}

function max(values: unknown[]): number | null {
  let result: number | null = null;
  for (const v of values) {
    const n = toNumber(v);
    if (n != null && (result == null || n > result)) result = n;
  }
  return result;
}

function count(values: unknown[]): IAggFuncResult<number> | null {
  let total = 0;
  for (const v of values) {
    if (v == null) continue;
    if (isAggResult(v) && v.count != null) {
      total += v.count;
    } else {
      total += 1;
    }
  }
  return makeResult(total, total);
}

function avg(values: unknown[]): IAggFuncResult<number> | null {
  let sumTotal = 0;
  let countTotal = 0;
  for (const v of values) {
    if (v == null) continue;
    if (isAggResult(v)) {
      const childValue = toNumber(v);
      const childCount = v.count ?? 1;
      if (childValue != null) {
        sumTotal += childValue * childCount;
        countTotal += childCount;
      }
    } else {
      const n = toNumber(v);
      if (n != null) {
        sumTotal += n;
        countTotal += 1;
      }
    }
  }
  if (countTotal === 0) return null;
  return makeResult(sumTotal / countTotal, countTotal);
}

function first(values: unknown[]): unknown {
  for (const v of values) {
    if (v != null) return v;
  }
  return null;
}

function last(values: unknown[]): unknown {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v != null) return v;
  }
  return null;
}

const BUILT_IN_LABELS: Record<string, string> = {
  sum: 'Sum',
  min: 'Min',
  max: 'Max',
  count: 'Count',
  avg: 'Average',
  first: 'First',
  last: 'Last',
};

/**
 * Aggregation function registry — bean `aggFuncSvc`.
 *
 * Ships the seven built-in functions and accepts custom functions via the
 * `aggFuncs` grid option and the `addAggFuncs` API.
 *
 * @feature Row Grouping -> Aggregation
 * @gridOption aggFuncs
 */
export class AggFuncService extends BeanStub implements IAggFuncService, NamedBean {
  beanName = 'aggFuncSvc' as const;

  private aggFuncs: Record<string, IAggFunc> = {};

  public postConstruct(): void {
    this.addBuiltIns();
    const custom = this.gos.get('aggFuncs') as Record<string, IAggFunc> | undefined;
    if (custom) this.addAggFuncs(custom);
    this.addManagedPropertyListener('aggFuncs', () => this.reloadFromOptions());
  }

  private addBuiltIns(): void {
    this.aggFuncs = {
      sum: (params: IAggFuncParams) => sum(params.values),
      min: (params: IAggFuncParams) => min(params.values),
      max: (params: IAggFuncParams) => max(params.values),
      count: (params: IAggFuncParams) => count(params.values),
      avg: (params: IAggFuncParams) => avg(params.values),
      first: (params: IAggFuncParams) => first(params.values),
      last: (params: IAggFuncParams) => last(params.values),
    };
  }

  private reloadFromOptions(): void {
    const custom = this.gos.get('aggFuncs') as Record<string, IAggFunc> | undefined;
    if (custom) this.addAggFuncs(custom);
  }

  public addAggFuncs(aggFuncs: Record<string, IAggFunc>): void {
    for (const [name, func] of Object.entries(aggFuncs)) {
      this.aggFuncs[name] = func;
    }
  }

  public clear(): void {
    this.aggFuncs = {};
  }

  public getAggFunc(name: string): IAggFunc {
    const func = this.aggFuncs[name];
    if (!func) {
      _warnOnce(`LibreGrid: aggregation function '${name}' not found`);
    }
    return func as IAggFunc;
  }

  public getDefaultAggFunc(column: AgColumn): string | null {
    const colDef = column.getColDef();
    return (colDef.defaultAggFunc as string | undefined) ?? 'sum';
  }

  public getFuncNames(column: AgColumn): string[] {
    const colDef = column.getColDef();
    const allowed = colDef.allowedAggFuncs as string[] | undefined;
    return allowed ?? Object.keys(this.aggFuncs);
  }

  public getDefaultFuncLabel(funcName: string): string {
    return BUILT_IN_LABELS[funcName] ?? funcName;
  }
}
