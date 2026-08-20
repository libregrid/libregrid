/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import type {
  AgColumn,
  AgShowValuesAsResolved,
  IRowNode,
  MenuItemDef,
  RowNode,
  ShowValuesAsType,
} from 'ag-grid-community';
import { ShowValuesAsService } from './showValuesAsService';

interface FakeColumnOptions {
  colId?: string;
  colDef?: Record<string, unknown>;
  showValuesAs?: AgShowValuesAsResolved | null;
  showValuesAsDef?: Record<string, unknown> | null;
  aggFunc?: string | null;
}

// `defaults` simulates the defaultColDef portion of the def that Community
// merges into `column.getColDef()` (Community deep-merges defaultColDef into
// each column's colDef; the stub reproduces the scalar-merge the service sees).
function makeColumn(opts: FakeColumnOptions = {}, defaults: Record<string, unknown> = {}) {
  const dispatchStateUpdatedEvent = vi.fn();
  const col = {
    showValuesAs: opts.showValuesAs ?? null,
    showValuesAsDef: opts.showValuesAsDef,
    getColId: () => opts.colId ?? 'sales',
    getColDef: () => ({ ...defaults, ...(opts.colDef ?? {}) }),
    getAggFunc: () => opts.aggFunc ?? null,
    dispatchStateUpdatedEvent,
  };
  return col as unknown as AgColumn & { dispatchStateUpdatedEvent: ReturnType<typeof vi.fn> };
}

function resolved(type: string, overrides: Record<string, unknown> = {}): AgShowValuesAsResolved {
  return { type, precision: 2, ...overrides } as unknown as AgShowValuesAsResolved;
}

interface HarnessBeans {
  colModel?: { getCols: () => AgColumn[] };
  gridApi?: {
    refreshCells: ReturnType<typeof vi.fn>;
    isPivotMode?: () => boolean;
    setColumnAggFunc?: ReturnType<typeof vi.fn>;
    applyColumnState?: ReturnType<typeof vi.fn>;
  };
  rowModel?: { getType: () => string; rootNode: unknown };
  valueColsSvc?: { columns: AgColumn[] };
  valueSvc?: { getValueFromData: (col: AgColumn, node: RowNode) => unknown };
}

function harness(extraBeans: HarnessBeans = {}) {
  return makeBeanHarness(ShowValuesAsService, { gridOptions: {}, beans: { ...extraBeans } });
}

function rootWithAggData(aggData: Record<string, unknown>) {
  return { getType: () => 'clientSide', rootNode: { aggData } };
}

describe('ShowValuesAsService', () => {
  describe('resolveColumn', () => {
    it('clears resolved state when colDef.showValuesAsDef is null', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({
        colDef: { showValuesAsDef: null },
        showValuesAs: resolved('percentOfGrandTotal'),
        showValuesAsDef: { precision: 4 },
      });
      bean.resolveColumn(col, true);
      expect(col.showValuesAsDef).toBeNull();
      expect(col.showValuesAs).toBeNull();
      destroy();
    });

    it('defaults precision to 2, suppressHeaderIndicator undefined, and resolves the five built-in modes', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ colDef: {} });
      bean.resolveColumn(col, true);
      expect(col.showValuesAsDef?.precision).toBe(2);
      expect(col.showValuesAsDef?.suppressHeaderIndicator).toBeUndefined();
      expect(Object.keys(col.showValuesAsDef?.modes ?? {}).sort()).toEqual([
        'percentOfColumnTotal',
        'percentOfGrandTotal',
        'percentOfParentColumnTotal',
        'percentOfParentRowTotal',
        'percentOfRowTotal',
      ]);
      expect(col.showValuesAs).toBeNull();
      destroy();
    });

    it('deep-merges showValuesAsDef.modes over the built-ins', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({
        colDef: {
          showValuesAsDef: {
            modes: {
              percentOfGrandTotal: { displayName: 'Custom' },
              percentOfRowTotal: false,
              doubled: { displayName: 'Doubled', transform: (p: { rawValue: number }) => p.rawValue * 2 },
            },
          },
        },
      });
      bean.resolveColumn(col, true);
      const modes = col.showValuesAsDef?.modes ?? {};
      expect(modes.percentOfGrandTotal?.def?.displayName).toBe('Custom');
      // built-in behaviour preserved where not overridden
      expect(typeof modes.percentOfGrandTotal?.def?.transform).toBe('function');
      expect(modes.percentOfRowTotal).toBeUndefined(); // disabled
      expect(Object.keys(modes)).toHaveLength(5); // 5 built-ins - 1 disabled + 1 custom
      destroy();
    });

    it('supports function mode entries receiving the base def', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({
        colDef: {
          showValuesAsDef: {
            modes: { percentOfGrandTotal: (base: { displayName?: string }) => ({ displayName: `${base.displayName}!` }) },
          },
        },
      });
      bean.resolveColumn(col, true);
      expect(col.showValuesAsDef?.modes?.percentOfGrandTotal?.def?.displayName).toBe('% of Grand Total!');
      destroy();
    });

    it('merges defaultColDef.showValuesAsDef with per-column entries', () => {
      const { bean, destroy } = makeBeanHarness(ShowValuesAsService, {
        gridOptions: {
          defaultColDef: { showValuesAsDef: { precision: 3, modes: { percentOfGrandTotal: { displayName: 'Grid' } } } },
        },
      });
      const col = makeColumn({ colDef: { showValuesAsDef: { precision: 5 } } });
      bean.resolveColumn(col, true);
      expect(col.showValuesAsDef?.precision).toBe(5); // per-column wins
      expect(col.showValuesAsDef?.modes?.percentOfGrandTotal?.def?.displayName).toBe('Grid'); // grid-wide mode entry
      destroy();
    });

    it('uses initialShowValuesAs when applyInitial and showValuesAs is unset', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ colDef: { initialShowValuesAs: 'percentOfGrandTotal' } });
      bean.resolveColumn(col, true);
      expect(col.showValuesAs?.type).toBe('percentOfGrandTotal');
      destroy();
    });

    it('prefers showValuesAs over initialShowValuesAs, and ignores initial when applyInitial is false', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({
        colDef: { showValuesAs: 'percentOfRowTotal', initialShowValuesAs: 'percentOfGrandTotal' },
      });
      bean.resolveColumn(col, true);
      expect(col.showValuesAs?.type).toBe('percentOfRowTotal');

      const col2 = makeColumn({ colDef: { initialShowValuesAs: 'percentOfGrandTotal' } });
      bean.resolveColumn(col2, false);
      expect(col2.showValuesAs).toBeNull();
      destroy();
    });

    it('honours colDef.showValuesAsDef.precision', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ colDef: { showValuesAsDef: { precision: 4 } } });
      bean.resolveColumn(col, true);
      expect(col.showValuesAsDef?.precision).toBe(4);
      destroy();
    });
  });

  describe('colDefSelection / toColState', () => {
    it('colDefSelection returns showValuesAs or null', () => {
      const { bean, destroy } = harness();
      expect(bean.colDefSelection({ showValuesAs: 'percentOfGrandTotal' })).toBe('percentOfGrandTotal');
      expect(bean.colDefSelection({})).toBeNull();
      destroy();
    });

    it('toColState returns null when nothing is applied', () => {
      const { bean, destroy } = harness();
      expect(bean.toColState(makeColumn())).toBeNull();
      destroy();
    });

    it('toColState returns type, params and precision when applied', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfRowTotal', { params: { foo: 1 }, precision: 3 }) });
      expect(bean.toColState(col)).toEqual({ type: 'percentOfRowTotal', params: { foo: 1 }, precision: 3 });
      destroy();
    });
  });

  describe('syncColState', () => {
    it('applies stateItem.showValuesAs with priority over defaultState', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAsDef: { precision: 2 } });
      bean.syncColState(
        col,
        { showValuesAs: 'percentOfRowTotal' } as never,
        { showValuesAs: 'percentOfGrandTotal' } as never,
        'api',
      );
      expect(col.showValuesAs?.type).toBe('percentOfRowTotal');
      destroy();
    });

    it('falls back to defaultState when stateItem has no showValuesAs', () => {
      const { bean, destroy } = harness();
      const col = makeColumn();
      bean.syncColState(col, null, { showValuesAs: 'percentOfGrandTotal' } as never, 'api');
      expect(col.showValuesAs?.type).toBe('percentOfGrandTotal');
      destroy();
    });

    it('clears the selection when neither provides one', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfGrandTotal') });
      bean.syncColState(col, null, undefined, 'api');
      expect(col.showValuesAs).toBeNull();
      destroy();
    });
  });

  describe('isApplying', () => {
    it('returns false when no mode is resolved', () => {
      const { bean, destroy } = harness();
      expect(bean.isApplying(makeColumn())).toBe(false);
      destroy();
    });

    it('returns false for percentOfParentColumnTotal, true otherwise', () => {
      const { bean, destroy } = harness();
      expect(bean.isApplying(makeColumn({ showValuesAs: resolved('percentOfParentColumnTotal') }))).toBe(false);
      expect(bean.isApplying(makeColumn({ showValuesAs: resolved('percentOfGrandTotal') }))).toBe(true);
      destroy();
    });
  });

  describe('refreshRenderedCells', () => {
    it('force-refreshes via gridApi', () => {
      const gridApi = { refreshCells: vi.fn() };
      const { bean, destroy } = harness({ gridApi });
      bean.refreshRenderedCells();
      expect(gridApi.refreshCells).toHaveBeenCalledWith({ force: true });
      destroy();
    });

    it('refreshRenderedCellsExcept delegates to refreshRenderedCells', () => {
      const gridApi = { refreshCells: vi.fn() };
      const { bean, destroy } = harness({ gridApi });
      bean.refreshRenderedCellsExcept(null, null);
      expect(gridApi.refreshCells).toHaveBeenCalledWith({ force: true });
      destroy();
    });
  });

  describe('transform', () => {
    it('returns the raw value untouched when no mode is resolved', () => {
      const { bean, destroy } = harness();
      expect(bean.transform(makeColumn(), {} as IRowNode, 42)).toBe(42);
      destroy();
    });

    it('returns null when the raw value is not numeric', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfGrandTotal') });
      expect(bean.transform(col, {} as IRowNode, 'abc')).toBeNull();
      expect(bean.transform(col, {} as IRowNode, null)).toBeNull();
      expect(bean.transform(col, {} as IRowNode, Number.NaN)).toBeNull();
      destroy();
    });

    it('returns the raw value untouched for an unknown resolved type', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('bogusMode') });
      expect(bean.transform(col, {} as IRowNode, 7)).toBe(7);
      destroy();
    });

    it('accepts objects exposing toNumber()', () => {
      const { bean, destroy } = harness({
        rowModel: rootWithAggData({ sales: 200 }),
      });
      const col = makeColumn({ showValuesAs: resolved('percentOfGrandTotal') });
      expect(bean.transform(col, {} as IRowNode, { toNumber: () => 50 })).toBe(25);
      expect(bean.transform(col, {} as IRowNode, { toNumber: () => 'x' })).toBeNull();
      expect(bean.transform(col, {} as IRowNode, {})).toBeNull();
      destroy();
    });

    it('percentOfColumnTotal computes against the grand total', () => {
      const { bean, destroy } = harness({
        rowModel: rootWithAggData({ sales: 400 }),
      });
      const col = makeColumn({ showValuesAs: resolved('percentOfColumnTotal') });
      expect(bean.transform(col, {} as IRowNode, 100)).toBe(25);
      destroy();
    });

    it('percentOfParentColumnTotal is dormant without pivot (raw value passes through)', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfParentColumnTotal') });
      expect(bean.isApplying(col)).toBe(false);
      expect(bean.transform(col, {} as IRowNode, 100)).toBe(100);
      destroy();
    });

    it('percentOfParentColumnTotal stays dormant under pivot (no pivot-axis totals)', () => {
      const { bean, destroy } = harness({ gridApi: { refreshCells: vi.fn(), isPivotMode: () => true } });
      const col = makeColumn({ showValuesAs: resolved('percentOfParentColumnTotal') });
      expect(bean.isApplying(col)).toBe(false);
      expect(bean.transform(col, {} as IRowNode, 100)).toBe(100);
      destroy();
    });

    it('unwraps { value, count } aggregation wrappers (avg results)', () => {
      const { bean, destroy } = harness({ rowModel: rootWithAggData({ sales: 200 }) });
      const col = makeColumn({ showValuesAs: resolved('percentOfGrandTotal') });
      expect(bean.transform(col, {} as IRowNode, { value: 50, count: 2 })).toBe(25);
      destroy();
    });

    it('returns null when the grand total is zero', () => {
      const { bean, destroy } = harness({
        rowModel: rootWithAggData({ sales: 0 }),
      });
      const col = makeColumn({ showValuesAs: resolved('percentOfGrandTotal') });
      expect(bean.transform(col, {} as IRowNode, 5)).toBeNull();
      destroy();
    });
  });

  describe('formatValue', () => {
    it('returns #N/A when notApplicable (a dormant selected mode)', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfParentColumnTotal') });
      expect(bean.formatValue(col, null, 100, 100, true)).toBe('#N/A');
      destroy();
    });

    it('returns null when the transformed value is null', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfGrandTotal') });
      expect(bean.formatValue(col, null, null, 12, false)).toBe('');
      destroy();

      // no mode at all -> no formatter -> null (Community falls back to default rendering)
      const { bean: bean2, destroy: destroy2 } = harness();
      expect(bean2.formatValue(makeColumn(), null, 12, 12, false)).toBeNull();
      destroy2();
    });

    it('uses resolved precision, then showValuesAsDef precision, then 2', () => {
      const { bean, destroy } = harness();
      const fromResolved = makeColumn({ showValuesAs: resolved('percentOfGrandTotal', { precision: 1 }) });
      expect(bean.formatValue(fromResolved, null, 12.345, 1, false)).toBe('12.3%');

      const fromDef = makeColumn({
        showValuesAsDef: { precision: 4 },
        showValuesAs: resolved('percentOfGrandTotal', { precision: undefined }),
      });
      expect(bean.formatValue(fromDef, null, 12.345678, 1, false)).toBe('12.3457%');

      const fromDefault = makeColumn({ showValuesAs: resolved('percentOfGrandTotal', { precision: undefined }) });
      expect(bean.formatValue(fromDefault, null, 12.345, 1, false)).toBe('12.35%');
      destroy();
    });
  });

  describe('getActiveModeLabel / getActiveModeTooltip', () => {
    it('getActiveModeLabel is null for unknown or dormant modes', () => {
      const { bean, destroy } = harness();
      expect(bean.getActiveModeLabel(makeColumn({ showValuesAs: resolved('bogusMode') }))).toBeNull();
      expect(
        bean.getActiveModeLabel(makeColumn({ showValuesAs: resolved('percentOfParentColumnTotal') })),
      ).toBeNull();
      expect(bean.getActiveModeLabel(makeColumn({ showValuesAs: resolved('percentOfGrandTotal') }))).toBe(
        '% of Grand Total',
      );
      destroy();
    });

    it('getActiveModeTooltip returns null when nothing is resolved or the mode is unknown', () => {
      const { bean, destroy } = harness();
      expect(bean.getActiveModeTooltip(makeColumn())).toBeNull();
      expect(bean.getActiveModeTooltip(makeColumn({ showValuesAs: resolved('bogusMode') }))).toBeNull();
      destroy();
    });

    it('getActiveModeTooltip combines display name and description', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfGrandTotal') });
      expect(bean.getActiveModeTooltip(col)).toBe(
        "% of Grand Total: This cell's value as a percentage of the column's grand total",
      );
      destroy();
    });
  });

  describe('isMenuEligible', () => {
    it('requires colDef.enableShowValuesAs === true when only set per-column', () => {
      const { bean, destroy } = harness();
      expect(bean.isMenuEligible(makeColumn({ colDef: { enableShowValuesAs: true } }))).toBe(true);
      expect(bean.isMenuEligible(makeColumn({ colDef: { enableShowValuesAs: false } }))).toBe(false);
      expect(bean.isMenuEligible(makeColumn())).toBe(false);
      destroy();
    });

    it('via defaultColDef, applies to numeric-type or aggregated columns only', () => {
      const { bean, destroy } = makeBeanHarness(ShowValuesAsService, {
        gridOptions: { defaultColDef: { enableShowValuesAs: true } },
      });
      // The flag is visible on the merged colDef, as Community produces it.
      const defaults = { enableShowValuesAs: true };
      expect(bean.isMenuEligible(makeColumn({ colDef: { cellDataType: 'number' } }, defaults))).toBe(true);
      expect(bean.isMenuEligible(makeColumn({ colDef: { cellDataType: 'bigNumber' } }, defaults))).toBe(true);
      expect(bean.isMenuEligible(makeColumn({ aggFunc: 'sum' }, defaults))).toBe(true);
      expect(bean.isMenuEligible(makeColumn({ colDef: { cellDataType: 'string' } }, defaults))).toBe(false);
      expect(bean.isMenuEligible(makeColumn({}, defaults))).toBe(false);
      destroy();
    });
  });

  describe('getMenuItems', () => {
    it('offers None plus one item per available mode, checking the active one', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfRowTotal') });
      const items = bean.getMenuItems(col, () => '');
      // percentOfParentColumnTotal is hidden: it only applies under pivot
      expect(items.map((i) => i.name)).toEqual([
        'None',
        '% of Grand Total',
        '% of Column Total',
        '% of Row Total',
        '% of Parent Row Total',
      ]);
      expect(items[0].checked).toBe(false);
      expect(items.find((i) => i.name === '% of Row Total')?.checked).toBe(true);
      expect(items.find((i) => i.name === '% of Grand Total')?.checked).toBe(false);
      destroy();
    });

    it('keeps the hidden percentOfParentColumnTotal visible (checked, disabled) when it is the active selection', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfParentColumnTotal') });
      const items = bean.getMenuItems(col, () => '');
      const item = items.find((i) => i.name === '% of Parent Column Total')!;
      expect(item.checked).toBe(true);
      expect(item.disabled).toBe(true);
      destroy();
    });

    it('checks None when no mode is active', () => {
      const { bean, destroy } = harness();
      const items = bean.getMenuItems(makeColumn(), () => '');
      expect(items[0].checked).toBe(true);
      destroy();
    });

    it('item actions call setColumnShowValuesAs', () => {
      const gridApi = { refreshCells: vi.fn() };
      const { bean, destroy } = harness({ gridApi });
      const col = makeColumn();

      const items = bean.getMenuItems(col, () => '');
      items.find((i) => i.name === '% of Grand Total')!.action!({} as never);
      expect(col.showValuesAs?.type).toBe('percentOfGrandTotal');
      expect(col.dispatchStateUpdatedEvent).toHaveBeenCalledWith('showValuesAs');

      items[0].action!({} as never);
      expect(col.showValuesAs).toBeNull();
      destroy();
    });
  });

  describe('getShowValuesAsMenuItem (column menu)', () => {
    it('returns null for ineligible columns', () => {
      const { bean, destroy } = harness();
      expect(bean.getShowValuesAsMenuItem(makeColumn(), {} as never)).toBeNull();
      expect(bean.getShowValuesAsMenuItem(null, {} as never)).toBeNull();
      destroy();
    });

    it('builds a submenu whose actions select modes via api.applyColumnState', () => {
      const applyColumnState = vi.fn();
      const { bean, destroy } = harness({ gridApi: { refreshCells: vi.fn(), applyColumnState } });
      const col = makeColumn({ colDef: { enableShowValuesAs: true } });
      bean.resolveColumn(col, true);

      const item = bean.getShowValuesAsMenuItem(col, { applyColumnState } as never)!;
      expect(item.name).toBe('Show Values As');
      expect(item.subMenu!.map((i) => (i as MenuItemDef).name)).toEqual([
        'None',
        '% of Grand Total',
        '% of Column Total',
        '% of Row Total',
        '% of Parent Row Total',
      ]);

      (item.subMenu![1] as MenuItemDef).action!({} as never);
      expect(applyColumnState).toHaveBeenCalledWith({ state: [{ colId: 'sales', showValuesAs: 'percentOfGrandTotal' }] });

      (item.subMenu![0] as MenuItemDef).action!({} as never);
      expect(applyColumnState).toHaveBeenLastCalledWith({ state: [{ colId: 'sales', showValuesAs: null }] });
      destroy();
    });

    it('checks the active mode in the submenu', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({
        colDef: { enableShowValuesAs: true, showValuesAs: 'percentOfRowTotal' },
      });
      bean.resolveColumn(col, true);
      const item = bean.getShowValuesAsMenuItem(col, {} as never)!;
      expect((item.subMenu![0] as MenuItemDef).checked).toBe(false);
      expect((item.subMenu![3] as MenuItemDef).checked).toBe(true);
      destroy();
    });
  });

  describe('user modes (showValuesAsDef.modes)', () => {
    it('runs the user transform and formatter callbacks with full params', () => {
      const { bean, destroy } = harness({ rowModel: rootWithAggData({ sales: 400 }) });
      const col = makeColumn({
        colDef: {
          showValuesAsDef: {
            modes: {
              doubled: {
                displayName: 'Doubled',
                transform: (p: { rawValue: number; grandTotal: () => number | null }) =>
                  (p.rawValue as number) * 2 + (p.grandTotal() ?? 0),
                formatter: (p: { value: number }) => `X${p.value}`,
              },
            },
          },
          showValuesAs: 'doubled',
        },
      });
      bean.resolveColumn(col, true);
      expect(col.showValuesAs?.type).toBe('doubled');
      expect(bean.transform(col, {} as IRowNode, 21)).toBe(442); // 21*2 + 400
      expect(bean.formatValue(col, null, 442, 21, false)).toBe('X442');
      destroy();
    });

    it('supports displayName/description callbacks and applicability/ready gating', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({
        colDef: {
          showValuesAsDef: {
            modes: {
              percentOfGrandTotal: {
                displayName: () => 'CB Name',
                description: () => 'CB Desc',
                applicability: (p: { pivotActive: boolean }) => (p.pivotActive ? 'enabled' : 'disabled'),
              },
            },
          },
          showValuesAs: 'percentOfGrandTotal',
        },
      });
      bean.resolveColumn(col, true);
      // not pivoting -> applicability 'disabled' -> not applying
      expect(bean.isApplying(col)).toBe(false);
      const items = bean.getMenuItems(col, () => '');
      expect(items.find((i) => i.name === 'CB Name')?.disabled).toBe(true);
      // tooltip still built from the callbacks
      expect(bean.getActiveModeTooltip(col)).toBe('CB Name: CB Desc');
      destroy();
    });

    it('ready(params) gates whether the mode applies', () => {
      const { bean, destroy } = harness({ rowModel: rootWithAggData({ sales: 200 }) });
      const showValuesAsDef = {
        modes: {
          percentOfGrandTotal: {
            ready: (p: { configured?: boolean }) => p.configured === true,
          },
        },
      };
      const colReady = makeColumn({
        colDef: { showValuesAsDef, showValuesAs: { type: 'percentOfGrandTotal', params: { configured: true } } },
      });
      bean.resolveColumn(colReady, true);
      expect(bean.isApplying(colReady)).toBe(true);
      expect(bean.transform(colReady, {} as IRowNode, 100)).toBe(50);

      const colNotReady = makeColumn({ colDef: { showValuesAsDef, showValuesAs: 'percentOfGrandTotal' } });
      bean.resolveColumn(colNotReady, true);
      expect(bean.isApplying(colNotReady)).toBe(false);
      // not applying -> raw value passes through
      expect(bean.transform(colNotReady, {} as IRowNode, 100)).toBe(100);
      destroy();
    });

    it('promotes defaultAggFunc onto a not-yet-aggregated column, keeps its own agg func otherwise', () => {
      const setColumnAggFunc = vi.fn();
      const { bean, destroy } = harness({ gridApi: { refreshCells: vi.fn(), setColumnAggFunc } });

      const bare = makeColumn();
      bean.setColumnShowValuesAs(bare, 'percentOfGrandTotal');
      expect(setColumnAggFunc).toHaveBeenCalledWith('sales', 'sum');

      const own = makeColumn({ aggFunc: 'max' });
      bean.setColumnShowValuesAs(own, 'percentOfGrandTotal');
      expect(setColumnAggFunc).toHaveBeenCalledTimes(1); // not called again
      destroy();
    });
  });

  describe('setColumnShowValuesAs', () => {
    it('applies the selection, dispatches a state event and refreshes cells', () => {
      const gridApi = { refreshCells: vi.fn() };
      const { bean, destroy } = harness({ gridApi });
      const col = makeColumn({ showValuesAsDef: { precision: 2 } });
      bean.setColumnShowValuesAs(col, 'percentOfGrandTotal');
      expect(col.showValuesAs?.type).toBe('percentOfGrandTotal');
      expect(col.dispatchStateUpdatedEvent).toHaveBeenCalledWith('showValuesAs');
      expect(gridApi.refreshCells).toHaveBeenCalledWith({ force: true });
      destroy();
    });

    it('accepts an object selection with params and precision', () => {
      const { bean, destroy } = harness();
      const col = makeColumn();
      bean.setColumnShowValuesAs(col, { type: 'percentOfRowTotal' as ShowValuesAsType, params: { a: 1 }, precision: 5 });
      expect(col.showValuesAs?.type).toBe('percentOfRowTotal');
      expect(col.showValuesAs?.params).toEqual({ a: 1 });
      expect(col.showValuesAs?.precision).toBe(5);
      destroy();
    });

    it('clears the selection with null', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfGrandTotal') });
      bean.setColumnShowValuesAs(col, null);
      expect(col.showValuesAs).toBeNull();
      destroy();
    });
  });

  describe('applySelection edge cases', () => {
    it('warns and clears on an unknown mode', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAs: resolved('percentOfGrandTotal') });
      bean.setColumnShowValuesAs(col, 'noSuchMode' as ShowValuesAsType);
      expect(col.showValuesAs).toBeNull();
      destroy();
    });

    it('resolved def.formatter delegates to formatValue and coerces null to empty string', () => {
      const { bean, destroy } = harness();
      const col = makeColumn();
      bean.setColumnShowValuesAs(col, 'percentOfGrandTotal');
      const def = col.showValuesAs!.def!;
      expect(def.formatter!({ value: 12.345, rawValue: 1, notApplicable: false } as never)).toBe('12.35%');
      expect(def.formatter!({ value: null, rawValue: 1, notApplicable: false } as never)).toBe('');
      expect(def.formatter!({ value: 5, rawValue: 5, notApplicable: true } as never)).toBe('#N/A');
      destroy();
    });

    it('resolved precision falls back to showValuesAsDef.precision', () => {
      const { bean, destroy } = harness();
      const col = makeColumn({ showValuesAsDef: { precision: 6 } });
      bean.setColumnShowValuesAs(col, 'percentOfGrandTotal');
      expect(col.showValuesAs?.precision).toBe(6);
      destroy();
    });
  });

  describe('ratio / grandTotal / rowTotal / parentTotal', () => {
    it('ratio returns null for nullish or zero totals', () => {
      const { bean, destroy } = harness();
      expect(bean.ratio(5, null)).toBeNull();
      expect(bean.ratio(5, 0)).toBeNull();
      expect(bean.ratio(1, 4)).toBe(25);
      destroy();
    });

    it('grandTotal returns null without a client-side row model or root', () => {
      const { bean, destroy } = harness({
        rowModel: { getType: () => 'serverSide', rootNode: {} },
      });
      expect(bean.grandTotal(makeColumn())).toBeNull();
      destroy();

      const { bean: bean2, destroy: destroy2 } = harness({
        rowModel: { getType: () => 'clientSide', rootNode: null },
      });
      expect(bean2.grandTotal(makeColumn())).toBeNull();
      destroy2();
    });

    it('grandTotal prefers root aggData, coercing via toNumber', () => {
      const { bean, destroy } = harness({
        rowModel: rootWithAggData({ sales: { toNumber: () => 250 } }),
      });
      expect(bean.grandTotal(makeColumn())).toBe(250);
      destroy();
    });

    it('grandTotal sums leaf values when root has no aggData for the column', () => {
      const leaves = [{ id: 'a' }, { id: 'b' }] as unknown as RowNode[];
      const valueSvc = { getValueFromData: vi.fn((col: AgColumn, node: RowNode) => (node.id === 'a' ? 10 : null)) };
      const { bean, destroy } = harness({
        rowModel: { getType: () => 'clientSide', rootNode: { allLeafChildren: leaves } },
        valueSvc,
      });
      expect(bean.grandTotal(makeColumn())).toBe(10);
      destroy();
    });

    it('grandTotal returns null when no leaf yields a number', () => {
      const valueSvc = { getValueFromData: () => null };
      const { bean, destroy } = harness({
        rowModel: { getType: () => 'clientSide', rootNode: { allLeafChildren: [{}] } },
        valueSvc,
      });
      expect(bean.grandTotal(makeColumn())).toBeNull();
      destroy();
    });

    it('rowTotal returns null with no value columns', () => {
      const { bean, destroy } = harness();
      expect(bean.rowTotal({} as IRowNode)).toBeNull();
      destroy();

      const { bean: bean2, destroy: destroy2 } = harness({ valueColsSvc: { columns: [] } });
      expect(bean2.rowTotal({} as IRowNode)).toBeNull();
      destroy2();
    });

    it('rowTotal sums value columns, reading aggData on group nodes', () => {
      const colA = makeColumn({ colId: 'a' });
      const colB = makeColumn({ colId: 'b' });
      const valueSvc = { getValueFromData: (col: AgColumn) => (col.getColId() === 'a' ? 3 : 'x') };
      const { bean, destroy } = harness({ valueColsSvc: { columns: [colA, colB] }, valueSvc });

      expect(bean.rowTotal({ group: false } as unknown as IRowNode)).toBe(3);

      const groupNode = { group: true, aggData: { a: 30, b: { toNumber: () => 10 } } } as unknown as IRowNode;
      expect(bean.rowTotal(groupNode)).toBe(40);
      destroy();
    });

    it('parentTotal uses the parent group aggData when available', () => {
      const { bean, destroy } = harness();
      const node = {
        parent: { group: true, aggData: { sales: 500 } },
      } as unknown as IRowNode;
      expect(bean.parentTotal(makeColumn(), node)).toBe(500);
      destroy();
    });

    it('parentTotal falls back to the grand total without a group parent', () => {
      const { bean, destroy } = harness({
        rowModel: rootWithAggData({ sales: 1000 }),
      });
      expect(bean.parentTotal(makeColumn(), { parent: null } as unknown as IRowNode)).toBe(1000);
      expect(
        bean.parentTotal(makeColumn(), { parent: { group: true } } as unknown as IRowNode),
      ).toBe(1000);
      destroy();
    });
  });

  describe('newColumnsLoaded', () => {
    it('re-resolves every column from colModel on newColumnsLoaded', () => {
      const col = makeColumn({ colDef: { initialShowValuesAs: 'percentOfGrandTotal' } });
      const colModel = { getCols: () => [col] };
      const { bean, beans, destroy } = harness({ colModel });
      void bean;
      (beans.eventSvc as unknown as { dispatchEvent(e: { type: string }): void }).dispatchEvent({
        type: 'newColumnsLoaded',
      });
      expect(col.showValuesAs?.type).toBe('percentOfGrandTotal');
      destroy();
    });
  });
});
