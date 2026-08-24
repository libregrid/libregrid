import type { AiProvider, AiProviderResult, AiRequest } from './provider';
import type { RawToolCall } from './tools';

/** ADR 0006: act at or above this confidence; below it, escalate or clarify. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

export type ToolkitOutcome =
  | { status: 'selected'; call: RawToolCall; confidence: number; via: string }
  | { status: 'clarify'; reason: string };

export interface RunToolkitOptions {
  /** Confidence gate (default 0.5 — spike §4-A). */
  threshold?: number;
  /** Remote fallback tried when the primary scores below `threshold`. */
  fallback?: AiProvider;
}

/**
 * The ADR 0006 escalation loop: run the primary provider, and if its
 * confidence is below the threshold, try the optional remote fallback.
 * Below-threshold results are never applied — the failure mode is a
 * clarification, not a guessed state change. The selected call still has to
 * pass `validateToolCall` before `applyToolCall`.
 */
export async function runToolkit(
  primary: AiProvider,
  request: AiRequest,
  options: RunToolkitOptions = {},
): Promise<ToolkitOutcome> {
  const threshold = options.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

  let result: AiProviderResult = await primary.complete(request);
  let via = primary.name;

  if (result.confidence < threshold) {
    if (!options.fallback) {
      return { status: 'clarify', reason: `low confidence (${result.confidence.toFixed(2)} < ${threshold}) and no fallback configured` };
    }
    result = await options.fallback.complete(request);
    via = options.fallback.name;
  }

  const call = result.calls[0];
  if (!call) return { status: 'clarify', reason: 'no actionable tool call (off-topic request)' };
  return { status: 'selected', call, confidence: result.confidence, via };
}
