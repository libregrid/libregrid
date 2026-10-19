---
'@libregrid/row-grouping': minor
---

Implement `groupDisplayType: 'groupRows'` and `'custom'`.

`groupRows` renders each group as a full-width row (default `agGroupRowRenderer`,
overridable with `groupRowRenderer` / `groupRowRendererParams`) and generates no
auto group column. `custom` also generates no auto column and routes group
values to the application's own `showRowGroup` columns.
