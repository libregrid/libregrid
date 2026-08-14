import type {
  _CellSelectionGridApi,
  BeanCollection,
  CellRange,
  CellRangeParams,
  _ModuleWithApi,
} from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { VERSION } from './version';
import { RangeService } from './rangeService';

/** Registers the Cell Selection feature boundary. @feature Cell Selection */
function ranges(beans: BeanCollection) {
  return beans.rangeSvc as unknown as
    | {
        getCellRanges(): CellRange[];
        addCellRange(params: CellRangeParams): void;
        removeAllCellRanges(): void;
      }
    | undefined;
}
function getCellRanges(beans: BeanCollection) {
  return ranges(beans)?.getCellRanges() ?? null;
}
function addCellRange(beans: BeanCollection, params: CellRangeParams) {
  ranges(beans)?.addCellRange(params);
}
function clearCellSelection(beans: BeanCollection) {
  ranges(beans)?.removeAllCellRanges();
}
export const CellSelectionModule: _ModuleWithApi<_CellSelectionGridApi> = {
  moduleName: 'CellSelection',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  beans: [RangeService],
  apiFunctions: {
    getCellRanges,
    addCellRange,
    clearCellSelection,
    clearRangeSelection: clearCellSelection,
  },
};
