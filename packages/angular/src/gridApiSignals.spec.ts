// @vitest-environment jsdom
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AllCommunityModule, ModuleRegistry, createGrid, type GridApi } from 'ag-grid-community';
import { describe, expect, it, vi } from 'vitest';
import { createGridApiSignals } from './gridApiSignals';

interface Row {
  name: string;
  score: number;
}

ModuleRegistry.registerModules([AllCommunityModule]);

describe('createGridApiSignals', () => {
  it('mirrors displayed rows, selection and filter model into signals', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const api = createGrid<Row>(el, {
      columnDefs: [{ field: 'name', filter: true }, { field: 'score' }],
      rowData: [
        { name: 'Alice', score: 1 },
        { name: 'Bob', score: 2 },
        { name: 'Carol', score: 3 },
      ],
      rowSelection: { mode: 'multiRow' },
    });
    const apiSignal = signal<GridApi<Row> | undefined>(api);

    const state = TestBed.runInInjectionContext(() => createGridApiSignals(apiSignal));

    await vi.waitFor(() => expect(state.displayedRowCount()).toBe(3));

    api.setFilterModel({ name: { filterType: 'text', type: 'equals', filter: 'Alice' } });
    await vi.waitFor(() => expect(state.displayedRowCount()).toBe(1));
    expect(state.filterModel()).toEqual({
      name: { filterType: 'text', type: 'equals', filter: 'Alice' },
    });

    api.selectAll('filtered');
    await vi.waitFor(() => expect(state.selectedRows().length).toBe(1));
    expect(state.selectedRows()[0]!.name).toBe('Alice');

    expect(state.revision()).toBeGreaterThan(3);
    api.destroy();
    el.remove();
  });

  it('returns zeroed signals while no api is available', () => {
    const apiSignal = signal<GridApi<Row> | undefined>(undefined);
    const state = TestBed.runInInjectionContext(() => createGridApiSignals(apiSignal));
    expect(state.displayedRowCount()).toBe(0);
    expect(state.selectedRows()).toEqual([]);
    expect(state.filterModel()).toEqual({});
    expect(state.revision()).toBe(0);
  });
});
