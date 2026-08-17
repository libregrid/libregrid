import type { IStatusPanelParams } from 'ag-grid-community';
import { aggregate } from './statusMetrics';

type AggFuncName = 'count' | 'sum' | 'min' | 'max' | 'avg';

/** Panel params merged from StatusPanelDef.statusPanelParams. */
interface PanelParams extends IStatusPanelParams {
  valueFormatter?: (params: {
    value: number | null;
    bigintValue?: bigint;
    totalRows: number;
    key: string;
  }) => string;
  aggFuncs?: AggFuncName[];
}

interface NameValue {
  label: string;
  value: string;
}

interface PanelApi {
  getDisplayedRowCount?: () => number;
  getModel?: () => { getRowCount?: () => number } | undefined;
  getSelectedNodes?: () => unknown[];
  getCellRanges?: () => Array<{
    startRow?: { rowIndex: number } | null;
    endRow?: { rowIndex: number } | null;
    columns: Array<{ getColDef(): { field?: string } }>;
  }> | null;
  getDisplayedRowAtIndex?: (index: number) => { data: unknown } | undefined;
  getLocaleTextFunc?: () => (key: string, defaultValue: string) => string;
}

/**
 * DOM-backed base status panel: label/value pairs with polite live
 * announcements, theme-native structure, value formatting, and localised
 * labels. @feature Status Bar
 */
export abstract class BaseStatusPanel {
  protected readonly gui = document.createElement('span');
  protected params: PanelParams | undefined;

  public agInit(params: IStatusPanelParams): void {
    this.params = params as PanelParams;
    this.gui.className = 'lgr-status-panel';
    this.gui.setAttribute('aria-live', 'polite');
    this.refresh(params);
  }

  public getGui(): HTMLElement {
    return this.gui;
  }

  public refresh(params: IStatusPanelParams): boolean {
    this.params = params as PanelParams;
    this.render();
    return true;
  }

  /** Whether the panel should currently render. Defaults to always. */
  public visible(): boolean {
    return true;
  }

  public destroy(): void {
    this.gui.remove();
  }

  protected abstract nameValues(): NameValue[];

  protected api(): PanelApi {
    return this.params?.api as unknown as PanelApi;
  }

  protected totalRows(): number {
    const api = this.api();
    return api.getModel?.()?.getRowCount?.() ?? api.getDisplayedRowCount?.() ?? 0;
  }

  protected format(value: number | null): string {
    const formatter = this.params?.valueFormatter;
    if (formatter) {
      return formatter({
        value,
        totalRows: this.totalRows(),
        key: this.params?.key ?? '',
      });
    }
    return value == null ? '' : value.toLocaleString();
  }

  protected label(key: string, fallback: string): string {
    const locale = this.api().getLocaleTextFunc;
    if (locale) {
      const func = locale();
      if (typeof func === 'function') return func(key, fallback);
    }
    return fallback;
  }

  private render(): void {
    this.gui.replaceChildren();
    for (const pair of this.nameValues()) {
      const row = document.createElement('span');
      row.className = 'lgr-status-name-value';
      const key = document.createElement('span');
      key.className = 'lgr-status-name-value-key';
      key.textContent = pair.label;
      const value = document.createElement('span');
      value.className = 'lgr-status-name-value-value';
      value.textContent = pair.value;
      row.append(key, document.createTextNode(' '), value);
      this.gui.appendChild(row);
    }
  }
}

/** Total source-row count. @feature Status Bar */
export class TotalRowCountPanel extends BaseStatusPanel {
  protected nameValues(): NameValue[] {
    return [{ label: this.label('totalRows', 'Total Rows'), value: this.format(this.totalRows()) }];
  }
}

/** Total and displayed row count. @feature Status Bar */
export class TotalAndFilteredRowCountPanel extends BaseStatusPanel {
  protected nameValues(): NameValue[] {
    const api = this.api();
    const displayed = api.getDisplayedRowCount?.() ?? 0;
    const total = this.totalRows();
    const value = this.format(displayed) + ' / ' + this.format(total);
    return [{ label: this.label('rows', 'Rows'), value }];
  }
}

/** Filtered (displayed) row count. @feature Status Bar */
export class FilteredRowCountPanel extends BaseStatusPanel {
  protected nameValues(): NameValue[] {
    const displayed = this.api().getDisplayedRowCount?.() ?? 0;
    return [{ label: this.label('filteredRows', 'Filtered Rows'), value: this.format(displayed) }];
  }
}

/** Selected row count. @feature Status Bar */
export class SelectedRowCountPanel extends BaseStatusPanel {
  protected nameValues(): NameValue[] {
    const selected = this.api().getSelectedNodes?.().length ?? 0;
    return [{ label: this.label('selectedRows', 'Selected Rows'), value: this.format(selected) }];
  }
}

const DEFAULT_AGG_FUNCS: AggFuncName[] = ['count', 'sum', 'min', 'max', 'avg'];
const AGG_LABELS: Record<AggFuncName, [string, string]> = {
  count: ['count', 'Count'],
  sum: ['sum', 'Sum'],
  min: ['min', 'Min'],
  max: ['max', 'Max'],
  avg: ['avg', 'Average'],
};

/**
 * Aggregation of numeric cells in the current range. Hidden while no range
 * is selected. @feature Status Bar
 */
export class AggregationPanel extends BaseStatusPanel {
  public override visible(): boolean {
    const ranges = this.api().getCellRanges?.();
    return !!ranges && ranges.length > 0;
  }

  protected nameValues(): NameValue[] {
    const configured = this.params?.aggFuncs;
    const funcs = configured && configured.length > 0 ? configured : DEFAULT_AGG_FUNCS;
    const metrics = this.collect();
    const result: NameValue[] = [];
    for (const func of funcs) {
      const pair = AGG_LABELS[func];
      if (!pair) continue;
      const value = metrics[func] ?? null;
      if (value == null && func !== 'count' && func !== 'sum') continue;
      result.push({ label: this.label(pair[0], pair[1]), value: this.format(value) });
    }
    return result;
  }

  private collect(): Record<AggFuncName, number | null> {
    const api = this.api();
    const range = api.getCellRanges?.()?.[0];
    const values: number[] = [];
    if (range?.startRow && range.endRow) {
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
          if (typeof value === 'bigint') {
            values.push(Number(value));
          } else if (typeof value === 'number' && Number.isFinite(value)) {
            values.push(value);
          }
        }
      }
    }
    return aggregate({ total: 0, filtered: 0, selected: 0, values });
  }
}
