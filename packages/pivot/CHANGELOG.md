# @libregrid/pivot

## 1.3.4

### Patch Changes

- Updated dependencies
  - @libregrid/core@1.3.4
  - @libregrid/row-grouping@1.3.4

## 1.3.3

### Patch Changes

- Add group row value editing — `RowGroupingEditModule` (gap-plan A8, Phase 21).

  Correctness follow-up: refresh visible ancestor totals through Community's
  deferred change detection, distribute nested edits in one aggregation pass,
  preserve weighted averages and exact bigint totals, and inherit group-editing
  configuration on pivot result columns while isolating edits to matching leaves.

  - `colDef.groupRowEditable` (`boolean | callback`) makes a group row's cell
    editable, and `colDef.groupRowValueSetter`
    (`boolean | callback | options`) distributes the edit across the group's
    descendants. Both validate against the `RowGroupingEdit` module name, so the
    new module fills the two bean slots Community declares and never provides:
    `rowGroupingEditValueSvc` (`RowGroupingEditService`) and `aggChildrenSvc`
    (`AggregatedChildrenService`).
  - `distributeGroupValue(params, options?)` implements the documented strategies —
    `'uniform'`, `'percentage'` (zero-total falls back to uniform), `'increment'`
    and `'overwrite'` — with the per-aggFunc defaults (`sum` → uniform, `avg` →
    overwrite, no aggFunc → overwrite, `count`/`min`/`max`/`first`/`last` and custom
    aggFuncs disabled unless explicitly enabled), per-aggFunc `distribution` records
    with a `default` fallback, `precision` rounding that spreads the remainder so
    child values still total the edited number, and `getValue`/`setValue` overrides.
    A per-aggFunc record entry of `true` (for example `distribution: { count: true }`)
    enables a default-disabled aggFunc with `'overwrite'`, while a top-level
    `distribution: true` keeps those five disabled — as documented.
  - `refreshAfterGroupEdit` re-evaluates the grouping hierarchy after an edit to an
    active row-group column, moving the row to the correct group while preserving
    expansion; it also unblocks managed drag-between-groups (A11).
  - Fixes `rowNode.getAggregatedChildren()`, which returned `[]` unconditionally
    because `aggChildrenSvc` was unfilled.
  - The group-editing beans (`RowGroupingEditService`, `AggregatedChildrenService`)
    are registered through the modules, not exported as values: `standards.md` §6.6
    keeps beans out of the public API. The only new public value is
    `distributeGroupValue`.
  - Docs app: `/group-editing` route, feature-catalog and route-guide entries, and a
    Playwright e2e battery (distribution, isolation, axe light/dark).

- Updated dependencies
  - @libregrid/row-grouping@1.3.3
  - @libregrid/core@1.3.3

## 1.3.1

### Patch Changes

- @libregrid/core@1.3.1
  - @libregrid/row-grouping@1.3.1

## 1.3.0

### Patch Changes

- @libregrid/core@1.3.0
  - @libregrid/row-grouping@1.3.0

## 1.2.3

### Patch Changes

- cc24da1: minor bug fixes
- Updated dependencies [cc24da1]
  - @libregrid/core@1.2.3
  - @libregrid/row-grouping@1.2.3

## 1.2.2

### Patch Changes

- @libregrid/core@1.2.2
  - @libregrid/row-grouping@1.2.2

## 1.2.1

### Patch Changes

- @libregrid/core@1.2.1
  - @libregrid/row-grouping@1.2.1

## 1.2.0

### Patch Changes

- Updated dependencies [3a7c86d]
  - @libregrid/row-grouping@1.2.0
  - @libregrid/core@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [8735c38]
  - @libregrid/core@1.1.1
  - @libregrid/row-grouping@1.1.1

## 1.0.1

### Patch Changes

- 1fe2b96: Rewrote every package README with install instructions, usage examples,
  and an API table, and added a LICENSE file to every package (previously
  only NOTICE and README shipped in the published tarball). No runtime
  behavior changed.
- Updated dependencies [1fe2b96]
  - @libregrid/core@1.0.1
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

- 4bad79b: Add the client-side Pivot module with generated nested result columns,
  intersection aggregation, pivot APIs, functional Columns-panel controls, and
  the documented high-cardinality guard.

### Patch Changes

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
  - @libregrid/row-grouping@1.0.0
  - @libregrid/core@1.0.0
