/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import type { RowNode } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { GroupStage } from '@libregrid/row-grouping';
import { TreeDataService } from './treeDataService';

const node = (id: string, data: Record<string, unknown>) => ({ id, data, childrenAfterGroup: [], parent: null, master: false } as unknown as RowNode);
const execute = (leaves: RowNode[], options: Record<string, unknown>) => {
  const root = { id: 'root', allLeafChildren: leaves, childrenAfterGroup: [] } as unknown as RowNode;
  const csrm = { getType: () => 'clientSide', rootNode: root, hierarchical: false, refreshModel: vi.fn() };
  const { bean } = makeBeanHarness(GroupStage, { gridOptions: { treeData: true, groupDefaultExpanded: -1, ...options }, beans: { rowModel: csrm, colModel: { getCols: () => [] } } });
  bean.execute({} as never);
  return root;
};

describe('Tree Data shared GroupStage', () => {
  it('materialises equivalent path, nested, and parent-id source shapes', () => {
    const path = execute([node('a', { id: 'a', path: ['A'] }), node('b', { id: 'b', path: ['A', 'B'] })], { getDataPath: (data: { path: string[] }) => data.path });
    const nested = execute([node('a', { id: 'a', name: 'A', children: [{ id: 'b', name: 'B' }] })], { treeDataChildrenField: 'children' });
    const parent = execute([node('a', { id: 'a', name: 'A' }), node('b', { id: 'b', name: 'B', parentId: 'a' })], { treeDataParentIdField: 'parentId' });
    expect(path.childrenAfterGroup?.[0]?.childrenAfterGroup?.length).toBe(1);
    expect(nested.childrenAfterGroup?.[0]?.childrenAfterGroup?.length).toBe(1);
    expect(parent.childrenAfterGroup?.[0]?.childrenAfterGroup?.length).toBe(1);
    expect(path.childrenAfterGroup?.[0]?.expanded).toBe(true);
  });

  it('creates missing path fillers and keeps a cyclic parent-id node reachable', () => {
    const filled = execute([node('c', { path: ['A', 'B', 'C'] })], { getDataPath: (data: { path: string[] }) => data.path });
    expect(filled.childrenAfterGroup?.[0]?.data).toBeUndefined();
    expect(filled.childrenAfterGroup?.[0]?.childrenAfterGroup?.[0]?.data).toBeUndefined();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cyclic = execute([node('a', { id: 'a', parentId: 'b' }), node('b', { id: 'b', parentId: 'a' })], { treeDataParentIdField: 'parentId' });
    expect(cyclic.childrenAfterGroup?.length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('reparents through the original path data and rejects descendant cycles', () => {
    const refreshModel = vi.fn();
    const { bean } = makeBeanHarness(TreeDataService, { gridOptions: { getDataPath: (data: { path: string[] }) => data.path }, beans: { rowModel: { refreshModel } } });
    const parent = node('parent', { path: ['Parent'] });
    const child = node('child', { path: ['Old', 'Child'] });
    child.parent = node('old', { path: ['Old'] });
    expect(bean.reparent(child, parent)).toBe(true);
    expect(child.data).toEqual({ path: ['Parent', 'Child'] });
    expect(refreshModel).toHaveBeenCalled();
    expect(bean.reparent(parent, child)).toBe(false);
  });
});
