/** ADR 0006: act at or above this confidence; below it, clarify rather than guess. */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;

/**
 * The confidence policy, in one place so the escalation loop and
 * `applyAiCommand` cannot drift apart.
 *
 * A *stated* low confidence is honoured — that is the model telling us it is
 * guessing. A *missing* confidence is different: tuned Needle weights report
 * none at all, because fine-tuning does not update the confidence head.
 * Treating missing as 0 would reject every response from the very weights this
 * toolkit exists to run, so it proceeds on the strength of full plan
 * validation instead. Validation is required either way.
 */
export function passesConfidenceGate(confidence: number | undefined, threshold: number = DEFAULT_CONFIDENCE_THRESHOLD): boolean {
  return confidence === undefined || confidence >= threshold;
}

/** Render a confidence for a message, including the missing case. */
export function formatConfidence(confidence: number | undefined): string {
  return confidence === undefined ? 'unreported' : confidence.toFixed(2);
}
