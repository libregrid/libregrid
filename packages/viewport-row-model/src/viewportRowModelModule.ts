import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { ViewportRowModel } from './viewportRowModel';
import { VERSION } from './version';

/** Registers the push-driven `viewport` row-model seam. @feature Viewport Row Model */
export const ViewportRowModelModule: Module = {
  moduleName: 'ViewportRowModel',
  version: VERSION,
  enterprise: true,
  rowModels: ['viewport'],
  beans: [ViewportRowModel],
  dependsOn: [EnterpriseCoreModule],
};
