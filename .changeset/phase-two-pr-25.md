---
'@libregrid/row-grouping': minor
---

PR 2.5 — Group filter & Show Values As: full `groupAggFiltering` support in `GroupFilterStage` (reusing Community's own `FilterManager.doesRowPassAggregateFilters`, with a fix for a filter-bucket classification quirk that otherwise silently disabled per-leaf filtering once `groupAggFiltering` was configured), a new `ShowValuesAsService` (bean `showValuesAsSvc`) implementing the five built-in "Show Values As" percent-of-total modes, and menu-item contributions (`rowGroup`, `rowUnGroup`, `expandAll`, `contractAll`, `valueAggSubMenu`) registered into `@libregrid/menu`'s registry with zero edits to that package. Also fixes a production-build bug where the menu registration's side effect was silently dropped by esbuild despite being reachable — `menuItems.ts` needed an explicit `sideEffects` array entry, not just an import.
