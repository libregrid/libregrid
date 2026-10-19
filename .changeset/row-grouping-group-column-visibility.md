---
'@libregrid/row-grouping': minor
---

Hide a column when it is grouped and show it again when ungrouped via the
row-group API (`addRowGroupColumns`, `removeRowGroupColumns`,
`setRowGroupColumns`), matching Community. Implement
`suppressGroupChangesColumnVisibility` (`true`, `'suppressHideOnGroup'`,
`'suppressShowOnUngroup'`) and the deprecated `suppressRowGroupHidesColumns` /
`suppressMakeColumnVisibleAfterUnGroup`.

Behaviour change: grouping through the API now hides the column. Set
`suppressGroupChangesColumnVisibility: true` to keep the previous behaviour.
