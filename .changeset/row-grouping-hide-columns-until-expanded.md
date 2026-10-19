---
'@libregrid/row-grouping': minor
---

Implement `groupHideColumnsUntilExpanded` for `groupDisplayType: 'multipleColumns'`
(client-side row model). The first group column is always visible; each further
one appears once at least one group of the preceding level is expanded.
