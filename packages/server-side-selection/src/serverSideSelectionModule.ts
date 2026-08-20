import {
  _SharedRowSelectionModule,
  type Module,
} from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { ServerSideRowModelModule } from '@libregrid/server-side-row-model';
import { ServerSideSelectionService } from './serverSideSelectionService';
import { ssrmSelectionCss } from './ssrmSelectionCss';
import { VERSION } from './version';

/** The beans this module's api functions can reach (structural — the
 *  runtime passes the grid's full `BeanCollection`). The feature service
 *  is a managed sub-bean of `selectionSvc`. */
interface SsrmSelectionBeans {
  selectionSvc?: ServerSideSelectionService;
}

function refreshSsrmSelection(beans: SsrmSelectionBeans): void {
  beans.selectionSvc?.getSsrmSelectionService().refresh();
}

const apiFunctions = {
  refreshSsrmSelection,
};

/**
 * Server-Side Selection module.
 *
 * Registers the `selectionSvc` bean for the server-side row model (Community
 * registers its own only for `clientSide`/`infinite`/`viewport`). The
 * feature service (op capture, spec lifecycle, footer, selection view) is a
 * managed sub-bean of that service — reachable via
 * `selectionSvc.getSsrmSelectionService()` — because the community bean-name
 * union has no seam for it.
 *
 * `moduleName` reuses Community's `RowSelection` literal (api-seams.md §3 —
 * the name must come from the closed union, and this is the feature seam we
 * fill). The module store keys modules by `(rowModel, moduleName)`, and this
 * module gates on `rowModels: ['serverSide']` while Community's
 * `RowSelectionModule` gates on the other three row models, so the two never
 * load into the same grid and no registration conflict exists: an app can
 * register both (or just this one — `dependsOn` pulls in the shared
 * selection services and the SSRM) and every grid type gets exactly one
 * selection service.
 *
 * @feature Server-Side Selection
 */
export const ServerSideSelectionModule: Module & { apiFunctions: typeof apiFunctions } = {
  moduleName: 'RowSelection',
  version: VERSION,
  enterprise: true,
  rowModels: ['serverSide'],
  beans: [ServerSideSelectionService],
  css: [ssrmSelectionCss],
  dependsOn: [EnterpriseCoreModule, ServerSideRowModelModule, _SharedRowSelectionModule],
  apiFunctions,
};
