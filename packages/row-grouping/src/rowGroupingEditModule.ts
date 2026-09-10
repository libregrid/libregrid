import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { VERSION } from './version';
import { RowGroupingModule } from './rowGroupingModule';
import { RowGroupingEditService } from './rowGroupingEditService';

/**
 * Group row value editing — `RowGroupingEditModule` (Phase 21, gap-plan A8).
 *
 * Declared as its own module because Community validates `colDef.groupRowEditable`
 * and `colDef.groupRowValueSetter` against the `RowGroupingEdit` module name (a
 * distinct entry from `RowGrouping`), while `refreshAfterGroupEdit` is validated
 * against `RowGrouping`/`TreeData` — so both names must be registered for a clean
 * grid.
 *
 * @feature Row Grouping -> Editing Groups
 */
export const RowGroupingEditModule: Module = {
  moduleName: 'RowGroupingEdit',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule, RowGroupingModule],
  beans: [RowGroupingEditService],
};
