---
'@libregrid/side-bar': patch
---

Fix sidebar buttons rendering the label above the icon when the Material renderer is installed. Angular Material wraps the button's projected content in `.mdc-button__label` (display: block), so the icon and label stopped being flex children of the column button and shared a baseline. The wrapper is now a flex column, restoring the icon-over-label stack.
