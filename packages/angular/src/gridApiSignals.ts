import { effect, signal, type Signal } from '@angular/core';
import type { FilterModel, GridApi } from 'ag-grid-community';

/**
 * Reactive mirrors of commonly-read grid state.
 *
 * @feature Angular integration
 */
export interface GridApiSignals<TData> {
  /** Number of rows currently displayed, after filtering and grouping. */
  displayedRowCount: Signal<number>;
  /** Rows currently selected. */
  selectedRows: Signal<TData[]>;
  /** Current column filter model. */
  filterModel: Signal<FilterModel>;
  /** Monotonic counter, incremented on every synchronisation. Use it to invalidate `computed()`s. */
  revision: Signal<number>;
}

/** Events that can change the mirrored state. */
const SYNC_EVENTS = [
  'modelUpdated',
  'rowDataUpdated',
  'selectionChanged',
  'filterChanged',
  'cellValueChanged',
] as const;

/**
 * Mirrors grid state into signals, re-synchronising whenever the supplied
 * {@link GridApi} signal changes or the grid raises a relevant event.
 *
 * Must be created in an injection context (component constructor or field
 * initialiser); listeners are removed automatically when that context is
 * destroyed.
 *
 * ```ts
 * readonly api = signal<GridApi<Row> | undefined>(undefined);
 * readonly state = createGridApiSignals(this.api);
 * onGridReady = (api: GridApi<Row>) => this.api.set(api);
 * ```
 *
 * @feature Angular integration
 */
export function createGridApiSignals<TData>(
  api: Signal<GridApi<TData> | undefined>,
): GridApiSignals<TData> {
  const displayedRowCount = signal(0);
  const selectedRows = signal<TData[]>([]);
  const filterModel = signal<FilterModel>({});
  const revision = signal(0);

  effect((onCleanup) => {
    const grid = api();
    if (!grid) {
      return;
    }
    const sync = () => {
      displayedRowCount.set(grid.getDisplayedRowCount());
      selectedRows.set(grid.getSelectedRows());
      filterModel.set(grid.getFilterModel());
      revision.update((value) => value + 1);
    };
    sync();
    for (const event of SYNC_EVENTS) {
      grid.addEventListener(event, sync);
    }
    onCleanup(() => {
      for (const event of SYNC_EVENTS) {
        grid.removeEventListener(event, sync);
      }
    });
  });

  return {
    displayedRowCount: displayedRowCount.asReadonly(),
    selectedRows: selectedRows.asReadonly(),
    filterModel: filterModel.asReadonly(),
    revision: revision.asReadonly(),
  };
}
