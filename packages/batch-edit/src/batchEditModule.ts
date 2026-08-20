import type { _ModuleWithApi, BeanCollection } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { batchEditCss } from './batchEditCss';
import { VERSION } from './version';

/** The GridApi surface contributed by this module's `apiFunctions`. */
export interface BatchEditGridApi {
  startBatchEdit(): void;
  commitBatchEdit(): void;
  cancelBatchEdit(): void;
  isBatchEditing(): boolean;
}

function editSvc(beans: BeanCollection) {
  return beans.editSvc;
}

function startBatchEdit(beans: BeanCollection): void {
  editSvc(beans)?.startBatchEditing();
}

function commitBatchEdit(beans: BeanCollection): void {
  // Commit semantics: stop every open editor committing its value, flush the
  // staged pending values to the row data, and end the batch. Block mode
  // (invalidEditValueMode: 'block') keeps the batch open when a staged value
  // is invalid — Community's stopBatchEditing checks stopBlockRejected for
  // exactly this param shape.
  editSvc(beans)?.stopBatchEditing({ commit: true, cancel: false, source: 'api' });
}

function cancelBatchEdit(beans: BeanCollection): void {
  // Cancel semantics: revert every open editor, discard all staged pending
  // values, and end the batch. No `commit` flag, so block-mode rejections
  // can never hold the batch open on a cancel.
  editSvc(beans)?.stopBatchEditing({ cancel: true, source: 'api' });
}

function isBatchEditing(beans: BeanCollection): boolean {
  return editSvc(beans)?.isBatchEditing() ?? false;
}

/**
 * Registers the four GridApi functions Community reserves for the
 * `BatchEdit` module (`startBatchEdit`, `commitBatchEdit`,
 * `cancelBatchEdit`, `isBatchEditing`) and the pending-edit CSS.
 *
 * The whole queue/apply/discard machinery already ships in the Community
 * build: while a batch is open, edits accumulate as pending values and the
 * grid renders them with the `ag-cell-batch-edit` / `ag-row-batch-edit`
 * classes; commit writes them to the row data in one pass (one undo action)
 * and discard reverts to the pre-batch values. This module is the thin
 * registration seam on top of that — the same pattern as Notes — and adds
 * nothing the host app could not do by calling the EditService directly,
 * but it exposes the reserved API names so Enterprise code ports
 * unchanged.
 *
 * Batch editing is API-only by design: the host app supplies the
 * start/commit/cancel controls (buttons, toolbar items) and calls the GridApi
 * methods.
 *
 * @feature BatchEdit
 */
export const BatchEditModule: _ModuleWithApi<BatchEditGridApi> = {
  moduleName: 'BatchEdit',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  css: [batchEditCss],
  apiFunctions: { startBatchEdit, commitBatchEdit, cancelBatchEdit, isBatchEditing },
};
