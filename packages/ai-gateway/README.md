# @libregrid/ai-gateway

A server-side HTTP handler and command-line service for LibreGrid AI commands.
It validates requests and provider output against the live grid schema.
Provider credentials and model selection stay on the server.

[Documentation and examples](https://libregrid.dev/ai-toolkit)

## Install

For the CLI or a Node application (Node.js `>=20.19.0`):

```bash
npm install @libregrid/ai-gateway
```

The gateway belongs on the server; do not bundle it in a TypeScript browser or
Angular application. Use [`@libregrid/ai-client`](../ai-client/README.md) there.

## Integration options

| Your server environment                                        | Integration work                                                                                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Any language, no AI route desired                              | Run the included container as a private sidecar/service and reverse-proxy `/v1/grid-command` through your existing authenticated API boundary. |
| Node or a Node framework with Web `Request`/`Response` support | Mount `createGridCommandHandler()` in one route; provider and validation behavior remain inside this package.                                  |
| Java, C#, Go, Python, Rust, PHP, Ruby, or another stack        | Generate a route stub from the shipped OpenAPI document, or call the sidecar. Run the conformance executable against the result.               |
| Custom model/provider protocol                                 | Implement the `GridModelProvider.complete()` interface; the browser protocol, limits, validation, errors, and state safety remain unchanged.   |

Choose the handler for an existing Node application, the CLI or container for
a separate service, or the OpenAPI contract when implementing your own server.

## Run the included OpenAI gateway

```bash
# Set OPENAI_API_KEY and OPENAI_MODEL in your server environment first.
npx --package=@libregrid/ai-gateway libregrid-ai-gateway
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
standalone deployment. Copy `.env.example`, set the provider key in your secret
manager or local environment (never in source control), then build from the
repository root.

```ts
import { createGridCommandHandler, createOpenAiResponsesProvider } from '@libregrid/ai-gateway';

export function createApplicationGateway(
  apiKey: () => string,
  model: string,
  authorize: (request: Request) => boolean | Promise<boolean>,
) {
  return createGridCommandHandler({
    provider: createOpenAiResponsesProvider({ apiKey, model }),
    authorize,
  });
}
```

Pass your secret reader, configured model, and session authorization function
to `createApplicationGateway`; mount the returned handler at
`POST /v1/grid-command` using your server framework’s route adapter.

The OpenAI adapter uses the Responses API strict `text.format` JSON Schema
contract. There is no OpenAI SDK dependency. For other provider protocols, implement `GridModelProvider`. The grid-command
HTTP contract and browser client can stay the same.

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

The OpenRouter-specific `OPENROUTER_REQUIRE_PARAMETERS` setting requests
providers that support the supplied parameters. Check that your chosen model
and endpoint support structured output; provider validation still runs on
every response.

The gateway validates provider responses, and the browser validates them again.
Output that fails schema validation produces `INVALID_PROVIDER_OUTPUT`. A
schema-valid response can still misunderstand user intent; use proposal review
in the browser when your workflow calls for it.

Verify any implementation—Node or otherwise—with the shipped executable:

```bash
npx --package=@libregrid/ai-gateway libregrid-ai-conformance https://your-api.example/v1/grid-command
```

If the endpoint needs a bearer or application token, put the complete value in
`LIBREGRID_AI_AUTHORIZATION`; the tool sends it without printing it.

## Guard the public endpoint with Turnstile

Set `TURNSTILE_SECRET_KEY` and `TURNSTILE_HOSTNAMES` to require a valid
Cloudflare Turnstile token on every request. Without that variable, the CLI does not perform a bot check. If the secret is set without an
approved hostname, the process refuses to start.

Get the secret key from the Turnstile widget settings in the Cloudflare
dashboard. Keep the secret key private. Never put it in browser code or in
source control.

The Turnstile site key is a different value. The site key is public. You may
put it in browser code. You may commit it to source control.

```bash
TURNSTILE_SECRET_KEY=0x0000000000000000000000000000000AA \
TURNSTILE_HOSTNAMES=localhost,127.0.0.1 \
npx --package=@libregrid/ai-gateway libregrid-ai-gateway
```

The browser client sends the token in the `x-turnstile-token` header. The
gateway requires Siteverify to return the exact action `grid_command` and a
hostname in `TURNSTILE_HOSTNAMES`. Mint a fresh token for every request. Each
Turnstile token works only once.

Set `GATEWAY_TIMEOUT_MS` to change the provider response deadline from its
30-second default. Keep it below your hosting platform's request timeout so the
gateway can still return a conformant `TIMEOUT` response. The startup log line
reports both the provider timeout and whether Turnstile is enabled. Check this
line before you expose the endpoint publicly.

## Production checklist

- Authenticate the caller before invoking the handler. The gateway deliberately
  does not invent an identity system for your application.
- If using Turnstile, configure its secret and allowed hostnames. Bot checks
  supplement application authentication; they do not identify an authorized user.
- Store `OPENAI_API_KEY` (or another provider credential) only in server-side
  secret storage. The protocol has no credential or model-name request field.
- Treat the live grid schema, current GridState, command, and context metadata
  as potentially sensitive outbound data. Apply your provider/data-residency
  policy and disclose it to users.
- Keep the configured model server-side. Because requests cannot select a
  model, the configured provider is also the effective model allowlist.
- Retain the default 512 KiB request limit. Change the 30-second provider
  timeout only from measured workload data, and keep it below the platform
  request timeout. Apply rate limits at the reverse proxy or application
  boundary.
- Log request IDs, status, latency, and normalized error codes—not commands,
  schemas, state payloads, authorization headers, or provider keys. The built-in
  log callback follows that metadata-only shape.
- Keep TLS termination, CORS, CSRF protection, and session-cookie policy in the
  same trusted edge that protects the rest of your API.

## License

MIT — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE). LibreGrid is an independent
project and is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
