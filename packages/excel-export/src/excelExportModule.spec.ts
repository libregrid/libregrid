import { describe, expect, it } from 'vitest';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { MenuItemRegistry } from '@libregrid/menu';
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
});
