import {
  ROW_NUMBERS_COLUMN_ID,
  type CellPosition,
  type ColDef,
  type ColumnEventType,
  type IRowNode,
  type IRowNumbersService,
  type IRowNumbersRowResizeFeature,
  type NamedBean,
  type RowNumbersOptions,
  type ValueGetterFunc,
  _BaseSingleColService,
} from 'ag-grid-community';

/** The colDef keys RowNumbersOptions allows overriding (its ColDef subset). */
const OVERRIDABLE: readonly (keyof RowNumbersOptions)[] = [
  'contextMenuItems',
  'context',
  'onCellClicked',
  'onCellContextMenu',
  'onCellDoubleClicked',
  'headerTooltip',
  'headerStyle',
  'headerComponent',
  'headerComponentParams',
  'suppressHeaderKeyboardEvent',
  'suppressNavigable',
  'tooltipField',
  'tooltipValueGetter',
  'tooltipComponent',
  'tooltipComponentParams',
  'tooltipComponentSelector',
  'valueGetter',
  'valueFormatter',
  'maxWidth',
  'cellRenderer',
  'cellRendererSelector',
  'cellRendererParams',
];

/** The default row value: the 1-based visible row index. */
const defaultRowValueGetter: ValueGetterFunc = (params) =>
  params.node?.rowIndex != null ? params.node.rowIndex + 1 : null;

function isOptions(value: unknown): RowNumbersOptions | undefined {
  return typeof value === 'object' && value !== null ? (value as RowNumbersOptions) : undefined;
}

/** Map the grid-options change source onto the column event source type. */
function toColumnSourceType(source: 'api' | 'optionsUpdated'): ColumnEventType {
  return source === 'optionsUpdated' ? 'gridOptionsChanged' : source;
}

/**
 * The `rowNumbersSvc` bean: owns the generated row-number column and the
 * row-number cell interactions (row selection on click, per-cell row resizer).
 *
 * Community's column model calls `refreshCols()` on every refresh; the header
 * comp calls `setupForHeader`; CellCtrl consults the mouse/keyboard hooks and
 * `createRowNumbersRowResizerFeature` for row-number cells.
 *
 * Default row value: the 1-based visible row index (`node.rowIndex + 1`). The
 * public spec does not state a default value getter; this is the natural
 * reading of "each cell of this column will work as a row header" and is
 * overridable via `rowNumbers.valueGetter`.
 */
export class RowNumbersService extends _BaseSingleColService implements IRowNumbersService, NamedBean {
  public beanName = 'rowNumbersSvc' as const;
  protected override readonly colKind = 'row-number' as const;

  /** The effective resizer state at the last option change (initialised in postConstruct). */
  private resizerActive: boolean = false;

  public postConstruct(): void {
    this.addManagedPropertyListener('rowNumbers', (event) => this.onOptionsChanged(toColumnSourceType(event.source)));
    this.addManagedPropertyListener('getRowHeight', (event) => this.onOptionsChanged(toColumnSourceType(event.source)));
    this.resizerActive = this.isResizerActive();
  }

  /** Whether the per-cell resizer should render (enabled and no custom row height). */
  private isResizerActive(): boolean {
    return isOptions(this.gos.get('rowNumbers'))?.enableRowResizer === true && this.gos.get('getRowHeight') == null;
  }

  public isEnabled(): boolean {
    return !!this.gos.get('rowNumbers');
  }

  protected override createColDef(): ColDef {
    const options = isOptions(this.gos.get('rowNumbers'));
    const rtl = !!this.gos.get('enableRtl');
    const overrides = (options ?? {}) as Record<string, unknown>;
    const picked: Record<string, unknown> = {};
    for (const key of OVERRIDABLE) {
      if (key in overrides) {
        picked[key] = overrides[key];
      }
    }
    return {
      // defaults (spec: width/minWidth 60, resizable false)
      width: options?.width ?? 60,
      minWidth: options?.minWidth ?? 60,
      resizable: options?.resizable ?? false,
      suppressHeaderMenuButton: true,
      sortable: false,
      suppressMovable: true,
      lockPosition: rtl ? 'right' : 'left',
      editable: false,
      suppressFillHandle: true,
      suppressAutoSize: true,
      pinned: null,
      // user colDef overrides
      ...picked,
      // row value: user override, else the 1-based visible index
      valueGetter: (picked.valueGetter as ValueGetterFunc | undefined) ?? defaultRowValueGetter,
      // non-overridable
      colId: ROW_NUMBERS_COLUMN_ID,
      chartDataType: 'excluded',
    };
  }

  /** Rebuild the column (or its colDef) after the `rowNumbers` option changed. */
  private onOptionsChanged(source: ColumnEventType): void {
    this.refreshColDef(source);
    this.beans.colModel.refreshAll(source);
    // The resizer is a per-cell feature created when the cell component is
    // attached, not when the column model refreshes: toggling it requires the
    // existing cells to be re-created (redraw destroys and rebuilds every row,
    // which re-runs the resizer feature init and removes stale handles).
    const active = this.isResizerActive();
    if (active !== this.resizerActive) {
      this.resizerActive = active;
      if (this.column) {
        this.beans.gridApi.redrawRows();
      }
    }
  }

  public setupForHeader(_comp: unknown): void {
    // No-op: the stock header component renders nothing for this column. The
    // hook exists because Community's header init calls it; keeping it on the
    // bean leaves that call path intact.
  }

  /**
   * Left-clicking a row number selects every currently visible cell in the
   * row (spec).
   *
   * Community's mousedown path calls this hook for row-number columns and
   * skips its default single-cell handling only when the hook returns false,
   * so a consumed click returns false and everything else passes through.
   */
  public handleMouseDownOnCell(cell: CellPosition, mouseEvent: MouseEvent): boolean {
    // A primary press: left mouse button (0), or a touch press (no button).
    if (mouseEvent.button !== 0 && mouseEvent.button != null) {
      return true;
    }
    if (isOptions(this.gos.get('rowNumbers'))?.suppressCellSelectionIntegration) {
      return true;
    }
    if (cell.rowIndex == null || !this.isCellSelectionEnabled()) {
      return true;
    }
    const rangeSvc = this.beans.rangeSvc;
    if (!rangeSvc) {
      return true;
    }
    // Record the press through the range service first: it sets its
    // dispatch-scoped "mouseDownHandled" flag (plus a provisional
    // single-cell range). The flag matters in real browsers, where
    // @libregrid/cell-selection's container mousedown listener fires after
    // this consumed pointerdown and would otherwise replace the row range
    // with a single-cell range.
    rangeSvc.handleCellMouseDown(mouseEvent, cell);
    rangeSvc.setCellRange({
      rowStartIndex: cell.rowIndex,
      rowEndIndex: cell.rowIndex,
      rowStartPinned: cell.rowPinned,
      rowEndPinned: cell.rowPinned,
      columns: this.beans.gridApi.getAllDisplayedColumns(),
    });
    return false;
  }

  /**
   * Community skips its default Enter handling when this returns true. There
   * is no documented key handling for row-number cells, so it always passes
   * through; the hook is kept so the Community call path stays intact.
   */
  public handleKeyDownOnCell(_cell: CellPosition, _event: KeyboardEvent): boolean {
    return false;
  }

  /**
   * Per-cell row resizer (spec: `enableRowResizer`), a drag handle on the
   * cell's bottom edge. Does not work with auto row height (spec), so it is
   * not created when `getRowHeight` is configured.
   */
  public createRowNumbersRowResizerFeature(ctrl: unknown): IRowNumbersRowResizeFeature | undefined {
    if (!isOptions(this.gos.get('rowNumbers'))?.enableRowResizer) {
      return undefined;
    }
    if (this.gos.get('getRowHeight')) {
      return undefined;
    }
    const cellCtrl = ctrl as { eGui?: HTMLElement; rowNode?: IRowNode } | null;
    const eGridCell = cellCtrl?.eGui;
    const node = cellCtrl?.rowNode;
    if (!eGridCell || !node) {
      return undefined;
    }
    return createRowResizerFeature(this, eGridCell, node);
  }

  private isCellSelectionEnabled(): boolean {
    const cellSelection = this.gos.get('cellSelection');
    return cellSelection === true || (typeof cellSelection === 'object' && cellSelection !== null);
  }

  /** Emits a row-resize grid event for the resizer drag. */
  public dispatchResizeEvent(type: 'rowResizeStarted' | 'rowResizeEnded', node: IRowNode, event: MouseEvent, rowHeight: number): void {
    (this.beans as unknown as { eventSvc?: { dispatchEvent(event: object): void } }).eventSvc?.dispatchEvent({
      type,
      node,
      event,
      rowHeight,
    });
  }

  /** Notifies the grid that a row height changed (after `node.setRowHeight`). */
  public notifyRowHeightChanged(): void {
    this.beans.gridApi.onRowHeightChanged();
  }
}

const MIN_ROW_HEIGHT = 10;

/** Drag-handle row resizer on a row-number cell's bottom edge. */
function createRowResizerFeature(
  service: RowNumbersService,
  eGridCell: HTMLElement,
  node: IRowNode,
): IRowNumbersRowResizeFeature {
  const eResizer = document.createElement('div');
  eResizer.className = 'lgr-row-number-resizer';
  eGridCell.appendChild(eResizer);

  let dragging = false;
  let startY = 0;
  let startHeight = 0;

  const onMouseMove = (event: MouseEvent): void => {
    if (!dragging) {
      return;
    }
    const height = Math.max(MIN_ROW_HEIGHT, startHeight + (event.clientY - startY));
    node.setRowHeight(height);
    service.notifyRowHeightChanged();
  };

  const onMouseUp = (event: MouseEvent): void => {
    if (!dragging) {
      return;
    }
    dragging = false;
    service.dispatchResizeEvent('rowResizeEnded', node, event, node.rowHeight ?? startHeight);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  const onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    dragging = true;
    startY = event.clientY;
    startHeight = node.rowHeight ?? 0;
    service.dispatchResizeEvent('rowResizeStarted', node, event, startHeight);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  eResizer.addEventListener('mousedown', onMouseDown);

  return {
    refreshRowResizer(): void {
      // Community calls this after the cell's value renders (the render can
      // replace the cell's content), so re-append the handle when it was wiped.
      if (!eGridCell.contains(eResizer)) {
        eGridCell.appendChild(eResizer);
      }
    },
    destroy(): void {
      eResizer.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      eResizer.remove();
    },
  };
}
