import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { VERSION } from './version';

const SharedTreeDataModule: Module = { moduleName: 'SharedTreeData', version: VERSION };

/** Enables the tree-mode branch of the shared client-side GroupStage. @feature Tree Data */
export const TreeDataModule: Module = {
  moduleName: 'TreeData', version: VERSION, enterprise: true,
  dependsOn: [EnterpriseCoreModule, RowGroupingModule, SharedTreeDataModule],
};
