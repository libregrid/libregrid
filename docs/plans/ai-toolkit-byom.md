# AI Toolkit BYOM Delivery Plan

**Status:** implementation, local verification, and live OpenAI validation complete

**Decision date:** 2026-08-25

**Architecture:** pure grid-schema module + portable protocol + browser client + deployable gateway

## Outcome

Give a LibreGrid consumer a BYOM integration without requiring provider-specific
application code. The irreducible consumer responsibilities are to authenticate
their own users, choose a provider/model, store its credential on a trusted
server, and expose or deploy one endpoint. LibreGrid owns the rest.

The browser-facing experience is one call:

```ts
const assistant = createGridAssistant({ api, endpoint: '/api/libregrid-ai' });
const result = await assistant.run('Show hardware sales over $5,000');
```

The server-facing experience is either a configuration-only gateway deployment
or one framework adapter around the same versioned HTTP protocol.

## Deliverables

- `@libregrid/ai-toolkit`: pure live-grid JSON Schema generation.
- `@libregrid/ai-protocol`: provider-neutral request, response, envelope, and
  validation contract plus OpenAPI 3.1 artifact.
- `@libregrid/ai-client`: browser orchestration, revision checks, dry-run,
  state diff, and safe application.
- `@libregrid/ai-gateway`: provider port, OpenAI Responses adapter,
  deterministic mock adapter, portable HTTP handler, runnable server, health
  endpoint, and container definition.
- Docs application route demonstrating schema inspection, mock execution,
  response validation, dry-run, and apply.
- Conformance and live OpenAI validation scripts.

## Phased Todo

### Phase 0 — Architecture and administrative records

- [x] Preserve the clean-room engineering specification under ignored
      `specs/`.
- [x] Record normative errata for State API preservation, filter unions,
      discriminator compatibility, operator arity, multi filters, enums, and
      stale responses.
- [x] Pause and supersede all local-model training plans.
- [x] Record the pure structured-schema implementation plan.
- [x] Record this BYOM delivery plan.
- [x] Add ADR 0007 for the pure module and language-neutral gateway decision.
- [x] Update Phase 19, design, parity, open actions, package inventory, and
      changeset records after implementation evidence exists.

### Phase 1 — Pure structured-schema module

- [x] Replace the flat v1 schema with the restricted JSON Schema dialect.
- [x] Implement root-only `$defs`, strict objects, non-empty typed enums,
      nullability, and `anyOf` unions.
- [x] Implement aggregation, simple/set/advanced filter, sort, pivot,
      visibility, sizing, and row-group schema builders.
- [x] Gate every feature and column on live capabilities; omit custom and
      positional multi filters that cannot be represented safely.
- [x] Add live-grid behavior, golden snapshot, empty-grid, and dialect tests.
- [x] Remove providers, prompts, model runtimes, action compilers, and the
      `advanced` public subpath from the published package.

### Phase 2 — Portable protocol

- [x] Define `libregrid.ai/v1` request, response, error, revision, and provider
      metadata types.
- [x] Build the strict response envelope with root-hoisted definitions.
- [x] Validate request limits, generated schemas, envelopes, responses, and
      ignore-list cross-field rules without a runtime dependency.
- [x] Publish OpenAPI 3.1 and protocol JSON Schema artifacts.
- [x] Add conformance fixtures and unit tests.

### Phase 3 — Browser client

- [x] Implement `createGridAssistant({ api, endpoint | transport })`.
- [x] Capture the generated schema and the complete current-state snapshot per
      request.
- [x] Fingerprint schema + state and reject stale responses.
- [x] Revalidate gateway responses in the browser.
- [x] Compute a protected ignore baseline for every AG Grid 36.1 state key.
- [x] Support dry-run, before/after diff, explicit apply, cancellation, and
      typed failure outcomes.
- [x] Prove unrelated state survives application on a live grid.

### Phase 4 — Language-neutral gateway

- [x] Define a provider port with in-memory mock and OpenAI Responses adapters.
- [x] Implement the canonical system prompt and structured-output call.
- [x] Enforce protocol/schema/body limits, timeouts, model allowlists, and
      normalized errors.
- [x] Implement `POST /v1/grid-command` and `GET /health` using standard Node
      primitives so frameworks are optional.
- [x] Provide a CLI entrypoint, environment configuration, Dockerfile, health
      check, and deployment/security guide.
- [x] Add handler, server, mock, and provider-wire tests.

### Phase 5 — Docs application

- [x] Replace the local-model demo and obsolete messaging.
- [x] Show the live schema, complete state snapshot, wire request, response
      envelope, validation result, and state diff.
- [x] Run the deterministic mock transport in the static Docs build.
- [x] Offer explicit dry-run and apply controls.
- [x] Document how to point the page at a separately running gateway without
      exposing a provider credential.
- [x] Update Playwright behavior and accessibility coverage.

### Phase 6 — Verification

- [x] Run all new package unit and live-grid integration tests.
- [x] Meet repository coverage thresholds for new code.
- [x] Run workspace type checking/build, lint, contamination, versions, and
      bundle-budget checks.
- [x] Build the Docs application and run its AI Toolkit Playwright suite.
- [x] Run gateway conformance against the deterministic mock provider.
- [x] Use `OPENAI_API_KEY` from `.secrets` for real OpenAI Responses API
      schema-validation and command tests without logging the key.
- [x] Record the model, request fixtures, response summaries, and pass/fail
      evidence without recording prompts that contain secrets or raw keys.

### Phase 7 — Completion records

- [x] Update every Phase 0 administrative item from observed evidence.
- [x] Document installation, protocol, security, operations, provider
      configuration, migration, and troubleshooting.
- [x] Add/update package NOTICE, LICENSE, README, budgets, aliases, workspace
      metadata, and changesets.
- [x] Perform a requirement-by-requirement completion audit; all local gates
      pass and the only open acceptance item is the explicitly authorized live
      OpenAI battery below.

## Verification record — 2026-08-25

- Independent five-reviewer audit of the full changeset (governance, diff bug
  scan, git-history regressions, prior review findings, documented-claim
  consistency) confirmed two blocking issues, both fixed before commit: the new
  package NOTICE files lacked G3 attribution content, and ADR/plan text said
  "pruned current state" while the shipped client deliberately captures the
  complete live snapshot. All other flagged concerns were verified and either
  intentional per specification or recorded as non-blocking follow-ups.
- Full Vitest: all 151 files passed; 1,141 tests passed and the one
  external-provider test was skipped.
- AI package coverage: 88.93% statements, 80.55% branches, 94.41% functions,
  and 94.67% lines.
- Full production build: all 37 Nx projects passed. The Docs build required
  outbound access only to inline its configured Google Fonts stylesheet.
- ESLint, whitespace, contamination, versions, package purity, and all
  consumer fixtures passed.
- Clean package output: toolkit 26.8 KB, protocol 18.7 KB, client 8.5 KB,
  gateway 59.8 KB including both executable bundles.
- Focused Docs Chromium suite: seven behavior and light/dark accessibility
  checks passed.
- Deterministic conformance passed through the framework-neutral handler and a
  real loopback Node HTTP server.
- Real-grid integration round-trips all seven emitted state sections and the
  AG Grid 36.1 `dateString` Advanced Filter discriminator. Three complete
  golden-schema digests protect full, excluded, and capability-removed grids.
- Live OpenAI validation ran on 2026-08-25 after explicit owner approval of
  the fully synthetic payload. Model: `gpt-5.6` (suite default; no
  `OPENAI_MODEL` override). Fixtures: the four-column synthetic sales grid
  (order / amountUsd / region / category, three invented rows) in ordinary,
  seeded-state, and Advanced Filter variants. Result: the local fixture test
  plus all eleven live contract commands passed in 36.99 s — compound filter,
  sort, aggregation, pivot, row group, column sizing, visibility, clear-all,
  preserve-everything, unsupported-intent refusal, and the recursive
  Advanced Filter case. The key was read through Node's `--env-file` from
  `.secrets`; no key or credential material was printed or recorded.

## Acceptance Gates

- The toolkit publishes no provider, prompt, network, or model implementation.
- The browser never receives a provider credential.
- A consumer can use the gateway through HTTP regardless of server language.
- Mock and OpenAI responses validate against the exact request envelope.
- Schema/state changes during inference produce a stale response, never an
  applied state.
- Non-toolkit, excluded, and capability-omitted Grid State survives every
  apply path.
- The static Docs application demonstrates the complete client behavior with
  no external secret.
- The real OpenAI validation battery covers every emitted feature—aggregation,
  filter, sort, pivot, visibility, sizing, and row grouping—plus clear,
  preservation, unsupported intent, and recursive advanced-filter cases.
