---
"@libregrid/server-side-selection": minor
"@libregrid/server-side-row-model": minor
"@libregrid/all": minor
---

Phase 16 — server-side selection for SSRM grids over very large data sets.

- **New `@libregrid/server-side-selection`** — durable, spec-based row selection for AG Grid Community server-side row model grids. Registers a `selectionSvc` bean for SSRM (Community's `RowSelectionModule` gates its service to the client-side/infinite/viewport row models, so SSRM grids previously had no selection service and every selection gesture was a silent no-op). Adds the compact selection spec (`all` filter terms, `group` route terms, server-only exceptions/additions) captured from UI and API selection, debounced into small `applyOps` batches, and hydrated back onto the datasource cache via `resolveSelected`. Includes the footer (per-page + total counts, spec-level Select All / Deselect All, and the R6 "Show All Selected" selection view) and tab-isolated `{gridId}:{tabId}` identity.
- **`@libregrid/server-side-row-model`** — the row model now keeps a per-node selection working copy: `getSsrmRoute` exposes a node's group route, `forEachNodeAfterFilter` walks the loaded-and-filtered set, node-creation sites call `updateRowSelectable`, `refreshStore` preserves and reapplies the working copy, `setDatasource` resets it, and evicted blocks purge their selection state so it is re-resolved from the spec on reload.
- **`@libregrid/all`** re-exports the new module, services, and types.

Selection semantics: terms accumulate (R1), survive filter changes (R2), exceptions override terms (R3), Select All (filtered) clears in-scope exceptions then appends the term (R4), groups are atomic both directions (R5), the selection view is `selected(spec) ∧ filterModel` with filters untouched (R6), and the header checkbox is viewport-only (R7). See `docs/phases/phase-16-server-side-selection.md`.
