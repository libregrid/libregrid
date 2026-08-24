import type { BeanCollection, GridState } from 'ag-grid-community';
import type { ValidatedCall } from './tools';

interface StateServiceLike {
  setState(state: GridState, propertiesToIgnore?: string[]): void;
}

interface FilterManagerLike {
  getFilterModel(): Record<string, unknown> | null;
}

/**
 * Map a validated tool call to the `GridState` patch that applies it. Pure —
 * the caller supplies the current filter model, so this is the single mapping
 * both `applyToolCall` (bean-level) and API-level callers use.
 *
 * `setState` *replaces* the filter model rather than merging into it, so a
 * filter patch has to be built over `currentFilterModel` — otherwise filtering
 * one column silently clears every other column's filter. Pass the current
 * model (`api.getFilterModel()`) for every filter call; omitting it means
 * "there are no other filters".
 */
export function toolCallToStatePatch(call: ValidatedCall, currentFilterModel?: Record<string, unknown> | null): Partial<GridState> {
  switch (call.kind) {
    case 'sort':
      return { sort: { sortModel: call.sortModel } };
    case 'filter': {
      // Set semantics for one column; an empty values list clears it and
      // leaves the other columns untouched (spike finding B keeps calls
      // single-column, so merging is what makes multi-column filters possible).
      const merged: Record<string, unknown> = { ...(currentFilterModel ?? {}) };
      if (call.values.length > 0) merged[call.column] = { filterType: 'set', values: call.values };
      else delete merged[call.column];
      return { filter: { filterModel: merged } };
    }
    case 'visibility':
      return { columnVisibility: { hiddenColIds: call.hiddenColIds } };
    case 'reset':
      return { sort: { sortModel: [] }, filter: { filterModel: {} }, columnVisibility: { hiddenColIds: [] } };
  }
}

/**
 * Apply a validated tool call through Community's `stateSvc` bean (the
 * `GridStateModule` round-trip), reading the current filter model from the
 * `filterManager` bean so filter patches merge rather than replace.
 */
export function applyToolCall(beans: BeanCollection, call: ValidatedCall): void {
  const stateSvc = (beans as unknown as { stateSvc?: StateServiceLike }).stateSvc;
  if (!stateSvc) throw new Error('ai-toolkit: stateSvc bean missing — register GridStateModule');

  const filterManager = (beans as unknown as { filterManager?: FilterManagerLike }).filterManager;
  stateSvc.setState(toolCallToStatePatch(call, filterManager?.getFilterModel()));
}
