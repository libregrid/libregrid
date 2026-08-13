---
'@libregrid/row-grouping': minor
---

PR 2.3 — Auto group column: `AutoGenColsService` (bean `autoColSvc`), `ShowRowGroupColsService`/`ShowRowGroupColsValueService` (the seam Community's `ValueService` routes group-column values through), `ExpansionService` (bean `expansionSvc`, required for `RowNode.setExpanded` to do anything), and the `agGroupCellRenderer` user component with a click/dblclick/Enter expand-collapse affordance. Supports `autoGroupColumnDef`, `groupDisplayType: 'singleColumn'`, `showOpenedGroup`, `groupHideOpenParents`, `groupHideParentOfSingleChild`, and `groupAllowUnbalanced`.
