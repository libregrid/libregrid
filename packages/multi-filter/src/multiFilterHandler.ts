import type { DoesFilterPassParams, FilterHandlerParams, IMultiFilterModel } from 'ag-grid-community';

type ChildFilterModel = {
  filterType?: string;
  type?: string;
  filter?: unknown;
  caseSensitive?: boolean;
  values?: unknown[];
} | null;

/** Filtering half of Multi Filter when Community filter handlers are enabled. */
export class MultiFilterHandler {
  private params: FilterHandlerParams<unknown, unknown, IMultiFilterModel> | undefined;

  public init(params: FilterHandlerParams<unknown, unknown, IMultiFilterModel>): void {
    this.refresh(params);
  }

  public refresh(params: FilterHandlerParams<unknown, unknown, IMultiFilterModel>): void {
    this.params = params;
  }

  public doesFilterPass(params: DoesFilterPassParams): boolean {
    const models = this.params?.model?.filterModels;
    if (!models?.length) return true;
    const value = this.params?.getValue(params.node);
    return models.every((model) => this.modelPasses(model as ChildFilterModel, value));
  }

  public getModelAsString(model: IMultiFilterModel | null): string {
    return model?.filterModels?.filter(Boolean).map((child) => child.filter ?? child.type ?? child.filterType).join(' AND ') ?? '';
  }

  private modelPasses(model: ChildFilterModel, value: unknown): boolean {
    if (!model) return true;
    if (model.filterType === 'set') {
      const key = value === null ? null : value === undefined ? '__libregrid_undefined__' : String(value);
      return model.values?.includes(key) ?? false;
    }
    const type = model.type ?? 'contains';
    const actual = String(value ?? '');
    const expected = String(model.filter ?? '');
    const normalisedActual = model.caseSensitive ? actual : actual.toLocaleLowerCase();
    const normalisedExpected = model.caseSensitive ? expected : expected.toLocaleLowerCase();
    if (model.filterType === 'number' || model.filterType === 'date') {
      const left = Number(value);
      const right = Number(model.filter);
      if (Number.isNaN(left) || Number.isNaN(right)) return false;
      return type === 'equals' ? left === right : type === 'notEqual' ? left !== right : type === 'lessThan' ? left < right : type === 'lessThanOrEqual' ? left <= right : type === 'greaterThan' ? left > right : left >= right;
    }
    return type === 'equals' ? normalisedActual === normalisedExpected
      : type === 'notEqual' ? normalisedActual !== normalisedExpected
      : type === 'startsWith' ? normalisedActual.startsWith(normalisedExpected)
      : type === 'endsWith' ? normalisedActual.endsWith(normalisedExpected)
      : type === 'notContains' ? !normalisedActual.includes(normalisedExpected)
      : normalisedActual.includes(normalisedExpected);
  }
}
