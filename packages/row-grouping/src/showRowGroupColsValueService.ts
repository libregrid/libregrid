import { BeanStub, type AgColumn, type NamedBean } from 'ag-grid-community';
import type { GroupValueResult, IRowNode, IShowRowGroupColsValueService } from 'ag-grid-community';

/**
 * Resolves the value shown in a `showRowGroup` column — bean
 * `showRowGroupColValueSvc`. Community's `ValueService.getValueForDisplay` /
 * `getDisplayValue` route through this bean whenever the cell's column has
 * `showRowGroup` set (or for full-width group rows), ahead of any
 * `valueGetter` on the column — this is the actual seam the auto group
 * column's value comes from, per the AG Grid docs on `showOpenedGroup` and
 * `groupHideOpenParents`.
 *
 * Known gap (documented rather than guessed at, per guardrail G2): a chain
 * of two or more consecutively-expanded ancestors hidden by
 * `groupHideOpenParents` collapses onto a single displayed row, but only the
 * nearest hidden ancestor's value is substituted — see
 * `docs/parity/row-grouping.md`.
 *
 * @feature Row Grouping -> Auto Group Column
 * @gridOption showOpenedGroup
 * @gridOption groupHideOpenParents
 */
export class ShowRowGroupColsValueService
  extends BeanStub
  implements IShowRowGroupColsValueService, NamedBean
{
  beanName = 'showRowGroupColValueSvc' as const;

  public getGroupValue(
    node: IRowNode,
    column: AgColumn | undefined,
    _ignoreAggData: boolean,
  ): GroupValueResult | null {
    const displayedNode = column ? this.getDisplayedNode(node, column, false) : node;
    if (!displayedNode?.group) return null;
    return { displayedNode, value: displayedNode.key ?? null };
  }

  public formatAndPrefixGroupColValue(
    groupValue: GroupValueResult,
    _column?: AgColumn,
    _exporting?: boolean,
  ): string | null {
    return groupValue.value == null ? null : String(groupValue.value);
  }

  public getDisplayedNode(
    node: IRowNode,
    _column: AgColumn,
    onlyHideOpenParents = false,
  ): IRowNode | undefined {
    if (node.group) return node;

    if (this.gos.get('groupHideOpenParents') === true) {
      const parent = node.parent;
      const standsInForParent =
        !!parent?.group && parent.expanded && parent.childrenAfterGroup?.[0] === node;
      if (standsInForParent) return parent as IRowNode;
    }

    if (!onlyHideOpenParents && this.gos.get('showOpenedGroup') === true) {
      let ancestor = node.parent;
      while (ancestor && !ancestor.group) ancestor = ancestor.parent;
      return ancestor ?? undefined;
    }

    return undefined;
  }
}
