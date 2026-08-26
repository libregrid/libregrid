# @libregrid/ai-gateway

A small provider-neutral HTTP gateway for LibreGrid grid commands. It validates
the browser request, calls an injected provider through one tiny port, validates
the provider output against the live grid schema, and returns the versioned
protocol envelope. No provider credential is accepted from the browser.

## Choose the lowest-burden integration

| Your server environment | Integration work |
| --- | --- |
| Any language, no AI route desired | Run the included container as a private sidecar/service and reverse-proxy `/v1/grid-command` through your existing authenticated API boundary. |
| Node or a Node framework with Web `Request`/`Response` support | Mount `createGridCommandHandler()` in one route; provider and validation behavior remain inside this package. |
| Java, C#, Go, Python, Rust, PHP, Ruby, or another stack | Generate a route stub from the shipped OpenAPI document, or call the sidecar. Run the conformance executable against the result. |
| Custom model/provider protocol | Implement only the small `GridModelProvider.complete()` port; the browser protocol, limits, validation, errors, and state safety remain unchanged. |

This keeps framework and identity policy outside LibreGrid without making each
consumer rebuild the provider plumbing.

## Run the included OpenAI gateway

```bash
OPENAI_API_KEY=... OPENAI_MODEL=gpt-5.6 npx libregrid-ai-gateway
```

It exposes `POST /v1/grid-command` and `GET /health` on `127.0.0.1:8787` by
default. Set `HOST` and `PORT` as needed. Put the process behind your normal API
authentication, rate limiting, and TLS, or use the `authorize` hook when
embedding the handler.

Set `OPENAI_BASE_URL` to use a private or proxied endpoint that implements the
same Responses API contract. `OPENAI_ORGANIZATION` and `OPENAI_PROJECT` add the
corresponding optional routing headers. These values and `OPENAI_MODEL` are
server configuration; none are accepted from browser requests.

The included Dockerfile and `docker-compose.example.yml` provide the same
zero-code deployment. Copy `.env.example`, set the provider key in your secret
manager or local environment (never in source control), then build from the
repository root.

```ts
import {
  createGridCommandHandler,
  createOpenAiResponsesProvider,
} from '@libregrid/ai-gateway';

const handler = createGridCommandHandler({
  provider: createOpenAiResponsesProvider({
    apiKey: () => secrets.OPENAI_API_KEY,
    model: 'gpt-5.6',
  }),
  authorize: (request) => verifyYourSession(request),
});
```

The OpenAI adapter uses the Responses API strict `text.format` JSON Schema
contract. There is no OpenAI SDK dependency. Inject another `GridModelProvider`
for Azure OpenAI, Anthropic, Gemini, Ollama, vLLM, LocalAI, or an internal model
gateway; the HTTP contract and browser package do not change.

`createMockProvider()` provides a deterministic, network-free adapter for CI,
local development, and contract tests. A production-oriented Dockerfile is
included. Teams implementing the endpoint in another language can generate
server stubs from `@libregrid/ai-protocol/openapi.json`.

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

Verify any implementation—Node or otherwise—with the shipped executable:

```bash
libregrid-ai-conformance https://your-api.example/v1/grid-command
```

If the endpoint needs a bearer or application token, put the complete value in
`LIBREGRID_AI_AUTHORIZATION`; the tool sends it without printing it.

## Guard the public endpoint with Turnstile

Set `TURNSTILE_SECRET_KEY` to require a valid Cloudflare Turnstile token on
every request. Without this variable, the gateway accepts every request with
no check.

Get the secret key from the Turnstile widget settings in the Cloudflare
dashboard. Keep the secret key private. Never put it in browser code or in
source control.

The Turnstile site key is a different value. The site key is public. You may
put it in browser code and commit it to source control.

```bash
TURNSTILE_SECRET_KEY=0x0000000000000000000000000000000AA npx libregrid-ai-gateway
```

The browser client sends the token in the `x-turnstile-token` header. Mint a
fresh token for every request; each Turnstile token works only once.

The startup log line reports `turnstile enabled` or `turnstile disabled`.
Check this line before you expose the endpoint publicly.

## Production checklist

- Authenticate the caller before invoking the handler. The gateway deliberately
  does not invent an identity system for your application.
- Set `TURNSTILE_SECRET_KEY` before you expose the endpoint publicly. An unset
  value means the endpoint accepts every request with no bot check.
- Store `OPENAI_API_KEY` (or another provider credential) only in server-side
  secret storage. The protocol has no credential or model-name request field.
- Treat the live grid schema, current GridState, command, and context metadata
  as potentially sensitive outbound data. Apply your provider/data-residency
  policy and disclose it to users.
- Keep the configured model server-side. Because requests cannot select a
  model, the configured provider is also the effective model allowlist.
- Retain the default 512 KiB request limit and 30-second timeout unless a
  measured workload requires a deliberate change. Apply rate limits at the
  reverse proxy or application boundary.
- Log request IDs, status, latency, and normalized error codes—not commands,
  schemas, state payloads, authorization headers, or provider keys. The built-in
  log callback follows that metadata-only shape.
- Keep TLS termination, CORS, CSRF protection, and session-cookie policy in the
  same trusted edge that protects the rest of your API.

## License

MIT — see [LICENSE](./LICENSE). LibreGrid is an independent open-source
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
See [NOTICE](./NOTICE) for third-party attribution.
