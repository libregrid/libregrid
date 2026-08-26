import type { JsonSchema } from '@libregrid/ai-protocol';
import { ModelProviderError, type GridModelProvider, type ModelProviderRequest, type ModelProviderResult } from './provider';

export interface OpenAiChatCompletionsProviderOptions {
  apiKey: string | (() => string | Promise<string>);
  model: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  /** Ask OpenRouter to route only to endpoints that support every supplied parameter. */
  requireParameters?: boolean;
  /** OpenRouter attribution header. */
  referer?: string;
  /** OpenRouter attribution header. */
  title?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function errorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.message === 'string') return value.message;
  return isRecord(value.error) && typeof value.error.message === 'string' ? value.error.message : undefined;
}

function mapHttpError(status: number, message: string): ModelProviderError {
  if (status === 429) return new ModelProviderError('RATE_LIMITED', message, true, status);
  if (status === 408 || status === 504) return new ModelProviderError('TIMEOUT', message, true, status);
  return new ModelProviderError('PROVIDER_ERROR', message, status >= 500, status);
}

function firstChoice(payload: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(payload.choices) || payload.choices.length === 0) {
    throw new ModelProviderError('INVALID_PROVIDER_OUTPUT', 'Chat completion contained no choices', false);
  }
  const choice = payload.choices[0];
  if (!isRecord(choice)) {
    throw new ModelProviderError('INVALID_PROVIDER_OUTPUT', 'Chat completion choice was not an object', false);
  }
  return choice;
}

function choiceText(choice: Record<string, unknown>): string {
  const message = isRecord(choice.message) ? choice.message : undefined;
  if (message && typeof message.refusal === 'string' && message.refusal.length > 0) {
    throw new ModelProviderError('MODEL_REFUSAL', message.refusal, false);
  }
  if (choice.finish_reason === 'length') {
    throw new ModelProviderError('PROVIDER_ERROR', 'Chat completion stopped at the token limit', true);
  }
  if (!message || typeof message.content !== 'string' || message.content.length === 0) {
    throw new ModelProviderError('INVALID_PROVIDER_OUTPUT', 'Chat completion contained no message content', false);
  }
  return message.content;
}

function requestBody(
  options: OpenAiChatCompletionsProviderOptions,
  prompt: ModelProviderRequest['prompt'],
  schema: JsonSchema,
): Record<string, unknown> {
  return {
    model: options.model,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'libregrid_grid_command',
        strict: true,
        schema,
      },
    },
    ...(options.requireParameters ? { provider: { require_parameters: true } } : {}),
  };
}

/**
 * Adapt any OpenAI-compatible Chat Completions service, such as OpenRouter,
 * to the gateway provider port.
 *
 * Set `requireParameters` for OpenRouter. Without it OpenRouter can route the
 * request to an endpoint that treats the JSON Schema as a hint instead of a
 * constraint.
 */
export function createOpenAiChatCompletionsProvider(options: OpenAiChatCompletionsProviderOptions): GridModelProvider {
  if (!options.model.trim()) throw new Error('ai-gateway: chat completions model is required');
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (!fetchImplementation) throw new Error('ai-gateway: fetch is unavailable');
  const endpoint = `${(options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
  return {
    service: 'openai-chat-completions',
    model: options.model,
    async complete(request): Promise<ModelProviderResult> {
      const apiKey = typeof options.apiKey === 'function' ? await options.apiKey() : options.apiKey;
      if (!apiKey) throw new ModelProviderError('PROVIDER_ERROR', 'Chat completions API key is not configured', false);
      const headers: Record<string, string> = {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      };
      if (options.referer) headers['http-referer'] = options.referer;
      if (options.title) headers['x-title'] = options.title;

      let response: Response;
      try {
        response = await fetchImplementation(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody(options, request.prompt, request.outputSchema)),
          signal: request.signal,
        });
      } catch (cause) {
        if (request.signal.aborted) {
          throw new ModelProviderError('TIMEOUT', 'Chat completions request was aborted', true, undefined, cause);
        }
        throw new ModelProviderError('PROVIDER_ERROR', 'Chat completions request failed', true, undefined, cause);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (cause) {
        throw new ModelProviderError(
          'PROVIDER_ERROR',
          `Chat completions returned non-JSON data (HTTP ${response.status})`,
          response.status >= 500,
          response.status,
          cause,
        );
      }

      if (!response.ok) {
        throw mapHttpError(response.status, errorMessage(payload) ?? `Chat completions returned HTTP ${response.status}`);
      }
      if (!isRecord(payload)) {
        throw new ModelProviderError('INVALID_PROVIDER_OUTPUT', 'Chat completions response was not an object', false);
      }
      // OpenRouter can return an error envelope with HTTP 200.
      if (isRecord(payload.error)) {
        const status = typeof payload.error.code === 'number' ? payload.error.code : 502;
        throw mapHttpError(status, errorMessage(payload) ?? 'Chat completions returned an error envelope');
      }

      const text = choiceText(firstChoice(payload));
      let output: unknown;
      try {
        output = JSON.parse(text);
      } catch (cause) {
        throw new ModelProviderError('INVALID_PROVIDER_OUTPUT', 'Chat completions output was not valid JSON', false, undefined, cause);
      }
      return { output, providerRequestId: typeof payload.id === 'string' ? payload.id : null };
    },
  };
}
