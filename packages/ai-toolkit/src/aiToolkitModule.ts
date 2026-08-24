import type { _AiToolkitGridApi, _ModuleWithApi } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { getStructuredSchema } from './aiToolkitApi';
import { VERSION } from './version';

/**
 * AI Toolkit feature boundary. Natural-language control of grid state via LLM
 * tool calls with structured outputs (gap-plan A6). Local-first inference
 * (ADR 0006); `getStructuredSchema` fills Community's reserved API slot.
 * @feature AiToolkit
 */
export const AiToolkitModule: _ModuleWithApi<_AiToolkitGridApi> = {
  moduleName: 'AiToolkit',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
  apiFunctions: { getStructuredSchema },
};
