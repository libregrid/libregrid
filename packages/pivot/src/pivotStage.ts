import { BeanStub, _getClientSideRowModel, type NamedBean } from 'ag-grid-community';
import type { AgColumn, ChangedPath, GridOptions, _IRowNodePivotStage, RowNode } from 'ag-grid-community';
import { createGeneratedPivotDefs } from './pivotResultColsService';
import type { PivotResultColsService } from './pivotResultColsService';

function pivotKey(value: unknown): string {
  if (value === null) return '\u0000null';
  if (value === undefined) return '\u0000undefined';
  return String(value);
}

/** Builds result columns from the current leaf rows before the aggregation stage runs. */
export class PivotStage extends BeanStub implements _IRowNodePivotStage, NamedBean {
  public beanName = 'pivotStage' as const;
  public readonly step = 'pivot' as const;
  public readonly refreshProps: (keyof GridOptions)[] | null = ['pivotMode', 'pivotMaxGeneratedColumns'];
  private signature: string | null = null;

  public execute(_changedPath: ChangedPath | undefined, _changedProps: Set<keyof GridOptions> | undefined): boolean {
    const csrm = _getClientSideRowModel(this.beans);
    const pivotColumns = this.beans.pivotColsSvc?.columns ?? [];
    const result = this.beans.pivotResultCols as PivotResultColsService | undefined;
    if (!csrm || !result) return false;
    if (!this.beans.colModel.isPivotActive()) {
      const changed = this.signature !== null || result.pivotCols !== null;
      this.signature = null;
      if (changed) result.hide('api');
      return changed;
    }
    if (result.suppliedColDefs) {
      const wasHidden = result.pivotCols === null;
      result.restoreSupplied('api');
      return wasHidden;
    }
    const valueColumns = this.beans.valueColsSvc?.columns ?? [];
    const rows = csrm.rootNode?.allLeafChildren ?? [];
    const keys = this.collectKeys(rows, pivotColumns);
    const limit = this.gos.get('pivotMaxGeneratedColumns');
    const max = typeof limit === 'number' ? limit : -1;
    const used = max >= 0 ? keys.slice(0, Math.floor(max / Math.max(valueColumns.length, 1))) : keys;
    const signature = JSON.stringify({ keys: used, values: valueColumns.map((column) => column.getColId()) });
    if (signature === this.signature) return false;
    this.signature = signature;
    result.setGenerated(createGeneratedPivotDefs(used, valueColumns), 'api');
    return true;
  }

  private collectKeys(rows: RowNode[], columns: AgColumn[]): string[][] {
    const unique = new Map<string, string[]>();
    for (const row of rows) {
      const keys = columns.map((column) => pivotKey(this.beans.valueSvc.getValue(column, row, 'data', true)));
      unique.set(JSON.stringify(keys), keys);
    }
    return [...unique.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
}

export function pivotKeyForValue(value: unknown): string { return pivotKey(value); }
