import {
  BeanStub,
  ROW_NUMBERS_COLUMN_ID,
  type CellRange,
  type CellRangeParams,
  type Column,
  type NamedBean,
  type RowPosition,
  type RowPinnedType,
} from 'ag-grid-community';
import { fillSeries } from './rangeModel';

type CellPosition = RowPosition & { column: Column };
type CellRangeFeatureCtrl = {
  rowNode: { rowIndex: number | null; rowPinned?: string | null };
  column: Column;
  eGui?: HTMLElement;
  comp?: { toggleCss(name: string, on: boolean): void };
};
class RangeHeaderMouseFeature extends BeanStub {}

/** Grid range state and DOM integration backing the public cell-range API. @feature Cell Selection */
export class RangeService extends BeanStub implements NamedBean {
  public beanName = 'rangeSvc' as const;
  /** Community consumes this property while dragging; the compact implementation does not auto-scroll. */
  public readonly autoScrollService = {};
  private cellRanges: CellRange[] = [];
  private readonly cellFeatures = new Set<CellRangeFeature>();
  private readonly headerRefreshers = new Set<() => void>();

  public getCellRanges(): CellRange[] {
    return this.cellRanges;
  }
  public removeAllCellRanges(silent = false): void {
    this.cellRanges = [];
    this.refresh();
    if (!silent) this.dispatchChanged();
  }
  public addCellRange(params: CellRangeParams): CellRange | undefined {
    const range = this.createCellRangeFromCellRangeParams(params);
    if (range) {
      this.cellRanges.push(range);
      this.refresh();
      this.dispatchChanged();
    }
    return range;
  }
  public setCellRange(params: CellRangeParams): void {
    this.cellRanges = [];
    this.addCellRange(params);
  }
  public extendLatestCellRange(params: CellRangeParams): void {
    const range = this.createCellRangeFromCellRangeParams(params);
    if (!range) return;
    this.cellRanges[this.cellRanges.length - 1] = range;
    this.refresh();
    this.dispatchChanged();
  }
  public isEmpty(): boolean {
    return this.cellRanges.length === 0;
  }
  public setCellRanges(ranges: CellRange[]): void {
    this.cellRanges = ranges;
    this.refresh();
    this.dispatchChanged();
  }
  public getCellRangeCount(cell: CellPosition): number {
    return this.cellRanges.filter((range) => this.isCellInSpecificRange(cell, range)).length;
  }
  public getRangeRowCount(range: CellRange): number {
    return (
      Math.abs(
        (range.endRow?.rowIndex ?? range.startRow?.rowIndex ?? 0) - (range.startRow?.rowIndex ?? 0),
      ) + 1
    );
  }
  public isCellInAnyRange(cell: CellPosition): boolean {
    return this.cellRanges.some((range) => this.isCellInSpecificRange(cell, range));
  }
  public isCellInSpecificRange(cell: CellPosition, range: CellRange): boolean {
    return this.isRowInRange(cell, range) && range.columns.includes(cell.column);
  }
  public isColumnInAnyRange(column: Column): boolean {
    return this.cellRanges.some((range) => range.columns.includes(column));
  }
  public isRowInRange(row: RowPosition, range: CellRange): boolean {
    const start = range.startRow;
    const end = range.endRow ?? start;
    return Boolean(
      start &&
      end &&
      row.rowPinned === start.rowPinned &&
      row.rowPinned === end.rowPinned &&
      row.rowIndex >= Math.min(start.rowIndex, end.rowIndex) &&
      row.rowIndex <= Math.max(start.rowIndex, end.rowIndex),
    );
  }
  public isBottomRightCell(range: CellRange, cell: CellPosition): boolean {
    return Boolean(
      range.endRow &&
      cell.rowIndex === range.endRow.rowIndex &&
      cell.rowPinned === range.endRow.rowPinned &&
      cell.column === range.columns.at(-1),
    );
  }
  public isContiguousRange(range: CellRange): boolean {
    const all = this.columns();
    const indexes = range.columns.map((column) => all.indexOf(column));
    return indexes.every(
      (index, position) => position === 0 || index === indexes[position - 1]! + 1,
    );
  }
  public isMoreThanOneCell(): boolean {
    return this.cellRanges.some((range) => this.getRangeRowCount(range) * range.columns.length > 1);
  }
  public areAllRangesAbleToMerge(): boolean {
    return (
      this.cellRanges.length <= 1 || this.cellRanges.every((range) => this.isContiguousRange(range))
    );
  }
  public setRangeToCell(cell: CellPosition, appendRange = false): void {
    const params = this.paramsFor(cell, cell);
    if (appendRange) this.addCellRange(params);
    else this.setCellRange(params);
  }
  public handleCellMouseDown(event: MouseEvent, cell: CellPosition): void {
    // Pressing the fill/range handle must not reset the selection — the
    // handle drag is owned by RangeDragFeature.
    const target = event.target;
    if (
      typeof HTMLElement !== 'undefined' &&
      target instanceof HTMLElement &&
      (target.closest('.lgr-fill-handle') || target.closest('.lgr-range-handle'))
    )
      return;
    // Community may deliver the same mousedown twice (the cell listener and
    // the drag-service listener both land here, on different event objects) —
    // a ctrl+drag would otherwise append two ranges. Set a dispatch-scoped
    // flag; RangeDragFeature's container listener checks it and skips its own
    // initial range creation.
    if (this.mouseDownHandled) return;
    this.mouseDownHandled = true;
    globalThis.setTimeout(() => {
      this.mouseDownHandled = false;
    }, 0);
    if (event.shiftKey && this.cellRanges.length) this.extendLatestRangeToCell(cell);
    else this.setRangeToCell(cell, (event.ctrlKey || event.metaKey) && !this.suppressMultiRanges());
  }
  public handleCellKeyboardSelect(event: KeyboardEvent, cell: CellPosition): void {
    if (event.shiftKey && this.cellRanges.length) this.extendLatestRangeToCell(cell);
    else this.setRangeToCell(cell);
  }
  /** True while the fill/range handle owns an active drag — suppress the cell-drag path. */
  public handleDragActive = false;

  /** Set for the duration of one mousedown dispatch — dedupes the two community delivery paths. */
  public mouseDownHandled = false;

  public setHandleDragActive(active: boolean): void {
    this.handleDragActive = active;
  }

  public onDragStart(event: MouseEvent): void {
    if (this.handleDragActive) return;
    const cell = this.domCell(event.target);
    if (cell) this.handleCellMouseDown(event, this.cellPosition(cell));
  }
  public onDragging(event: MouseEvent): void {
    if (this.handleDragActive) return;
    const cell = this.domCell(event.target);
    if (cell && event.buttons === 1) this.extendLatestRangeToCell(this.cellPosition(cell));
  }
  public onDragStop(): void {
    /* DOM listener owns drag state. */
  }
  public intersectLastRange(): void {
    /* Overlap is retained as a distinct range, matching multi-range copy semantics. */
  }
  public extendLatestRangeToCell(cell: CellPosition): void {
    const range = this.cellRanges.at(-1);
    if (!range?.startRow) return this.setRangeToCell(cell);
    this.extendRangeToCell(range, cell);
  }
  public extendRangeToCell(range: CellRange, cell: CellPosition): void {
    const start = range.startRow ? { ...range.startRow, column: range.startColumn } : cell;
    this.replaceRange(range, this.paramsFor(start, cell));
  }
  public extendRangeRowCountBy(range: CellRange, targetCount: number): void {
    if (!range.startRow || !range.endRow) return;
    this.replaceRange(range, {
      rowStartIndex: range.startRow.rowIndex,
      rowStartPinned: range.startRow.rowPinned,
      rowEndIndex: range.startRow.rowIndex + Math.max(0, targetCount - 1),
      rowEndPinned: range.endRow.rowPinned,
      columnStart: range.startColumn,
      columnEnd: range.columns.at(-1) ?? range.startColumn,
    });
  }
  public extendRangeColumnCountBy(range: CellRange, delta: number): void {
    const index = this.columns().indexOf(range.columns.at(-1) ?? range.startColumn);
    const column = this.columns()[Math.max(0, Math.min(this.columns().length - 1, index + delta))];
    if (column && range.endRow) this.extendRangeToCell(range, { ...range.endRow, column });
  }
  public updateRangeRowBoundary({
    cellRange,
    boundary,
    cellPosition,
    silent = false,
  }: {
    cellRange: CellRange;
    boundary: 'start' | 'end';
    cellPosition: CellPosition;
    silent?: boolean;
  }): void {
    const start = boundary === 'start' ? cellPosition : cellRange.startRow!;
    const end = boundary === 'end' ? cellPosition : cellRange.endRow!;
    const params: CellRangeParams = {
      rowStartIndex: start.rowIndex,
      rowStartPinned: start.rowPinned,
      rowEndIndex: end.rowIndex,
      rowEndPinned: end.rowPinned,
      columnStart: boundary === 'start' ? cellPosition.column : cellRange.startColumn,
      columnEnd: boundary === 'end' ? cellPosition.column : cellRange.columns.at(-1) ?? cellRange.startColumn,
    };
    this.replaceRange(cellRange, params, silent);
  }
  public getRangeStartRow(range: Partial<CellRange>): RowPosition {
    return range.startRow ?? range.endRow ?? { rowIndex: 0, rowPinned: null };
  }
  public getRangeEndRow(range: Partial<CellRange>): RowPosition {
    return range.endRow ?? range.startRow ?? { rowIndex: 0, rowPinned: null };
  }
  public createDragListenerFeature(container: HTMLElement): BeanStub {
    return new RangeDragFeature(this, container);
  }
  public createCellRangeFeature(ctrl: CellRangeFeatureCtrl): CellRangeFeature {
    const feature = new CellRangeFeature(this, ctrl);
    this.cellFeatures.add(feature);
    return feature;
  }
  public createRangeHighlightFeature(
    compBean: BeanStub,
    column: Column,
    headerComp: { toggleCss?(name: string, on: boolean): void },
  ): void {
    const refresh = () =>
      headerComp.toggleCss?.(
        'ag-header-cell-range-selected',
        this.headerHighlightEnabled() && this.isColumnInAnyRange(column),
      );
    refresh();
    this.headerRefreshers.add(refresh);
    compBean.addDestroyFunc(() => this.headerRefreshers.delete(refresh));
  }
  public createHeaderGroupCellMouseListenerFeature(column: Column, eGui: HTMLElement): BeanStub {
    const feature = new RangeHeaderMouseFeature();
    feature.addManagedElementListeners(eGui, {
      mousedown: (event?: MouseEvent) => { if (event) this.handleColumnSelection(column, event); },
    });
    return feature;
  }
  public forEachRowInRange(range: CellRange, callback: (row: RowPosition) => void): void {
    const start = this.getRangeStartRow(range);
    const end = this.getRangeEndRow(range);
    for (
      let index = Math.min(start.rowIndex, end.rowIndex);
      index <= Math.max(start.rowIndex, end.rowIndex);
      index++
    )
      callback({ rowIndex: index, rowPinned: start.rowPinned });
  }
  public handleColumnSelection(column: Column, event: MouseEvent | KeyboardEvent): void {
    if (!this.cellSelectionOption('enableColumnSelection')) return;
    const api = this.api();
    const rowCount = api.getDisplayedRowCount?.() ?? 0;
    if (!rowCount) return;
    const append = (event.ctrlKey || event.metaKey) && !this.suppressMultiRanges();
    const params = {
      rowStartIndex: 0,
      rowEndIndex: rowCount - 1,
      columnStart: column,
      columnEnd: column,
    };
    if (append) this.addCellRange(params);
    else this.setCellRange(params);
  }
  /** Applies copy/series fill from a selected rectangle through the target cell, then expands the range. */
  public fillRangeToCell(range: CellRange, target: CellPosition): void {
    if (!range.startRow || !range.endRow || target.rowPinned !== range.startRow.rowPinned) return;
    const start = Math.min(range.startRow.rowIndex, range.endRow.rowIndex);
    const end = Math.max(range.startRow.rowIndex, range.endRow.rowIndex);
    const targetEnd = target.rowIndex;
    if (targetEnd <= end) return;
    const api = this.api() as ReturnType<RangeService['api']> & {
      getDisplayedRowAtIndex?: (index: number) =>
        | {
            data?: unknown;
            setDataValue?: (column: Column, value: unknown, source?: string) => void;
          }
        | undefined;
    };
    this.dispatch('fillStart', { initialRange: range });
    for (const column of range.columns) {
      const field = column.getColDef().field;
      const source = Array.from({ length: end - start + 1 }, (_, offset) => {
        const node = api.getDisplayedRowAtIndex?.(start + offset) as { data?: unknown } | undefined;
        const data = node?.data;
        return field && data && typeof data === 'object'
          ? (data as Record<string, unknown>)[field]
          : undefined;
      });
      const values = fillSeries(source, targetEnd - start + 1);
      values
        .slice(end - start + 1)
        .forEach((value, offset) =>
          api.getDisplayedRowAtIndex?.(end + 1 + offset)?.setDataValue?.(column, value, 'fill'),
        );
    }
    const finalRange = this.createCellRangeFromCellRangeParams({
      rowStartIndex: range.startRow.rowIndex,
      rowStartPinned: range.startRow.rowPinned,
      rowEndIndex: targetEnd,
      rowEndPinned: target.rowPinned,
      columnStart: range.startColumn,
      columnEnd: range.columns.at(-1) ?? range.startColumn,
    });
    if (finalRange) {
      const index = this.cellRanges.indexOf(range);
      if (index >= 0) this.cellRanges[index] = finalRange;
      this.refresh();
      this.dispatchChanged();
      this.dispatch('fillEnd', { initialRange: range, finalRange });
    }
  }
  /** Clear all selected editable cells and emit the wrapper events used by Delete/Backspace. */
  public clearCellRangeCellValues(
    params: {
      cellRanges?: CellRange[];
      cellEventSource?: string;
      dispatchWrapperEvents?: boolean;
      wrapperEventSource?: 'deleteKey';
    } = {},
  ): void {
    const ranges = params.cellRanges ?? this.cellRanges;
    const api = this.api();
    if (params.dispatchWrapperEvents)
      this.dispatch('cellSelectionDeleteStart', { source: params.wrapperEventSource });
    for (const range of ranges)
      this.forEachRowInRange(range, (row) =>
        range.columns.forEach((column) =>
          api
            .getDisplayedRowAtIndex?.(row.rowIndex)
            ?.setDataValue?.(column, null, params.cellEventSource ?? 'cellClear'),
        ),
      );
    if (params.dispatchWrapperEvents)
      this.dispatch('cellSelectionDeleteEnd', { source: params.wrapperEventSource });
  }

  public createCellRangeFromCellRangeParams(params: CellRangeParams): CellRange | undefined {
    const allColumns = this.columns();
    const resolve = (value: string | Column | undefined) =>
      typeof value === 'string' ? allColumns.find((column) => column.getColId() === value) : value;
    const startColumn =
      resolve(params.columnStart) ??
      (params.columns?.length ? resolve(params.columns[0]) : undefined);
    const endColumn =
      resolve(params.columnEnd) ??
      (params.columns?.length ? resolve(params.columns.at(-1)) : startColumn);
    if (!startColumn || !endColumn || params.rowStartIndex == null || params.rowEndIndex == null)
      return undefined;
    const startIndex = allColumns.indexOf(startColumn);
    const endIndex = allColumns.indexOf(endColumn);
    const columns =
      params.columns?.map(resolve).filter((column): column is Column => Boolean(column)) ??
      allColumns.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
    return {
      columns,
      startColumn,
      startRow: { rowIndex: params.rowStartIndex, rowPinned: params.rowStartPinned ?? null },
      endRow: { rowIndex: params.rowEndIndex, rowPinned: params.rowEndPinned ?? null },
    };
  }
  public createPartialCellRangeFromRangeParams(
    params: CellRangeParams,
  ): Partial<CellRange> | undefined {
    return this.createCellRangeFromCellRangeParams(params);
  }
  public extendLatestRangeInDirection(event: KeyboardEvent): CellPosition | undefined {
    const range = this.cellRanges.at(-1);
    if (!range?.endRow) return undefined;
    const all = this.columns();
    const last = range.columns.at(-1) ?? range.startColumn;
    const delta =
      event.key === 'ArrowUp'
        ? [-1, 0]
        : event.key === 'ArrowDown'
          ? [1, 0]
          : event.key === 'ArrowLeft'
            ? [0, -1]
            : event.key === 'ArrowRight'
              ? [0, 1]
              : undefined;
    if (!delta) return undefined;
    const column = all[all.indexOf(last) + delta[1]!];
    const row = range.endRow.rowIndex + delta[0]!;
    if (!column || row < 0) return undefined;
    const cell = { rowIndex: row, rowPinned: range.endRow.rowPinned, column };
    this.extendLatestRangeToCell(cell);
    return cell;
  }

  private replaceRange(existing: CellRange, params: CellRangeParams, silent = false): void {
    const range = this.createCellRangeFromCellRangeParams(params);
    if (!range) return;
    const index = this.cellRanges.indexOf(existing);
    if (index >= 0) this.cellRanges[index] = range;
    this.refresh();
    if (!silent) this.dispatchChanged();
  }
  private paramsFor(start: CellPosition, end: CellPosition): CellRangeParams {
    return {
      rowStartIndex: start.rowIndex,
      rowStartPinned: start.rowPinned,
      rowEndIndex: end.rowIndex,
      rowEndPinned: end.rowPinned,
      columnStart: start.column,
      columnEnd: end.column,
    };
  }
  private cellPosition(cell: { row: number; column: string }): CellPosition {
    const column = this.columns().find((item) => item.getColId() === cell.column)!;
    return { rowIndex: cell.row, rowPinned: null, column };
  }
  private domCell(target: EventTarget | null): { row: number; column: string } | undefined {
    const element =
      typeof HTMLElement !== 'undefined' && target instanceof HTMLElement
        ? target.closest<HTMLElement>('.ag-cell')
        : null;
    const rowElement = element?.closest<HTMLElement>('.ag-row');
    const row = rowElement ? Number(rowElement.getAttribute('row-index')) : NaN;
    const column = element?.getAttribute('col-id');
    return Number.isInteger(row) && column ? { row, column } : undefined;
  }
  private columns(): Column[] {
    return (
      (
        this.beans.gridApi as unknown as { getAllGridColumns?: () => Column[] }
      ).getAllGridColumns?.() ?? []
    );
  }
  private api() {
    return this.beans.gridApi as unknown as {
      getAllGridColumns?: () => Column[];
      getDisplayedRowCount?: () => number;
      getDisplayedRowAtIndex?: (
        index: number,
      ) => { setDataValue?: (column: Column, value: unknown, source?: string) => void } | undefined;
    };
  }
  public handleMode(): 'fill' | 'range' | undefined {
    const selection = this.gos.get('cellSelection');
    const handle =
      selection && typeof selection === 'object'
        ? (selection as { handle?: { mode?: unknown } }).handle
        : undefined;
    return handle?.mode === 'fill' || handle?.mode === 'range' ? handle.mode : undefined;
  }
  public headerHighlightEnabled(): boolean {
    return this.cellSelectionOption('enableHeaderHighlight');
  }
  private cellSelectionOption(key: 'enableColumnSelection' | 'enableHeaderHighlight'): boolean {
    const selection = this.gos.get('cellSelection');
    return (
      typeof selection === 'object' &&
      selection !== null &&
      Boolean((selection as Record<string, unknown>)[key])
    );
  }
  private suppressMultiRanges(): boolean {
    const selection = this.gos.get('cellSelection');
    return typeof selection === 'object' && selection !== null
      ? Boolean((selection as { suppressMultiRanges?: boolean }).suppressMultiRanges)
      : Boolean(this.gos.get('suppressMultiRangeSelection'));
  }
  private refresh(): void {
    this.cellFeatures.forEach((feature) => feature.scheduleRefreshRangeStyleAndHandle());
    this.headerRefreshers.forEach((refresh) => refresh());
  }
  private dispatchChanged(): void {
    this.dispatch('rangeSelectionChanged', { started: false, finished: true });
  }
  private dispatch(type: string, extra: object = {}): void {
    (
      this.beans.eventSvc as unknown as { dispatchEvent?: (event: object) => void } | undefined
    )?.dispatchEvent?.({ type, api: this.beans.gridApi, ...extra });
  }
  public unregister(feature: CellRangeFeature): void {
    this.cellFeatures.delete(feature);
  }
}

/** Per-cell selection painter. It keeps selection styling attached to recycled grid cells. */
class CellRangeFeature extends BeanStub {
  private comp: CellRangeFeatureCtrl['comp'];
  private fillHandle: HTMLElement | undefined;
  public constructor(
    private readonly rangeService: RangeService,
    private readonly ctrl: CellRangeFeatureCtrl,
  ) {
    super();
  }
  public setComp(comp: NonNullable<CellRangeFeatureCtrl['comp']>): void {
    this.comp = comp;
    this.scheduleRefreshRangeStyleAndHandle();
  }
  public unsetComp(): void {
    this.comp = undefined;
  }
  public scheduleRefreshRangeStyleAndHandle(): void {
    this.paint();
  }
  public updateRangeBordersIfRangeCount(): void {
    this.paint();
  }
  public onCellSelectionChanged(): void {
    this.paint();
  }
  public override destroy(): void {
    this.rangeService.unregister(this);
    super.destroy();
  }
  private paint(): void {
    const comp = this.comp;
    const rowIndex = this.ctrl.rowNode.rowIndex;
    if (!comp || rowIndex == null) return;
    const cell = {
      rowIndex,
      rowPinned: (this.ctrl.rowNode.rowPinned ?? null) as RowPinnedType,
      column: this.ctrl.column,
    };
    const ranges = this.rangeService.getCellRanges();
    const count = this.rangeService.getCellRangeCount(cell);
    comp.toggleCss('ag-cell-range-selected', count > 0);
    comp.toggleCss('ag-cell-range-selected-1', count > 0);
    comp.toggleCss('ag-cell-range-selected-2', count > 1);
    const range = ranges.find((item) => this.rangeService.isCellInSpecificRange(cell, item));
    comp.toggleCss(
      'ag-cell-range-single-cell',
      Boolean(
        range && this.rangeService.getRangeRowCount(range) === 1 && range.columns.length === 1,
      ),
    );
    comp.toggleCss(
      'ag-cell-range-top',
      Boolean(
        range &&
        cell.rowIndex ===
          Math.min(range.startRow?.rowIndex ?? rowIndex, range.endRow?.rowIndex ?? rowIndex),
      ),
    );
    comp.toggleCss(
      'ag-cell-range-bottom',
      Boolean(
        range &&
        cell.rowIndex ===
          Math.max(range.startRow?.rowIndex ?? rowIndex, range.endRow?.rowIndex ?? rowIndex),
      ),
    );
    comp.toggleCss('ag-cell-range-left', Boolean(range && cell.column === range.columns[0]));
    comp.toggleCss('ag-cell-range-right', Boolean(range && cell.column === range.columns.at(-1)));
    this.toggleFillHandle(Boolean(range && this.rangeService.isBottomRightCell(range, cell)));
  }
  private toggleFillHandle(show: boolean): void {
    const mode = this.rangeService.handleMode();
    if (!show || !mode) {
      this.fillHandle?.remove();
      this.fillHandle = undefined;
      return;
    }
    if (this.fillHandle || !this.ctrl.eGui) return;
    const handle = document.createElement('span');
    handle.className = mode === 'fill' ? 'lgr-fill-handle' : 'lgr-range-handle';
    handle.tabIndex = 0;
    handle.setAttribute('aria-label', mode === 'fill' ? 'Fill range' : 'Resize range');
    handle.setAttribute('role', 'button');
    Object.assign(handle.style, {
      position: 'absolute',
      width: '7px',
      height: '7px',
      right: '-4px',
      bottom: '-4px',
      zIndex: '2',
      background: 'var(--ag-range-selection-border-color, #1976d2)',
      cursor: 'crosshair',
    });
    this.ctrl.eGui.append(handle);
    this.fillHandle = handle;
  }
}

class RangeDragFeature extends BeanStub {
  private start: { row: number; column: string } | undefined;
  private append = false;
  private filling: CellRange | undefined;
  private resizing: CellRange | undefined;
  public constructor(
    private readonly rangeService: RangeService,
    private readonly container: HTMLElement,
  ) {
    super();
  }
  public postConstruct(): void {
    this.addManagedElementListeners(this.container, {
      mousedown: (event) => this.startDrag(event as MouseEvent),
      mousemove: (event) => {
        this.extendDragTo(this.elementUnder(event as MouseEvent));
      },
      mouseup: (event) => this.finishDrag(event as MouseEvent),
    });
  }
  private finishDrag(event: MouseEvent): void {
    // event.target can be a recycled row's cell mid-drag; resolve the cell
    // actually under the pointer instead.
    const target = this.elementUnder(event);
    const cell = this.cell(target);
    const column = cell
      ? (this.rangeService as unknown as { columns(): Column[] })
          .columns()
          .find((item) => item.getColId() === cell.column)
      : undefined;
    if (this.filling && cell && column)
      this.rangeService.fillRangeToCell(this.filling, {
        rowIndex: cell.row,
        rowPinned: null,
        column,
      });
    if (this.resizing && cell && column)
      this.rangeService.extendRangeToCell(this.resizing, {
        rowIndex: cell.row,
        rowPinned: null,
        column,
      });
    // A short drag may not emit an intermediate mousemove over the final
    // cell, so commit the normal selection from the mouseup target as well.
    if (this.start && !this.filling && !this.resizing) this.extendDragTo(target);
    this.filling = undefined;
    this.resizing = undefined;
    this.start = undefined;
    this.append = false;
    this.rangeService.setHandleDragActive(false);
  }
  private isFillHandle(target: EventTarget | null): boolean {
    return (
      typeof HTMLElement !== 'undefined' &&
      target instanceof HTMLElement &&
      Boolean(target.closest('.lgr-fill-handle'))
    );
  }
  private isRangeHandle(target: EventTarget | null): boolean {
    return (
      typeof HTMLElement !== 'undefined' &&
      target instanceof HTMLElement &&
      Boolean(target.closest('.lgr-range-handle'))
    );
  }
  private startDrag(event: MouseEvent): void {
    if (this.isFillHandle(event.target) || this.isRangeHandle(event.target)) {
      const range = this.rangeService.getCellRanges().find((item) => {
        const cell = this.cell(event.target);
        return Boolean(
          cell &&
          item.endRow?.rowIndex === cell.row &&
          item.columns.at(-1)?.getColId() === cell.column,
        );
      });
      if (this.isFillHandle(event.target)) {
        this.filling = range;
        this.rangeService.setHandleDragActive(true);
      } else {
        this.resizing = range;
        this.rangeService.setHandleDragActive(true);
      }
      return;
    }
    const cell = this.cell(event.target);
    if (!cell) return;
    // Row-number cells never start a cell drag: the row-numbers feature owns
    // the press (it consumes the pointerdown before this container mousedown
    // fires and selects the whole visible row), so a range created here would
    // clobber the row selection.
    if (cell.column === ROW_NUMBERS_COLUMN_ID) return;
    if (event.shiftKey) {
      const column = (this.rangeService as unknown as { columns(): Column[] })
        .columns()
        .find((item) => item.getColId() === cell.column);
      if (column)
        this.rangeService.extendLatestRangeToCell({ rowIndex: cell.row, rowPinned: null, column });
      return;
    }
    this.start = cell;
    this.append =
      (event.ctrlKey || event.metaKey) &&
      !(this.rangeService as unknown as { suppressMultiRanges(): boolean }).suppressMultiRanges();
    const params = {
      rowStartIndex: cell.row,
      rowEndIndex: cell.row,
      columnStart: cell.column,
      columnEnd: cell.column,
    };
    // RangeService.handleCellMouseDown has already created the initial range
    // for cell mousedowns (Community calls it directly); only create it here
    // when that path did not run (e.g. a mousedown on a non-cell surface).
    if (this.rangeService.mouseDownHandled) return;
    if (this.append) this.rangeService.addCellRange(params);
    else this.rangeService.setCellRange(params);
  }
  private extendDragTo(target: EventTarget | null): void {
    if (!this.start) return;
    const cell = this.cell(target);
    if (cell) {
      const params = {
        rowStartIndex: this.start.row,
        rowEndIndex: cell.row,
        columnStart: this.start.column,
        columnEnd: cell.column,
      };
      this.rangeService.extendLatestCellRange(params);
    }
  }
  /** Resolve the drag target: prefer the element under the pointer, but only when it resolves to a cell (jsdom's elementFromPoint returns the body). */
  private elementUnder(event: MouseEvent): EventTarget | null {
    if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
      try {
        const under = document.elementFromPoint(event.clientX, event.clientY);
        if (under instanceof HTMLElement && under.closest('.ag-cell')) return under;
      } catch {
        /* jsdom may not implement elementFromPoint */
      }
    }
    return event.target;
  }

  private cell(target: EventTarget | null): { row: number; column: string } | undefined {
    const element =
      typeof HTMLElement !== 'undefined' && target instanceof HTMLElement
        ? target.closest<HTMLElement>('.ag-cell')
        : null;
    // v36 wraps cells inside .ag-grid-scrolling-cells; the row-index
    // attribute lives on the .ag-row ancestor. Number(null) would silently
    // resolve every drag to row 0.
    const rowElement = element?.closest<HTMLElement>('.ag-row');
    const row = rowElement ? Number(rowElement.getAttribute('row-index')) : NaN;
    const column = element?.getAttribute('col-id');
    return Number.isInteger(row) && column ? { row, column } : undefined;
  }
}
