# @libregrid/ai-gateway

## 1.3.0

### Minor Changes

- 4438d5c: Add an OpenAI-compatible Chat Completions provider adapter and a Cloudflare
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
  - The release also adds a Cloud Run / Firebase Hosting deployment path:
    `cloudbuild.yaml`, `.gcloudignore`, a `firebase.json` rewrite, and
    [`docs/ai-gateway-hosting.md`](../docs/ai-gateway-hosting.md) document it.

- 4839d34: Rebuild the AI Toolkit around a pure live-grid schema and a provider-neutral
  BYOM boundary.

  - `@libregrid/ai-toolkit` now exposes only `AiToolkitModule` and the registered
    `GridApi.getStructuredSchema()` capability. The experimental command,
    provider, model, prompt, action-plan, and `advanced` APIs are removed.
  - `@libregrid/all` no longer re-exports those removed AI Toolkit values and
    types. Consumers of that convenience barrel must migrate to the new
    `@libregrid/ai-client` and `@libregrid/ai-protocol` boundaries.
  - Generate strict schemas for aggregation, simple/set/advanced filtering,
    sorting, pivoting, column visibility, exclusive width/flex sizing, and row
    grouping from the current grid's real capabilities.
  - Add `@libregrid/ai-protocol` with versioned envelopes, runtime validation,
    conformance fixtures, JSON Schemas, and OpenAPI 3.1.
  - Add `@libregrid/ai-client` with same-origin HTTP transport, browser-side
    revalidation, stale-state rejection, dry-run diffs, protected ignore lists,
    and explicit application.
  - Add `@libregrid/ai-gateway` with a provider port, OpenAI Responses strict
    output adapter, deterministic mock, portable HTTP handler, Node CLI/server,
    conformance CLI, and container deployment files.

### Patch Changes

- Updated dependencies [4839d34]
  - @libregrid/ai-protocol@1.3.0

## Unreleased

- Initial provider-neutral gateway, OpenAI Responses and mock adapters,
  portable handler, Node server/CLI, conformance CLI, and container assets.
- Expose Responses-compatible base URL and OpenAI organization/project routing
  through server-only environment configuration.
