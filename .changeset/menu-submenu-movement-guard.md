---
'@libregrid/menu': patch
---

Fix context and column submenus closing the instant they are hovered.

Menus are `position: absolute`, so anything that moves the document — a page
scroll, a `scroll-behavior: smooth` animation, a late popup re-position — slides
the menu out from under a stationary pointer. The browser then fires
`mouseleave`/`mouseenter` with no user intent behind them, which cancelled the
pending submenu open or destroyed an open submenu with no way to reopen it. The
symptom was intermittent: the submenu flashed open and vanished, or never
appeared, depending on whether something happened to move the menu.

Enter/leave events are now checked against the menu's position at the last real
pointer movement, so only genuine pointer movement opens and closes submenus.
Deliberate hover-out still closes them as before.
