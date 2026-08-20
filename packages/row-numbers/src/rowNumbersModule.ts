import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { rowNumbersCss } from './rowNumbersCss';
import { RowNumbersService } from './rowNumbersService';
import { VERSION } from './version';

/**
 * Registers the `rowNumbersSvc` bean that owns the generated row-number
 * column: the `rowNumbers` grid option, row selection on click, and the
 * per-cell row resizer. @feature RowNumbers
 */
export const RowNumbersModule: Module = { moduleName: 'RowNumbers', version: VERSION, enterprise: true, dependsOn: [EnterpriseCoreModule], beans: [RowNumbersService], css: [rowNumbersCss] };
