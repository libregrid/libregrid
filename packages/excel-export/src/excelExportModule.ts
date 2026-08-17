import type { BeanCollection, _ExcelExportGridApi, _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { registerMenuItems } from '@libregrid/menu';
import { VERSION } from './version';
import { ExcelCreator } from './excelCreator';

function excel(beans: BeanCollection) {
  return beans.excelCreator as ExcelCreator | undefined;
}

function getDataAsExcel(
  beans: BeanCollection,
  params?: Parameters<ExcelCreator['getDataAsExcel']>[0],
): Blob | undefined {
  return excel(beans)?.getDataAsExcel(params);
}

function exportDataAsExcel(
  beans: BeanCollection,
  params?: Parameters<ExcelCreator['exportDataAsExcel']>[0],
): void {
  excel(beans)?.exportDataAsExcel(params);
}

function getSheetDataForExcel(
  beans: BeanCollection,
  params?: Parameters<ExcelCreator['getSheetDataForExcel']>[0],
): string | undefined {
  return excel(beans)?.getSheetDataForExcel(params);
}

function getMultipleSheetsAsExcel(
  beans: BeanCollection,
  params: Parameters<ExcelCreator['getMultipleSheetsAsExcel']>[0],
): Blob | undefined {
  return excel(beans)?.getMultipleSheetsAsExcel(params);
}

function exportMultipleSheetsAsExcel(
  beans: BeanCollection,
  params: Parameters<ExcelCreator['exportMultipleSheetsAsExcel']>[0],
): void {
  excel(beans)?.exportMultipleSheetsAsExcel(params);
}

/** Registers the Excel export feature and its context-menu contributions. @feature Excel Export */
export const ExcelExportModule: _ModuleWithApi<_ExcelExportGridApi> = {
  moduleName: 'ExcelExport',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  beans: [ExcelCreator],
  apiFunctions: {
    getDataAsExcel,
    exportDataAsExcel,
    getSheetDataForExcel,
    getMultipleSheetsAsExcel,
    exportMultipleSheetsAsExcel,
  },
  onRegister: () =>
    registerMenuItems([
      {
        name: 'export',
        order: 10,
        factory: () => ({ name: 'Export', subMenu: ['csvExport', 'excelExport'] }),
      },
      {
        name: 'csvExport',
        order: 11,
        factory: (params) => ({
          name: 'CSV Export',
          icon: 'csvExport',
          action: () =>
            (
              params.api as unknown as {
                exportDataAsCsv?: () => void;
              }
            ).exportDataAsCsv?.(),
        }),
      },
      {
        name: 'excelExport',
        order: 12,
        factory: (params) => ({
          name: 'Excel Export (.xlsx)',
          icon: 'excelExport',
          action: () =>
            (
              params.api as unknown as {
                exportDataAsExcel?: () => void;
              }
            ).exportDataAsExcel?.(),
        }),
      },
    ]),
};
