import type { GroupCellRendererParams, ICellRendererComp } from 'ag-grid-community';

/**
 * Default renderer for the auto group column — user component
 * `agGroupCellRenderer` (identifier required by G4.1a; Community resolves it
 * by exact string against a closed union). Registered via `userComponents`,
 * so — unlike the beans in this package — it is a plain class with no DI
 * access: Community's `userCompFactory` just calls `new GroupCellRenderer()`
 * then `init(params)`, exactly as it would a consumer's own React/Vue/Angular
 * cell renderer.
 *
 * Supports `suppressCount`, `suppressPadding`, `suppressDoubleClickExpand`,
 * `suppressEnterExpand` and (function form only — the string/expression form
 * is unsupported) `totalValueGetter`. `innerRenderer`/`innerRendererParams`/
 * `innerRendererSelector` and `checkbox` are not yet implemented — see
 * `docs/parity/row-grouping.md`.
 *
 * @feature Row Grouping -> Auto Group Column
 */
export class GroupCellRenderer implements ICellRendererComp {
  private eGui!: HTMLSpanElement;
  private eToggle!: HTMLSpanElement;
  private eValue!: HTMLSpanElement;
  private eCount!: HTMLSpanElement;
  private params!: GroupCellRendererParams;
  private readonly onNodeChanged = () => this.render();

  public init(params: GroupCellRendererParams): void {
    this.params = params;

    this.eGui = document.createElement('span');
    this.eGui.className = 'lgr-group-cell';

    this.eToggle = document.createElement('span');
    this.eToggle.className = 'lgr-group-cell-toggle';

    this.eValue = document.createElement('span');
    this.eValue.className = 'lgr-group-cell-value';

    this.eCount = document.createElement('span');
    this.eCount.className = 'lgr-group-cell-count';

    this.eGui.append(this.eToggle, this.eValue, this.eCount);

    this.eToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleExpanded(event);
    });
    if (!params.suppressDoubleClickExpand) {
      this.eGui.addEventListener('dblclick', (event) => this.toggleExpanded(event));
    }
    if (!params.suppressEnterExpand) {
      this.eGui.addEventListener('keydown', (event) => {
        if ((event as KeyboardEvent).key === 'Enter') this.toggleExpanded(event);
      });
    }

    params.node.addEventListener('expandedChanged', this.onNodeChanged);
    params.node.addEventListener('allChildrenCountChanged', this.onNodeChanged);
    this.render();
  }

  public getGui(): HTMLElement {
    return this.eGui;
  }

  public refresh(params: GroupCellRendererParams): boolean {
    this.params = params;
    this.render();
    return true;
  }

  public destroy(): void {
    this.params.node.removeEventListener('expandedChanged', this.onNodeChanged);
    this.params.node.removeEventListener('allChildrenCountChanged', this.onNodeChanged);
  }

  private toggleExpanded(event: Event): void {
    const { node } = this.params;
    if (!node.group || !node.childrenAfterGroup?.length) return;
    node.setExpanded(!node.expanded, event as MouseEvent | KeyboardEvent);
  }

  private render(): void {
    const { node, value, suppressPadding, suppressCount, totalValueGetter } = this.params;
    const isExpandable = !!node.group && !!node.childrenAfterGroup?.length;

    this.eGui.classList.toggle('lgr-group-cell-expandable', isExpandable);
    this.eGui.classList.toggle('lgr-group-cell-total', !!node.footer);
    this.eGui.setAttribute('tabindex', isExpandable ? '0' : '-1');
    if (isExpandable) {
      // role="button" makes the interactive span a valid aria-expanded host
      // (axe aria-allowed-attr) — it toggles the group's disclosure.
      this.eGui.setAttribute('role', 'button');
      this.eGui.setAttribute('aria-expanded', String(!!node.expanded));
    } else {
      this.eGui.removeAttribute('role');
      this.eGui.removeAttribute('aria-expanded');
    }

    this.eToggle.classList.toggle('lgr-group-cell-toggle-expanded', !!node.expanded);
    this.eToggle.classList.toggle('lgr-group-cell-toggle-hidden', !isExpandable);

    this.eGui.style.paddingLeft = suppressPadding ? '' : `${(node.uiLevel ?? 0) * 16}px`;

    // A total row's group-column cell shows 'Total' (ag-grid.com documented
    // default), not the group key — overridable via cellRendererParams.
    // totalValueGetter (function form only; string/expression form
    // unsupported).
    const displayValue = node.footer
      ? typeof totalValueGetter === 'function'
        ? totalValueGetter(this.params)
        : 'Total'
      : value;
    this.eValue.textContent = displayValue == null ? '' : String(displayValue);

    const count = !node.footer && node.group ? (node.allChildrenCount ?? node.childrenAfterGroup?.length ?? 0) : 0;
    const showCount = !suppressCount && count > 0;
    this.eCount.textContent = showCount ? `(${count})` : '';
    this.eCount.style.display = showCount ? '' : 'none';
  }
}
