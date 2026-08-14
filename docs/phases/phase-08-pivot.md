# Phase 8 — Pivot

**Status:** ✅ Complete
**Depends on:** Phase 2 (grouping + aggregation), Phase 3 (Columns panel, static sections, builder seam, and drag adapter)
**Blocks:** Phase 9 (SSRM pivoting), Phase 12 (pivot charts)

**Package:** `@libregrid/pivot` (`moduleName: 'Pivot'`, `'PivotModule'`)
**Parity:** [`../parity/pivoting.md`](../parity/pivoting.md)

---

## Context

Pivot mode transposes grouped data: row groups stay as rows, pivot columns become dynamically generated **pivot result columns**, and aggregations fill the intersections.

The mechanism is `pivotStage` (`_IRowNodePivotStage`), which runs **after** `groupStage` and `filterStage` but **before** `aggStage` — so aggregation operates on the pivoted column set. Its `execute()` returns a `boolean` indicating whether the `changedPath` should be deactivated, which happens when pivot columns change and cached paths are no longer valid. Getting that return value wrong causes stale aggregates that are very hard to diagnose.

The genuinely novel work is **pivot result columns**: they don't exist in `columnDefs`, they're generated from data values. That means column identity, ordering, state persistence and the secondary-column lifecycle all need care. `getPivotResultColumn(pivotKeys, valueColId)` is the lookup contract.

Phase 3 ships functional Values controls and static Pivot Mode and Column Labels sections.
It also supplies an inert `PivotDropZone` builder product, but it does not mount that component.
This phase replaces the static sections, creates the functional pivot controls, and mounts the required pivot drop targets.

---

## Todo

- [x] `PivotStage` implementing `_IRowNodePivotStage`, bean `pivotStage`, `step = 'pivot'`
- [x] Correct `execute()` return semantics (deactivates `changedPath` on generated-result changes)
- [x] Bean `pivotColDefSvc` (`iPivotColDefService`) and `pivotResultCols` (`iPivotResultColsService`)
- [x] Deterministic nested result headers, per-group aggregates, and root/grand totals
- [x] Calculated/value-column compatible aggregation path
- [x] `pivotMode`, `pivotPanelShow`, and `pivotPanelSuppressSort` lifecycle support
- [x] `pivot` / `enablePivot` ColDef behavior and full public pivot API
- [x] Functional Columns-panel switch, pivot zone, native drag target, and Material CDK target
- [x] Mounted header `PivotDropZone` subject to `pivotPanelShow`
- [x] State-safe pivot-mode toggling and explicit result-column definitions
- [x] Existing `pivotChart` menu item remains the documented Phase 12 stub

---

## Test plan

| Tier            | Coverage                                                                                                                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Unit**        | Pivot result column ID generation and uniqueness for multi-key pivots. Column ordering determinism. `getPivotResultColumn` lookup by `pivotKeys` + `valueColId`. Header name derivation with and without `suppressAggFuncInHeader`                                                                           |
| **Integration** | Fixture dataset produces the expected result-column set and correct intersection aggregates. Toggling `pivotMode` on→off→on preserves original column state. Adding/removing a pivot column regenerates result columns. Pivot totals and grand totals correct. Pivot combined with multiple row-group levels |
| **E2E**         | Drag a column into the pivot drop zone → result columns appear. Toggle pivot mode from the tool panel. Expand/collapse pivot column groups                                                                                                                                                                   |
| **Performance** | 100k rows, 2 row-group levels × 2 pivot keys × 3 value columns: initial pivot within baseline; re-pivot after changing a pivot column                                                                                                                                                                        |
| **a11y**        | Nested pivot headers expose correct grouping semantics; axe 0 violations light + dark                                                                                                                                                                                                                        |

**Specific edge cases to cover:**

- Pivot key with high cardinality (guard against generating thousands of columns — document the practical limit)
- `null` / `undefined` pivot key values
- Pivot with no value columns configured
- Pivot with no row groups configured
- `setPivotResultColumns` with explicit defs overriding generation
- Sorting on a pivot result column

---

## Acceptance criteria

- [x] Pivot mode produces correct result columns and totals against a fixture dataset
- [x] Toggling pivot mode preserves primary-column state and explicit result definitions
- [x] Multi-level pivot keys render nested column groups correctly
- [x] Pivot totals and grand totals use the root aggregate when configured
- [x] The Columns panel and header panel have functional pivot controls/drop zones
- [x] Value columns drive pivot intersections
- [x] `getPivotResultColumn(pivotKeys, valueColId)` resolves reliably
- [x] High-cardinality generation is bounded by `pivotMaxGeneratedColumns`; use a finite cap (100–500 is a practical browser-safe range for most grids)
- [x] Unit, integration, docs build, and Playwright coverage are recorded below
- [x] Parity checklist is updated with explicit partial/deferred notes
- [x] Full Definition of Done ([standards §9](../reference/standards.md#9-definition-of-done)) satisfied

## Verification record

- `npx vitest run packages/pivot --coverage --coverage.include='packages/pivot/src/**/*.ts'`: 93.92% statements, 76.02% branches, 90.14% functions, 96.85% lines
- `npx nx run pivot:test`, `row-grouping:test`, `columns-tool-panel:test`, and `material:test`
- `npx nx run pivot:build`, `row-grouping:build`, `columns-tool-panel:build`, `material:build`, and `docs:build`
- Docs E2E: generated headers, mode toggle, tool-panel pivot control, native drag-to-pivot, and light/dark axe checks
- `npx nx run-many -t lint test build`, `conformance:matrix`, contamination, bundle consumer fixture, and Phase-0 benchmark comparison

The real-grid integration suite also verifies group and root/grand pivot totals plus sorting by a generated result column. The high-cardinality guard truncates generation rather than attempting to create an unbounded browser header tree. It is intentionally deterministic: the sorted first N key combinations are used. Server-side pivot result fields remain Phase 9 work.
