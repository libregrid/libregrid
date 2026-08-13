import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { VERSION } from './version';

/**
 * Registers the Server-Side Row Model feature boundary.
 *
 * The Phase-7 implementation will add the row-model bean and its API
 * companion here. Registration remains the consuming application's decision;
 * this package never registers itself at module scope.
 *
 * @feature Server-Side Row Model
 */
export const ServerSideRowModelModule: Module = {
  moduleName: 'ServerSideRowModel',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
};
