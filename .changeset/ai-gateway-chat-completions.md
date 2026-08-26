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
- The release also adds a Cloud Run / Firebase Hosting deployment path:
  `cloudbuild.yaml`, `.gcloudignore`, a `firebase.json` rewrite, and
  [`docs/ai-gateway-hosting.md`](../docs/ai-gateway-hosting.md) document it.
