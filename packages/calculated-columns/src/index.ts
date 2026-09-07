export { CalculatedColumnsModule } from './calculatedColumnsModule';
export { CalculatedColumnsService } from './calculatedColumnsService';
// The `formula` bean is the canonical FormulaService shared with
// @libregrid/formulas (gap-plan A1). The old class name is kept as an alias
// so 1.x imports keep working; it is the same superset class.
export {
  FormulaService,
  FormulaService as CalculatedColumnFormulaService,
} from '@libregrid/formulas';
export {
  FormulaError,
  parseExpression,
  validateExpression,
  evaluate,
  referencedColumnIds,
  referencedCells,
  FORMULA_FUNCTIONS,
  FORMULA_FUNCTION_NAMES,
  FORMULA_FUNCTION_DESCRIPTIONS,
  FORMULA_OPERATORS,
  getFormulaFunction,
  type FormulaErrorCode,
  type ExprNode,
  type FormulaFunc,
  type ExpressionEvaluator,
  type ValidateOptions,
} from '@libregrid/formulas';
export type { ColumnReference, CalcDialogProps } from './calculatedColumnsDialog';
