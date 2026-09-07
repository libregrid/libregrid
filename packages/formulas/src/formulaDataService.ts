import { BeanStub, type BeanCollection, type FormulaDataSource, type GetFormulaParams, type IFormulaDataService, type NamedBean, type SetFormulaParams } from 'ag-grid-community';

/**
 * The `formulaDataSvc` bean — wraps the user's `gridOptions.formulaDataSource`
 * when one is configured. Community's edit path gates external formula storage
 * on `hasDataSource()`: with a data source, formula columns work even without
 * `field`/`valueSetter` (the store is the only storage); without one, `=...`
 * strings live in the row-data field via the normal setters and this bean
 * reports no data source.
 *
 * The user data source's `init({ api, context })` runs on bean init and
 * `destroy()` on teardown, per the documented `FormulaDataSource` contract.
 *
 * @feature Formulas
 */
export class FormulaDataService extends BeanStub implements IFormulaDataService, NamedBean {
  public readonly beanName = 'formulaDataSvc' as const;

  private dataSource: FormulaDataSource | undefined;
  /** Whether `dataSource` is an instance this bean owns and must tear down. */
  private owned = false;

  public postConstruct(): void {
    this.dataSource = this.gos.get('formulaDataSource');
    this.owned = this.dataSource !== undefined;
    if (this.dataSource?.init) {
      this.initDataSource(this.dataSource);
    }
  }

  public override destroy(): void {
    this.releaseDataSource();
    super.destroy();
  }

  public hasDataSource(): boolean {
    return this.dataSource !== undefined;
  }

  public getFormula(params: GetFormulaParams): string | undefined {
    return this.dataSource?.getFormula(params);
  }

  public setFormula(params: SetFormulaParams): void {
    this.dataSource?.setFormula(params);
    // The formula service caches store reads per cell — a write (or clear)
    // through the data source must drop the cached entry, or the next read
    // (including Community's immediate re-evaluation inside the commit path)
    // returns the pre-write text.
    (this.beans as unknown as {
      formula?: { invalidateCellFormula?(row: unknown, column: unknown): void };
    }).formula?.invalidateCellFormula?.(params.rowNode, params.column);
  }

  /** Re-read `formulaDataSource` after a runtime grid-option swap. */
  public refreshDataSource(): void {
    const next = this.gos.get('formulaDataSource');
    if (next === this.dataSource) return;
    this.releaseDataSource();
    this.dataSource = next;
    this.owned = next !== undefined;
    if (next?.init) {
      this.initDataSource(next);
    }
  }

  /** User lifecycle hook — a throw must not break grid construction. */
  private initDataSource(dataSource: FormulaDataSource): void {
    try {
      dataSource.init!({ api: this.beans.gridApi, context: this.gos.get('context') });
    } catch (e) {
      console.error('formulas: formulaDataSource.init() threw', e);
    }
  }

  /** Tear down and forget the held data source, if any. */
  private releaseDataSource(): void {
    if (this.owned) {
      this.owned = false;
      try {
        this.dataSource?.destroy?.();
      } catch (e) {
        console.error('formulas: formulaDataSource.destroy() threw', e);
      }
    }
    this.dataSource = undefined;
  }
}

/** Guard for tests: whether a bean collection carries the data service. */
export function hasFormulaDataSvc(beans: BeanCollection): boolean {
  return beans.formulaDataSvc !== undefined;
}
