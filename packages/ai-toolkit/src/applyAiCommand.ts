import type { GridApi, GridState } from 'ag-grid-community';
import { snapshotGrid, revisionOf, type AiColumnHints } from './gridSnapshot';
import { buildAiEnvironment, type BuildEnvironmentOptions } from './environment';
import { decodePlan } from './decodePlan';
import { validatePlan, type ValidatePlanLimits } from './validatePlan';
import { compilePlan } from './compilePlan';
import { isEmptyPlan, type AiAppliedChanges, type AiCommandResult, type AiGridPlan, type AiNotAppliedReason } from './plan';
import { NeedleWasmProvider, type AiProvider } from './provider';
import { DEFAULT_CONFIDENCE_THRESHOLD, formatConfidence, passesConfidenceGate } from './confidence';

export { DEFAULT_CONFIDENCE_THRESHOLD };

export interface ApplyAiCommandOptions extends BuildEnvironmentOptions {
  /** Inference provider. Defaults to a lazily created browser-local Needle. */
  provider?: AiProvider;
  /** Per-column hints, keyed by colId. Optional enrichment, never required. */
  columns?: Record<string, AiColumnHints>;
  /** Plan size limits. */
  limits?: ValidatePlanLimits;
  /**
   * Minimum confidence to act on. A provider that reports no confidence at all
   * is not blocked by this — see the note in `passesConfidenceGate`.
   */
  confidenceThreshold?: number;
  /** Return the plan without applying it. */
  dryRun?: boolean;
  signal?: AbortSignal;
  onPlan?: (plan: AiGridPlan) => void;
}

/** One provider per page; loading the engine and weights is expensive. */
let sharedProvider: NeedleWasmProvider | undefined;

function notApplied(reason: AiNotAppliedReason, message: string): AiCommandResult {
  return { status: 'not-applied', reason, message };
}

/**
 * Interpret a natural-language request against the live grid and apply it.
 *
 * The whole pipeline lives behind this one call: snapshot the grid, build the
 * model environment, run inference, decode to a semantic plan, validate the
 * plan in full, re-check that the grid has not changed underneath us, compile,
 * and apply in a single transaction.
 *
 * Ambiguous, unsupported, off-topic, invalid and cancelled requests are
 * ordinary outcomes and resolve as `not-applied`. The promise rejects only for
 * operational failures — the model artifact failing to load, for instance —
 * because those are the caller's problem to handle, not the user's to read.
 */
export async function applyAiCommand(
  api: GridApi,
  prompt: string,
  options: ApplyAiCommandOptions = {},
): Promise<AiCommandResult> {
  const trimmed = prompt.trim();
  if (!trimmed) return notApplied('invalid', 'empty request');
  if (options.signal?.aborted) return notApplied('cancelled', 'cancelled before starting');

  const snapshot = snapshotGrid(api, options.columns ?? {});
  if (snapshot.columns.length === 0) return notApplied('unsupported', 'the grid has no columns to act on');

  const environment = buildAiEnvironment(snapshot, { ...options, prompt: trimmed });
  const provider = options.provider ?? (sharedProvider ??= new NeedleWasmProvider());

  const result = await provider.complete({
    prompt: trimmed,
    context: environment.context,
    tools: environment.tools,
  });

  if (options.signal?.aborted) return notApplied('cancelled', 'cancelled during inference');

  const threshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  if (!passesConfidenceGate(result.confidence, threshold)) {
    return notApplied('ambiguous', `low confidence (${formatConfidence(result.confidence)} < ${threshold})`);
  }

  if (result.calls.length === 0) {
    return notApplied('off-topic', 'the request does not map to a grid action');
  }

  const decoded = decodePlan(result.calls, environment);
  if (!decoded.ok) return notApplied('invalid', decoded.reason);
  if (isEmptyPlan(decoded.plan)) return notApplied('off-topic', 'the request does not change the grid');

  const validation = validatePlan(decoded.plan, snapshot, options.limits);
  if (!validation.ok) return notApplied('unsupported', validation.reason);

  options.onPlan?.(decoded.plan);
  if (options.dryRun) return { status: 'applied', changes: changesOf(decoded.plan) };

  // The grid is live: columns can be added, removed or reconfigured while the
  // model is thinking. Applying a plan built against a different column set is
  // how a request to hide one column ends up hiding another.
  if (revisionOf(snapshotGrid(api, options.columns ?? {}).columns) !== environment.revision) {
    return notApplied('invalid', 'the grid changed while the request was being processed');
  }

  applyAtomically(api, compilePlan(decoded.plan, snapshot));
  return { status: 'applied', changes: changesOf(decoded.plan) };
}

/**
 * `setState` batches its work but offers no rollback, so a failure part-way
 * through would leave the grid in a state nobody asked for. Snapshot first and
 * restore on failure to make the change all-or-nothing.
 */
function applyAtomically(api: GridApi, patch: Partial<GridState>): void {
  const before = api.getState();
  try {
    api.setState(patch);
  } catch (error) {
    api.setState(before);
    throw error;
  }
}

/** Report back only the sections the plan actually touched. */
function changesOf(plan: AiGridPlan): AiAppliedChanges {
  const changes: AiAppliedChanges = {};
  if (plan.filter !== undefined) changes.filter = plan.filter;
  if (plan.sort !== undefined) changes.sort = plan.sort;
  if (plan.visibility !== undefined) changes.visibility = plan.visibility;
  if (plan.reset !== undefined) changes.reset = plan.reset;
  return changes;
}
