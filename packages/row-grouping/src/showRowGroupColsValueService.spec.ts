import { describe, it, expect } from 'vitest';
import type { AgColumn, IRowNode } from 'ag-grid-community';
import { makeBeanHarness } from '@libregrid/core/testing';
import { ShowRowGroupColsValueService } from './showRowGroupColsValueService';

function harness(gridOptions: Record<string, unknown> = {}) {
  return makeBeanHarness(ShowRowGroupColsValueService, { gridOptions });
}

const column = {} as AgColumn;

function node(overrides: Record<string, unknown> = {}): IRowNode {
  return { group: false, ...overrides } as unknown as IRowNode;
}

describe('ShowRowGroupColsValueService', () => {
  describe('getGroupValue', () => {
    it('uses the node itself when no column is given', () => {
      const { bean } = harness();
      const group = node({ group: true, key: 'US' });
      expect(bean.getGroupValue(group, undefined, false)).toEqual({
        displayedNode: group,
        value: 'US',
      });
      expect(bean.getGroupValue(node(), undefined, false)).toBeNull();
    });

    it('returns null for a leaf with no displayed node, and null value for keyless groups', () => {
      const { bean } = harness();
      expect(bean.getGroupValue(node(), column, false)).toBeNull();

      const group = node({ group: true, key: null });
      expect(bean.getGroupValue(group, column, false)).toEqual({
        displayedNode: group,
        value: null,
      });
    });
  });

  describe('formatAndPrefixGroupColValue', () => {
    it('stringifies values and returns null for nullish ones', () => {
      const { bean } = harness();
      expect(bean.formatAndPrefixGroupColValue({ value: 42 } as never)).toBe('42');
      expect(bean.formatAndPrefixGroupColValue({ value: null } as never)).toBeNull();
      expect(bean.formatAndPrefixGroupColValue({ value: undefined } as never)).toBeNull();
    });
  });

  describe('getDisplayedNode', () => {
    it('returns group nodes unchanged', () => {
      const { bean } = harness({ groupHideOpenParents: true, showOpenedGroup: true });
      const group = node({ group: true });
      expect(bean.getDisplayedNode(group, column)).toBe(group);
    });

    it('returns undefined for a leaf with no display substitutions configured', () => {
      const { bean } = harness();
      expect(bean.getDisplayedNode(node(), column)).toBeUndefined();
    });

    describe('groupHideOpenParents', () => {
      it('returns the expanded parent group when the leaf stands in for it', () => {
        const { bean } = harness({ groupHideOpenParents: true });
        const leaf = node();
        const parent = node({ group: true, expanded: true, childrenAfterGroup: [leaf] });
        leaf.parent = parent;

        expect(bean.getDisplayedNode(leaf, column)).toBe(parent);
      });

      it('returns undefined when the leaf is not the first child or the parent is collapsed', () => {
        const { bean } = harness({ groupHideOpenParents: true });
        const first = node();
        const leaf = node();
        const expandedParent = node({ group: true, expanded: true, childrenAfterGroup: [first, leaf] });
        leaf.parent = expandedParent;
        expect(bean.getDisplayedNode(leaf, column)).toBeUndefined();

        const collapsedParent = node({ group: true, expanded: false, childrenAfterGroup: [leaf] });
        leaf.parent = collapsedParent;
        expect(bean.getDisplayedNode(leaf, column)).toBeUndefined();

        const leafNoParent = node();
        expect(bean.getDisplayedNode(leafNoParent, column)).toBeUndefined();
      });
    });

    describe('showOpenedGroup', () => {
      it('walks past non-group ancestors to the nearest group', () => {
        const { bean } = harness({ showOpenedGroup: true });
        const leaf = node();
        const nonGroupParent = node({ group: false });
        const grandparent = node({ group: true });
        leaf.parent = nonGroupParent;
        nonGroupParent.parent = grandparent;

        expect(bean.getDisplayedNode(leaf, column)).toBe(grandparent);
      });

      it('returns a directly-grouped parent without walking', () => {
        const { bean } = harness({ showOpenedGroup: true });
        const leaf = node();
        const parent = node({ group: true });
        leaf.parent = parent;

        expect(bean.getDisplayedNode(leaf, column)).toBe(parent);
      });

      it('returns undefined when no group ancestor exists', () => {
        const { bean } = harness({ showOpenedGroup: true });
        const leaf = node();
        const nonGroupParent = node({ group: false });
        leaf.parent = nonGroupParent;

        expect(bean.getDisplayedNode(leaf, column)).toBeUndefined();
      });

      it('is skipped when onlyHideOpenParents is set', () => {
        const { bean } = harness({ showOpenedGroup: true });
        const leaf = node();
        leaf.parent = node({ group: true });

        expect(bean.getDisplayedNode(leaf, column, true)).toBeUndefined();
      });
    });
  });
});
