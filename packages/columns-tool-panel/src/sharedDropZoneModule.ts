import type { Module, ModuleName } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { DropZoneDragTargetService } from './dropZoneDragTargetService';
import { VERSION } from './version';

/**
 * Wires registered drop zones into the grid DragAndDropService so header
 * drags reach them. Shared parent of the columns tool panel and row grouping
 * panel modules — AG Grid dedupes the dependency by moduleName.
 *
 * AG Grid has no counterpart module name to claim; 'SharedDropZone' is a
 * libregrid-internal name, cast past Community's closed ModuleName union.
 *
 * @feature Columns Tool Panel
 */
export const SharedDropZoneModule: Module = {
  moduleName: 'SharedDropZone' as ModuleName,
  version: VERSION,
  // 'dropZoneDragTargetSvc' is not in Community's closed BeanName union; the
  // DI keys beans by their beanName string at runtime (api-seams.md §7).
  beans: [DropZoneDragTargetService as never],
  dependsOn: [EnterpriseCoreModule],
  enterprise: true,
};
