# AI Toolkit Pure Structured-Schema Implementation Plan

**Status:** implemented and locally verified within the BYOM delivery program

**Decision date:** 2026-08-25

**Supersedes:** `ai-toolkit-smollm2-v3.md`

**Training status:** paused; no model training or model selection is in scope

**Program plan:** [`ai-toolkit-byom.md`](./ai-toolkit-byom.md)

## Outcome

Rebuild `@libregrid/ai-toolkit` as a provider-agnostic schema-generation
module. Its grid-facing interface is one function:

```ts
gridApi.getStructuredSchema(params?): JSONSchema | undefined
```

The function introspects the live grid and returns a strict, model-facing JSON
Schema for the legal AG Grid State changes available at that moment. It does
not interpret natural language, call a model, build prompts, validate model
responses, or apply state.

The local source of truth is
`specs/AI-Toolkit-Engineering-Specification.md`, as corrected by
`specs/AI-Toolkit-Engineering-Specification-Errata.md`. This plan repeats the
decisions needed to keep the repository understandable even though the local
`specs/` directory is intentionally git-ignored.

## Product Decisions

1. `@libregrid/ai-toolkit` is the pure schema module, not an AI runtime.
2. `AiToolkitModule` registers exactly one Grid API function,
   `getStructuredSchema`, and no toolkit-owned beans.
3. The module depends on `EnterpriseCoreModule` and `ColumnApiModule`.
4. The generated schema mirrors supported `GridState` sections directly. The
   toolkit has no action language and no translation layer.
5. Prompts, providers, model SDKs, networking, structured-output adapters,
   response envelopes, semantic validation, stale-state checks, and
   `setState()` calls belong to a host integration.
6. A future natural-language convenience product requires a separate package
   and decision record. It must not expand the schema module's interface.
7. All Needle, SmolLM, Flan-T5, Qwen, LoRA, ONNX, and Transformers.js work is
   paused. Existing evaluation artifacts remain historical evidence only.

## Module Shape

`AiToolkitModule` is a deep module: callers learn one interface while the
implementation owns live capability discovery, feature gating, filter-model
resolution, schema construction, dialect enforcement, and definition
hoisting.

```text
GridApi.getStructuredSchema(params)
                 │
                 ▼
       live-grid adapter (internal)
                 │ capability snapshot
                 ▼
       feature registry (internal)
                 │ builder graph
                 ▼
    strict schema serializer (internal)
                 │
                 ▼
        one root JSON Schema
```

The Grid API function is the external seam and the primary test surface. The
builder and feature registry are internal seams; they are not exported merely
to make tests convenient.

## Supported State Surface

Features are considered in this fixed order:

1. `aggregation`
2. `filter`
3. `sort`
4. `pivot`
5. `columnVisibility`
6. `columnSizing`
7. `rowGroup`

Each feature is omitted when excluded by the caller, unsupported by the live
grid, or unsafe to represent in the portable dialect. Every included root
feature is nullable. Every emitted enum contains only values legal for the
specific live capability.

The first release deliberately omits multi-filter columns because their child
models are positional and the portable dialect has no tuple construct. Simple,
set, and advanced filters remain in scope.

## Non-Negotiable Schema Rules

- Every object has `required` equal to all property keys and
  `additionalProperties: false`.
- Optional output decisions use nullability, not omitted keys.
- Every enum is non-empty, homogeneous, and type-correct.
- Every `$defs` entry is hoisted to the document root; conflicting definition
  IDs fail rather than overwrite.
- `anyOf` is the only union construct.
- Simple filters use operator-discriminated variants so operand arity is
  structural.
- `dateString` advanced filters use `filterType: "dateString"` for AG Grid
  36.1.
- An empty grid produces a valid empty root schema, with no empty enum and no
  visibility feature.
- An empty generated feature set produces an envelope whose ignore array has
  `maxItems: 0`; it never creates an empty enum.
- Schema generation performs no I/O except an explicitly requested set-filter
  handler/value lookup already owned by the live grid.

## Host-Integration Contract

The following behavior is documented and tested in a reference harness, but
is not implemented inside `@libregrid/ai-toolkit`:

1. Generate a fresh schema and capture the seven relevant current-state
   sections for every request.
2. Wrap the schema at the document root, preserving root `$defs`.
3. Attach it through a provider's native structured-output mechanism when
   available.
4. Parse and validate every response locally even when constrained decoding is
   enabled.
5. Perform deterministic cross-field and semantic validation.
6. Reject the response if a fingerprint of the live schema plus relevant
   state differs from the request fingerprint.
7. Compute the apply ignore list as:
   - every supported `GridStateKey` not present in the generated feature set;
   - plus each included feature the response intentionally leaves untouched.
8. Require ignored included features to contain `null` placeholders.
9. Treat a non-ignored `null` as an explicit clear and a non-ignored object as
   the complete replacement for that feature.
10. Call `setState` once and show the explanation only after success.

This protects all non-toolkit, excluded, and capability-omitted grid state.
The model never controls that protection baseline.

## Scope

### In scope

- Restricted JSON Schema representations and internal builder DSL.
- `$defs` collection, collision detection, and root hoisting.
- Live bean-to-capability adaptation.
- Seven feature builders plus the advanced-filter branch.
- Built-in text, number, date, set, and advanced-filter operators.
- Per-column descriptions and opt-in low-cardinality set values.
- Module registration and the `GridApi` binding.
- Behavioral, snapshot, dialect, integration, and state-round-trip tests.
- A Docs application schema inspector and safe reference-envelope example.
- Removal of model/runtime concerns from the published package.

### Out of scope

- Selecting, training, quantizing, downloading, caching, or executing a model.
- Prompt templates and conversation history.
- OpenAI, Anthropic, Gemini, Ollama, vLLM, or Transformers.js adapters.
- Natural-language interpretation and explanation generation.
- A compact action plan, decoder, compiler, repair pass, or confidence gate.
- Multi-filter output until portable positional tuples are approved.
- Provider-specific schema extensions in the core module.

## Migration Ledger

### Rewrite and retain

- `src/aiToolkitModule.ts`: keep the one Grid API registration; add
  `ColumnApiModule` dependency and remove inference-oriented commentary.
- `src/aiToolkitApi.ts`: replace the v1 adapter with the complete live-grid
  capability adapter.
- `src/structuredSchema.ts`: replace the flat v1 schema with the root assembler
  and feature registry.
- `src/structuredSchema.unit.spec.ts` and live-grid integration tests: replace
  implementation-shaped assertions with interface-level behavioral and golden
  tests.
- Package README, parity documentation, and Docs route: describe schema
  generation rather than a bundled assistant.

### Internal new implementation

- Restricted-dialect types and serializers.
- Internal builder factories with `nullable`, `define`, and `toJSON` behavior.
- Internal feature builders for aggregation, filtering, sorting, pivoting,
  visibility, sizing, and row grouping.
- Internal capability snapshot types that isolate bean/version knowledge from
  schema construction.
- Golden schema fixtures and a dialect invariant checker used only by tests.

### Remove from the published toolkit

- `applyAiCommand` and its default provider construction.
- Browser model and remote-provider implementations.
- Prompt/environment rendering and token budgeting.
- Action-plan decoding, validation, compilation, confidence gating, and repair.
- `@huggingface/transformers` peer dependency.
- The `./advanced` export surface that exposes the retired runtime pipeline.

Training generators, checkpoints, and evaluation reports are not inputs to
this implementation. Preserve useful historical evidence outside the
published package until a separate assistant package is either approved or
rejected; do not silently migrate it into the schema module.

This is a breaking product change and should ship as the next major version,
not as a compatibility shim that keeps two competing interfaces alive.

## Work Plan

### Phase 0 — Freeze the contract

- Record the errata alongside the local source specification.
- Mark the SmolLM2 plan paused and superseded.
- Stop training jobs, corpus regeneration, model export, and model integration
  changes.
- Turn every normative correction into an acceptance test description before
  production implementation begins.

**Exit:** there is one active implementation plan and no active model gate.

### Phase 1 — Establish interface-level failing tests

- Build live grids exercising each capability gate.
- Add behavioral tests through `api.getStructuredSchema()` for feature order,
  omission, exclusion, enum contents, descriptions, set values, filters, and
  empty grids.
- Add full golden snapshots for a reference grid, excluded features, removed
  capabilities, advanced filtering, and an empty grid.
- Add dialect checks for required-all properties, closed objects, non-empty
  enums, legal constructs, and root-only `$defs`.

**Exit:** tests describe the complete public behavior and fail against the v1
implementation for the expected reasons.

### Phase 2 — Implement the restricted schema serializer

- Implement primitive, enum, literal, array, object, union, and reference
  builders.
- Implement idempotent nullability.
- Implement recursive `$defs` collection and root hoisting.
- Reject empty/heterogeneous enums and conflicting definition IDs.
- Keep the implementation private to the schema module.

**Exit:** serializer-specific tests pass through an internal test seam; no new
package export exists.

### Phase 3 — Isolate live-grid introspection

- Adapt the full ordered column list and capability-filtered views.
- Resolve sortable, filterable, resizable, aggregation, grouping, and pivot
  capabilities from the live grid.
- Resolve default filters through the column-filter implementation.
- Gate optional aggregation, advanced-filter, and data-type capabilities on
  the beans actually present.
- Acquire set-filter keys only when `includeSetValues` is explicitly enabled.

**Exit:** capability behavior is observable through the Grid API tests and bean
knowledge is localized to one internal adapter.

### Phase 4 — Implement non-filter feature builders

Implement and verify, in registry order:

- aggregation with per-column function pairing;
- sort with sortable-only IDs and required sort type;
- pivot with pivotable-only IDs;
- visibility through the all-column definition;
- sizing with resizable-only IDs and exclusive width/flex variants;
- row grouping with groupable-only IDs.

**Exit:** all non-filter behavioral and golden tests pass.

### Phase 5 — Implement filter builders

- Resolve built-in simple, set, and advanced filter types.
- Encode simple filters as a single/combined union and then as
  operator-discriminated variants.
- Respect built-in filter-option overrides only when operand semantics are
  known.
- Add date separator patterns and typed nullable fields.
- Add opt-in set values with empty-list fallback.
- Build advanced-filter bucket definitions and recursive joins using the
  corrected AG Grid 36.1 discriminators.
- Omit custom and multi filters that cannot meet the safety invariant.

**Exit:** every supported emitted filter model round-trips through a live grid;
every unsupported filter is absent rather than approximated.

### Phase 6 — Complete root assembly and module registration

- Apply the fixed feature order, exclusions, feature gates, and uniform root
  nullability.
- Build the all-column description dictionary and hoist all definitions.
- Register `getStructuredSchema` with no beans of its own.
- Add `ColumnApiModule` to module dependencies.
- Ensure direct internal helpers are not exported from the package.

**Exit:** complete golden snapshots pass exclusively through the public Grid
API interface.

### Phase 7 — Build the reference host harness

- Implement envelope construction outside the package.
- Add mandatory JSON Schema and semantic validation.
- Add deterministic protected-ignore computation for every `GridStateKey`.
- Add schema/state fingerprinting and stale-response rejection.
- Verify clear, replace, preserve, excluded-feature, and non-toolkit-state
  behavior against a live grid.
- Change the Docs AI Toolkit route into a schema/state/envelope inspector; a
  provider call is optional and must remain application code.

**Exit:** the reference harness cannot clear unrelated state and demonstrates
the complete integration contract without adding runtime concerns to the
toolkit.

### Phase 8 — Remove the superseded runtime surface

- Remove runtime/provider exports and implementation from the package.
- Remove the Transformers.js peer dependency.
- Rewrite package documentation and examples around
  `getStructuredSchema()`.
- Move retained model research artifacts outside the package release surface.
- Add migration notes for users of the experimental `applyAiCommand()` API.

**Exit:** the published package contains schema generation only and its package
graph contains no model runtime or networking dependency.

### Phase 9 — Release verification

- Run package unit and integration tests, workspace type checking, linting,
  package build, and Docs build.
- Inspect the packed artifact to confirm no model/provider/training files or
  dependencies ship.
- Validate every golden schema with the dialect checker.
- Run the live-grid round-trip and untouched-state suites on the minimum and
  maximum supported AG Grid versions.
- Record any provider conformance tests separately; they do not gate the pure
  module unless LibreGrid publishes that adapter.

**Exit:** all definition-of-done gates below pass.

## Definition of Done

- `AiToolkitModule` registers one function and no beans.
- `getStructuredSchema()` covers every safe feature and omits every unavailable
  or unrepresentable capability.
- Generated schemas obey the restricted dialect and contain no empty enum,
  nested `$defs`, open object, or optional object property.
- Supported generated state round-trips through AG Grid 36.1.
- The reference apply harness preserves all unrelated state and rejects stale
  responses.
- Multi filters remain absent until their positional contract is structurally
  representable.
- The package exports no inference pipeline and depends on no model SDK.
- Training remains paused with no model named as a release dependency.
- Documentation presents the toolkit as a schema generator, not as a bundled
  natural-language assistant.

## Deferred Decisions

These require separate approval and do not block the pure module:

1. Whether to create `@libregrid/ai-assistant` as a host-integration package.
2. Whether that package offers remote structured-output adapters.
3. Whether browser-local inference remains a product requirement.
4. If local inference remains, whether it emits direct state or a compact
   intermediate action language.
5. Which model, quantization, payload ceiling, corpus, and evaluation gates
   apply to that separate runtime.

## Completion record — 2026-08-25

Phases 0–9 were implemented. The host-integration question was resolved by
ADR 0007 as two separate optional packages—`@libregrid/ai-client` and
`@libregrid/ai-gateway`—rather than by expanding this module. The provider
contract lives in `@libregrid/ai-protocol`.

The public toolkit surface is limited to `AiToolkitModule` and `VERSION`; its
registered Grid API function is `getStructuredSchema()`. A clean package build
contains six JavaScript modules and measures 26.8 KB unminified. It contains no
provider, prompt, network, model, training, action-plan, or state-application
implementation. Unit/dialect tests and a live Grid API integration pass inside
the 1,141-test workspace suite. The separate client integration proves stale
rejection and unrelated-state preservation.

The local-model questions above remain deferred. Live OpenAI validation is an
external gateway acceptance gate and does not change the completed status of
this pure schema module.
