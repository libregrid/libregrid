import { describe, expect, it } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { EnterpriseCoreModule } from '@libregrid/core';
import { FormulaDataService } from './formulaDataService';
import { FormulaInputManager } from './formulaInputManager';
import { FormulaService } from './formulaService';
import { FormulasModule, type FormulasGridApi } from './formulasModule';

describe('FormulasModule (unit)', () => {
  it('registers under the Formula module name with the reserved API slot', () => {
    expect(FormulasModule.moduleName).toBe('Formula');
    expect(FormulasModule.enterprise).toBe(true);
    expect(FormulasModule.dependsOn).toContain(EnterpriseCoreModule);
    expect(FormulasModule.beans).toEqual([FormulaService, FormulaDataService, FormulaInputManager]);
    expect(FormulasModule.userComponents?.agFormulaCellEditor).toBeDefined();
    expect(Object.keys(FormulasModule.apiFunctions ?? {})).toEqual(['refreshFormulas']);
  });

  it('refreshFormulas invalidates the whole cache and reports no-ops', () => {
    const cached = {
      active: true,
      hasCachedRows: () => true,
      refreshFormulas: (_refreshRows: boolean) => undefined,
      refreshRow: (_row: unknown) => true,
    };
    expect(
      FormulasModule.apiFunctions!.refreshFormulas({ formula: cached } as never, undefined),
    ).toBe(true);

    const empty = { active: true, hasCachedRows: () => false, refreshFormulas: () => undefined, refreshRow: () => true };
    expect(FormulasModule.apiFunctions!.refreshFormulas({ formula: empty } as never, undefined)).toBe(false);

    const inactive = { active: false, hasCachedRows: () => true };
    expect(FormulasModule.apiFunctions!.refreshFormulas({ formula: inactive } as never, undefined)).toBe(false);

    const rowCached = { active: true, refreshRow: (row: unknown) => row === 'known' };
    expect(FormulasModule.apiFunctions!.refreshFormulas({ formula: rowCached } as never, 'known')).toBe(true);
    expect(FormulasModule.apiFunctions!.refreshFormulas({ formula: rowCached } as never, 'unknown')).toBe(false);
    expect(FormulasModule.apiFunctions!.refreshFormulas({} as never, undefined)).toBe(false);
  });

  it('types the module against the reserved GridApi surface', () => {
    // Compile-time check: refreshFormulas must appear on the module API type.
    const api: keyof FormulasGridApi = 'refreshFormulas';
    expect(api).toBe('refreshFormulas');
  });
});

describe('FormulaInputManager (unit)', () => {
  it('tracks a single active editor and runs the deactivate callback once', () => {
    const harness = makeBeanHarness(FormulaInputManager, {});
    const bean = harness.bean as unknown as FormulaInputManager;
    let deactivated = 0;
    expect(bean.registerActiveEditor(1, () => deactivated++)).toBe(true);
    expect(bean.isActiveEditor(1)).toBe(true);
    expect(bean.registerActiveEditor(1, () => deactivated++)).toBe(false);
    bean.unregisterActiveEditor(1, () => deactivated++);
    expect(deactivated).toBe(1);
    expect(bean.isActiveEditor(1)).toBe(false);
    bean.unregisterActiveEditor(1, () => deactivated++); // no-op
    expect(deactivated).toBe(1);
    harness.destroy();
  });
});

describe('FormulaDataService (unit)', () => {
  it('reports no data source without the grid option', () => {
    const harness = makeBeanHarness(FormulaDataService, { gridOptions: {} });
    expect(harness.bean.hasDataSource()).toBe(false);
    expect(harness.bean.getFormula({} as never)).toBeUndefined();
    harness.destroy();
  });

  it('initialises, delegates and destroys the user data source', () => {
    const calls: string[] = [];
    const store = new Map<string, string>();
    const harness = makeBeanHarness(FormulaDataService, {
      gridOptions: {
        formulaDataSource: {
          init: () => calls.push('init'),
          getFormula: () => store.get('k'),
          setFormula: () => calls.push('set'),
          destroy: () => calls.push('destroy'),
        },
      },
    });
    expect(calls).toEqual(['init']);
    expect(harness.bean.hasDataSource()).toBe(true);
    harness.bean.setFormula({ formula: 'v' } as never);
    expect(calls).toEqual(['init', 'set']);
    harness.destroy();
    expect(calls).toEqual(['init', 'set', 'destroy']);
  });
});
