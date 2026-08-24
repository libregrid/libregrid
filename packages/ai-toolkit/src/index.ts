/**
 * @libregrid/ai-toolkit — AI Toolkit for AG Grid Community.
 *
 * Barrel: flat re-exports only. No logic, no side effects, no registration.
 */
export { AiToolkitModule } from './aiToolkitModule';
export { getStructuredSchema } from './aiToolkitApi';
export { buildStructuredSchema, V1_FEATURES, type AiColumnInfo, type StructuredSchemaInput } from './structuredSchema';
export { buildGridTools, validateToolCall, MAX_FILTER_VALUES, type RawToolCall, type ValidatedCall, type ValidationFailure } from './tools';
export { toolCallToStatePatch, applyToolCall } from './applyToolCall';
export { NeedleWasmProvider, OpenAiCompatibleProvider, type AiProvider, type AiProviderResult, type AiRequest, type NeedleEngine, type NeedleWasmOptions } from './provider';
export { runToolkit, DEFAULT_CONFIDENCE_THRESHOLD, type ToolkitOutcome, type RunToolkitOptions } from './escalation';
export { VERSION } from './version';
