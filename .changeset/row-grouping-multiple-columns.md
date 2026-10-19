---
'@libregrid/row-grouping': minor
---

Implement `groupDisplayType: 'multipleColumns'`.

One auto group column is generated per row-group column
(`ag-Grid-AutoColumn-<colId>`, `showRowGroup` set to the source column id).
Each column shows only the groups of its own level, and the group cell
renderer leaves other levels empty. `groupRows` and `custom` remain
unimplemented.
