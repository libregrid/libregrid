---
'@libregrid/row-grouping': minor
---

Implement `suppressAggFuncInHeader`. Value columns now show their aggregation
function in the header (`sum(Sales)`), as Community does; set
`suppressAggFuncInHeader: true` for the plain name. Pivot result columns are
unchanged.

Behaviour change: headers of aggregated columns now include the function name
by default.
