// @vitest-environment jsdom
import { APP_INITIALIZER } from '@angular/core';
import { AllCommunityModule, ModuleRegistry, createGrid } from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { describe, expect, it, vi } from 'vitest';
import { provideLibreGrid, registerLibreGridModules } from './provideLibreGrid';

interface InitializerProvider {
  provide: unknown;
  useFactory: () => () => void;
}

describe('provideLibreGrid', () => {
  it('wires the module registration into an APP_INITIALIZER', () => {
    const providers = provideLibreGrid(RowGroupingModule);
    const raw = (providers as unknown as { ɵproviders: InitializerProvider[] }).ɵproviders;
    const initializer = raw.find((entry) => entry.provide === APP_INITIALIZER);
    expect(initializer).toBeDefined();
    expect(typeof initializer!.useFactory).toBe('function');

    const cleanup = initializer!.useFactory();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('registration through registerLibreGridModules enables grouping on a real grid', async () => {
    ModuleRegistry.registerModules([AllCommunityModule]);
    registerLibreGridModules([RowGroupingModule]);
    const el = document.createElement('div');
    document.body.appendChild(el);
    const api = createGrid(el, {
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'sales', aggFunc: 'sum' },
      ],
      rowData: [
        { country: 'US', sales: 1 },
        { country: 'US', sales: 2 },
        { country: 'GB', sales: 5 },
      ],
    });
    await vi.waitFor(() => expect(api.getDisplayedRowCount()).toBe(2));
    expect(api.getDisplayedRowAtIndex(0)!.aggData.sales).toBe(3);
    api.destroy();
    el.remove();
  });
});
