import { describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { MenuItemRegistry, type MenuActionParams } from '@libregrid/menu';
import { ExcelExportModule } from './excelExportModule';

describe('ExcelExportModule', () => {
  it('registers the Excel export API and menu contributions', () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    const registry = new MenuItemRegistry();
    expect(registry.has('excelExport')).toBe(true);
    expect(registry.has('csvExport')).toBe(true);
    expect(registry.has('export')).toBe(true);
    const exportItem = registry.getItem('export', {
      column: null,
      node: null,
      value: null,
      api: null as never,
    })!;
    expect(exportItem.subMenu).toEqual(['csvExport', 'excelExport']);
  });

  // Phase 14 P0-6 — the Phase-1 null stubs in @libregrid/menu must be replaced
  // by these factories once the module is registered (global store, last-write-wins).
  it('replace the Phase-1 null stubs with real factories that call the export API', () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    const api = { exportDataAsCsv: vi.fn(), exportDataAsExcel: vi.fn() };
    const params = { column: null, node: null, value: null, api } as MenuActionParams;
    const registry = new MenuItemRegistry();

    const csv = registry.getItem('csvExport', params);
    const excel = registry.getItem('excelExport', params);
    expect(csv?.name).toBe('CSV Export');
    expect(excel?.name).toBe('Excel Export (.xlsx)');

    csv!.action!({} as never);
    expect(api.exportDataAsCsv).toHaveBeenCalledTimes(1);
    excel!.action!({} as never);
    expect(api.exportDataAsExcel).toHaveBeenCalledTimes(1);
  });
});
