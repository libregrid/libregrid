# AI Toolkit Live Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a developer drive the docs AI Toolkit demo from a real model on their own machine, and let the deployed docs site do the same through a small protected backend.

**Architecture:** Add a second provider adapter that speaks the OpenAI-compatible Chat Completions API, so OpenRouter and similar services work behind the existing `GridModelProvider` port. Keep every browser call same-origin — a dev-server proxy locally, a Firebase Hosting rewrite to Cloud Run in production — so the gateway never needs CORS. Protect the public endpoint with Cloudflare Turnstile through the gateway's existing `authorize` hook.

**Tech Stack:** TypeScript, Node 20.19+, Vitest, Angular 22 (`@angular/build:dev-server`), Firebase Hosting, Cloud Run, Cloudflare Turnstile, OpenRouter.

**Spec:** This document. The Design and Constraints sections below are the spec; the Tasks implement them.

---

## Global Constraints

- Node engine floor is `>=20.19.0`. Do not use APIs above that floor.
- `@libregrid/ai-gateway` must keep zero provider SDK dependencies. Its only dependency stays `@libregrid/ai-protocol`. Use `fetch` directly.
- Do not change `@libregrid/ai-protocol`. The wire contract is versioned and already published behavior.
- Do not add CORS headers to the gateway. Every browser path in this plan is same-origin by design.
- Never print, log, or commit a provider key or a Turnstile secret.
- Gateway logs stay metadata-only: request IDs, result codes, latency. Never commands, schemas, state, or credentials.
- Commit messages follow Conventional Commits with a scope, for example `feat(ai-gateway): ...`.
- Documentation text follows ASD-STE100: short sentences, one instruction per sentence, active voice.
- The repo bans reading or installing `ag-grid-enterprise`. `npm run check:contamination` enforces this.

---

## Design

### Why the current code cannot do this

1. `packages/ai-gateway/src/openAiResponsesProvider.ts:69` builds the endpoint as `${baseUrl}/responses` and nests the schema at `text.format`. That is the OpenAI **Responses** API. OpenRouter serves `/api/v1/chat/completions` and expects `response_format.json_schema`. Pointing `OPENAI_BASE_URL` at OpenRouter returns HTTP 404.
2. `packages/ai-gateway/src/nodeServer.ts` sets no `Access-Control-*` header and handles no `OPTIONS` request. A browser on a different origin fails preflight.
3. `apps/docs/project.json` defines no dev-server proxy, so the docs app on port 4200 cannot reach a gateway on port 8787.

The browser half is already built. `apps/docs/src/app/routes/ai-toolkit.ts:381` renders an endpoint field and `:546` switches the assistant between the demo transport and a real HTTP endpoint.

### Facts that shape the design

- `GridAssistantOptions extends HttpGridCommandTransportOptions` (`packages/ai-client/src/assistant.ts:36`), and `headers` accepts an async function (`packages/ai-client/src/transport.ts:9`). The browser can therefore attach a fresh Turnstile token per request with no client change.
- `authorize` is `(request: Request) => boolean | Promise<boolean>` and runs at `packages/ai-gateway/src/gateway.ts:139`, **before** the body is read at `:143`. The Turnstile token must travel in a header, not in the JSON body.
- OpenRouter routes one model across several providers, and only some of them enforce a schema. The request must send `provider: { require_parameters: true }` so OpenRouter only picks endpoints that truly support structured outputs.
- The generated schema already satisfies OpenAI `strict` mode, which means it is fully `additionalProperties: false` with complete `required` arrays. It is therefore structurally valid for OpenRouter's strict path too.

### Risk gate

Free models hold deep nested schemas less reliably than `gpt-5.6` did. Task 4 measures this **before** Tasks 5 and 6 build hosting on top of the assumption. If free models cannot hold the schema, the fallback is a low-cost paid model for the hosted demo, with free models documented as suitable for local development.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/ai-gateway/src/openAiChatCompletionsProvider.ts` | **Create.** Chat Completions adapter behind `GridModelProvider`. |
| `packages/ai-gateway/src/index.ts` | **Modify.** Export the new factory and its options type. |
| `packages/ai-gateway/src/gateway.unit.spec.ts` | **Modify.** Add wire-shape and failure-mapping tests for the new adapter. |
| `packages/ai-gateway/src/server.ts` | **Modify.** Select the adapter from `AI_PROVIDER`. |
| `packages/ai-gateway/.env.example` | **Modify.** Document the OpenRouter variables. |
| `packages/ai-gateway/README.md` | **Modify.** Document the second adapter and the OpenRouter recipe. |
| `bundle-budgets.json` | **Modify.** Raise the `@libregrid/ai-gateway` budget and update its note. |
| `apps/docs/proxy.conf.json` | **Create.** Route `/v1/grid-command` and `/health` to the local gateway. |
| `apps/docs/project.json` | **Modify.** Attach the proxy to the `serve` target. |
| `packages/ai-gateway/src/openrouter.live.spec.ts` | **Create.** Env-guarded live battery against a free model. |
| `firebase.json` | **Modify.** Rewrite `/v1/grid-command` to Cloud Run, above the catch-all. |
| `docs/ai-gateway-hosting.md` | **Create.** Cloud Run deploy and secret runbook. |
| `packages/ai-gateway/src/turnstile.ts` | **Create.** Turnstile siteverify authorize hook. |
| `packages/ai-gateway/src/turnstile.unit.spec.ts` | **Create.** Tests for the hook. |
| `apps/docs/src/app/routes/ai-toolkit.ts` | **Modify.** Render the widget and attach the token header. |

---

## Task 1: OpenAI-compatible Chat Completions provider

**Files:**
- Create: `packages/ai-gateway/src/openAiChatCompletionsProvider.ts`
- Modify: `packages/ai-gateway/src/index.ts`
- Modify: `bundle-budgets.json:21-24`
- Test: `packages/ai-gateway/src/gateway.unit.spec.ts`

**Interfaces:**
- Consumes: `GridModelProvider`, `ModelProviderRequest`, `ModelProviderResult`, `ModelProviderError`, `ProviderFailureCode` from `./provider`; `JsonSchema` from `@libregrid/ai-protocol`.
- Produces: `createOpenAiChatCompletionsProvider(options: OpenAiChatCompletionsProviderOptions): GridModelProvider` and the exported interface `OpenAiChatCompletionsProviderOptions` with fields `apiKey: string | (() => string | Promise<string>)`, `model: string`, `baseUrl?: string`, `fetch?: typeof globalThis.fetch`, `requireParameters?: boolean`, `referer?: string`, `title?: string`. The provider's `service` field is the literal `'openai-chat-completions'`.

- [ ] **Step 1: Write the failing tests**

Add this block to `packages/ai-gateway/src/gateway.unit.spec.ts`. It reuses the existing `providerRequest()` helper defined at line 201.

```ts
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
```

Add the import at the top of the same file, next to the existing provider imports:

```ts
import { createOpenAiChatCompletionsProvider } from './openAiChatCompletionsProvider';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/ai-gateway/src/gateway.unit.spec.ts`

Expected: FAIL. The error names the missing module `./openAiChatCompletionsProvider`.

- [ ] **Step 3: Write the implementation**

Create `packages/ai-gateway/src/openAiChatCompletionsProvider.ts`:

```ts
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
```

- [ ] **Step 4: Export the factory**

In `packages/ai-gateway/src/index.ts`, add this line directly above the existing `createOpenAiResponsesProvider` export so the list stays alphabetical:

```ts
export { createOpenAiChatCompletionsProvider, type OpenAiChatCompletionsProviderOptions } from './openAiChatCompletionsProvider';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run packages/ai-gateway/src/gateway.unit.spec.ts`

Expected: PASS, including the six new cases.

- [ ] **Step 6: Raise the bundle budget**

The new adapter is compiled into both CLI bundles. Measured clean output was 59.8 KB against a 64 KB budget, so it can cross the line. Budget overruns are advisory warnings, not failures, but the recorded number must stay honest.

Run: `npm run check:budgets`

Read the reported `@libregrid/ai-gateway` size. If it exceeds 64 KB, update `bundle-budgets.json:21-24` to the next whole 4 KB step above the measured value, and rewrite the note to match. For example:

```json
"@libregrid/ai-gateway": {
  "maxSize": "68 KB",
  "note": "Server-only HTTP gateway, provider port, OpenAI Responses and Chat Completions adapters, mock, Node server, and conformance runner; no provider SDK. The 68 KB package budget includes both self-contained CLI bundles and their shared library modules."
}
```

Replace the stated measurement with the number the check actually printed. Do not copy this example value without measuring.

- [ ] **Step 7: Run lint and the full gateway suite**

Run: `npm run lint && npx vitest run packages/ai-gateway`

Expected: PASS with no ESLint findings.

- [ ] **Step 8: Commit**

```bash
git add packages/ai-gateway/src/openAiChatCompletionsProvider.ts \
        packages/ai-gateway/src/index.ts \
        packages/ai-gateway/src/gateway.unit.spec.ts \
        bundle-budgets.json
git commit -m "feat(ai-gateway): add OpenAI-compatible chat completions provider"
```

---

## Task 2: Select the provider from the environment

**Files:**
- Modify: `packages/ai-gateway/src/server.ts:1-23`
- Modify: `packages/ai-gateway/.env.example`
- Modify: `packages/ai-gateway/README.md`

**Interfaces:**
- Consumes: `createOpenAiChatCompletionsProvider` from Task 1.
- Produces: the `AI_PROVIDER` environment contract with the two accepted values `openai-responses` and `openai-chat`. `openai-responses` stays the default so current deployments do not change behavior.

- [ ] **Step 1: Rewrite the server entry point**

`server.ts` is a top-level script with no unit test; the integration coverage lives in `nodeServer.integration.spec.ts`, which builds its own handler. Verification for this task is the manual start in Step 3.

Replace the contents of `packages/ai-gateway/src/server.ts` with:

```ts
import { createGridCommandHandler } from './gateway';
import { listenNodeGateway } from './nodeServer';
import { createOpenAiChatCompletionsProvider } from './openAiChatCompletionsProvider';
import { createOpenAiResponsesProvider } from './openAiResponsesProvider';
import type { GridModelProvider } from './provider';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY is required');

const kind = process.env.AI_PROVIDER ?? 'openai-responses';
if (kind !== 'openai-responses' && kind !== 'openai-chat') {
  throw new Error('AI_PROVIDER must be "openai-responses" or "openai-chat"');
}

const model = process.env.OPENAI_MODEL ?? (kind === 'openai-chat' ? 'openrouter/free' : 'gpt-5.6');
const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('PORT must be a valid TCP port');

const provider: GridModelProvider = kind === 'openai-chat'
  ? createOpenAiChatCompletionsProvider({
      apiKey,
      model,
      ...(process.env.OPENAI_BASE_URL ? { baseUrl: process.env.OPENAI_BASE_URL } : {}),
      requireParameters: process.env.OPENROUTER_REQUIRE_PARAMETERS !== 'false',
      ...(process.env.OPENROUTER_REFERER ? { referer: process.env.OPENROUTER_REFERER } : {}),
      ...(process.env.OPENROUTER_TITLE ? { title: process.env.OPENROUTER_TITLE } : {}),
    })
  : createOpenAiResponsesProvider({
      apiKey,
      model,
      ...(process.env.OPENAI_BASE_URL ? { baseUrl: process.env.OPENAI_BASE_URL } : {}),
      ...(process.env.OPENAI_ORGANIZATION ? { organization: process.env.OPENAI_ORGANIZATION } : {}),
      ...(process.env.OPENAI_PROJECT ? { project: process.env.OPENAI_PROJECT } : {}),
    });

const handler = createGridCommandHandler({
  provider,
  log: (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
});
const host = process.env.HOST ?? '127.0.0.1';
await listenNodeGateway({ handler, host, port });
process.stdout.write(`LibreGrid AI gateway listening on ${host}:${port} using ${provider.service} (${provider.model})\n`);
```

`OPENROUTER_REQUIRE_PARAMETERS` defaults to on. A deployer must opt out deliberately, because opting out silently weakens schema enforcement.

- [ ] **Step 2: Document the environment variables**

Replace the contents of `packages/ai-gateway/.env.example` with:

```sh
# Select the provider adapter: openai-responses (default) or openai-chat.
AI_PROVIDER=openai-responses
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
# Optional for a compatible proxy or private gateway.
OPENAI_BASE_URL=https://api.openai.com/v1
# Optional OpenAI tenant routing headers. Responses adapter only.
OPENAI_ORGANIZATION=
OPENAI_PROJECT=
HOST=0.0.0.0
PORT=8787

# OpenRouter recipe. Set AI_PROVIDER=openai-chat and use these values.
# AI_PROVIDER=openai-chat
# OPENAI_BASE_URL=https://openrouter.ai/api/v1
# OPENAI_API_KEY=sk-or-v1-...
# OPENAI_MODEL=openrouter/free
# Keep this on. It stops OpenRouter from routing to an endpoint that
# treats the JSON Schema as a hint instead of a constraint.
# OPENROUTER_REQUIRE_PARAMETERS=true
# OPENROUTER_REFERER=https://libregrid.dev
# OPENROUTER_TITLE=LibreGrid Docs
```

- [ ] **Step 3: Start the gateway against OpenRouter and verify by hand**

Get a free key at `https://openrouter.ai/keys`. Write it to a git-ignored `.secrets` file in the repo root. Confirm `.secrets` is ignored before you write the key:

```bash
git check-ignore -v .secrets
```

Expected: the command prints a matching `.gitignore` rule. If it prints nothing, add `.secrets` to `.gitignore` first.

Write the file:

```sh
AI_PROVIDER=openai-chat
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-v1-your-key
OPENAI_MODEL=openrouter/free
OPENROUTER_REQUIRE_PARAMETERS=true
```

Build and start:

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx build ai-gateway
node --env-file=.secrets packages/ai-gateway/dist/server.js
```

Expected: `LibreGrid AI gateway listening on 127.0.0.1:8787 using openai-chat-completions (openrouter/free)`.

In a second terminal:

```bash
curl -s http://127.0.0.1:8787/health
```

Expected: `{"status":"ok","protocol":"libregrid.ai/v1"}`.

Stop the server when the check passes.

- [ ] **Step 4: Document the recipe in the package README**

In `packages/ai-gateway/README.md`, add a section after the existing provider documentation. Keep the sentences short and active, per ASD-STE100.

```markdown
## OpenAI-compatible chat completions

Set `AI_PROVIDER=openai-chat` to use a service that speaks the OpenAI Chat
Completions API. OpenRouter is one such service.

```sh
AI_PROVIDER=openai-chat
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-v1-...
OPENAI_MODEL=openrouter/free
OPENROUTER_REQUIRE_PARAMETERS=true
```

Keep `OPENROUTER_REQUIRE_PARAMETERS` on. OpenRouter serves one model through
more than one provider. Only some of those providers apply a JSON Schema as a
constraint. The others apply it as a hint. This flag tells OpenRouter to use
only the providers that apply the constraint.

The gateway validates every provider response, and the browser validates it a
second time. A weak provider therefore causes a clean `INVALID_PROVIDER_OUTPUT`
failure, not a bad grid change.
```

- [ ] **Step 5: Run lint and the gateway suite**

Run: `npm run lint && npx vitest run packages/ai-gateway`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ai-gateway/src/server.ts packages/ai-gateway/.env.example packages/ai-gateway/README.md
git commit -m "feat(ai-gateway): select the provider adapter from AI_PROVIDER"
```

---

## Task 3: Same-origin proxy for docs local development

**Files:**
- Create: `apps/docs/proxy.conf.json`
- Modify: `apps/docs/project.json:36-42`
- Modify: `docs/firebase-hosting.md`

**Interfaces:**
- Consumes: a gateway listening on `127.0.0.1:8787` from Task 2.
- Produces: `/v1/grid-command` and `/health` served on the docs dev-server origin, so the demo's default endpoint value needs no change.

- [ ] **Step 1: Create the proxy configuration**

Create `apps/docs/proxy.conf.json`:

```json
{
  "/v1/grid-command": {
    "target": "http://127.0.0.1:8787",
    "secure": false,
    "changeOrigin": false,
    "logLevel": "debug"
  },
  "/health": {
    "target": "http://127.0.0.1:8787",
    "secure": false,
    "changeOrigin": false,
    "logLevel": "debug"
  }
}
```

`changeOrigin` stays `false` so the gateway sees the docs origin. Task 6 relies on that when it checks the Turnstile token.

- [ ] **Step 2: Attach the proxy to the serve target**

In `apps/docs/project.json`, the `serve` target currently has an `options` block containing only `prebundle`. Add `proxyConfig` beside it:

```json
"serve": {
  "executor": "@angular/build:dev-server",
  "options": {
    "prebundle": {
      "exclude": ["@libregrid/calculated-columns"]
    },
    "proxyConfig": "apps/docs/proxy.conf.json"
  },
  "configurations": {
    "production": {
      "buildTarget": "docs:build:production"
    },
    "development": {
      "buildTarget": "docs:build:development"
    }
  },
  "defaultConfiguration": "development"
}
```

- [ ] **Step 3: Verify the full local loop by hand**

This is the deliverable of the task, so test it end to end.

Terminal 1:

```bash
node --env-file=.secrets packages/ai-gateway/dist/server.js
```

Terminal 2:

```bash
npx nx serve docs
```

In a browser, open the printed dev-server URL and go to `/ai-toolkit`. Then:

1. Set the mode selector to **External HTTP gateway**.
2. Leave the endpoint field at its default `/v1/grid-command`.
3. Enter `Show hardware sales over $5,000`.
4. Generate the proposal.

Expected: a proposal appears with a diff, and no CORS error appears in the browser console. Applying the proposal changes the grid.

If the proposal fails with `INVALID_PROVIDER_OUTPUT`, the free model did not hold the schema. Record which model failed and continue to Task 4, which measures this properly.

- [ ] **Step 4: Document the local loop**

Add this section to `docs/firebase-hosting.md`, after the "Local and preview deployment" section:

```markdown
## Local AI gateway for the docs demo

The `/ai-toolkit` demo can call a real model. Run the gateway on your own
machine and let the dev server proxy to it. The browser stays on one origin,
so the demo needs no CORS.

Put your provider key in a git-ignored `.secrets` file in the repository root.
See [`packages/ai-gateway/.env.example`](../packages/ai-gateway/.env.example)
for the OpenRouter recipe.

```sh
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx build ai-gateway
node --env-file=.secrets packages/ai-gateway/dist/server.js
npx nx serve docs
```

On the `/ai-toolkit` page, set the mode to **External HTTP gateway** and keep
the default `/v1/grid-command` endpoint. The dev server sends that path to the
gateway on port 8787.
```

- [ ] **Step 5: Commit**

```bash
git add apps/docs/proxy.conf.json apps/docs/project.json docs/firebase-hosting.md
git commit -m "feat(docs): proxy the AI gateway path in local development"
```

---

## Task 4: Live OpenRouter battery — the risk gate

**Files:**
- Create: `packages/ai-gateway/src/openrouter.live.spec.ts`
- Modify: `docs/plans/ai-toolkit-live-backend.md` (the Verification record at the end of this file)

**Interfaces:**
- Consumes: `createOpenAiChatCompletionsProvider` from Task 1, `createGridCommandHandler` from `./gateway`.
- Produces: a measured answer to whether a free OpenRouter model holds the generated schema. Tasks 5 and 6 depend on that answer.

**Before starting:** this task sends data to a third-party service. The payload is fully synthetic. Confirm the repository owner approves the egress, exactly as open action B4 recorded for the OpenAI battery. Do not run it without that approval.

- [ ] **Step 1: Write the live spec**

Create `packages/ai-gateway/src/openrouter.live.spec.ts`. It mirrors `openai.live.spec.ts`, which builds a real grid in jsdom and captures a real schema. Copy the `captureGrid` helper and the module registration block from that file verbatim so both batteries measure the same schema.

```ts
/** @vitest-environment jsdom */
import { expect, it } from 'vitest';
import { AllCommunityModule, ModuleRegistry, createGrid } from 'ag-grid-community';
import { AdvancedFilterModule } from '@libregrid/advanced-filter';
import { AiToolkitModule } from '@libregrid/ai-toolkit';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { PivotModule } from '@libregrid/pivot';
import { SetFilterModule } from '@libregrid/set-filter';
import {
  AI_PROTOCOL,
  revisionFor,
  type GridCommandRequest,
  type GridCommandResponse,
  type JsonObject,
  type JsonSchema,
} from '@libregrid/ai-protocol';
import { createGridCommandHandler } from './gateway';
import { createOpenAiChatCompletionsProvider } from './openAiChatCompletionsProvider';

ModuleRegistry.registerModules([
  AllCommunityModule,
  AdvancedFilterModule,
  AiToolkitModule,
  RowGroupingModule,
  PivotModule,
  SetFilterModule,
]);

// Copy `captureGrid` from openai.live.spec.ts without changes.

const live = process.env.OPENROUTER_API_KEY ? it : it.skip;

const COMMANDS = [
  'Show hardware sales over $5,000',
  'Sort the sales amount from highest to lowest',
  'Group the rows by sales region',
  'Pivot product category across sales region',
  'Total the sales amount',
  'Hide the sales rep column',
  'Size the columns to fit their content',
  'Clear every filter',
  'Leave the grid exactly as it is',
  'Order me a pizza',
  'Show sales in North America over $1,000 that closed after March 2026',
];

function handler() {
  return createGridCommandHandler({
    provider: createOpenAiChatCompletionsProvider({
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      model: process.env.OPENROUTER_MODEL ?? 'openrouter/free',
      baseUrl: 'https://openrouter.ai/api/v1',
      requireParameters: true,
      referer: 'https://libregrid.dev',
      title: 'LibreGrid conformance',
    }),
    timeoutMs: 60_000,
  });
}

function request(command: string, captured: { currentState: JsonObject; gridSchema: JsonSchema }): GridCommandRequest {
  return {
    protocol: AI_PROTOCOL,
    requestId: `openrouter-${command.slice(0, 12)}`,
    revision: revisionFor({ gridSchema: captured.gridSchema, currentState: captured.currentState }),
    command,
    gridSchema: captured.gridSchema,
    currentState: captured.currentState,
    context: {},
  };
}

for (const command of COMMANDS) {
  live(`holds the schema for: ${command}`, { timeout: 90_000 }, async () => {
    const captured = captureGrid({ advanced: command.includes('closed after') });
    const response = await handler()(new Request('http://localhost/v1/grid-command', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request(command, captured)),
    }));
    const body = (await response.json()) as GridCommandResponse;

    // A refusal for the unsupported intent is a pass. A schema violation is not.
    // `GridCommandResponse` discriminates on `status: 'ok' | 'error'`
    // (`packages/ai-protocol/src/types.ts:81,99`) — not on an `ok` boolean.
    if (command === 'Order me a pizza') {
      expect(
        body.status === 'ok' || body.error.code === 'MODEL_REFUSAL' || body.error.code === 'INVALID_PROVIDER_OUTPUT',
      ).toBe(true);
      return;
    }
    if (body.status === 'error') {
      throw new Error(`${command} -> ${body.error.code}: ${body.error.message}`);
    }
    expect(body.status).toBe('ok');
  });
}
```

- [ ] **Step 2: Run the battery without a key to confirm it skips**

Run: `npx vitest run packages/ai-gateway/src/openrouter.live.spec.ts`

Expected: every test reports as skipped. No network call happens. This protects CI.

- [ ] **Step 3: Run the battery against a free model**

Add `OPENROUTER_API_KEY` to `.secrets`, then run:

```bash
node --env-file=.secrets node_modules/vitest/vitest.mjs run \
  packages/ai-gateway/src/openrouter.live.spec.ts
```

Record the pass count, the model that OpenRouter actually selected, and the total time.

- [ ] **Step 4: Decide the hosted model, and record the decision**

Read the result and choose:

- **9 or more of 11 pass:** the free tier is good enough. Tasks 5 and 6 use `openrouter/free`.
- **Fewer than 9 pass:** the free tier cannot hold this schema. Re-run with `OPENROUTER_MODEL` set to a specific structured-output model to confirm the schema is not itself at fault. Then use a low-cost paid model for the hosted demo, and document free models as suitable for local development only.

Write the outcome into the Verification record at the end of this plan. State the model, the pass count, the elapsed time, and the decision. Do not leave this as a guess — Tasks 5 and 6 read it.

- [ ] **Step 5: Commit**

```bash
git add packages/ai-gateway/src/openrouter.live.spec.ts docs/plans/ai-toolkit-live-backend.md
git commit -m "test(ai-gateway): add env-guarded OpenRouter live contract battery"
```

---

## Task 5: Host the gateway behind Firebase Hosting

**Files:**
- Modify: `firebase.json`
- Create: `docs/ai-gateway-hosting.md`

**Interfaces:**
- Consumes: the container in `packages/ai-gateway/Dockerfile`, and the model decision recorded in Task 4.
- Produces: `POST https://<docs-site>/v1/grid-command` served from Cloud Run on the docs origin.

**Do not start this task until Task 4 records a model decision.**

- [ ] **Step 1: Add the rewrite above the catch-all**

Firebase evaluates rewrites in order and returns the first match. The existing `**` rule matches everything, so a rule placed after it never runs. Put the new rule first.

In `firebase.json`, replace the `rewrites` array with:

```json
"rewrites": [
  {
    "source": "/v1/grid-command",
    "run": {
      "serviceId": "libregrid-ai-gateway",
      "region": "us-central1"
    }
  },
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```

`/health` is deliberately absent. The health endpoint is for operators, who reach it on the Cloud Run URL. Do not publish it on the docs origin.

- [ ] **Step 2: Store the provider key as a secret**

Never place the key in `firebase.json`, in the Dockerfile, or in any committed file.

```bash
gcloud secrets create libregrid-openrouter-key --replication-policy=automatic
printf '%s' 'sk-or-v1-your-key' | gcloud secrets versions add libregrid-openrouter-key --data-file=-
```

The `printf` form avoids a trailing newline in the secret value and keeps the key out of your shell history file when the shell is configured to ignore leading-space commands.

- [ ] **Step 3: Build and deploy the container**

Run from the repository root. Substitute the model that Task 4 selected.

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx build ai-gateway

gcloud run deploy libregrid-ai-gateway \
  --source packages/ai-gateway \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --concurrency 20 \
  --timeout 60s \
  --set-env-vars AI_PROVIDER=openai-chat,OPENAI_BASE_URL=https://openrouter.ai/api/v1,OPENAI_MODEL=openrouter/free,OPENROUTER_REQUIRE_PARAMETERS=true,OPENROUTER_REFERER=https://libregrid.dev,OPENROUTER_TITLE=LibreGrid\ Docs,HOST=0.0.0.0 \
  --set-secrets OPENAI_API_KEY=libregrid-openrouter-key:latest
```

`--allow-unauthenticated` is required because Firebase Hosting calls the service without a Google identity. Task 6 adds the real access control. Until Task 6 lands, treat the deployed URL as open and keep `--max-instances` low.

`--min-instances 0` lets the service scale to zero, so an idle demo costs nothing.

- [ ] **Step 4: Verify the service directly, then through the docs origin**

```bash
gcloud run services describe libregrid-ai-gateway --region us-central1 --format='value(status.url)'
curl -s "$(gcloud run services describe libregrid-ai-gateway --region us-central1 --format='value(status.url)')/health"
```

Expected: `{"status":"ok","protocol":"libregrid.ai/v1"}`.

Deploy hosting and check the joined path:

```bash
npm -w apps/docs run build
firebase hosting:channel:deploy preview
```

Open the preview URL, go to `/ai-toolkit`, select **External HTTP gateway**, keep `/v1/grid-command`, and generate a proposal.

Expected: a proposal appears, and the browser console shows no CORS error, because the request never left the docs origin.

- [ ] **Step 5: Run the conformance CLI against the deployed endpoint**

```bash
npx libregrid-ai-conformance --endpoint https://<preview-url>/v1/grid-command
```

Expected: the conformance report passes, including its failure paths.

- [ ] **Step 6: Write the hosting runbook**

Create `docs/ai-gateway-hosting.md` with these sections. Follow ASD-STE100: short sentences, one instruction per sentence, active voice.

```markdown
# AI gateway hosting

The docs site serves the AI gateway from Cloud Run on its own origin. Firebase
Hosting sends `/v1/grid-command` to the Cloud Run service. The browser sees one
origin, so the gateway needs no CORS header and the demo keeps the same
security model that the published packages describe.

## Rewrite order

Firebase reads the `rewrites` array in order and uses the first match. The
`**` rule matches every path. Put the `/v1/grid-command` rule before it. A rule
placed after `**` never runs.

## Deploy

(Copy the exact `gcloud run deploy` command from Step 3 of this task.)

## Secrets

(Copy the `gcloud secrets` commands from Step 2 of this task.)

Never write a key into `firebase.json`, the Dockerfile, or any committed file.

## Roll back

List the revisions, then send all traffic to the last good one:

```sh
gcloud run revisions list --service libregrid-ai-gateway --region us-central1
gcloud run services update-traffic libregrid-ai-gateway \
  --region us-central1 --to-revisions <revision-name>=100
```

## Cost control

The service holds a real provider key, so cap the blast radius:

- `--min-instances 0` lets the service scale to zero. An idle demo costs
  nothing.
- `--max-instances 3` and `--concurrency 20` cap the burst.
- Set a Google Cloud billing budget alert on the project.
- Review OpenRouter usage weekly for the first month after launch.

Open action B5 tracks this.

## Health

The health endpoint is for operators. It is not published on the docs origin.
Reach it on the Cloud Run service URL:

```sh
curl -s "$(gcloud run services describe libregrid-ai-gateway \
  --region us-central1 --format='value(status.url)')/health"
```
```

Add a pointer to the new file from `docs/firebase-hosting.md`, in the "Local AI gateway for the docs demo" section added in Task 3:

```markdown
To deploy this gateway for the live site, read
[AI gateway hosting](ai-gateway-hosting.md).
```

- [ ] **Step 7: Commit**

```bash
git add firebase.json docs/ai-gateway-hosting.md docs/firebase-hosting.md
git commit -m "feat(hosting): serve the AI gateway from Cloud Run on the docs origin"
```

---

## Task 6: Protect the public endpoint with Turnstile

**Files:**
- Create: `packages/ai-gateway/src/turnstile.ts`
- Create: `packages/ai-gateway/src/turnstile.unit.spec.ts`
- Modify: `packages/ai-gateway/src/index.ts`
- Modify: `packages/ai-gateway/src/server.ts`
- Modify: `apps/docs/src/app/routes/ai-toolkit.ts`

**Interfaces:**
- Consumes: the `authorize` hook on `GridCommandGatewayOptions`, which is `(request: Request) => boolean | Promise<boolean>`.
- Produces: `createTurnstileAuthorizer(options: TurnstileAuthorizerOptions): (request: Request) => Promise<boolean>`, where `TurnstileAuthorizerOptions` is `{ secretKey: string; fetch?: typeof globalThis.fetch; header?: string }`. The default header is `x-turnstile-token`.

A skill named `turnstile-spin` is available and automates much of the widget and siteverify wiring. Consider invoking it before writing this task by hand.

- [ ] **Step 1: Write the failing tests**

Create `packages/ai-gateway/src/turnstile.unit.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTurnstileAuthorizer } from './turnstile';

function post(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/v1/grid-command', { method: 'POST', headers });
}

describe('Turnstile authorizer', () => {
  it('accepts a token that siteverify approves', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    const authorize = createTurnstileAuthorizer({ secretKey: 'secret', fetch });

    await expect(authorize(post({ 'x-turnstile-token': 'good-token' }))).resolves.toBe(true);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = new URLSearchParams(String(init.body));
    expect(body.get('secret')).toBe('secret');
    expect(body.get('response')).toBe('good-token');
  });

  it('rejects a token that siteverify declines', async () => {
    const authorize = createTurnstileAuthorizer({
      secretKey: 'secret',
      fetch: async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 }),
    });
    await expect(authorize(post({ 'x-turnstile-token': 'bad-token' }))).resolves.toBe(false);
  });

  it('rejects a request with no token and never calls siteverify', async () => {
    const fetch = vi.fn(async () => new Response('{}'));
    const authorize = createTurnstileAuthorizer({ secretKey: 'secret', fetch });
    await expect(authorize(post())).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails closed when siteverify errors or returns a non-200', async () => {
    const network = createTurnstileAuthorizer({
      secretKey: 'secret',
      fetch: async () => { throw new Error('network down'); },
    });
    await expect(network(post({ 'x-turnstile-token': 't' }))).resolves.toBe(false);

    const server = createTurnstileAuthorizer({
      secretKey: 'secret',
      fetch: async () => new Response('gateway timeout', { status: 504 }),
    });
    await expect(server(post({ 'x-turnstile-token': 't' }))).resolves.toBe(false);
  });

  it('reads a custom header name', async () => {
    const authorize = createTurnstileAuthorizer({
      secretKey: 'secret',
      header: 'cf-token',
      fetch: async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
    });
    await expect(authorize(post({ 'cf-token': 'good' }))).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run packages/ai-gateway/src/turnstile.unit.spec.ts`

Expected: FAIL. The error names the missing module `./turnstile`.

- [ ] **Step 3: Write the implementation**

Create `packages/ai-gateway/src/turnstile.ts`:

```ts
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileAuthorizerOptions {
  secretKey: string;
  fetch?: typeof globalThis.fetch;
  /** Request header that carries the widget token. Defaults to `x-turnstile-token`. */
  header?: string;
}

/**
 * Build an `authorize` hook that checks a Cloudflare Turnstile token.
 *
 * The gateway reads `authorize` before it reads the request body, so the token
 * must travel in a header. The hook fails closed: any missing token, declined
 * verdict, transport error, or non-200 answer returns `false`.
 */
export function createTurnstileAuthorizer(
  options: TurnstileAuthorizerOptions,
): (request: Request) => Promise<boolean> {
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  if (!fetchImplementation) throw new Error('ai-gateway: fetch is unavailable');
  if (!options.secretKey) throw new Error('ai-gateway: Turnstile secret key is required');
  const header = options.header ?? 'x-turnstile-token';

  return async (request: Request): Promise<boolean> => {
    const token = request.headers.get(header);
    if (!token) return false;

    const body = new URLSearchParams({ secret: options.secretKey, response: token });
    const remoteIp = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for');
    if (remoteIp) body.set('remoteip', remoteIp.split(',')[0]!.trim());

    let response: Response;
    try {
      response = await fetchImplementation(SITEVERIFY, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    } catch {
      return false;
    }
    if (!response.ok) return false;

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return false;
    }
    return Boolean(payload && typeof payload === 'object' && (payload as { success?: unknown }).success === true);
  };
}
```

The hook returns a boolean and never throws a message outward. The gateway turns `false` into a generic 401 at `gateway.ts:139-142`, so a caller learns nothing about why the check failed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run packages/ai-gateway/src/turnstile.unit.spec.ts`

Expected: PASS, all five cases.

- [ ] **Step 5: Export and wire the hook**

In `packages/ai-gateway/src/index.ts`, add:

```ts
export { createTurnstileAuthorizer, type TurnstileAuthorizerOptions } from './turnstile';
```

In `packages/ai-gateway/src/server.ts`, add the import:

```ts
import { createTurnstileAuthorizer } from './turnstile';
```

Then replace the `createGridCommandHandler` call with:

```ts
const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
const handler = createGridCommandHandler({
  provider,
  ...(turnstileSecret ? { authorize: createTurnstileAuthorizer({ secretKey: turnstileSecret }) } : {}),
  log: (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
});
```

Then extend the startup line so an operator can see the protection state:

```ts
process.stdout.write(
  `LibreGrid AI gateway listening on ${host}:${port} using ${provider.service} (${provider.model});`
  + ` turnstile ${turnstileSecret ? 'enabled' : 'disabled'}\n`,
);
```

Leaving `TURNSTILE_SECRET_KEY` unset keeps local development frictionless. The Cloud Run service must always set it.

- [ ] **Step 6: Add the widget to the docs demo**

Turnstile tokens are single-use. Request a fresh one for every command, and never cache one across requests.

In `apps/docs/src/app/routes/ai-toolkit.ts`, add this module-level helper above the component class:

```ts
declare global {
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: Record<string, unknown>): string;
      execute(widgetId: string): void;
      reset(widgetId: string): void;
    };
  }
}

const TURNSTILE_SITE_KEY = '0x0000000000000000000000';
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let turnstileScript: Promise<void> | undefined;

function loadTurnstile(): Promise<void> {
  turnstileScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile did not load'));
    document.head.append(script);
  });
  return turnstileScript;
}
```

Replace `TURNSTILE_SITE_KEY` with the real site key from the Cloudflare dashboard. The site key is public and safe to commit; the **secret** key is not, and belongs only in Secret Manager.

Add a host element to the component template, next to the endpoint field:

```html
<div #turnstileHost data-testid="ai-turnstile"></div>
```

Add these members to the `AiToolkitDemo` class:

```ts
private readonly turnstileHost = viewChild<ElementRef<HTMLElement>>('turnstileHost');
private turnstileWidget: string | undefined;

private async turnstileToken(): Promise<string> {
  await loadTurnstile();
  const api = window.turnstile;
  const host = this.turnstileHost()?.nativeElement;
  if (!api || !host) throw new Error('Turnstile is not available');

  this.turnstileWidget ??= api.render(host, {
    sitekey: TURNSTILE_SITE_KEY,
    execution: 'execute',
    appearance: 'interaction-only',
  });
  const widget = this.turnstileWidget;

  return new Promise<string>((resolve, reject) => {
    api.render(host, {
      sitekey: TURNSTILE_SITE_KEY,
      execution: 'execute',
      appearance: 'interaction-only',
      callback: (token: string) => resolve(token),
      'error-callback': () => reject(new Error('Turnstile verification failed')),
    });
    api.reset(widget);
    api.execute(widget);
  });
}
```

Import `ElementRef` and `viewChild` from `@angular/core` in the existing import statement.

Then, in the `assistant()` method at line 546, pass the header alongside `endpoint`. `GridAssistantOptions` extends `HttpGridCommandTransportOptions`, so `headers` is already accepted and may be an async function — no client change is needed:

```ts
...(this.mode() === 'mock'
  ? { transport: DEMO_TRANSPORT }
  : {
      endpoint: this.endpoint().trim() || '/v1/grid-command',
      headers: async () => ({ 'x-turnstile-token': await this.turnstileToken() }),
    }),
```

Do not send the header in mock mode. The mock transport never reaches a server.

- [ ] **Step 6a: Keep the existing E2E suite green**

The seven Chromium behaviour and accessibility checks in `apps/docs/e2e/ai-toolkit.spec.ts` run in mock mode, so they must not call Turnstile at all.

Run: `npx nx e2e docs --grep "ai-toolkit"`

Expected: 7/7 pass. If a test now fails on a network call, the header is leaking into mock mode. Fix the condition rather than the test.

Add one axe check covering the widget host, because the container is new page furniture:

```ts
test('turnstile host does not break the accessibility tree', async ({ page }) => {
  await page.goto('/ai-toolkit');
  await expect(page.getByTestId('ai-turnstile')).toBeAttached();
  const results = await new AxeBuilder({ page }).include('[data-testid="ai-turnstile"]').analyze();
  expect(results.violations).toEqual([]);
});
```

- [ ] **Step 7: Deploy the secret and redeploy the service**

```bash
gcloud secrets create libregrid-turnstile-secret --replication-policy=automatic
printf '%s' 'your-turnstile-secret' | gcloud secrets versions add libregrid-turnstile-secret --data-file=-

gcloud run services update libregrid-ai-gateway \
  --region us-central1 \
  --update-secrets TURNSTILE_SECRET_KEY=libregrid-turnstile-secret:latest
```

- [ ] **Step 8: Verify that the guard holds**

Confirm the browser path still works on the preview channel, then confirm a direct call is refused:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  -H 'content-type: application/json' \
  -d '{}' \
  "$(gcloud run services describe libregrid-ai-gateway --region us-central1 --format='value(status.url)')/v1/grid-command"
```

Expected: `401`. A request with no Turnstile token must never reach the provider.

- [ ] **Step 9: Run the full gate**

```bash
npm run lint
npm run test:all
npm run check:contamination
npm run check:versions
npm run check:budgets
```

Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add packages/ai-gateway/src/turnstile.ts \
        packages/ai-gateway/src/turnstile.unit.spec.ts \
        packages/ai-gateway/src/index.ts \
        packages/ai-gateway/src/server.ts \
        apps/docs/src/app/routes/ai-toolkit.ts
git commit -m "feat(ai-gateway): verify Turnstile tokens on the public demo endpoint"
```

---

## Task 7: Record the release

**Files:**
- Create: `.changeset/ai-gateway-chat-completions.md`
- Modify: `docs/parity/ai-toolkit.md`
- Modify: `docs/OPEN-ACTIONS.md`

- [ ] **Step 1: Write the changeset**

`@libregrid/ai-gateway` gains a feature and no breaking change, so the bump is minor. No other package changes its public surface.

Create `.changeset/ai-gateway-chat-completions.md`:

```markdown
---
'@libregrid/ai-gateway': minor
'@libregrid/all': minor
---

Add an OpenAI-compatible Chat Completions provider adapter and a Cloudflare
Turnstile authorizer.

- `createOpenAiChatCompletionsProvider` speaks the `/chat/completions` API with
  strict `response_format.json_schema`, so OpenRouter and similar services work
  behind the existing provider port.
- The adapter sends `provider.require_parameters` so OpenRouter routes only to
  endpoints that apply the schema as a constraint.
- `AI_PROVIDER` selects the adapter in the bundled server. The default stays
  `openai-responses`.
- `createTurnstileAuthorizer` builds a fail-closed `authorize` hook that reads a
  header token and checks it with Cloudflare siteverify.
```

- [ ] **Step 2: Update the parity checklist**

In `docs/parity/ai-toolkit.md`, add a row to the capability table:

```markdown
| OpenAI-compatible chat completions adapter | ✅ | Strict `response_format.json_schema`, OpenRouter provider routing, refusal/rate-limit/truncation mapping; unit tested and covered by an env-guarded live battery |
```

Update the "OpenAI Responses structured-output adapter" row so it does not read as the only supported provider.

- [ ] **Step 3: Record the open action**

In `docs/OPEN-ACTIONS.md`, add a row to the "Time-sensitive" table:

```markdown
| B5  | Public AI demo cost and abuse control | ⬜ open | The Cloud Run demo gateway holds a real provider key. Turnstile guards it and `--max-instances 3` caps burst. Set a Google Cloud billing budget alert, and review OpenRouter usage weekly for the first month. |
```

- [ ] **Step 4: Commit**

```bash
git add .changeset/ai-gateway-chat-completions.md docs/parity/ai-toolkit.md docs/OPEN-ACTIONS.md
git commit -m "docs(ai-gateway): record the chat completions and Turnstile release"
```

---

## Acceptance Gates

- A developer can run one gateway command and one serve command, then drive the docs demo from a real model with no CORS error.
- The gateway ships no CORS header and no provider SDK.
- `@libregrid/ai-protocol` is unchanged.
- `AI_PROVIDER` unset reproduces the current OpenAI Responses behavior exactly.
- A request without a valid Turnstile token receives HTTP 401 and never reaches the provider.
- No key or secret appears in any committed file, log line, or error message.
- `npm run lint`, `npm run test:all`, `check:contamination`, `check:versions`, and `check:budgets` all pass.

## Verification record

Fill this in as the tasks complete. Task 4 Step 4 writes the model decision here, and Tasks 5 and 6 read it.

- Task 4 live battery: _model, pass count, elapsed time, and decision to record._
