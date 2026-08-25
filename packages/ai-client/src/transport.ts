import type { GridCommandRequest } from '@libregrid/ai-protocol';

export interface GridCommandTransport {
  send(request: GridCommandRequest, signal?: AbortSignal): Promise<unknown>;
}

export interface HttpGridCommandTransportOptions {
  endpoint?: string;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  credentials?: RequestCredentials;
}

export class GridCommandTransportError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GridCommandTransportError';
  }
}

export function createHttpGridCommandTransport(
  options: HttpGridCommandTransportOptions = {},
): GridCommandTransport {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (!fetchImplementation) throw new Error('ai-client: fetch is unavailable; provide a transport or fetch implementation');
  const endpoint = options.endpoint ?? '/v1/grid-command';
  return {
    async send(request, signal) {
      const configuredHeaders = typeof options.headers === 'function' ? await options.headers() : options.headers;
      let response: Response;
      try {
        response = await fetchImplementation(endpoint, {
          method: 'POST',
          credentials: options.credentials ?? 'same-origin',
          headers: { 'content-type': 'application/json', ...configuredHeaders },
          body: JSON.stringify(request),
          ...(signal ? { signal } : {}),
        });
      } catch (cause) {
        throw new GridCommandTransportError('AI gateway request failed', undefined, cause);
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch (cause) {
        throw new GridCommandTransportError('AI gateway returned non-JSON data', response.status, cause);
      }
      if (!response.ok && (!payload || typeof payload !== 'object')) {
        throw new GridCommandTransportError(`AI gateway returned HTTP ${response.status}`, response.status);
      }
      return payload;
    },
  };
}
