import { BeanStub, _getServerSideRowModel, type NamedBean, type RowNode } from 'ag-grid-community';

/** Shared, tiny listener seam so SSRM refresh decisions are not scattered through the row model. */
export class SsrmListenerUtils extends BeanStub implements NamedBean {
  public beanName = 'ssrmListenerUtils' as const;
  public refreshRoot(): void { _getServerSideRowModel(this.beans)?.refreshStore(); }
}

/** Propagates the active filter model by replacing the affected SSRM root store. */
export class SsrmFilterListener extends BeanStub implements NamedBean {
  public beanName = 'ssrmFilterListener' as const;
  public postConstruct(): void { this.addManagedEventListeners({ filterChanged: () => _getServerSideRowModel(this.beans)?.refreshStore() }); }
}

/** Propagates sort state into subsequent datasource requests. */
export class SsrmSortService extends BeanStub implements NamedBean {
  public beanName = 'ssrmSortSvc' as const;
  public postConstruct(): void { this.addManagedEventListeners({ sortChanged: () => _getServerSideRowModel(this.beans)?.refreshStore() }); }
}

/** The row-group module calls this bridge when a server-side group is opened or closed. */
export class SsrmExpandListener extends BeanStub implements NamedBean {
  public beanName = 'ssrmExpandListener' as const;
  public onGroupExpanded(node: RowNode, expanded: boolean): void {
    const model = _getServerSideRowModel(this.beans) as (ReturnType<typeof _getServerSideRowModel> & { onGroupExpanded?: (row: RowNode, state: boolean) => void }) | undefined;
    model?.onGroupExpanded?.(node, expanded);
  }
}
