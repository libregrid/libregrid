/**
 * @libregrid/ai-toolkit/advanced — the machinery behind `applyAiCommand`.
 *
 * Exported for consumers who need to substitute a provider, inspect or reuse
 * the model environment, drive the pipeline stage by stage, or generate
 * training fixtures. Ordinary applications should not need any of it.
 *
 * Barrel: flat re-exports only. No logic, no side effects, no registration.
 */
export { snapshotGrid, revisionOf, type AiColumnSnapshot, type AiGridSnapshot } from './gridSnapshot';
export {
  buildAiEnvironment,
  estimateContextTokens,
  estimateToolsTokens,
  estimateEnvironmentTokens,
  DEFAULT_MAX_ENVIRONMENT_TOKENS,
  type BuildEnvironmentOptions,
  type GridAiEnvironment,
} from './environment';
export {
  dataTypeFor,
  filterKindFor,
  operandArity,
  operandMatchesType,
  operatorsFor,
  simpleFilterType,
  type AiFilterKind,
} from './capabilities';
export { decodePlan, type DecodeResult } from './decodePlan';
export { validatePlan, DEFAULT_LIMITS, type PlanValidation, type ValidatePlanLimits } from './validatePlan';
export { compilePlan } from './compilePlan';
export { isEmptyPlan } from './plan';
export { passesConfidenceGate, formatConfidence } from './confidence';
export {
  NeedleWasmProvider,
  OpenAiCompatibleProvider,
  AnthropicProvider,
  createRemoteProvider,
  type AiProvider,
  type AiProviderResult,
  type AiRemoteProviderConfig,
  type AiRequest,
  type NeedleEngine,
  type NeedleWasmOptions,
} from './provider';

// --- Superseded by `applyAiCommand`; kept for the existing integration path.
export { getStructuredSchema } from './aiToolkitApi';
export { buildStructuredSchema, V1_FEATURES, type AiColumnInfo, type StructuredSchemaInput } from './structuredSchema';
export { buildGridTools, validateToolCall, MAX_FILTER_VALUES, type RawToolCall, type ValidatedCall, type ValidationFailure } from './tools';
export { toolCallToStatePatch, applyToolCall } from './applyToolCall';
export { runToolkit, type ToolkitOutcome, type RunToolkitOptions } from './escalation';
