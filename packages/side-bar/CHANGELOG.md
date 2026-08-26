# @libregrid/side-bar

## 1.3.0

### Patch Changes

- @libregrid/core@1.3.0

## 1.2.3

### Patch Changes

- cc24da1: minor bug fixes
- df929a8: Fix sidebar buttons rendering without labels or icons when the Material renderer is installed. MDC's button `min-width` (64px) and horizontal padding overrode the 32px strip, pushing the icon and label out of view; and Angular's `innerHTML` sanitizer stripped the panel icon SVG. Buttons now fit the strip and the icon renders.
- 9c8ce41: Fix sidebar buttons rendering the label above the icon when the Material renderer is installed. Angular Material wraps the button's projected content in `.mdc-button__label` (display: block), so the icon and label stopped being flex children of the column button and shared a baseline. The wrapper is now a flex column, restoring the icon-over-label stack.
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

- f0d2329: Add context and column menus, a resizable side-bar host, and Material theme integration for AG Grid Community.
- ee4f9cc: Add the Columns tool panel, shared column chooser, standalone row-group panel, and Material CDK drag-drop adapter.

### Patch Changes

- Updated dependencies [a3b983c]
- Updated dependencies [ee4f9cc]
- Updated dependencies [7aa7801]
  - @libregrid/core@1.0.0
