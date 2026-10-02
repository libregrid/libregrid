# @libregrid/ai-protocol

## 1.3.5

### Patch Changes

- bab329a: Support `ag-grid-community` 36.2.0.

  Bumped the `ag-grid-community` and `ag-grid-angular` pins to `36.2.0` and
  `ag-charts-community` to `^14.2.0`. The peer range is unchanged at
  `>=36.1.0 <37`, so no action is required for consumers.

  The bump required six seam updates. Community 36.2 added
  `refreshAggregateDependentCells` to the `aggStage` bean, so `row-grouping`
  implements it. `IFindService` gained `getState`/`setState`, which `find`
  now provides. `textFormatter` gained a `FilterInputCallbackParams` argument,
  which `set-filter` passes. The Advanced Filter model gained a `set`
  condition type, which `advanced-filter` evaluates and serialises. The grid
  state model gained `find` and `quickFilter`, which `ai-protocol` mirrors in
  `GRID_STATE_KEYS`.

  Community 36.2 also sets `aria-expanded` on every expandable row, not only
  on grouping rows. Master rows are expandable, but the grid keeps
  `role="grid"` unless row grouping or tree data is active, and ARIA allows
  `aria-expanded` on a row only inside a `treegrid`. This raised an
  `aria-conditional-attr` violation in axe. `master-detail` now restores the
  36.1 contract: a master row that is not a grouping row does not carry the
  attribute. This is the same defect reported upstream as ag-grid#12892 for
  pinned rows.

## 1.3.4

## 1.3.3

## 1.3.1

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

## Unreleased

- Initial provider-neutral `libregrid.ai/v1` contract, validation, JSON Schema,
  OpenAPI, conformance fixtures, and deterministic revision support.
