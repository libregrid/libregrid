import type { BeanCollection, IRowNode, RowNode, _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { FormulaCellEditor } from './formulaCellEditor';
import { FormulaDataService } from './formulaDataService';
import { FormulaInputManager } from './formulaInputManager';
import { FormulaService } from './formulaService';
import { formulasCss } from './formulasCss';
import { VERSION } from './version';

/** The GridApi surface contributed by this module's `apiFunctions`. */
export interface FormulasGridApi {
  /**
   * Invalidate the grid's formula cache so the next render re-queries
   * `formulaDataSource.getFormula` and re-evaluates affected formulas. Call
   * this when the formula store has been mutated outside the grid (e.g.
   * synced from your server) or after direct store writes.
   *
   * - No argument: invalidates every cached formula.
   * - `IRowNode` or row id: invalidates that row's cache including pinned /
   *   group-footer sibling chains.
   *
   * Returns `false` for no-op cases: formulas inactive, an unknown row id, or
   * a row whose entire sibling chain had no cached formulas.
   */
  refreshFormulas(rowNode?: IRowNode | string): boolean;
}

function formulaSvc(beans: BeanCollection): FormulaService | undefined {
  return beans.formula as FormulaService | undefined;
}

function refreshFormulas(beans: BeanCollection, rowNode?: IRowNode | string): boolean {
  const svc = formulaSvc(beans);
  if (!svc || !svc.active) return false;
  const api = beans.gridApi;
  if (rowNode === undefined) {
    if (!svc.hasCachedRows()) return false;
    svc.refreshFormulas(true);
    return true;
  }
  const removed = svc.refreshRow(rowNode as RowNode | string);
  if (removed && api) {
    const node = typeof rowNode === 'string' ? api.getRowNode(rowNode) : rowNode;
    if (node) {
      api.refreshCells({ force: true, rowNodes: [node] });
    }
  }
  return removed;
}

/**
 * Registers the beans and components Community's formula seams expect:
 *
 * - `formula` (`FormulaService`) — the shared value pipeline: calculated-column
 *   expressions (Phase 18) and per-cell `=...` formulas (A1), external formula
 *   text cache, error model, custom-function lookup, fill-handle offsets.
 * - `formulaDataSvc` (`FormulaDataService`) — wraps `gridOptions.formulaDataSource`.
 * - `formulaInputManager` (`FormulaInputManager`) — active formula-editor coordination.
 * - `agFormulaCellEditor` — the tokenising formula cell editor, Community's
 *   default editor for `allowFormula` columns.
 * - `refreshFormulas` — the reserved `_FormulaGridApi` slot.
 *
 * Per-cell formulas require Client-Side Row Model row IDs; tree data, pivot
 * mode, active row grouping and non-CSR row models keep the feature inert
 * (docs compatibility table).
 *
 * @feature Formulas
 */
export const FormulasModule: _ModuleWithApi<FormulasGridApi> = {
  moduleName: 'Formula',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  beans: [FormulaService, FormulaDataService, FormulaInputManager],
  userComponents: { agFormulaCellEditor: FormulaCellEditor },
  css: [formulasCss],
  apiFunctions: { refreshFormulas },
};
