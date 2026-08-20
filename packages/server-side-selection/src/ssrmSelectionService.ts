import {
  BeanStub,
  type GridOptions,
  type RowNode,
  type RowNodeSelectedEvent,
  type SelectionEventSourceType,
} from 'ag-grid-community';
import { getSsrmRoute } from '@libregrid/server-side-row-model';
import type { SsrmSelectionOptions } from './types';
import type { SelectionOp, SelectionSpec } from './types';

const LOG_PREFIX = '[LibreGrid Server-Side Selection]';

/** Sources that flip rows as a spec-level act: header/api select-all in the full/filtered scope. */
const TERM_SELECT_ALL_SOURCES: ReadonlySet<SelectionEventSourceType> = new Set([
  'uiSelectAll',
  'uiSelectAllFiltered',
  'apiSelectAllFiltered',
]);

/** Sources this package must never turn into ops (service-internal / programmatic flips). */
const IGNORED_SOURCES: ReadonlySet<SelectionEventSourceType> = new Set(['api', 'selectableChanged']);

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The row-model traversal seam this service needs from the SSRM bean. */
interface SsrmTraversable {
  forEachNode(callback: (node: RowNode, index: number) => void): void;
}

/**
 * The feature service for `@libregrid/server-side-selection`: event wiring,
 * spec lifecycle, op capture/batching, hydration, selection view, and the
 * footer panel.
 *
 * A managed sub-bean of the grid's `selectionSvc` (created via
 * `createManagedBean` in `ServerSideSelectionService.postConstruct`): it has
 * no `BeanCollection` slot of its own — the community package's closed
 * bean-name union has no seam for it — and its lifecycle is the selection
 * service's lifecycle (wired, constructed, and destroyed with it).
 *
 * The server-side spec (terms/exceptions/additions, per `{gridId}:{tabId}`)
 * lives in the app's provider — the only truth. This service keeps:
 * - the last `getSpec` result (for the "Total Selected" count),
 * - the in-flight op queue (cache-sized batches),
 * - the loaded rows' `__selected` flags (via the `selectionSvc` bean),
 * and nothing else. Working-copy lifetime = row-cache lifetime: the SSRM
 * bean purges evicted ids, and hydration re-resolves from the provider
 * whenever a row is requested again.
 */
export class SsrmSelectionService extends BeanStub {
  private options: SsrmSelectionOptions | undefined;

  // Spec lifecycle
  private spec: SelectionSpec | undefined;
  private specRequestId = 0;

  // Hydration: the generation counter drops stale in-flight resolveSelected
  // responses; `hydrating` keeps the capture listener out of the delta window.
  private hydrationGeneration = 0;
  private hydrating = false;
  private ready = false;

  // Op queue
  private pendingOps: SelectionOp[] = [];
  private opTimer: ReturnType<typeof setTimeout> | undefined;
  private opsInFlight = false;

  // Selection view (R6)
  private viewActive = false;

  // Footer
  private footerEl: HTMLElement | undefined;
  private pageSpan: HTMLElement | undefined;
  private totalSpan: HTMLElement | undefined;
  private selectAllButton: HTMLButtonElement | undefined;
  private viewToggleButton: HTMLButtonElement | undefined;

  public postConstruct(): void {
    this.addManagedPropertyListeners(['ssrmSelection'], () => this.onOptionsChanged());
    this.onOptionsChanged();
    this.addManagedEventListeners({
      modelUpdated: () => this.onModelUpdated(),
      rowSelected: (event) => this.onRowSelected(event),
      selectionChanged: () => this.updateFooter(),
      paginationChanged: () => this.updateFooter(),
    });
  }

  public override destroy(): void {
    this.cancelOpTimer();
    this.pendingOps = [];
    this.detachFooter();
    super.destroy();
  }

  // ---------------------------------------------------------------------
  // Option lifecycle
  // ---------------------------------------------------------------------

  private onOptionsChanged(): void {
    const options = this.gos.get('ssrmSelection');
    if (options === this.options) {
      return;
    }
    this.cancelOpTimer();
    this.pendingOps = [];
    this.opsInFlight = false;
    this.hydrating = false;
    this.ready = false;
    this.viewActive = false;
    this.spec = undefined;
    this.specRequestId++;
    this.hydrationGeneration++;
    this.detachFooter();
    this.options = options;
    if (options === undefined) {
      return;
    }
    this.validate(options);
  }

  private validate(options: SsrmSelectionOptions): void {
    const provider = options.provider;
    if (
      provider === undefined ||
      typeof provider.getSpec !== 'function' ||
      typeof provider.applyOps !== 'function' ||
      typeof provider.resolveSelected !== 'function'
    ) {
      console.error(
        `${LOG_PREFIX} ssrmSelection.provider must implement getSpec, applyOps and resolveSelected`,
      );
      return;
    }
    const rowSelection = this.gos.get('rowSelection');
    const isMultiRow =
      rowSelection === 'multiple' ||
      (rowSelection !== null && typeof rowSelection === 'object' && rowSelection.mode === 'multiRow');
    if (!isMultiRow) {
      console.warn(
        `${LOG_PREFIX} requires rowSelection: { mode: 'multiRow', selectAll: 'currentPage' } for spec-correct select-all capture`,
      );
    }
    if (this.gos.get('getRowId') === undefined) {
      console.warn(
        `${LOG_PREFIX} requires a stable getRowId: row ids are the spec's row-level keys`,
      );
    }
    // A column-level `checkboxSelection` (deprecated in v36 in favour of
    // `rowSelection.checkboxes`) renders a second checkbox in the same row as
    // the row-selection API's checkbox: two controls for one selection. The
    // column model isn't built yet at bean postConstruct, so scan the
    // `columnDefs` option directly (grouped columns included).
    const checkboxCols = this.checkboxSelectionColumnIds(this.gos.get('columnDefs'));
    if (checkboxCols.length > 0) {
      console.warn(
        `${LOG_PREFIX} column(s) ${checkboxCols
          .join(', ')} set 'checkboxSelection', which renders a redundant second ` +
          'checkbox per row — remove it; the row-selection checkbox is the single control',
      );
    }
  }

  private checkboxSelectionColumnIds(columnDefs: GridOptions['columnDefs']): string[] {
    const ids: string[] = [];
    const walk = (defs: GridOptions['columnDefs']): void => {
      for (const def of defs ?? []) {
        // `ColGroupDef` has `children`; a leaf `ColDef` may set `colId`.
        const colDef = def as {
          checkboxSelection?: unknown;
          colId?: string | number;
          children?: GridOptions['columnDefs'];
        };
        if (colDef.checkboxSelection !== undefined) {
          ids.push(colDef.colId === undefined ? '(unnamed)' : String(colDef.colId));
        }
        if (colDef.children !== undefined) {
          walk(colDef.children);
        }
      }
    };
    walk(columnDefs);
    return ids;
  }

  private gridIdKey(): string {
    const options = this.options;
    return options?.gridId ?? this.beans.gridApi.getGridId();
  }

  private get ssrm(): SsrmTraversable {
    return this.beans.rowModel as unknown as SsrmTraversable;
  }

  // ---------------------------------------------------------------------
  // Spec lifecycle
  // ---------------------------------------------------------------------

  private onModelUpdated(): void {
    if (this.options === undefined) {
      return;
    }
    this.refreshSpec();
    this.hydrate();
  }

  private refreshSpec(): void {
    const options = this.options;
    if (options === undefined) {
      return;
    }
    const requestId = ++this.specRequestId;
    options.provider
      .getSpec({ gridId: this.gridIdKey(), tabId: options.tabId })
      .then((spec) => {
        if (requestId !== this.specRequestId || this.options === undefined) {
          return;
        }
        this.spec = spec;
        this.updateFooter();
      })
      .catch((error: unknown) => {
        console.error(`${LOG_PREFIX} getSpec failed: ${describeError(error)}`);
      });
  }

  /**
   * Re-resolves the whole loaded set from the provider (cache-bounded:
   * partial-mode `forEachNode` iterates exactly the cached block rows, stubs
   * excluded), diffs against the current node flags, and applies the delta
   * (≤ 2 `setNodesSelected` calls, `source: 'api'`, under the hydration
   * guard). Idempotent and self-healing — the service keeps no answered
   * bookkeeping, so a stale flag heals on the next model update.
   */
  private hydrate(): void {
    const options = this.options;
    const svc = this.beans.selectionSvc;
    if (options === undefined || svc === undefined) {
      return;
    }
    const rowIds: string[] = [];
    const groupRoutes: string[] = [];
    this.ssrm.forEachNode((node) => {
      const route = getSsrmRoute(node);
      if (node.group) {
        if (route !== undefined) {
          groupRoutes.push(route.join('|'));
        }
        return;
      }
      if (node.id !== undefined) {
        rowIds.push(node.id);
      }
    });
    // The first `modelUpdated` can fire before rows materialise: nothing is
    // loaded, so there is nothing to resolve and no "ready" signal yet.
    if (rowIds.length + groupRoutes.length === 0) {
      return;
    }
    const generation = ++this.hydrationGeneration;
    const gridId = this.gridIdKey();
    const tabId = options.tabId;
    options.provider
      .resolveSelected({ gridId, tabId, rowIds, groupRoutes: [...new Set(groupRoutes)] })
      .then((resolved) => {
        if (generation !== this.hydrationGeneration || this.options === undefined) {
          return;
        }
        const selectionSvc = this.beans.selectionSvc;
        if (selectionSvc === undefined) {
          return;
        }
        const toSelect: RowNode[] = [];
        const toDeselect: RowNode[] = [];
        this.ssrm.forEachNode((node) => {
          const key = node.group ? getSsrmRoute(node)?.join('|') : node.id;
          if (key === undefined) {
            return;
          }
          const selected = resolved[key] === true;
          if (selected !== node.isSelected()) {
            (selected ? toSelect : toDeselect).push(node);
          }
        });
        if (toDeselect.length > 0 || toSelect.length > 0) {
          this.hydrating = true;
          try {
            if (toDeselect.length > 0) {
              selectionSvc.setNodesSelected({
                nodes: toDeselect,
                newValue: false,
                clearSelection: false,
                source: 'api',
              });
            }
            if (toSelect.length > 0) {
              selectionSvc.setNodesSelected({
                nodes: toSelect,
                newValue: true,
                clearSelection: false,
                source: 'api',
              });
            }
          } finally {
            this.hydrating = false;
          }
        }
        // `onReady` marks the first hydration that resolved actual rows
        // (earlier empty `modelUpdated`s are skipped above).
        if (!this.ready) {
          this.ready = true;
          this.options?.onReady?.(this);
        }
        this.updateFooter();
      })
      .catch((error: unknown) => {
        console.error(`${LOG_PREFIX} resolveSelected failed: ${describeError(error)}`);
      });
  }

  // ---------------------------------------------------------------------
  // Change capture (global `rowSelected`, per node, with source)
  // ---------------------------------------------------------------------

  private onRowSelected(event: RowNodeSelectedEvent): void {
    if (this.options === undefined || this.hydrating) {
      return;
    }
    // The runtime attaches `source` to the per-node event (the typed
    // interface does not); flips without a known source are internal.
    const source = (event as RowNodeSelectedEvent & { source?: SelectionEventSourceType }).source;
    if (source === undefined || IGNORED_SOURCES.has(source)) {
      return;
    }
    const node = event.node as RowNode;
    const op = this.opForNode(node, node.isSelected() === true, source);
    if (op !== undefined) {
      this.enqueueOp(op);
    }
  }

  private opForNode(
    node: RowNode,
    selected: boolean,
    source: SelectionEventSourceType,
  ): SelectionOp | undefined {
    // Header/api select-all in the full/filtered scope: one spec-level op,
    // deduped across the per-node flips it causes.
    if (TERM_SELECT_ALL_SOURCES.has(source)) {
      if (selected) {
        return { op: 'selectAll', filter: this.beans.gridApi.getFilterModel() };
      }
      return { op: 'deselectAll' };
    }
    // Group node, or a leaf under a group: groups are atomic (R5) — promote
    // to the nearest group ancestor's route.
    const route = this.groupRouteFor(node);
    if (route !== undefined) {
      return selected ? { op: 'selectGroup', route } : { op: 'deselectGroup', route };
    }
    const id = node.id;
    if (id === undefined) {
      return undefined;
    }
    return selected ? { op: 'select', ids: [id] } : { op: 'deselect', ids: [id] };
  }

  private groupRouteFor(node: RowNode): string[] | undefined {
    let current: RowNode | null = node;
    while (current !== null) {
      if (current.group) {
        // A group node without a route marker (or under one) is not part of
        // the SSRM group feature: no op, no promotion.
        return getSsrmRoute(current);
      }
      current = current.parent;
    }
    return undefined;
  }

  // ---------------------------------------------------------------------
  // Op queue: debounce + merge, then atomic applyOps batches
  // ---------------------------------------------------------------------

  private enqueueOp(op: SelectionOp): void {
    const pending = this.pendingOps;
    if (op.op === 'select' || op.op === 'deselect') {
      const cancelType = op.op === 'select' ? 'deselect' : 'select';
      for (const existing of pending) {
        if (existing.op === cancelType) {
          existing.ids = existing.ids.filter((id) => !op.ids.includes(id));
        }
      }
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        if (p !== undefined && (p.op === 'select' || p.op === 'deselect') && p.ids.length === 0) {
          pending.splice(i, 1);
        }
      }
      const last = pending[pending.length - 1];
      if (last !== undefined && last.op === op.op) {
        for (const id of op.ids) {
          if (!last.ids.includes(id)) {
            last.ids.push(id);
          }
        }
      } else {
        pending.push(op);
      }
    } else if (op.op === 'selectGroup' || op.op === 'deselectGroup') {
      const opposite: SelectionOp['op'] =
        op.op === 'selectGroup' ? 'deselectGroup' : 'selectGroup';
      const key = op.route.join('|');
      const sameIndex = pending.findIndex((p) => p.op === op.op && routeKey(p) === key);
      if (sameIndex >= 0) {
        pending.splice(sameIndex, 1);
      }
      const oppositeIndex = pending.findIndex((p) => p.op === opposite && routeKey(p) === key);
      if (oppositeIndex >= 0) {
        pending.splice(oppositeIndex, 1);
      }
      pending.push(op);
    } else if (op.op === 'selectAll') {
      // The latest filter snapshot wins; pending leaf selects are subsumed
      // by the term (every loaded row matches the current filter by
      // construction). Pending deselects stay — they become exceptions.
      for (let i = pending.length - 1; i >= 0; i--) {
        const p = pending[i];
        if (p !== undefined && (p.op === 'selectAll' || p.op === 'select')) {
          pending.splice(i, 1);
        }
      }
      pending.push(op);
    } else {
      // deselectAll clears the whole spec — everything pending is moot.
      pending.length = 0;
      pending.push(op);
    }
    this.scheduleOpFlush();
  }

  private scheduleOpFlush(): void {
    if (this.opTimer !== undefined) {
      return;
    }
    const delay = this.options?.opDebounceMillis ?? 300;
    this.opTimer = setTimeout(() => {
      this.opTimer = undefined;
      this.flushOps();
    }, delay);
  }

  private cancelOpTimer(): void {
    if (this.opTimer !== undefined) {
      clearTimeout(this.opTimer);
      this.opTimer = undefined;
    }
  }

  private flushOps(): void {
    if (this.pendingOps.length === 0) {
      return;
    }
    if (this.opsInFlight) {
      this.scheduleOpFlush();
      return;
    }
    const options = this.options;
    if (options === undefined) {
      return;
    }
    const ops = this.pendingOps;
    this.pendingOps = [];
    this.opsInFlight = true;
    options.provider
      .applyOps({ gridId: this.gridIdKey(), tabId: options.tabId, ops })
      .then(() => {
        this.opsInFlight = false;
        if (this.pendingOps.length > 0) {
          this.scheduleOpFlush();
        }
        // Ack: in the selection view, deselected rows leave the dataset.
        if (this.viewActive) {
          this.beans.gridApi.refreshServerSide();
        }
        this.refreshSpec();
      })
      .catch((error: unknown) => {
        this.opsInFlight = false;
        if (this.pendingOps.length > 0) {
          this.scheduleOpFlush();
        }
        console.error(`${LOG_PREFIX} applyOps failed: ${describeError(error)}`);
      });
  }

  /**
   * The `refreshSsrmSelection` API: re-fetch the spec and re-resolve the
   * loaded set (e.g. after the app changed the spec out-of-band).
   */
  public refresh(): void {
    if (this.options === undefined) {
      return;
    }
    this.refreshSpec();
    this.hydrate();
  }

  // ---------------------------------------------------------------------
  // Selection view (R6)
  // ---------------------------------------------------------------------

  /** Enters the "Show All Selected" view: option on + store refresh. */
  public enterViewMode(): void {
    if (this.viewActive || this.options === undefined) {
      return;
    }
    if ((this.spec?.selectedCount ?? 0) === 0) {
      console.warn(`${LOG_PREFIX} cannot enter the selection view: nothing is selected`);
      return;
    }
    this.viewActive = true;
    this.beans.gridApi.setGridOption('ssrmSelectionViewActive', true);
    this.beans.gridApi.refreshServerSide();
    this.updateFooter();
  }

  /** Exits the view: option off + store refresh (filters untouched). */
  public exitViewMode(): void {
    if (!this.viewActive) {
      return;
    }
    this.viewActive = false;
    this.beans.gridApi.setGridOption('ssrmSelectionViewActive', false);
    this.beans.gridApi.refreshServerSide();
    this.updateFooter();
  }

  public toggleViewMode(): void {
    if (this.viewActive) {
      this.exitViewMode();
    } else {
      this.enterViewMode();
    }
  }

  public isViewActive(): boolean {
    return this.viewActive;
  }

  /** The last fetched spec (counts for the footer; `undefined` until fetched). */
  public getSpec(): SelectionSpec | undefined {
    return this.spec;
  }

  /**
   * Spec-level "Select All": flips every loaded row under the current filter
   * and captures a single `selectAll {filter}` op.
   */
  public selectAllFiltered(): void {
    this.beans.selectionSvc?.selectAllRowNodes({ source: 'apiSelectAllFiltered', selectAll: 'filtered' });
  }

  /**
   * Spec-level "Deselect All": flips every loaded row off and captures a
   * single `deselectAll` op (clears terms, exceptions, additions).
   */
  public deselectAll(): void {
    this.beans.selectionSvc?.deselectAllRowNodes({ source: 'apiSelectAllFiltered', selectAll: 'filtered' });
  }

  // ---------------------------------------------------------------------
  // Footer panel (service-built, app-mounted, `lgr-` classes)
  // ---------------------------------------------------------------------

  public attachFooter(parent: HTMLElement): void {
    this.detachFooter();
    const footer = document.createElement('div');
    footer.className = 'lgr-ssrm-selection-footer';

    const page = document.createElement('span');
    page.className = 'lgr-ssrm-selection-footer__page';

    const total = document.createElement('span');
    total.className = 'lgr-ssrm-selection-footer__total';

    const selectAll = document.createElement('button');
    selectAll.type = 'button';
    selectAll.className = 'lgr-text-button lgr-ssrm-selection-footer__select-all';
    selectAll.addEventListener('click', () => this.selectAllFiltered());

    const deselectAll = document.createElement('button');
    deselectAll.type = 'button';
    deselectAll.className = 'lgr-text-button lgr-ssrm-selection-footer__deselect-all';
    deselectAll.textContent = 'Deselect All';
    deselectAll.addEventListener('click', () => this.deselectAll());

    const viewToggle = document.createElement('button');
    viewToggle.type = 'button';
    viewToggle.className = 'lgr-text-button lgr-ssrm-selection-footer__view-toggle';
    viewToggle.addEventListener('click', () => this.toggleViewMode());

    footer.append(page, total, selectAll, deselectAll, viewToggle);
    parent.append(footer);
    this.footerEl = footer;
    this.pageSpan = page;
    this.totalSpan = total;
    this.selectAllButton = selectAll;
    this.viewToggleButton = viewToggle;
    this.updateFooter();
  }

  public detachFooter(): void {
    this.footerEl?.remove();
    this.footerEl = undefined;
    this.pageSpan = undefined;
    this.totalSpan = undefined;
    this.selectAllButton = undefined;
    this.viewToggleButton = undefined;
  }

  private updateFooter(): void {
    if (this.footerEl === undefined) {
      return;
    }
    const spec = this.spec;
    if (this.pageSpan !== undefined) {
      this.pageSpan.textContent = `Selected on current page: ${this.countPageSelected()}`;
    }
    if (this.totalSpan !== undefined) {
      this.totalSpan.textContent =
        spec !== undefined ? `Total Selected: ${spec.selectedCount}` : 'Total Selected: …';
    }
    if (this.selectAllButton !== undefined) {
      this.selectAllButton.textContent = `Select All (${this.rowCount()})`;
    }
    if (this.viewToggleButton !== undefined) {
      const selectedCount = spec?.selectedCount ?? 0;
      this.viewToggleButton.textContent = this.viewActive
        ? 'Show All Records'
        : `Show All Selected (${selectedCount})`;
      this.viewToggleButton.disabled = !this.viewActive && selectedCount === 0;
    }
  }

  /** "Selected on current page" (R7): the viewport's loaded, selected rows. */
  private countPageSelected(): number {
    const { pageBounds, rowModel } = this.beans;
    const firstRow = pageBounds.getFirstRow();
    const lastRow = pageBounds.getLastRow();
    let count = 0;
    for (let i = firstRow; i <= lastRow; i++) {
      const node = rowModel.getRow(i);
      if (node !== undefined && !node.group && node.isSelected()) {
        count++;
      }
    }
    return count;
  }

  /** The store's filtered total from the last successful load (Select All (N)). */
  private rowCount(): number {
    return this.beans.rowModel.getRowCount();
  }
}

function routeKey(op: SelectionOp): string | undefined {
  if (op.op === 'selectGroup' || op.op === 'deselectGroup') {
    return op.route.join('|');
  }
  return undefined;
}
