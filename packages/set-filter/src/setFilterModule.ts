import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { SetFilter } from './setFilter';
import { SetFilterHandler } from './setFilterHandler';
import { setFilterCss } from './setFilterCss';
import { VERSION } from './version';

/** Registers the virtualised Set Filter user component. @feature Set Filter */
export const SetFilterModule: Module = {
  moduleName: 'SetFilter',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  userComponents: { agSetColumnFilter: SetFilter },
  dynamicBeans: { agSetColumnFilterHandler: SetFilterHandler },
  css: [setFilterCss],
};
