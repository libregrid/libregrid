---
"@libregrid/core": minor
"@libregrid/menu": minor
"@libregrid/side-bar": minor
"@libregrid/status-bar": minor
"@libregrid/columns-tool-panel": minor
"@libregrid/filters-tool-panel": minor
"@libregrid/material": minor
"@libregrid/find": minor
"@libregrid/clipboard": minor
"@libregrid/excel-export": minor
"@libregrid/row-grouping": minor
"@libregrid/toolbar": minor
---

UI/UX pass: menus, side bar, tool panels, status bar, and the new Quick Access Toolbar now match the Quartz enterprise look.

- Menus: theme-native metrics, icons, working submenus, Home/End/type-ahead, separators preserved, standalone ColumnMenuModule.
- Side bar: icon-over-label tabs, 250px default panel width, focus rings.
- Tool panels: styled controls, chip drop zones, drag-over highlights, filter cards.
- Status bar: renders into the grid with aligned label/value panels, valueFormatter, aggFuncs, hide-without-selection.
- Toolbar: new @libregrid/toolbar package with quick filter, find, row group panel, pivot panel, menu, and action-button items.
- Dark mode: body-level popups inherit the grid theme.
