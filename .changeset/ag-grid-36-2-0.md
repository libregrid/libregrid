---
'@libregrid/advanced-filter': patch
'@libregrid/ai-protocol': patch
'@libregrid/find': patch
'@libregrid/row-grouping': patch
'@libregrid/set-filter': patch
---

Support `ag-grid-community` 36.2.0.

Bumped the `ag-grid-community` and `ag-grid-angular` pins to `36.2.0` and
`ag-charts-community` to `^14.2.0`. The peer range is unchanged at
`>=36.1.0 <37`, so no action is required for consumers.

The bump required five seam updates. Community 36.2 added
`refreshAggregateDependentCells` to the `aggStage` bean, so `row-grouping`
implements it. `IFindService` gained `getState`/`setState`, which `find`
now provides. `textFormatter` gained a `FilterInputCallbackParams` argument,
which `set-filter` passes. The Advanced Filter model gained a `set`
condition type, which `advanced-filter` evaluates and serialises. The grid
state model gained `find` and `quickFilter`, which `ai-protocol` mirrors in
`GRID_STATE_KEYS`.