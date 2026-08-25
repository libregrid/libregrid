import {
  AI_PROTOCOL,
  buildProviderOutputSchema,
  buildProviderPrompt,
  validateGridCommandRequest,
  validateProviderGridOutput,
  type GridCommandErrorCode,
  type GridCommandFailure,
  type GridCommandRequest,
  type GridCommandSuccess,
} from '@libregrid/ai-protocol';
import { ModelProviderError, type GridModelProvider } from './provider';

export interface GatewayLogEvent {
  event: 'completed' | 'failed' | 'rejected';
  requestId: string;
  code?: GridCommandErrorCode;
  latencyMs: number;
}

export interface GridCommandGatewayOptions {
  provider: GridModelProvider;
  authorize?: (request: Request) => boolean | Promise<boolean>;
  maxBodyBytes?: number;
  timeoutMs?: number;
  log?: (event: GatewayLogEvent) => void;
}

const RESPONSE_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: RESPONSE_HEADERS });
}

function identifiers(value: unknown): { requestId: string; revision: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { requestId: '', revision: '' };
  const item = value as Record<string, unknown>;
  return {
    requestId: typeof item.requestId === 'string' ? item.requestId : '',
    revision: typeof item.revision === 'string' ? item.revision : '',
  };
}

function failure(
  identity: { requestId: string; revision: string },
  code: GridCommandErrorCode,
  message: string,
  retryable: boolean,
): GridCommandFailure {
  return {
    protocol: AI_PROTOCOL,
    requestId: identity.requestId,
    revision: identity.revision,
    status: 'error',
    error: { code, message, retryable },
  };
}

async function readBody(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new RangeError('request body is too large');
  if (!request.body) throw new SyntaxError('request body is required');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    bytes += item.value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new RangeError('request body is too large');
    }
    text += decoder.decode(item.value, { stream: true });
  }
  text += decoder.decode();
  return JSON.parse(text) as unknown;
}

function timeoutSignal(source: AbortSignal, timeoutMs: number): { signal: AbortSignal; clear(): void } {
  const controller = new AbortController();
  const abort = (): void => controller.abort(source.reason);
  if (source.aborted) abort();
  else source.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('provider timeout')), timeoutMs);
  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timer);
      source.removeEventListener('abort', abort);
    },
  };
}

function providerFailure(error: ModelProviderError): { code: GridCommandErrorCode; status: number } {
  if (error.code === 'RATE_LIMITED') return { code: 'RATE_LIMITED', status: 429 };
  if (error.code === 'TIMEOUT') return { code: 'TIMEOUT', status: 504 };
  if (error.code === 'MODEL_REFUSAL') return { code: 'MODEL_REFUSAL', status: 422 };
  if (error.code === 'INVALID_PROVIDER_OUTPUT') return { code: 'INVALID_PROVIDER_OUTPUT', status: 502 };
  return { code: 'PROVIDER_ERROR', status: 502 };
}

function completeBeforeAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new ModelProviderError('TIMEOUT', 'Provider timed out', true));
  return new Promise<T>((resolve, reject) => {
    const aborted = (): void => reject(new ModelProviderError('TIMEOUT', 'Provider timed out', true));
    signal.addEventListener('abort', aborted, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener('abort', aborted);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', aborted);
        reject(error);
      },
    );
  });
}

export function createGridCommandHandler(options: GridCommandGatewayOptions): (request: Request) => Promise<Response> {
  const maxBodyBytes = options.maxBodyBytes ?? 512 * 1024;
  const timeoutMs = options.timeoutMs ?? 30_000;
  return async (httpRequest): Promise<Response> => {
    if (new URL(httpRequest.url).pathname === '/health') {
      return jsonResponse({ status: 'ok', protocol: AI_PROTOCOL }, 200);
    }
    if (new URL(httpRequest.url).pathname !== '/v1/grid-command' || httpRequest.method !== 'POST') {
      return jsonResponse({ error: 'not found' }, 404);
    }
    const started = performance.now();
    let raw: unknown;
    try {
      if (options.authorize && !(await options.authorize(httpRequest))) {
        options.log?.({ event: 'rejected', requestId: '', code: 'BAD_REQUEST', latencyMs: performance.now() - started });
        return jsonResponse(failure({ requestId: '', revision: '' }, 'BAD_REQUEST', 'Unauthorized', false), 401);
      }
      raw = await readBody(httpRequest, maxBodyBytes);
    } catch (error) {
      const message = error instanceof RangeError ? error.message : 'Request body must be valid JSON';
      return jsonResponse(failure(identifiers(raw), 'BAD_REQUEST', message, false), error instanceof RangeError ? 413 : 400);
    }
    const validatedRequest = validateGridCommandRequest(raw);
    if (!validatedRequest.ok) {
      options.log?.({ event: 'rejected', requestId: identifiers(raw).requestId, code: 'BAD_REQUEST', latencyMs: performance.now() - started });
      return jsonResponse(failure(identifiers(raw), 'BAD_REQUEST', validatedRequest.issues.map((entry) => `${entry.path}: ${entry.message}`).join('; '), false), 400);
    }
    const request: GridCommandRequest = validatedRequest.value;
    const timeout = timeoutSignal(httpRequest.signal, timeoutMs);
    try {
      const providerResult = await completeBeforeAbort(options.provider.complete({
        prompt: buildProviderPrompt(request),
        outputSchema: buildProviderOutputSchema(request.gridSchema),
        signal: timeout.signal,
      }), timeout.signal);
      const output = validateProviderGridOutput(request, providerResult.output);
      if (!output.ok) {
        const response = failure(request, 'INVALID_PROVIDER_OUTPUT', output.issues.map((entry) => `${entry.path}: ${entry.message}`).join('; '), false);
        options.log?.({ event: 'failed', requestId: request.requestId, code: response.error.code, latencyMs: performance.now() - started });
        return jsonResponse(response, 502);
      }
      const response: GridCommandSuccess = {
        protocol: AI_PROTOCOL,
        requestId: request.requestId,
        revision: request.revision,
        status: 'ok',
        output: output.value,
        provider: {
          service: options.provider.service,
          model: options.provider.model,
          providerRequestId: providerResult.providerRequestId,
          latencyMs: performance.now() - started,
        },
      };
      options.log?.({ event: 'completed', requestId: request.requestId, latencyMs: response.provider.latencyMs });
      return jsonResponse(response, 200);
    } catch (error) {
      const providerError = error instanceof ModelProviderError
        ? error
        : timeout.signal.aborted
          ? new ModelProviderError('TIMEOUT', 'Provider timed out', true)
          : new ModelProviderError('PROVIDER_ERROR', 'Provider failed', true, undefined, error);
      const mapped = providerFailure(providerError);
      const response = failure(request, mapped.code, providerError.message, providerError.retryable);
      options.log?.({ event: 'failed', requestId: request.requestId, code: response.error.code, latencyMs: performance.now() - started });
      return jsonResponse(response, mapped.status);
    } finally {
      timeout.clear();
    }
  };
}
