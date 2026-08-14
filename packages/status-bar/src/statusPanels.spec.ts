/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { StatusBarService } from './statusBarService';
import {
  AggregationPanel,
  FilteredRowCountPanel,
  SelectedRowCountPanel,
  TotalAndFilteredRowCountPanel,
  TotalRowCountPanel,
} from './statusPanels';
const api = {
  getDisplayedRowCount: () => 2,
  getModel: () => ({ getRowCount: () => 3 }),
  getSelectedNodes: () => [{}, {}],
  getCellRanges: () => [
    {
      startRow: { rowIndex: 0 },
      endRow: { rowIndex: 1 },
      columns: [{ getColDef: () => ({ field: 'value' }) }],
    },
  ],
  getDisplayedRowAtIndex: (index: number) => ({ data: { value: index + 1 } }),
};
describe('provided status panels', () => {
  it('renders all count and aggregation panels', () => {
    const panels = [
      new TotalRowCountPanel(),
      new TotalAndFilteredRowCountPanel(),
      new FilteredRowCountPanel(),
      new SelectedRowCountPanel(),
      new AggregationPanel(),
    ];
    panels.forEach((panel, index) => {
      panel.agInit({ api, context: undefined, key: String(index) } as never);
    });
    expect(panels.map((panel) => panel.getGui().textContent)).toEqual([
      'Total Rows: 3',
      'Rows: 2 / 3',
      'Filtered Rows: 2',
      'Selected Rows: 2',
      'Count: 2 Sum: 3 Avg: 1.5',
    ]);
  });
  it('configures defaults, refreshes custom panels, replaces registrations, and destroys cleanly', () => {
    const refresh = vi.fn();
    const destroy = vi.fn();
    class CustomPanel {
      public agInit = vi.fn();
      public refresh = refresh;
      public destroy = destroy;
    }
    const { bean } = makeBeanHarness(StatusBarService, {
      gridOptions: {
        context: { source: 'test' },
        statusBar: { statusPanels: [{ statusPanel: CustomPanel }, { statusPanel: 'unknown' }] },
      },
      beans: { gridApi: api },
    });
    const custom = bean.getStatusPanel<CustomPanel>('status-0')!;
    expect(custom.agInit).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'status-0', context: { source: 'test' } }),
    );
    bean.refresh();
    expect(refresh).toHaveBeenCalledWith(expect.objectContaining({ key: 'status-0' }));
    const replacement = { destroy: vi.fn() };
    bean.register('status-0', replacement);
    expect(destroy).toHaveBeenCalledOnce();
    bean.destroy();
    expect(replacement.destroy).toHaveBeenCalledOnce();
  });
  it('renders safe empty values when panel APIs have no data', () => {
    const emptyApi = { getCellRanges: () => null };
    const aggregation = new AggregationPanel();
    const total = new TotalRowCountPanel();
    aggregation.agInit({ api: emptyApi, context: null, key: 'aggregation' } as never);
    total.agInit({ api: emptyApi, context: null, key: 'total' } as never);
    expect(aggregation.getGui().textContent).toBe('Count: 0');
    expect(total.getGui().textContent).toBe('Total Rows: 0');
  });
});
