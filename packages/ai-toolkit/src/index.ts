/**
 * @libregrid/ai-toolkit — AI Toolkit for AG Grid Community.
 *
 * The ordinary path is two things: register `AiToolkitModule`, then call
 * `applyAiCommand(api, prompt)`. Everything else — providers, tool schemas,
 * the environment builder, the plan validator and compiler — lives under
 * `@libregrid/ai-toolkit/advanced` for consumers who need to reach inside.
 *
 * Barrel: flat re-exports only. No logic, no side effects, no registration.
 */
export { AiToolkitModule } from './aiToolkitModule';
export { applyAiCommand, type ApplyAiCommandOptions } from './applyAiCommand';
export { DEFAULT_CONFIDENCE_THRESHOLD } from './confidence';
export type {
  AiAppliedChanges,
  AiCommandResult,
  AiFilterCondition,
  AiGridPlan,
  AiNotAppliedReason,
  AiSort,
  AiVisibilityChange,
} from './plan';
export type { AiColumnHints } from './gridSnapshot';
export type { AiDataType, AiFilterOperator, AiScalar } from './capabilities';
export { VERSION } from './version';
