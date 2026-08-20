import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { columnHeaderEditCss } from './columnHeaderEditCss';
import { ColumnHeaderEditService } from './columnHeaderEditService';
import { VERSION } from './version';

/**
 * Registers the `colHeaderEditSvc` bean that implements
 * `IColumnHeaderEditService`: the "Edit Column Name" column-menu item (via the
 * `@libregrid/menu` registry, overriding its stub), the header-name editor
 * popup, and the edit-highlight hooks the Community header comps already call.
 * @feature ColumnHeaderEdit
 */
export const ColumnHeaderEditModule: Module = {
  moduleName: 'ColumnHeaderEdit',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  beans: [ColumnHeaderEditService],
  css: [columnHeaderEditCss],
};
