# @libregrid/server-side-row-model

## 1.2.0

### Minor Changes

- 3a7c86d: Phase 16 — server-side selection for SSRM grids over very large data sets.

  - **New `@libregrid/server-side-selection`** — durable, spec-based row selection for AG Grid Community server-side row model grids. Registers a `selectionSvc` bean for SSRM (Community's `RowSelectionModule` gates its service to the client-side/infinite/viewport row models, so SSRM grids previously had no selection service and every selection gesture was a silent no-op). Adds the compact selection spec (`all` filter terms, `group` route terms, server-only exceptions/additions) captured from UI and API selection, debounced into small `applyOps` batches, and hydrated back onto the datasource cache via `resolveSelected`. Includes the footer (per-page + total counts, spec-level Select All / Deselect All, and the R6 "Show All Selected" selection view) and tab-isolated `{gridId}:{tabId}` identity.
  - **`@libregrid/server-side-row-model`** — the row model now keeps a per-node selection working copy: `getSsrmRoute` exposes a node's group route, `forEachNodeAfterFilter` walks the loaded-and-filtered set, node-creation sites call `updateRowSelectable`, `refreshStore` preserves and reapplies the working copy, `setDatasource` resets it, and evicted blocks purge their selection state so it is re-resolved from the spec on reload.
  - **`@libregrid/all`** re-exports the new module, services, and types.

  Selection semantics: terms accumulate (R1), survive filter changes (R2), exceptions override terms (R3), Select All (filtered) clears in-scope exceptions then appends the term (R4), groups are atomic both directions (R5), the selection view is `selected(spec) ∧ filterModel` with filters untouched (R6), and the header checkbox is viewport-only (R7). See `docs/phases/phase-16-server-side-selection.md`.

### Patch Changes

- Updated dependencies [3a7c86d]
  - @libregrid/row-grouping@1.2.0
  - @libregrid/core@1.2.0
  - @libregrid/pivot@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [8735c38]
  - @libregrid/core@1.1.1
  - @libregrid/pivot@1.1.1
  - @libregrid/row-grouping@1.1.1

## 1.0.1

### Patch Changes

- 1fe2b96: Rewrote every package README with install instructions, usage examples,
  and an API table, and added a LICENSE file to every package (previously
  only NOTICE and README shipped in the published tarball). No runtime
  behavior changed.
- Updated dependencies [1fe2b96]
  - @libregrid/core@1.0.1
  - @libregrid/pivot@1.0.1
  - @libregrid/row-grouping@1.0.1

## 1.0.0

### Major Changes

- a3b983c: Phase 13 — 1.0.0 release: parity audit, honest gap list, migration guide,
  bundle budgets with tree-shaking fixtures, dist purity checks, dependency and
  attribution CI checks, Angular signal ergonomics, the @libregrid/all barrel,
  accessibility fixes, and hardened CI across Chromium, Firefox and WebKit.

  Publication is externally owned: run the changesets release workflow from
  main and publish with npm provenance (--provenance) as documented in
  docs/phases/phase-13-hardening.md.

### Minor Changes

- 81a990d: Add the flat Server-Side Row Model with full and lazy root stores, range loading, bounded block caching, transactions, and durable selection state. Add the one-million-row SSRM documentation demo.

### Patch Changes

- 4bad79b: Add hierarchical server-side grouping, analytical request forwarding, server-driven pivot result columns, and the push-driven Viewport Row Model.
- Updated dependencies [4bad79b]
- Updated dependencies [4bad79b]
- Updated dependencies [a3b983c]
- Updated dependencies [ee4f9cc]
- Updated dependencies [7aa7801]
- Updated dependencies [7aa7801]
- Updated dependencies [39bdeb0]
- Updated dependencies [1bbfdc5]
- Updated dependencies [1bbfdc5]
- Updated dependencies [985c5f9]
  - @libregrid/pivot@1.0.0
  - @libregrid/row-grouping@1.0.0
  - @libregrid/core@1.0.0
