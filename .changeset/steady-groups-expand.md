---
'@libregrid/row-grouping': patch
---

Preserve group expansion state across row-data updates by restoring deterministic group IDs after regrouping, and restore every nested group's rows when filters are cleared.
