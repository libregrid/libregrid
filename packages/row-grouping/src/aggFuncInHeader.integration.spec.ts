/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  type GridOptions,
} from 'ag-grid-community';
import { RowGroupingModule } from './rowGroupingModule';

ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule]);

const options = (extra: Partial<GridOptions> = {}): GridOptions => ({
  columnDefs: [
    { field: 'country', rowGroup: true },
    { field: 'sales', aggFunc: 'sum' },
    { field: 'cost' },
  ],
  rowData: [{ country: 'US', sales: 1, cost: 2 }],
  ...extra,
});

async function headerTexts(extra: Partial<GridOptions>): Promise<string[]> {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const api = createGrid(el, options(extra));
  await vi.waitFor(() =>
    expect(el.querySelectorAll('.ag-header-cell-text').length).toBeGreaterThan(1),
  );
  const texts = [...el.querySelectorAll('.ag-header-cell-text')].map((e) => e.textContent ?? '');
  api.destroy();
  el.remove();
  return texts;
}

describe('aggregation function in value column headers', () => {
  it('shows sum(Sales) by default and only for the aggregated column', async () => {
    const texts = await headerTexts({});
    expect(texts).toContain('sum(Sales)');
    expect(texts).toContain('Cost');
  });

  it('suppressAggFuncInHeader restores the plain header', async () => {
    const texts = await headerTexts({ suppressAggFuncInHeader: true });
    expect(texts).toContain('Sales');
    expect(texts).not.toContain('sum(Sales)');
  });
});
