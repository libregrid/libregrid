---
'@libregrid/menu': patch
---

Make `.lgr-context-menu` and `.lgr-column-menu` root-menu-only selectors.
Submenus retain `.lgr-menu` and `.lgr-sub-menu`; consumers that style every
menu level should use `.lgr-menu` instead of the root-menu selectors.
