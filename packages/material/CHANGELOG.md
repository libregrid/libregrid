# @libregrid/material

## 1.3.0

### Patch Changes

- @libregrid/columns-tool-panel@1.3.0
  - @libregrid/core@1.3.0
  - @libregrid/menu@1.3.0
  - @libregrid/rich-select@1.3.0
  - @libregrid/side-bar@1.3.0

## 1.2.3

### Patch Changes

- cc24da1: minor bug fixes
- df929a8: Fix sidebar buttons rendering without labels or icons when the Material renderer is installed. MDC's button `min-width` (64px) and horizontal padding overrode the 32px strip, pushing the icon and label out of view; and Angular's `innerHTML` sanitizer stripped the panel icon SVG. Buttons now fit the strip and the icon renders.
- Updated dependencies [cc24da1]
- Updated dependencies [df929a8]
- Updated dependencies [9c8ce41]
  - @libregrid/columns-tool-panel@1.2.3
  - @libregrid/core@1.2.3
  - @libregrid/menu@1.2.3
  - @libregrid/rich-select@1.2.3
  - @libregrid/side-bar@1.2.3

## 1.2.2

### Patch Changes

- Updated dependencies [982d1cd]
  - @libregrid/menu@1.2.2
  - @libregrid/columns-tool-panel@1.2.2
  - @libregrid/core@1.2.2
  - @libregrid/rich-select@1.2.2
  - @libregrid/side-bar@1.2.2

## 1.2.1

### Patch Changes

- Updated dependencies [b6836f0]
  - @libregrid/menu@1.2.1
  - @libregrid/columns-tool-panel@1.2.1
  - @libregrid/core@1.2.1
  - @libregrid/rich-select@1.2.1
  - @libregrid/side-bar@1.2.1

## 1.2.0

### Patch Changes

- Updated dependencies [3a7c86d]
- Updated dependencies [192f180]
- Updated dependencies [c4c47ae]
- Updated dependencies [3a7c86d]
  - @libregrid/menu@1.2.0
  - @libregrid/columns-tool-panel@1.2.0
  - @libregrid/core@1.2.0
  - @libregrid/rich-select@1.2.0
  - @libregrid/side-bar@1.2.0

## 1.1.1

### Patch Changes

- 8735c38: Fix toolbar and header drop zones so row-group/pivot targets accept header and Columns-panel drags, and restyle drop-zone chips as compact Quartz pills with order badges.
- Updated dependencies [8735c38]
  - @libregrid/columns-tool-panel@1.1.1
  - @libregrid/core@1.1.1
  - @libregrid/menu@1.1.1
  - @libregrid/rich-select@1.1.1
  - @libregrid/side-bar@1.1.1

## 1.0.1

### Patch Changes

- 1fe2b96: Rewrote every package README with install instructions, usage examples,
  and an API table, and added a LICENSE file to every package (previously
  only NOTICE and README shipped in the published tarball). No runtime
  behavior changed.
- Updated dependencies [1fe2b96]
  - @libregrid/columns-tool-panel@1.0.1
  - @libregrid/core@1.0.1
  - @libregrid/menu@1.0.1
  - @libregrid/rich-select@1.0.1
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

- f0d2329: Add context and column menus, a resizable side-bar host, and Material theme integration for AG Grid Community.
- ee4f9cc: Add the Columns tool panel, shared column chooser, standalone row-group panel, and Material CDK drag-drop adapter.

### Patch Changes

- 4bad79b: Add the client-side Pivot module with generated nested result columns,
  intersection aggregation, pivot APIs, functional Columns-panel controls, and
  the documented high-cardinality guard.
- 4bad79b: Add serialisable Advanced Filter expressions and builder, rendered-cell Find navigation, and an accessible virtualised Rich Select editor with a Material adapter.
- 4bad79b: Add cell-range selection, range/fill handles, Excel-compatible clipboard actions,
  configurable status panels, and the Angular Material status-bar presentation shell.
- Updated dependencies [4bad79b]
- Updated dependencies [4bad79b]
- Updated dependencies [4bad79b]
- Updated dependencies [f0d2329]
- Updated dependencies [a3b983c]
- Updated dependencies [4bad79b]
- Updated dependencies [ee4f9cc]
- Updated dependencies [7aa7801]
  - @libregrid/columns-tool-panel@1.0.0
  - @libregrid/rich-select@1.0.0
  - @libregrid/menu@1.0.0
  - @libregrid/side-bar@1.0.0
  - @libregrid/core@1.0.0
