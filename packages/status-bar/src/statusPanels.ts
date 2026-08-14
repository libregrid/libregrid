import type { IStatusPanelParams } from 'ag-grid-community';
import { aggregate } from './statusMetrics';

/** DOM-backed base panel with polite live announcements. @feature Status Bar */
export abstract class BaseStatusPanel {
  protected readonly gui = document.createElement('span');
  protected params: IStatusPanelParams | undefined;
  public agInit(params: IStatusPanelParams): void {
    this.params = params;
    this.gui.setAttribute('aria-live', 'polite');
    this.refresh(params);
  }
  public getGui(): HTMLElement {
    return this.gui;
  }
  public refresh(params: IStatusPanelParams): boolean {
    this.params = params;
    this.gui.textContent = this.text();
    return true;
  }
  protected abstract text(): string;
  protected api() {
    return this.params?.api as unknown as {
      getDisplayedRowCount?: () => number;
      getModel?: () => { getRowCount?: () => number };
      getSelectedNodes?: () => unknown[];
      getCellRanges?: () => Array<{
        startRow?: { rowIndex: number };
        endRow?: { rowIndex: number };
        columns: Array<{ getColDef(): { field?: string } }>;
      }> | null;
      getDisplayedRowAtIndex?: (index: number) => { data: unknown } | undefined;
    };
  }
}
/** Total source-row count. @feature Status Bar */
export class TotalRowCountPanel extends BaseStatusPanel {
  protected text(): string {
    const api = this.api();
    return `Total Rows: ${api.getModel?.().getRowCount?.() ?? api.getDisplayedRowCount?.() ?? 0}`;
  }
}
/** Total and displayed row count. @feature Status Bar */
export class TotalAndFilteredRowCountPanel extends BaseStatusPanel {
  protected text(): string {
    const api = this.api();
    return `Rows: ${api.getDisplayedRowCount?.() ?? 0} / ${api.getModel?.().getRowCount?.() ?? 0}`;
  }
}
/** Filtered (displayed) row count. @feature Status Bar */
export class FilteredRowCountPanel extends BaseStatusPanel {
  protected text(): string {
    return `Filtered Rows: ${this.api().getDisplayedRowCount?.() ?? 0}`;
  }
}
/** Selected row count. @feature Status Bar */
export class SelectedRowCountPanel extends BaseStatusPanel {
  protected text(): string {
    return `Selected Rows: ${this.api().getSelectedNodes?.().length ?? 0}`;
  }
}
/** Sum/count/min/max/average of numeric cells in the current range. @feature Status Bar */
export class AggregationPanel extends BaseStatusPanel {
  protected text(): string {
    const api = this.api();
    const range = api.getCellRanges?.()?.[0];
    if (!range?.startRow || !range.endRow) return 'Count: 0';
    const values: number[] = [];
    for (
      let row = Math.min(range.startRow.rowIndex, range.endRow.rowIndex);
      row <= Math.max(range.startRow.rowIndex, range.endRow.rowIndex);
      row++
    ) {
      const data = api.getDisplayedRowAtIndex?.(row)?.data;
      for (const column of range.columns) {
        const field = column.getColDef().field;
        const value =
          field && data && typeof data === 'object'
            ? (data as Record<string, unknown>)[field]
            : undefined;
        if (typeof value === 'number') values.push(value);
      }
    }
    const metrics = aggregate({ total: 0, filtered: 0, selected: 0, values });
    return `Count: ${metrics.count} Sum: ${metrics.sum} Avg: ${metrics.avg ?? ''}`;
  }
}
