import { describe, expect, it, vi } from 'vitest';
import { AI_PROTOCOL, revisionFor, type GridCommandRequest, type JsonValue } from '@libregrid/ai-protocol';
import { createGridCommandHandler } from './gateway';
import { runGatewayConformance } from './conformance';
import { createMockProvider } from './mockProvider';
import { createOpenAiResponsesProvider } from './openAiResponsesProvider';
import { createOpenAiChatCompletionsProvider } from './openAiChatCompletionsProvider';
import { ModelProviderError, type GridModelProvider, type ModelProviderRequest } from './provider';

const gridSchema = {
  type: 'object',
  properties: {
    sort: {
      type: ['object', 'null'],
      properties: {
        sortModel: {
          type: 'array',
          items: {
            type: 'object',
            properties: { colId: { const: 'sales' }, sort: { enum: ['asc', 'desc'] } },
            required: ['colId', 'sort'],
            additionalProperties: false,
          },
        },
      },
      required: ['sortModel'],
      additionalProperties: false,
    },
  },
  required: ['sort'],
  additionalProperties: false,
};

function commandRequest(): GridCommandRequest {
  const currentState = { sort: { sortModel: [] } };
  return {
    protocol: AI_PROTOCOL,
    requestId: 'gateway-test',
    revision: revisionFor({ gridSchema: gridSchema as JsonValue, currentState }),
    command: 'sort sales highest first',
    gridSchema,
    currentState,
    context: {},
  };
}

function httpRequest(value: unknown = commandRequest()): Request {
  return new Request('http://localhost/v1/grid-command', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
}

describe('grid command gateway', () => {
  it('ships an executable conformance check for any-language gateway implementations', async () => {
    const handler = createGridCommandHandler({ provider: createMockProvider() });
    const fetch: typeof globalThis.fetch = async (input, init) => handler(new Request(input, init));
    await expect(runGatewayConformance({ endpoint: 'http://gateway.test/v1/grid-command', fetch })).resolves.toEqual({
      ok: true,
      endpoint: 'http://gateway.test/v1/grid-command',
      protocol: AI_PROTOCOL,
      status: 'ok',
    });
  });

  it('serves health without invoking a provider', async () => {
    const provider = createMockProvider();
    const handler = createGridCommandHandler({ provider });
    const response = await handler(new Request('http://localhost/health'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok', protocol: AI_PROTOCOL });
  });

  it('returns 404 for unsupported routes and methods', async () => {
    const handler = createGridCommandHandler({ provider: createMockProvider() });
    expect((await handler(new Request('http://localhost/unknown'))).status).toBe(404);
    expect((await handler(new Request('http://localhost/v1/grid-command', { method: 'GET' }))).status).toBe(404);
  });

  it('validates, completes, revalidates, and envelopes a command', async () => {
    const provider = createMockProvider({
      resolve: () => ({
        gridState: { sort: { sortModel: [{ colId: 'sales', sort: 'desc' }] } },
        propertiesToIgnore: [],
        explanation: 'Sorted sales descending.',
      }),
    });
    const handler = createGridCommandHandler({ provider });
    const response = await handler(httpRequest());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      protocol: AI_PROTOCOL,
      requestId: 'gateway-test',
      status: 'ok',
      output: { gridState: { sort: { sortModel: [{ colId: 'sales', sort: 'desc' }] } } },
      provider: { service: 'libregrid-mock', model: 'deterministic-v1' },
    });
  });

  it('returns a typed 400 before provider invocation for malformed contracts', async () => {
    const complete = vi.fn();
    const provider = { service: 'test', model: 'test', complete } satisfies GridModelProvider;
    const response = await createGridCommandHandler({ provider })(httpRequest({ command: 'missing envelope' }));
    expect(response.status).toBe(400);
    expect(complete).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ status: 'error', error: { code: 'BAD_REQUEST' } });
  });

  it('rejects provider output that invents a column or operator', async () => {
    const provider = createMockProvider({
      resolve: () => ({
        gridState: { sort: { sortModel: [{ colId: 'invented', sort: 'sideways' }] } },
        propertiesToIgnore: [],
        explanation: 'Invalid fixture.',
      }),
    });
    const response = await createGridCommandHandler({ provider })(httpRequest());
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ status: 'error', error: { code: 'INVALID_PROVIDER_OUTPUT' } });
  });

  it('enforces authorization, body limits, and provider timeouts', async () => {
    const mock = createMockProvider();
    const unauthorized = await createGridCommandHandler({ provider: mock, authorize: () => false })(httpRequest());
    expect(unauthorized.status).toBe(401);

    const oversized = await createGridCommandHandler({ provider: mock, maxBodyBytes: 4 })(httpRequest());
    expect(oversized.status).toBe(413);

    const hanging: GridModelProvider = {
      service: 'hanging',
      model: 'never',
      complete: () => new Promise(() => undefined),
    };
    const timedOut = await createGridCommandHandler({ provider: hanging, timeoutMs: 5 })(httpRequest());
    expect(timedOut.status).toBe(504);
    await expect(timedOut.json()).resolves.toMatchObject({ error: { code: 'TIMEOUT', retryable: true } });
  });

  it('rejects missing, malformed, and streamed oversized request bodies', async () => {
    const handler = createGridCommandHandler({ provider: createMockProvider(), maxBodyBytes: 8 });
    const missing = await handler(new Request('http://localhost/v1/grid-command', { method: 'POST' }));
    expect(missing.status).toBe(400);

    const malformed = await handler(new Request('http://localhost/v1/grid-command', {
      method: 'POST',
      body: '{',
      headers: { 'content-type': 'application/json' },
    }));
    expect(malformed.status).toBe(400);

    const oversized = await handler(new Request('http://localhost/v1/grid-command', {
      method: 'POST',
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('12345'));
          controller.enqueue(new TextEncoder().encode('67890'));
          controller.close();
        },
      }),
      // Node requires this opt-in for a streamed request body.
      duplex: 'half',
    } as RequestInit));
    expect(oversized.status).toBe(413);
  });

  it('maps provider failures, unexpected failures, and records metadata-only events', async () => {
    const cases: [ModelProviderError, number, string][] = [
      [new ModelProviderError('RATE_LIMITED', 'slow down', true), 429, 'RATE_LIMITED'],
      [new ModelProviderError('MODEL_REFUSAL', 'declined', false), 422, 'MODEL_REFUSAL'],
      [new ModelProviderError('INVALID_PROVIDER_OUTPUT', 'invalid', false), 502, 'INVALID_PROVIDER_OUTPUT'],
      [new ModelProviderError('PROVIDER_ERROR', 'upstream', true), 502, 'PROVIDER_ERROR'],
    ];
    for (const [error, status, code] of cases) {
      const provider: GridModelProvider = { service: 'test', model: 'test', complete: async () => { throw error; } };
      const response = await createGridCommandHandler({ provider })(httpRequest());
      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toMatchObject({ error: { code } });
    }

    const log = vi.fn();
    const provider: GridModelProvider = { service: 'test', model: 'test', complete: async () => { throw new Error('secret payload'); } };
    const response = await createGridCommandHandler({ provider, authorize: async () => true, log })(httpRequest());
    expect(response.status).toBe(502);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ event: 'failed', requestId: 'gateway-test', code: 'PROVIDER_ERROR' }));
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret payload');
  });

  it('logs rejected and completed request identifiers without command contents', async () => {
    const log = vi.fn();
    const handler = createGridCommandHandler({ provider: createMockProvider(), log });
    await handler(httpRequest({ ...commandRequest(), protocol: 'wrong' }));
    await handler(httpRequest());
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ event: 'rejected', requestId: 'gateway-test' }));
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ event: 'completed', requestId: 'gateway-test' }));
    expect(JSON.stringify(log.mock.calls)).not.toContain('sort sales highest first');
  });
});

describe('OpenAI Responses provider', () => {
  function providerRequest(): ModelProviderRequest {
    return {
      prompt: { system: 'system instructions', user: '{"command":"sort sales"}' },
      outputSchema: {
        type: 'object',
        properties: {
          gridState: gridSchema,
          propertiesToIgnore: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
        },
        required: ['gridState', 'propertiesToIgnore', 'explanation'],
        additionalProperties: false,
      },
      signal: new AbortController().signal,
    };
  }

  it('uses current Responses strict text.format and parses output_text content', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      id: 'resp_123',
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({
        gridState: { sort: null },
        propertiesToIgnore: ['sort'],
        explanation: 'No change.',
      }) }] }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const provider = createOpenAiResponsesProvider({ apiKey: 'test-secret', model: 'gpt-test', fetch });
    await expect(provider.complete(providerRequest())).resolves.toMatchObject({ providerRequestId: 'resp_123' });
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/responses');
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: 'gpt-test',
      store: false,
      text: { format: { type: 'json_schema', name: 'libregrid_grid_command', strict: true } },
    });
    expect(JSON.stringify(body)).toContain('system instructions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer test-secret');
  });

  it('maps rate limits and refusals to typed provider failures', async () => {
    const rateLimited = createOpenAiResponsesProvider({
      apiKey: 'test-secret',
      model: 'gpt-test',
      fetch: async () => new Response(JSON.stringify({ error: { message: 'slow down' } }), { status: 429 }),
    });
    await expect(rateLimited.complete(providerRequest())).rejects.toMatchObject({ code: 'RATE_LIMITED', retryable: true });

    const refusal = createOpenAiResponsesProvider({
      apiKey: 'test-secret',
      model: 'gpt-test',
      fetch: async () => new Response(JSON.stringify({ output: [{ content: [{ type: 'refusal', refusal: 'cannot comply' }] }] }), { status: 200 }),
    });
    await expect(refusal.complete(providerRequest())).rejects.toMatchObject({ code: 'MODEL_REFUSAL', retryable: false });
  });

  it('supports direct output_text, async credentials, custom URLs, and tenant headers', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      output_text: JSON.stringify({ gridState: { sort: null }, propertiesToIgnore: ['sort'], explanation: 'No change.' }),
    }), { status: 200 }));
    const provider = createOpenAiResponsesProvider({
      apiKey: async () => 'dynamic-key',
      model: 'gpt-test',
      baseUrl: 'https://example.test/openai/',
      organization: 'org-test',
      project: 'project-test',
      fetch,
    });
    await expect(provider.complete(providerRequest())).resolves.toMatchObject({ providerRequestId: null });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.test/openai/responses');
    expect(init.headers).toMatchObject({
      authorization: 'Bearer dynamic-key',
      'openai-organization': 'org-test',
      'openai-project': 'project-test',
    });
  });

  it('rejects invalid configuration and missing credentials', async () => {
    expect(() => createOpenAiResponsesProvider({ apiKey: 'x', model: '  ' })).toThrow(/model is required/);
    const provider = createOpenAiResponsesProvider({ apiKey: '', model: 'gpt-test', fetch: vi.fn() });
    await expect(provider.complete(providerRequest())).rejects.toMatchObject({ code: 'PROVIDER_ERROR', retryable: false });
  });

  it('maps HTTP, parsing, incomplete, and missing-output failures', async () => {
    const responses: [Response, string][] = [
      [new Response(JSON.stringify({ message: 'gateway timed out' }), { status: 504 }), 'TIMEOUT'],
      [new Response(JSON.stringify({ error: { message: 'upstream failed' } }), { status: 500 }), 'PROVIDER_ERROR'],
      [new Response('<html>bad gateway</html>', { status: 502 }), 'PROVIDER_ERROR'],
      [new Response('null', { status: 200 }), 'INVALID_PROVIDER_OUTPUT'],
      [new Response(JSON.stringify({ status: 'incomplete', incomplete_details: { message: 'token limit' } }), { status: 200 }), 'PROVIDER_ERROR'],
      [new Response(JSON.stringify({ output: [] }), { status: 200 }), 'INVALID_PROVIDER_OUTPUT'],
      [new Response(JSON.stringify({ output_text: '{' }), { status: 200 }), 'INVALID_PROVIDER_OUTPUT'],
    ];
    for (const [response, code] of responses) {
      const provider = createOpenAiResponsesProvider({ apiKey: 'x', model: 'gpt-test', fetch: async () => response });
      await expect(provider.complete(providerRequest())).rejects.toMatchObject({ code });
    }
  });

  it('distinguishes aborted requests from other transport failures', async () => {
    const aborted = new AbortController();
    aborted.abort();
    const provider = createOpenAiResponsesProvider({
      apiKey: 'x',
      model: 'gpt-test',
      fetch: async () => { throw new Error('aborted'); },
    });
    await expect(provider.complete({ ...providerRequest(), signal: aborted.signal })).rejects.toMatchObject({ code: 'TIMEOUT' });

    const failed = createOpenAiResponsesProvider({
      apiKey: 'x',
      model: 'gpt-test',
      fetch: async () => { throw new Error('network down'); },
    });
    await expect(failed.complete(providerRequest())).rejects.toMatchObject({ code: 'PROVIDER_ERROR', retryable: true });
  });

  describe('OpenAI-compatible chat completions provider', () => {
    it('sends the chat completions wire shape with a strict schema', async () => {
      const fetch = vi.fn(async () => new Response(JSON.stringify({
        id: 'gen_abc',
        choices: [{ message: { content: JSON.stringify({
          gridState: { sort: null },
          propertiesToIgnore: ['sort'],
          explanation: 'No change.',
        }) }, finish_reason: 'stop' }],
      }), { status: 200, headers: { 'content-type': 'application/json' } }));

      const provider = createOpenAiChatCompletionsProvider({
        apiKey: 'test-secret',
        model: 'openrouter/free',
        baseUrl: 'https://openrouter.ai/api/v1',
        requireParameters: true,
        referer: 'https://libregrid.dev',
        title: 'LibreGrid Docs',
        fetch,
      });

      await expect(provider.complete(providerRequest())).resolves.toMatchObject({ providerRequestId: 'gen_abc' });
      expect(provider.service).toBe('openai-chat-completions');

      const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');

      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(body).toMatchObject({
        model: 'openrouter/free',
        response_format: { type: 'json_schema', json_schema: { name: 'libregrid_grid_command', strict: true } },
        provider: { require_parameters: true },
      });
      expect(body.messages).toEqual([
        { role: 'system', content: 'system instructions' },
        { role: 'user', content: '{"command":"sort sales"}' },
      ]);

      const headers = init.headers as Record<string, string>;
      expect(headers.authorization).toBe('Bearer test-secret');
      expect(headers['http-referer']).toBe('https://libregrid.dev');
      expect(headers['x-title']).toBe('LibreGrid Docs');
    });

    it('omits provider routing and attribution headers when they are not configured', async () => {
      const fetch = vi.fn(async () => new Response(JSON.stringify({
        choices: [{ message: { content: '{"gridState":{"sort":null},"propertiesToIgnore":[],"explanation":"ok"}' } }],
      }), { status: 200 }));

      const provider = createOpenAiChatCompletionsProvider({ apiKey: 'k', model: 'm', fetch });
      await expect(provider.complete(providerRequest())).resolves.toMatchObject({ providerRequestId: null });

      const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(body.provider).toBeUndefined();
      expect((init.headers as Record<string, string>)['http-referer']).toBeUndefined();
    });

    it('maps refusals, rate limits, truncation, and bad JSON to typed failures', async () => {
      const refusal = createOpenAiChatCompletionsProvider({
        apiKey: 'k', model: 'm',
        fetch: async () => new Response(JSON.stringify({
          choices: [{ message: { refusal: 'cannot comply' } }],
        }), { status: 200 }),
      });
      await expect(refusal.complete(providerRequest())).rejects.toMatchObject({ code: 'MODEL_REFUSAL', retryable: false });

      const limited = createOpenAiChatCompletionsProvider({
        apiKey: 'k', model: 'm',
        fetch: async () => new Response(JSON.stringify({ error: { message: 'slow down' } }), { status: 429 }),
      });
      await expect(limited.complete(providerRequest())).rejects.toMatchObject({ code: 'RATE_LIMITED', retryable: true });

      const truncated = createOpenAiChatCompletionsProvider({
        apiKey: 'k', model: 'm',
        fetch: async () => new Response(JSON.stringify({
          choices: [{ message: { content: '{"gridState"' }, finish_reason: 'length' }],
        }), { status: 200 }),
      });
      await expect(truncated.complete(providerRequest())).rejects.toMatchObject({ code: 'PROVIDER_ERROR', retryable: true });

      const badJson = createOpenAiChatCompletionsProvider({
        apiKey: 'k', model: 'm',
        fetch: async () => new Response(JSON.stringify({
          choices: [{ message: { content: 'not json' }, finish_reason: 'stop' }],
        }), { status: 200 }),
      });
      await expect(badJson.complete(providerRequest())).rejects.toMatchObject({ code: 'INVALID_PROVIDER_OUTPUT', retryable: false });
    });

    it('reports an in-body error envelope returned with HTTP 200', async () => {
      const provider = createOpenAiChatCompletionsProvider({
        apiKey: 'k', model: 'm',
        fetch: async () => new Response(JSON.stringify({ error: { message: 'no endpoints found', code: 404 } }), { status: 200 }),
      });
      await expect(provider.complete(providerRequest())).rejects.toMatchObject({ code: 'PROVIDER_ERROR' });
    });

    it('rejects a missing key and an empty model', async () => {
      expect(() => createOpenAiChatCompletionsProvider({ apiKey: 'k', model: '   ' })).toThrow(/model is required/);

      const noKey = createOpenAiChatCompletionsProvider({ apiKey: '', model: 'm', fetch: async () => new Response('{}') });
      await expect(noKey.complete(providerRequest())).rejects.toMatchObject({ code: 'PROVIDER_ERROR' });
    });
  });
});

describe('gateway conformance failure diagnostics', () => {
  it('reports non-JSON, non-conformant, and conformant error responses', async () => {
    await expect(runGatewayConformance({
      endpoint: 'http://gateway.test/v1/grid-command',
      fetch: async () => new Response('bad', { status: 502 }),
    })).rejects.toThrow(/non-JSON/);

    await expect(runGatewayConformance({
      endpoint: 'http://gateway.test/v1/grid-command',
      fetch: async () => new Response(JSON.stringify({ status: 'wrong' }), { status: 200 }),
    })).rejects.toThrow(/not conformant/);

    const request = commandRequest();
    await expect(runGatewayConformance({
      endpoint: 'http://gateway.test/v1/grid-command',
      authorization: 'Bearer local-test',
      fetch: async (_input, init) => {
        expect((init?.headers as Record<string, string>).authorization).toBe('Bearer local-test');
        const sent = JSON.parse(String(init?.body)) as GridCommandRequest;
        return new Response(JSON.stringify({
          protocol: AI_PROTOCOL,
          requestId: sent.requestId,
          revision: sent.revision,
          status: 'error',
          error: { code: 'PROVIDER_ERROR', message: 'offline', retryable: true },
        }), { status: 502 });
      },
    })).rejects.toThrow(/conformant error/);
    expect(request.command).toContain('sales');
  });
});
