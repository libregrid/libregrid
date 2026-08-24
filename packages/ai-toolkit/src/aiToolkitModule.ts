import type { Module } from 'ag-grid-community';
import { EnterpriseCoreModule } from '@libregrid/core';
import { VERSION } from './version';

/**
 * AI Toolkit feature boundary. Natural-language control of grid state via LLM
 * tool calls with structured outputs (gap-plan A6). Local-first inference
 * (ADR 0006); `getStructuredSchema` fills Community's reserved API slot.
 * @feature AiToolkit
 */
export const AiToolkitModule: Module = {
  moduleName: 'AiToolkit',
  version: VERSION,
  enterprise: true,
  dependsOn: [EnterpriseCoreModule],
};
