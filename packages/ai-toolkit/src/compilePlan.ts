import type { GridState, SortModelItem } from 'ag-grid-community';
import type { AiGridSnapshot } from './gridSnapshot';
import type { AiFilterCondition, AiGridPlan } from './plan';
import { simpleFilterType, type AiFilterKind, type AiScalar } from './capabilities';

/**
 * Compile a validated plan into one `GridState` patch.
 *
 * Every section the plan touches is applied in a single `setState` call so the
 * grid moves once, not three times. `setState` *replaces* each section it is
 * given rather than merging, which is why the filter section is rebuilt from
 * the plan rather than spliced into the live model: v1 filter semantics are
 * "these conditions are now the filter".
 *
 * Sections the plan does not mention are omitted entirely, so an unrelated
 * sort survives a filter-only request.
 */
export function compilePlan(plan: AiGridPlan, snapshot: AiGridSnapshot): Partial<GridState> {
  if (plan.reset) {
    return { sort: { sortModel: [] }, filter: { filterModel: {} }, columnVisibility: { hiddenColIds: [] } };
  }

  const patch: Partial<GridState> = {};
  const byId = new Map(snapshot.columns.map((column) => [column.colId, column]));

  if (plan.filter !== undefined) {
    const filterModel: Record<string, unknown> = {};
    for (const condition of plan.filter ?? []) {
      const kind = byId.get(condition.columnId)?.filter?.kind;
      if (!kind) continue;
      filterModel[condition.columnId] = filterModelFor(condition, kind);
    }
    patch.filter = { filterModel };
  }

  if (plan.sort !== undefined) {
    const sortModel: SortModelItem[] = plan.sort.map((entry) => ({ colId: entry.columnId, sort: entry.direction }));
    patch.sort = { sortModel };
  }

  if (plan.visibility !== undefined) {
    // Visibility is expressed as the set of hidden columns, so "hide one more"
    // has to start from the columns already hidden.
    const hidden = new Set(snapshot.hiddenColIds);
    for (const colId of plan.visibility.hide ?? []) hidden.add(colId);
    for (const colId of plan.visibility.show ?? []) hidden.delete(colId);
    patch.columnVisibility = { hiddenColIds: [...hidden] };
  }

  return patch;
}

/** Build the wire model the column's own filter implementation understands. */
function filterModelFor(condition: AiFilterCondition, kind: AiFilterKind): Record<string, unknown> {
  if (kind === 'set') {
    // A set filter has no operators — membership is the whole of it, and both
    // `eq` and `in` collapse to the same values list.
    return { filterType: 'set', values: condition.operands.map(String) };
  }

  const type = simpleFilterType(condition.operator);
  const model: Record<string, unknown> = { filterType: kind, type };

  if (kind === 'date') {
    const [from, to] = condition.operands;
    if (from !== undefined) model.dateFrom = toDateWire(from);
    model.dateTo = to !== undefined ? toDateWire(to) : null;
    return model;
  }

  const [first, second] = condition.operands;
  if (first !== undefined) model.filter = first;
  if (second !== undefined) model.filterTo = second;
  return model;
}

/** Community's date filters read `'YYYY-MM-DD hh:mm:ss'`; the plan carries ISO dates. */
function toDateWire(value: AiScalar): string {
  return `${String(value)} 00:00:00`;
}
