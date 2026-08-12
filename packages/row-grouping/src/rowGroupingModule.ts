import type {
  _AggregationGridApi,
  _ModuleWithApi,
  _PivotGridApi,
  _RowGroupingGridApi,
} from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { VERSION } from './version';
import { GroupStage } from './groupStage';
import { FlattenStage } from './flattenStage';
import { AggFuncService } from './aggFuncService';
import { AggregationStage } from './aggregationStage';
import { FilterAggregateStage } from './filterAggregateStage';
import { GroupFilterStage } from './groupFilterStage';
import { ValueColsService } from './valueColsService';
import { RowGroupColsService } from './rowGroupColsService';
import {
  addRowGroupColumns,
  getRowGroupColumns,
  moveRowGroupColumn,
  removeRowGroupColumns,
  setRowGroupColumns,
} from './rowGroupColsApi';
import {
  addAggFuncs,
  addValueColumns,
  clearAggFuncs,
  getValueColumns,
  removeValueColumns,
  setColumnAggFunc,
  setValueColumns,
} from './aggregationApi';

type ValueColumnApi = Pick<
  _PivotGridApi<unknown>,
  'getValueColumns' | 'addValueColumns' | 'removeValueColumns' | 'setValueColumns'
>;

export const RowGroupingModule: _ModuleWithApi<
  _RowGroupingGridApi & _AggregationGridApi<unknown> & ValueColumnApi
> = {
  moduleName: 'RowGrouping',
  version: VERSION,
  beans: [
    AggFuncService,
    ValueColsService,
    RowGroupColsService,
    GroupStage,
    GroupFilterStage,
    FlattenStage,
    AggregationStage,
    FilterAggregateStage,
  ],
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  apiFunctions: {
    addRowGroupColumns,
    removeRowGroupColumns,
    setRowGroupColumns,
    moveRowGroupColumn,
    getRowGroupColumns,
    addAggFuncs,
    clearAggFuncs,
    setColumnAggFunc,
    getValueColumns,
    addValueColumns,
    removeValueColumns,
    setValueColumns,
  },
};
