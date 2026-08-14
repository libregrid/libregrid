import type { BeanCollection, FindCellParams, FindCellValueParams, _FindApi, _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { FindCellRenderer } from './findCellRenderer';
import { findCss } from './findCss';
import { FindService } from './findService';
import { VERSION } from './version';
function service(beans: BeanCollection): FindService | undefined { return (beans as unknown as { findSvc?: FindService }).findSvc; }
function findNext(beans: BeanCollection): void { service(beans)?.next(); }
function findPrevious(beans: BeanCollection): void { service(beans)?.previous(); }
function findGetTotalMatches(beans: BeanCollection): number { return service(beans)?.totalMatches ?? 0; }
function findGoTo(beans: BeanCollection, match: number, force?: boolean): void { service(beans)?.goTo(match, force); }
function findClearActive(beans: BeanCollection): void { service(beans)?.clearActive(); }
function findGetActiveMatch(beans: BeanCollection) { return service(beans)?.activeMatch; }
function findGetNumMatches(beans: BeanCollection, params: FindCellParams): number { return service(beans)?.getNumMatches(params.node, params.column) ?? 0; }
function findGetParts(beans: BeanCollection, params: FindCellValueParams) { return service(beans)?.getParts(params) ?? [{ value: params.value }]; }
function findRefresh(beans: BeanCollection): void { service(beans)?.refresh(true); }
/** Registers Find navigation and the rendered-cell highlight renderer. @feature Find */
export const FindModule: _ModuleWithApi<_FindApi<unknown>> = { moduleName: 'Find', version: VERSION, enterprise: true, dependsOn: [EnterpriseCoreModule], beans: [FindService], userComponents: { agFindCellRenderer: FindCellRenderer }, css: [findCss], apiFunctions: { findNext, findPrevious, findGetTotalMatches, findGoTo, findClearActive, findGetActiveMatch, findGetNumMatches, findGetParts, findRefresh } };
