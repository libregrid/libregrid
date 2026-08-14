import type { DoesFilterPassParams, FilterHandlerParams, SetFilterModel } from 'ag-grid-community';

/** Filtering half of Set Filter when Community filter handlers are enabled. */
export class SetFilterHandler {
  private params: FilterHandlerParams<unknown, unknown, SetFilterModel> | undefined;
  private keys: Set<string | null> | undefined;

  public init(params: FilterHandlerParams<unknown, unknown, SetFilterModel>): void {
    this.refresh(params);
  }

  public refresh(params: FilterHandlerParams<unknown, unknown, SetFilterModel>): void {
    this.params = params;
    this.keys = params.model ? new Set(params.model.values) : undefined;
  }

  public doesFilterPass(params: DoesFilterPassParams): boolean {
    if (!this.keys) return true;
    const value = this.params?.getValue(params.node);
    return this.keys.has(this.keyFor(value));
  }

  public getModelAsString(model: SetFilterModel | null): string {
    return model?.values.join(', ') ?? '';
  }

  private keyFor(value: unknown): string | null {
    if (value === null) return null;
    if (value === undefined) return '__libregrid_undefined__';
    const filterParams = this.params?.colDef.filterParams as {
      keyCreator?: (params: { value: unknown; api: unknown; context: unknown; colDef: unknown; column: unknown }) => string;
    } | undefined;
    const keyCreator = filterParams?.keyCreator ?? this.params?.colDef.keyCreator;
    return keyCreator && this.params
      ? keyCreator({
          value,
          api: this.params.api,
          context: this.params.context,
          colDef: this.params.colDef,
          column: this.params.column,
        } as never)
      : String(value);
  }
}
