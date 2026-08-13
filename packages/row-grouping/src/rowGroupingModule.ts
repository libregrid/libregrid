import type {
  Module,
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
import { AutoGenColsService } from './autoGenColsService';
import { ShowRowGroupColsService } from './showRowGroupColsService';
import { ShowRowGroupColsValueService } from './showRowGroupColsValueService';
import { ExpansionService } from './expansionService';
import { GroupSortStage } from './groupSortStage';
import { FooterService } from './footerService';
import { ShowValuesAsService } from './showValuesAsService';
import { GroupCellRenderer } from './groupCellRenderer';
import { groupCellCss } from './groupCellCss';
import './menuItems';
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

/**
 * Community validates the grouping and aggregation column options through
 * these internal seam names. They are deliberately separate module records:
 * the registry keys modules by `moduleName`, so claiming either name on the
 * public RowGrouping module would make one of the validation checks fail.
 *
 * They contain no beans. The public module below supplies the implementation;
 * these records declare its compatibility with Community's feature checks.
 */
const SharedRowGroupingModule: Module = {
  moduleName: 'SharedRowGrouping',
  version: VERSION,
};

const SharedAggregationModule: Module = {
  moduleName: 'SharedAggregation',
  version: VERSION,
};

const CsrmGroupStagesModule: Module = {
  moduleName: 'CsrmGroupStages',
  version: VERSION,
};

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
    AutoGenColsService,
    ShowRowGroupColsService,
    ShowRowGroupColsValueService,
    ExpansionService,
    GroupStage,
    GroupFilterStage,
    GroupSortStage,
    FooterService,
    ShowValuesAsService,
    FlattenStage,
    AggregationStage,
    FilterAggregateStage,
  ],
  userComponents: {
    agGroupCellRenderer: GroupCellRenderer,
  },
  css: [groupCellCss],
  enterprise: true,
  dependsOn: [
    EnterpriseCoreModule,
    SharedRowGroupingModule,
    SharedAggregationModule,
    CsrmGroupStagesModule,
  ],
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
