---
"@libregrid/menu": patch
---

Menu popups render outside the grid footprint: context, column, and toolbar
menus now open in a viewport-level popup by default (an app-configured
`popupParent` is still honoured), so a menu opened near the grid edge extends
past the grid boundary and is clamped to the viewport instead of being cut off
at the grid edge. Also resolves string `subMenu` entries on registered items
(Export → CSV/Excel) and renders separators as a full-width line.
