import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { FormulaService } from '@libregrid/formulas';
import { CalculatedColumnsService } from './calculatedColumnsService';
import { calculatedColumnsCss } from './calculatedColumnsCss';
import { VERSION } from './version';

/**
 * Registers the beans Community's calculated-column seams expect:
 *
 * - `formula` (`FormulaService`, from `@libregrid/formulas`) — the canonical
 *   expression evaluator Community routes calculated-column cell values
 *   through (`ValueService.getValueFromData`), plus the formula-error hooks
 *   driving the `formula-error` CSS class and cell tooltips. Declaring the
 *   same class as `FormulasModule` means exactly one instance serves both
 *   features (the context dedupes module beans by class identity).
 * - `calculatedColsSvc` (`CalculatedColumnsService`) — the dynamic-column
 *   lifecycle: dialog-created columns spliced into the column build
 *   (`contributeTo`), user-column-layer record, add/edit/remove dialog,
 *   menu items, edit highlighting, and the `calculatedColumn*` events.
 *
 * `calculatedColumns` on the grid options (boolean or
 * `{ dataTypes, expressionPickers, applyMode, suppressColumnHighlighting }`)
 * enables the feature. Calculated columns are always read-only; Community
 * enforces that in its edit/paste/setValue paths via `AgColumn.isCalculatedCol`.
 *
 * @feature CalculatedColumns
 */
export const CalculatedColumnsModule: Module = {
  moduleName: 'CalculatedColumns',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  beans: [FormulaService, CalculatedColumnsService],
  css: [calculatedColumnsCss],
};
