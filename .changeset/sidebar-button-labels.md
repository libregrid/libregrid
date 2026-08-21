---
'@libregrid/side-bar': patch
'@libregrid/material': patch
---

Fix sidebar buttons rendering without labels or icons when the Material renderer is installed. MDC's button `min-width` (64px) and horizontal padding overrode the 32px strip, pushing the icon and label out of view; and Angular's `innerHTML` sanitizer stripped the panel icon SVG. Buttons now fit the strip and the icon renders.
