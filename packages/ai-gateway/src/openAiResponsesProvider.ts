import type { JsonSchema } from '@libregrid/ai-protocol';
import { ModelProviderError, type GridModelProvider, type ModelProviderRequest, type ModelProviderResult } from './provider';

export interface OpenAiResponsesProviderOptions {
  apiKey: string | (() => string | Promise<string>);
  model: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  organization?: string;
  project?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function errorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.message === 'string') return value.message;
  return isRecord(value.error) && typeof value.error.message === 'string' ? value.error.message : undefined;
}

function outputText(value: Record<string, unknown>): string | undefined {
  if (typeof value.output_text === 'string') return value.output_text;
  if (!Array.isArray(value.output)) return undefined;
  const parts: string[] = [];
  for (const item of value.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (!isRecord(content)) continue;
      if (content.type === 'refusal' && typeof content.refusal === 'string') {
        throw new ModelProviderError('MODEL_REFUSAL', content.refusal, false);
      }
      if (content.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.length > 0 ? parts.join('') : undefined;
}

function mapHttpError(status: number, message: string): ModelProviderError {
  if (status === 429) return new ModelProviderError('RATE_LIMITED', message, true, status);
  if (status === 408 || status === 504) return new ModelProviderError('TIMEOUT', message, true, status);
  return new ModelProviderError('PROVIDER_ERROR', message, status >= 500, status);
}

function requestBody(model: string, prompt: ModelProviderRequest['prompt'], schema: JsonSchema): Record<string, unknown> {
  return {
    model,
    store: false,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: prompt.system }] },
      { role: 'user', content: [{ type: 'input_text', text: prompt.user }] },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'libregrid_grid_command',
        strict: true,
        schema,
      },
    },
  };
}

export function createOpenAiResponsesProvider(options: OpenAiResponsesProviderOptions): GridModelProvider {
  if (!options.model.trim()) throw new Error('ai-gateway: OpenAI model is required');
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (!fetchImplementation) throw new Error('ai-gateway: fetch is unavailable');
  const endpoint = `${(options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')}/responses`;
  return {
    service: 'openai-responses',
    model: options.model,
    async complete(request): Promise<ModelProviderResult> {
      const apiKey = typeof options.apiKey === 'function' ? await options.apiKey() : options.apiKey;
      if (!apiKey) throw new ModelProviderError('PROVIDER_ERROR', 'OpenAI API key is not configured', false);
      const headers: Record<string, string> = {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      };
      if (options.organization) headers['openai-organization'] = options.organization;
      if (options.project) headers['openai-project'] = options.project;
      let response: Response;
      try {
        response = await fetchImplementation(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody(options.model, request.prompt, request.outputSchema)),
          signal: request.signal,
        });
      } catch (cause) {
        if (request.signal.aborted) throw new ModelProviderError('TIMEOUT', 'OpenAI request was aborted', true, undefined, cause);
        throw new ModelProviderError('PROVIDER_ERROR', 'OpenAI request failed', true, undefined, cause);
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch (cause) {
        throw new ModelProviderError('PROVIDER_ERROR', `OpenAI returned non-JSON data (HTTP ${response.status})`, response.status >= 500, response.status, cause);
      }
      if (!response.ok) throw mapHttpError(response.status, errorMessage(payload) ?? `OpenAI returned HTTP ${response.status}`);
      if (!isRecord(payload)) throw new ModelProviderError('INVALID_PROVIDER_OUTPUT', 'OpenAI response was not an object', false);
      if (payload.status === 'incomplete') {
        throw new ModelProviderError('PROVIDER_ERROR', errorMessage(payload.incomplete_details) ?? 'OpenAI response was incomplete', true);
      }
      const text = outputText(payload);
      if (!text) throw new ModelProviderError('INVALID_PROVIDER_OUTPUT', 'OpenAI response did not contain output text', false);
      let output: unknown;
      try {
        output = JSON.parse(text);
      } catch (cause) {
        throw new ModelProviderError('INVALID_PROVIDER_OUTPUT', 'OpenAI output was not valid JSON', false, undefined, cause);
      }
      return { output, providerRequestId: typeof payload.id === 'string' ? payload.id : null };
    },
  };
}
