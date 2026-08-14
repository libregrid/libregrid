import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { SetFilterModule } from '@libregrid/set-filter';
import { MultiFilter } from './multiFilter';
import { MultiFilterHandler } from './multiFilterHandler';
import { multiFilterCss } from './multiFilterCss';
import { VERSION } from './version';

/** Registers the composable Multi Filter user component. @feature Multi Filter */
export const MultiFilterModule: Module = {
  moduleName: 'MultiFilter',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule, SetFilterModule],
  userComponents: { agMultiColumnFilter: MultiFilter },
  dynamicBeans: { agMultiColumnFilterHandler: MultiFilterHandler },
  css: [multiFilterCss],
};
