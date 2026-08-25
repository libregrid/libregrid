# Design — AI Toolkit and BYOM gateway

**Status:** implemented and validated locally; the live OpenAI contract battery
passed on 2026-08-25 after approved egress

**Decision:** [ADR 0007](../adr/0007-pure-ai-schema-and-byom-gateway.md)
supersedes the runtime architecture in ADR 0006

**Plan:** [AI Toolkit BYOM delivery](../plans/ai-toolkit-byom.md)

## Product boundary

LibreGrid owns the grid-specific schema, transport contract, validation,
stale-state protection, diff, and safe state application. The deploying
application owns user authentication, provider/model choice, data-residency
policy, and server-side credentials.

The browser never receives a provider key or selects a model.

```text
AG Grid
  │ getStructuredSchema() + getState()
  ▼
@libregrid/ai-client
  │ POST /v1/grid-command (libregrid.ai/v1)
  ▼
the application's authenticated API boundary
  │
  ├─ @libregrid/ai-gateway + OpenAI Responses adapter
  ├─ @libregrid/ai-gateway + another GridModelProvider
  └─ any-language implementation generated from OpenAPI
  │
  ▼
provider structured output
  │ server validation → browser validation → revision check → review diff
  ▼
proposal.apply() → GridApi.setState(state, protectedIgnoreList)
```

## Deep modules

### `@libregrid/ai-toolkit`

One public capability: register `AiToolkitModule`, then call the
Community-reserved `GridApi.getStructuredSchema(params?)` function. Internally
the module snapshots live column capabilities and emits a strict schema for the
applicable portions of `GridState`:

1. aggregation;
2. filter (simple, set, or recursive advanced filter);
3. sort;
4. pivot;
5. column visibility;
6. column sizing;
7. row grouping.

Every included object is closed and requires all of its properties. Feature
sections are nullable for “preserve this feature.” Column IDs, aggregation
functions, filter operators, operand arity, and optional set values are scoped
to the live column. Unsupported custom filter components and positional multi
filters are omitted rather than approximated. Shared/recursive definitions are
hoisted to the root.

The package contains no prompt, provider, network, model, credential, response
validator, or state-application implementation.

### `@libregrid/ai-protocol`

The dependency-free `libregrid.ai/v1` contract contains request, success,
failure, provider metadata, and state-ignore types; a restricted JSON Schema
validator; strict provider-envelope composition; deterministic revisions;
JSON conformance fixtures; JSON Schemas; and OpenAPI 3.1.

The provider envelope hoists the dynamic grid schema's `$defs` to its own root
so local references remain valid. Provider output is always validated locally,
even when constrained decoding was used.

### `@libregrid/ai-client`

`createGridAssistant({ api, endpoint | transport })` owns the browser workflow:

1. capture the live schema, complete current `GridState`, and view context;
2. calculate a deterministic revision and send a versioned request;
3. verify protocol version, request ID, revision, dynamic output, provider
   metadata, and ignore-list invariants;
4. expose a dry-run proposal and before/after feature diff;
5. regenerate the schema/state revision immediately before apply;
6. add every unsupported or omitted AG Grid state key to a protected baseline;
7. call `setState` once only after `proposal.apply()`.

Any state/schema change while the model is running makes the proposal stale.
Ignored included features must be null; non-null ignored state is rejected.

### `@libregrid/ai-gateway`

The gateway's deep interface is the `GridModelProvider.complete()` port. The
package owns portable `Request → Response` handling, body and command limits,
timeouts that work even when an adapter ignores abort, optional authorization,
normalized errors, metadata-only logging, output revalidation, health, Node
server/CLI, Docker deployment, deterministic mock, and conformance CLI.

The OpenAI adapter uses the Responses API strict JSON Schema field
`text.format`. The configured model is server-only, making provider
configuration the model allowlist. Other provider adapters do not alter the
browser or HTTP contract.

## Data and security contract

Each request may disclose the user's command, live column identifiers and
descriptions, supported values explicitly included by the developer, complete
current grid state, record/page counts, density, and developer-provided facts.
Row records are not sent. Deployers must treat the remaining metadata as
potentially sensitive and apply their normal authentication, authorization,
TLS, retention, residency, audit, and provider policies.

LibreGrid deliberately does not define application identity. The bundled
server can be placed behind an existing reverse proxy/session boundary, or its
authorization hook can call application policy. Logs never need raw commands,
schemas, state, authorization values, or provider keys.

## Compatibility and omissions

- The active contract targets `ag-grid-community >=36.1.0 <37`.
- Multi-filter output is omitted because positional child models cannot be
  represented in the approved portable dialect.
- Custom filter components are omitted; custom simple-filter options are only
  safe if a future contract can communicate their semantics, not merely names.
- The protocol is stateless. A host may retain conversation UI state, but each
  request carries a fresh authoritative grid snapshot.
- Local-model training and browser model execution remain paused historical
  experiments, not dependencies or fallbacks in this architecture.
