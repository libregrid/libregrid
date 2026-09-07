/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { FormulaDataService, hasFormulaDataSvc } from './formulaDataService';
import type { FormulaDataSource } from 'ag-grid-community';

function makeDataSource(overrides: Partial<FormulaDataSource> = {}): FormulaDataSource {
  return {
    getFormula: () => undefined,
    setFormula: () => undefined,
    ...overrides,
  } as FormulaDataSource;
}

describe('FormulaDataService', () => {
  it('initialises the data source with api and context', () => {
    const init = vi.fn();
    const context = { beanName: 'ctx' };
    const dataSource = makeDataSource({ init: init as unknown as FormulaDataSource['init'] });
    const { bean, beans, gos } = makeBeanHarness(FormulaDataService, {
      gridOptions: { formulaDataSource: dataSource, context },
      beans: { gridApi: {} },
    });
    expect(bean.hasDataSource()).toBe(true);
    expect(init).toHaveBeenCalledWith({ api: beans.gridApi, context });
    expect(gos.get('formulaDataSource')).toBe(dataSource);
  });

  it('passes getFormula/setFormula through and destroys on teardown', () => {
    const destroy = vi.fn();
    const dataSource = makeDataSource({
      getFormula: () => '=A1',
      setFormula: vi.fn(),
      destroy,
    });
    const { bean } = makeBeanHarness(FormulaDataService, {
      gridOptions: { formulaDataSource: dataSource },
      beans: { gridApi: {} },
    });
    expect(bean.getFormula({ column: {} as never, rowNode: {} as never })).toBe('=A1');
    bean.setFormula({ column: {} as never, rowNode: {} as never, formula: '=B2' });
    bean.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(bean.hasDataSource()).toBe(false);
  });

  it('survives throwing init and destroy hooks without breaking the grid', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const throwing = makeDataSource({
      init: (() => {
        throw new Error('boom');
      }) as unknown as FormulaDataSource['init'],
      destroy: () => {
        throw new Error('teardown boom');
      },
    });
    const { bean } = makeBeanHarness(FormulaDataService, {
      gridOptions: { formulaDataSource: throwing },
      beans: { gridApi: {} },
    });
    expect(err).toHaveBeenCalledWith('formulas: formulaDataSource.init() threw', expect.any(Error));
    bean.destroy();
    expect(err).toHaveBeenCalledWith('formulas: formulaDataSource.destroy() threw', expect.any(Error));
    expect(bean.hasDataSource()).toBe(false);

    const destroy = vi.fn(() => {
      throw new Error('teardown boom');
    });
    const second = makeDataSource({ destroy });
    const h2 = makeBeanHarness(FormulaDataService, {
      gridOptions: { formulaDataSource: second },
      beans: { gridApi: {} },
    });
    h2.bean.destroy();
    expect(err).toHaveBeenCalledWith('formulas: formulaDataSource.destroy() threw', expect.any(Error));
    err.mockRestore();
  });

  it('reports no data source when the grid option is unset', () => {
    const { bean } = makeBeanHarness(FormulaDataService, { gridOptions: {}, beans: {} });
    expect(bean.hasDataSource()).toBe(false);
    expect(bean.getFormula({ column: {} as never, rowNode: {} as never })).toBeUndefined();
  });

  it('refreshDataSource swaps instances: destroys the old, inits the new', () => {
    const destroyA = vi.fn();
    const initB = vi.fn();
    const a = makeDataSource({ destroy: destroyA });
    const b = makeDataSource({ init: initB as unknown as FormulaDataSource['init'] });
    const harness = makeBeanHarness(FormulaDataService, {
      gridOptions: { formulaDataSource: a },
      beans: { gridApi: {} },
    });
    harness.gos.set('formulaDataSource', b);
    harness.bean.refreshDataSource();
    expect(destroyA).toHaveBeenCalledTimes(1);
    expect(initB).toHaveBeenCalledTimes(1);
    expect(harness.bean.hasDataSource()).toBe(true);
  });

  it('refreshDataSource is a no-op when the instance is unchanged and clears when unset', () => {
    const destroyA = vi.fn();
    const a = makeDataSource({ destroy: destroyA });
    const harness = makeBeanHarness(FormulaDataService, {
      gridOptions: { formulaDataSource: a },
      beans: { gridApi: {} },
    });
    harness.bean.refreshDataSource();
    expect(destroyA).not.toHaveBeenCalled();

    harness.gos.set('formulaDataSource', undefined);
    harness.bean.refreshDataSource();
    expect(destroyA).toHaveBeenCalledTimes(1);
    expect(harness.bean.hasDataSource()).toBe(false);
  });

  it('hasFormulaDataSvc guards on the bean collection', () => {
    expect(hasFormulaDataSvc({ formulaDataSvc: {} } as never)).toBe(true);
    expect(hasFormulaDataSvc({} as never)).toBe(false);
  });
});
