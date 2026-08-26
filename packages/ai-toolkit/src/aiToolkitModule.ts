import { ColumnApiModule, type _AiToolkitGridApi, type _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { getStructuredSchema } from './aiToolkitApi';
import { VERSION } from './version';

/**
 * Pure AI schema feature boundary. `getStructuredSchema` describes the live
 * grid as strict JSON Schema; provider transport and state application live in
 * separate opt-in packages (ADR 0007).
 * @feature AiToolkit
 */
export const AiToolkitModule: _ModuleWithApi<_AiToolkitGridApi> = {
  moduleName: 'AiToolkit',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule, ColumnApiModule],
  apiFunctions: { getStructuredSchema },
};
