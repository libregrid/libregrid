import type { Module, _ModuleWithApi, _PivotGridApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { VERSION } from './version';
import { PivotColsService } from './pivotColsService';
import { PivotResultColsService } from './pivotResultColsService';
import { PivotColDefService } from './pivotColDefService';
import { PivotStage } from './pivotStage';
import * as api from './pivotApi';

const SharedPivotModule: Module = { moduleName: 'SharedPivot', version: VERSION };

/** Registers client-side result-column pivoting. @feature Pivot */
export const PivotModule: _ModuleWithApi<_PivotGridApi<unknown>> = {
  moduleName: 'Pivot',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule, RowGroupingModule, SharedPivotModule],
  beans: [PivotColsService, PivotResultColsService, PivotColDefService, PivotStage],
  apiFunctions: api as unknown as NonNullable<_ModuleWithApi<_PivotGridApi<unknown>>['apiFunctions']>,
};
