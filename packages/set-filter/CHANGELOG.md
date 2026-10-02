# @libregrid/set-filter

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

- @libregrid/core@1.3.5

## 1.3.4

### Patch Changes

- Updated dependencies
  - @libregrid/core@1.3.4

## 1.3.3

### Patch Changes

- @libregrid/core@1.3.3

## 1.3.1

### Patch Changes

- @libregrid/core@1.3.1

## 1.3.0

### Patch Changes

- @libregrid/core@1.3.0

## 1.2.3

### Patch Changes

- cc24da1: minor bug fixes
- Updated dependencies [cc24da1]
  - @libregrid/core@1.2.3

## 1.2.2

### Patch Changes

- @libregrid/core@1.2.2

## 1.2.1

### Patch Changes

- @libregrid/core@1.2.1

## 1.2.0

### Patch Changes

- @libregrid/core@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [8735c38]
  - @libregrid/core@1.1.1

## 1.0.1

### Patch Changes

- 1fe2b96: Rewrote every package README with install instructions, usage examples,
  and an API table, and added a LICENSE file to every package (previously
  only NOTICE and README shipped in the published tarball). No runtime
  behavior changed.
- Updated dependencies [1fe2b96]
  - @libregrid/core@1.0.1

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

- 4bad79b: Add virtualised Set Filter, composable Multi Filter, and the accessible Filters
  Tool Panel with serialisable filter models for future server-side filtering.

### Patch Changes

- Updated dependencies [a3b983c]
- Updated dependencies [ee4f9cc]
- Updated dependencies [7aa7801]
  - @libregrid/core@1.0.0
