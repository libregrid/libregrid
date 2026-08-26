# @libregrid/ai-client

## 1.3.0

### Minor Changes

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

- Initial browser assistant with live snapshots, HTTP/custom transport,
  revalidation, stale checks, dry-run diff, and explicit safe apply.
- Preserve nested Grid State keys that are intentionally not model-visible
  when replacing an advertised feature.
