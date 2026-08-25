# ADR 0007 — Pure AI schema module and language-neutral BYOM gateway

**Status:** accepted

**Date:** 2026-08-25

## Context

ADR 0006 coupled grid schema generation, prompt construction, local inference,
remote provider adapters, plan compilation, and State API application in one
package. Needle and SmolLM experiments demonstrated that syntax could be made
reliable but semantic grounding remained far below the release gate. A new
clean-room engineering specification also establishes a smaller product seam:
the grid module generates the exact structured-output schema and the host owns
model execution.

Following the specification literally would make every consumer recreate the
same envelope, validation, state-preservation, and provider plumbing. Framework-
specific server SDKs would then multiply that logic across languages without
improving the grid module.

## Decision

Split the system into four deep modules:

1. `@libregrid/ai-toolkit` owns only live-grid schema generation through
   `GridApi.getStructuredSchema(params)`.
2. `@libregrid/ai-protocol` owns the versioned HTTP and structured-output
   contract, envelope construction, and portable validation.
3. `@libregrid/ai-client` owns browser request orchestration, stale-response
   protection, dry-run/diff, and safe State API application.
4. `@libregrid/ai-gateway` owns the provider port and a language-neutral HTTP
   implementation. It ships a runnable Node server and container, plus OpenAI
   Responses and deterministic mock adapters.

The HTTP seam is one versioned operation, `POST /v1/grid-command`. Consumers
may deploy the supplied gateway, proxy to it through their existing
authenticated server, or implement the published OpenAPI contract in any
language.

Provider credentials are server-only. Provider name, endpoint, model, output
budget, and authorization policy are server configuration and cannot be
overridden by a browser request.

The core request is stateless and contains the command, live grid schema,
complete current state, and a client-generated revision. The response echoes the
revision. Both gateway and browser validate the structured response; the
browser rechecks the live schema/state revision immediately before apply.

The client, not the model, computes the baseline State API ignore list. It
always protects every state key outside the generated feature set. The model
can only mark generated features as untouched.

## Provider implementation

The OpenAI adapter uses the Responses API with strict structured output via
`text.format = { type: 'json_schema', name, strict: true, schema }`. This is
the non-tool form intended for schema-constrained responses. The protocol does
not expose OpenAI-specific fields.

## Authentication

LibreGrid cannot determine whether an application user is authorized to send
grid metadata to a model. The supplied gateway therefore supports deployment
behind an authenticated reverse proxy and exposes an authorization hook. A
deployment that is reachable from a browser must configure authentication,
allowed origins, request limits, and provider cost controls.

## Consequences

- Any server language can use the same HTTP contract.
- Most consumers deploy or proxy one endpoint instead of writing model code.
- The browser bundle contains no model runtime and no provider credential.
- Provider adapters and grid internals change independently across explicit
  seams.
- Four packages add release and compatibility work, but each has a small
  interface and a distinct dependency direction.
- Local inference is no longer the default and is not part of this decision.
  A future browser-local assistant would require a separate ADR and package.

## Superseded decision

This ADR supersedes ADR 0006 as the active architecture for the AI Toolkit.
ADR 0006 remains as the historical record of the rejected local-first
experiment.

