import type { JsonSchema, ProviderGridOutput, ProviderPrompt } from '@libregrid/ai-protocol';

export type ProviderFailureCode =
  | 'MODEL_REFUSAL'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'INVALID_PROVIDER_OUTPUT';

export interface ModelProviderRequest {
  prompt: ProviderPrompt;
  outputSchema: JsonSchema;
  signal: AbortSignal;
}

export interface ModelProviderResult {
  output: ProviderGridOutput | unknown;
  providerRequestId: string | null;
}

/** The only provider-specific seam in the gateway. */
export interface GridModelProvider {
  readonly service: string;
  readonly model: string;
  complete(request: ModelProviderRequest): Promise<ModelProviderResult>;
}

export class ModelProviderError extends Error {
  constructor(
    readonly code: ProviderFailureCode,
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ModelProviderError';
  }
}
