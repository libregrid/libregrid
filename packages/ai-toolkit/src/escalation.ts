import type { AiProvider, AiProviderResult, AiRequest } from './provider';
import type { RawToolCall } from './tools';

/** ADR 0006: act at or above this confidence; below it, escalate or clarify. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

export type ToolkitOutcome =
  | { status: 'selected'; call: RawToolCall; confidence: number; via: string; result: AiProviderResult }
  | { status: 'clarify'; reason: string; result: AiProviderResult };

export interface RunToolkitOptions {
  /** Confidence gate (default 0.5 — spike §4-A). */
  threshold?: number;
  /** Remote fallback tried when the primary scores below `threshold`. */
  fallback?: AiProvider;
}

/**
 * The ADR 0006 escalation loop: run the primary provider, and if its
 * confidence is below the threshold, try the optional remote fallback.
 * Below-threshold results are never applied — including the fallback's, which
 * is gated on the same threshold — so the failure mode is always a
 * clarification, not a guessed state change. The selected call still has to
 * pass `validateToolCall` before `applyToolCall`.
 *
 * v1 acts on the first call only; `outcome.result.calls` carries the rest for
 * consumers that want them.
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
      return { status: 'clarify', reason: `low confidence (${result.confidence.toFixed(2)} < ${threshold}) and no fallback configured`, result };
    }
    result = await options.fallback.complete(request);
    via = options.fallback.name;
    // The fallback is gated too. `OpenAiCompatibleProvider` reports 1 by
    // design, but `fallback` is any `AiProvider` — a second local model must
    // not become the way an under-confident answer gets applied anyway.
    if (result.confidence < threshold) {
      return { status: 'clarify', reason: `low confidence after escalation to ${via} (${result.confidence.toFixed(2)} < ${threshold})`, result };
    }
  }

  const call = result.calls[0];
  if (!call) return { status: 'clarify', reason: 'no actionable tool call (off-topic request)', result };
  return { status: 'selected', call, confidence: result.confidence, via, result };
}
