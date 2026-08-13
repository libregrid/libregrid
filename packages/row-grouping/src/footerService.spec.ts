import { describe, it, expect, vi } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import type { Column, IRowNode, RowNode } from 'ag-grid-community';
import type { GridOptions } from 'ag-grid-community';
import { FooterService } from './footerService';

function makeNode(overrides: Record<string, unknown> = {}): RowNode {
  return { expanded: true, ...overrides } as unknown as RowNode;
}

const harness = (gridOptions: Partial<GridOptions> = {}) =>
  makeBeanHarness(FooterService, { gridOptions });

describe('FooterService', () => {
  describe('addTotalRows', () => {
    it('returns startIndex unchanged when footer nodes are not included', () => {
      const { bean, destroy } = harness({ grandTotalRow: 'top' });
      const callback = vi.fn();
      expect(bean.addTotalRows(3, makeNode(), callback, false, true, 'top')).toBe(3);
      expect(callback).not.toHaveBeenCalled();
      destroy();
    });

    it('skips a collapsed non-root group', () => {
      const { bean, destroy } = harness({ groupTotalRow: 'top' });
      const callback = vi.fn();
      const node = makeNode({ expanded: false });
      expect(bean.addTotalRows(3, node, callback, true, false, 'top')).toBe(3);
      expect(callback).not.toHaveBeenCalled();
      destroy();
    });

    it('skips when the configured position does not match the requested position', () => {
      const { bean, destroy } = harness({ grandTotalRow: 'bottom' });
      const callback = vi.fn();
      expect(bean.addTotalRows(3, makeNode(), callback, true, true, 'top')).toBe(3);
      expect(callback).not.toHaveBeenCalled();
      destroy();
    });

    it('emits the grand total footer at the matching position and syncs aggData', () => {
      const { bean, destroy } = harness({ grandTotalRow: 'top' });
      const footer = { aggData: undefined } as unknown as RowNode;
      const node = makeNode({ aggData: { sales: 5 }, sibling: footer });
      const callback = vi.fn();
      expect(bean.addTotalRows(3, node, callback, true, true, 'top')).toBe(4);
      expect(callback).toHaveBeenCalledWith(footer, 3);
      expect(footer.aggData).toBe(node.aggData);
      destroy();
    });

    it('emits a group total footer for an expanded group', () => {
      const { bean, destroy } = harness({ groupTotalRow: 'top' });
      const footer = {} as unknown as RowNode;
      const node = makeNode({ expanded: true, sibling: footer });
      const callback = vi.fn();
      expect(bean.addTotalRows(0, node, callback, true, false, 'top')).toBe(1);
      expect(callback).toHaveBeenCalledWith(footer, 0);
      destroy();
    });
  });

  describe('getTopDisplayIndex', () => {
    const defaultIndex = (i: number) => i * 10;

    it('adds 1 when the grand total row sits at the top of rowsToDisplay', () => {
      const { bean, destroy } = harness({ grandTotalRow: 'top' });
      const rows = [{ footer: true } as unknown as RowNode];
      expect(bean.getTopDisplayIndex(rows, 2, [], defaultIndex)).toBe(21);
      destroy();
    });

    it('adds 0 when rowsToDisplay does not start with a footer', () => {
      const { bean, destroy } = harness({ grandTotalRow: 'top' });
      const rows = [{ footer: false } as unknown as RowNode];
      expect(bean.getTopDisplayIndex(rows, 2, [], defaultIndex)).toBe(20);
      expect(bean.getTopDisplayIndex([], 2, [], defaultIndex)).toBe(20);
      destroy();
    });

    it('adds 0 when the grand total row is not positioned at top', () => {
      const { bean, destroy } = harness({ grandTotalRow: 'bottom' });
      const rows = [{ footer: true } as unknown as RowNode];
      expect(bean.getTopDisplayIndex(rows, 2, [], defaultIndex)).toBe(20);
      destroy();
    });
  });

  describe('total prefix helpers', () => {
    it('getTotalValue returns the literal Total', () => {
      const { bean, destroy } = harness();
      expect(bean.getTotalValue(123)).toBe('Total');
      destroy();
    });

    it('doesCellShowTotalPrefix requires a footer node and an undefined or showRowGroup column', () => {
      const { bean, destroy } = harness();
      const footer = { footer: true } as unknown as IRowNode;
      const normal = { footer: false } as unknown as IRowNode;
      const showCol = { showRowGroup: true } as unknown as Column;
      const otherCol = { showRowGroup: 'country' } as unknown as Column;

      expect(bean.doesCellShowTotalPrefix(normal)).toBe(false);
      expect(bean.doesCellShowTotalPrefix(footer)).toBe(true);
      expect(bean.doesCellShowTotalPrefix(footer, showCol)).toBe(true);
      expect(bean.doesCellShowTotalPrefix(footer, otherCol)).toBe(false);
      expect(bean.doesCellShowTotalPrefix(normal, showCol)).toBe(false);
      destroy();
    });

    it('applyTotalPrefix returns Total for prefixed footer cells', () => {
      const { bean, destroy } = harness();
      const footer = { footer: true } as unknown as IRowNode;
      const showCol = { showRowGroup: true } as unknown as Column;
      expect(bean.applyTotalPrefix(300, '300', footer, showCol)).toBe('Total');
      destroy();
    });

    it('applyTotalPrefix falls back to the formatted value, then the raw value, then empty string', () => {
      const { bean, destroy } = harness();
      const normal = { footer: false } as unknown as IRowNode;
      const col = { showRowGroup: true } as unknown as Column;
      expect(bean.applyTotalPrefix(300, '£300', normal, col)).toBe('£300');
      expect(bean.applyTotalPrefix(300, null, normal, col)).toBe('300');
      expect(bean.applyTotalPrefix(null, null, normal, col)).toBe('');
      destroy();
    });
  });
});
