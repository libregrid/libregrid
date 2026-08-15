import {
  BeanStub,
  type Column,
  type IClipboardCopyParams,
  type IClipboardCopyRowsParams,
  type NamedBean,
} from 'ag-grid-community';
import { fromDelimited, toDelimited } from './tsv';

/** Grid-backed Clipboard implementation for range and selected-row copy actions. @feature Clipboard */
export class GridClipboardService extends BeanStub implements NamedBean {
  public beanName = 'clipboardSvc' as const;
  private lastCopied = '';

  public pasteFromClipboard(): void {
    if (this.gos.get('suppressClipboardPaste')) return;
    const read = globalThis.navigator?.clipboard?.readText;
    if (read) void read.call(globalThis.navigator.clipboard).then((data) => this.pasteData(data));
  }
  public copyToClipboard(params?: IClipboardCopyParams): void {
    this.copySelectedRangeToClipboard(params);
  }
  public cutToClipboard(params?: IClipboardCopyParams): void {
    if (this.gos.get('suppressCutToClipboard')) return;
    this.dispatch('cutStart');
    this.copySelectedRangeToClipboard(params);
    (
      this.beans.rangeSvc as unknown as
        { clearCellRangeCellValues?: (params: { cellEventSource: string }) => void } | undefined
    )?.clearCellRangeCellValues?.({ cellEventSource: 'clipboard' });
    this.dispatch('cutEnd');
  }
  public copySelectedRowsToClipboard(params?: IClipboardCopyRowsParams): void {
    const api = this.api();
    const columns = (params?.columnKeys
      ?.map((key) => (typeof key === 'string' ? api.getColumn?.(key) : key))
      .filter(Boolean) ??
      api.getAllGridColumns?.() ??
      []) as Column[];
    const rows =
      api
        .getSelectedNodes?.()
        .filter((node) => !node.group)
        .map((node) => columns.map((column) => this.value(node.data, column, node))) ?? [];
    this.write(this.withHeaders(rows, columns, params));
  }
  public copySelectedRangeToClipboard(params?: IClipboardCopyParams): void {
    const api = this.api();
    const ranges =
      (
        this.beans.rangeSvc as unknown as
          | {
              getCellRanges(): Array<{
                startRow?: { rowIndex: number };
                endRow?: { rowIndex: number };
                columns: Column[];
              }>;
            }
          | undefined
      )?.getCellRanges() ?? [];
    const copied: unknown[][] = [];
    for (const range of ranges) {
      if (!range?.startRow || !range.endRow) continue;
      if (copied.length) copied.push([]); // Non-contiguous ranges are TSV blocks separated by a blank row.
      const start = Math.min(range.startRow.rowIndex, range.endRow.rowIndex);
      const end = Math.max(range.startRow.rowIndex, range.endRow.rowIndex);
      const rows = Array.from({ length: end - start + 1 }, (_, index) =>
        api.getDisplayedRowAtIndex?.(start + index),
      )
        .filter(Boolean)
        .filter((node) => !node!.group)
        .map((node) => range.columns.map((column) => this.value(node!.data, column, node)));
      copied.push(...this.withHeaders(rows, range.columns, params));
    }
    this.write(copied);
  }
  public copyRangeDown(): void {
    const range = (
      this.beans.rangeSvc as unknown as
        | {
            getCellRanges(): Array<{
              endRow?: { rowIndex: number; rowPinned: string | null };
              columns: Column[];
            }>;
            fillRangeToCell?: (
              range: unknown,
              target: { rowIndex: number; rowPinned: string | null; column: Column },
            ) => void;
          }
        | undefined
    )?.getCellRanges()[0];
    if (!range?.endRow || !range.columns.length) return;
    (
      this.beans.rangeSvc as unknown as
        | {
            fillRangeToCell?: (
              range: unknown,
              target: { rowIndex: number; rowPinned: string | null; column: Column },
            ) => void;
          }
        | undefined
    )?.fillRangeToCell?.(range, {
      rowIndex: range.endRow.rowIndex + 1,
      rowPinned: range.endRow.rowPinned,
      column: range.columns.at(-1)!,
    });
  }
  public getLastCopied(): string {
    return this.lastCopied;
  }
  public parse(value: string): string[][] {
    return fromDelimited(value, this.delimiter());
  }
  /** Applies clipboard-delimited text at the first selected range cell. @feature Clipboard */
  public pasteData(value: string): void {
    if (this.gos.get('suppressClipboardPaste')) return;
    const process = this.gos.get('processDataFromClipboard') as
      ((params: { data: string[][] }) => string[][] | null | undefined) | undefined;
    const data =
      process?.({ data: fromDelimited(value, this.delimiter()) }) ??
      fromDelimited(value, this.delimiter());
    const range = (
      this.beans.rangeSvc as unknown as
        | { getCellRanges(): Array<{ startRow?: { rowIndex: number }; columns: Column[] }> }
        | undefined
    )?.getCellRanges()[0];
    if (!range?.startRow) return;
    const api = this.api() as {
      getDisplayedRowAtIndex?: (index: number) =>
        | {
            setDataValue?: (column: Column, value: unknown, source?: string) => void;
            data: unknown;
            group?: boolean;
          }
        | undefined;
    };
    this.dispatch('pasteStart');
    data.forEach((row, rowOffset) =>
      row.forEach((source, columnOffset) => {
        const column = range.columns[columnOffset];
        const node = api.getDisplayedRowAtIndex?.(range.startRow!.rowIndex + rowOffset);
        if (!column || !node || node.group || this.suppressPaste(column, node.data)) return;
        const transform = this.gos.get('processCellFromClipboard') as
          ((params: { value: string; column: Column; node: unknown }) => unknown) | undefined;
        const next = transform?.({ value: source, column, node }) ?? source;
        if (this.gos.get('readOnlyEdit'))
          this.dispatch('cellEditRequest', {
            column,
            node,
            oldValue: this.value(node.data, column),
            newValue: next,
            source: 'clipboard',
          });
        else node.setDataValue?.(column, next, 'clipboard');
      }),
    );
    this.dispatch('pasteEnd');
  }

  private withHeaders(
    rows: unknown[][],
    columns: Column[],
    params?: IClipboardCopyParams,
  ): unknown[][] {
    if (!(params?.includeHeaders || this.gos.get('copyHeadersToClipboard'))) return rows;
    return [
      [...columns.map((column) => this.header(column, Boolean(params?.includeGroupHeaders)))],
      ...rows,
    ];
  }
  private write(rows: unknown[][] | string): void {
    this.lastCopied = typeof rows === 'string' ? rows : toDelimited(rows, this.delimiter());
    const callback = this.gos.get('sendToClipboard') as
      ((params: { data: string }) => void) | undefined;
    if (callback) {
      callback({ data: this.lastCopied });
      return;
    }
    this.writeToBrowserClipboard(this.lastCopied);
  }

  private writeToBrowserClipboard(value: string): void {
    const clipboard = globalThis.navigator?.clipboard;
    if (clipboard?.writeText) {
      void clipboard.writeText(value).catch(() => this.copyWithTemporaryTextarea(value));
      return;
    }
    this.copyWithTemporaryTextarea(value);
  }

  private copyWithTemporaryTextarea(value: string): void {
    const document = globalThis.document;
    if (!document?.body) return;
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand?.('copy');
    textarea.remove();
  }
  private delimiter(): string {
    return (this.gos.get('clipboardDelimiter') as string | undefined) ?? '\t';
  }
  private suppressPaste(column: Column, data: unknown): boolean {
    const value = column.getColDef().suppressPaste;
    return typeof value === 'function' ? value({ column, data } as never) : Boolean(value);
  }
  private dispatch(type: string, extra: object = {}): void {
    (
      this.beans.eventSvc as unknown as { dispatchEvent?: (event: object) => void } | undefined
    )?.dispatchEvent?.({ type, api: this.beans.gridApi, ...extra });
  }
  private header(column: Column, includeGroupHeaders: boolean): unknown {
    const value = column.getColDef().headerName ?? column.getColDef().field ?? column.getColId();
    const callback = this.gos.get(
      includeGroupHeaders ? 'processGroupHeaderForClipboard' : 'processHeaderForClipboard',
    ) as ((params: { column: Column; value: string }) => unknown) | undefined;
    return callback?.({ column, value }) ?? value;
  }
  private value(data: unknown, column: Column, node?: unknown): unknown {
    const field = column.getColDef().field;
    const value =
      field && data && typeof data === 'object'
        ? (data as Record<string, unknown>)[field]
        : undefined;
    const callback = this.gos.get('processCellForClipboard') as
      ((params: { value: unknown; column: Column; node: unknown }) => unknown) | undefined;
    return callback?.({ value, column, node }) ?? value;
  }
  private api() {
    return this.beans.gridApi as unknown as {
      getAllGridColumns?: () => Column[];
      getColumn?: (key: string) => Column | null;
      getSelectedNodes?: () => Array<{ data: unknown; group?: boolean }>;
      getDisplayedRowAtIndex?: (index: number) => { data: unknown; group?: boolean } | undefined;
    };
  }
}
