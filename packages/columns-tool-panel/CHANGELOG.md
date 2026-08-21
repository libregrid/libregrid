# @libregrid/columns-tool-panel

## 1.2.3

### Patch Changes

- cc24da1: minor bug fixes
- Updated dependencies [cc24da1]
- Updated dependencies [df929a8]
- Updated dependencies [9c8ce41]
  - @libregrid/core@1.2.3
  - @libregrid/side-bar@1.2.3

## 1.2.2

### Patch Changes

- @libregrid/core@1.2.2
  - @libregrid/side-bar@1.2.2

## 1.2.1

### Patch Changes

- @libregrid/core@1.2.1
  - @libregrid/side-bar@1.2.1

## 1.2.0

### Patch Changes

- @libregrid/core@1.2.0
  - @libregrid/side-bar@1.2.0

## 1.1.1

### Patch Changes

- 8735c38: Fix toolbar and header drop zones so row-group/pivot targets accept header and Columns-panel drags, and restyle drop-zone chips as compact Quartz pills with order badges.
- Updated dependencies [8735c38]
  - @libregrid/core@1.1.1
  - @libregrid/side-bar@1.1.1

## 1.0.1

### Patch Changes

- 1fe2b96: Rewrote every package README with install instructions, usage examples,
  and an API table, and added a LICENSE file to every package (previously
  only NOTICE and README shipped in the published tarball). No runtime
  behavior changed.
- Updated dependencies [1fe2b96]
  - @libregrid/core@1.0.1
  - @libregrid/side-bar@1.0.1

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

- ee4f9cc: Add the Columns tool panel, shared column chooser, standalone row-group panel, and Material CDK drag-drop adapter.

### Patch Changes

- 4bad79b: Add the client-side Pivot module with generated nested result columns,
  intersection aggregation, pivot APIs, functional Columns-panel controls, and
  the documented high-cardinality guard.
- 4bad79b: Restore Columns Tool Panel expansion from initial state, cover panel controls
  and listener cleanup, and record Phase 3 completion with explicit later-phase
  ownership for pivot and long-tail drag features.
- Updated dependencies [f0d2329]
- Updated dependencies [a3b983c]
- Updated dependencies [ee4f9cc]
- Updated dependencies [7aa7801]
  - @libregrid/side-bar@1.0.0
  - @libregrid/core@1.0.0
