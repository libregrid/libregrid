---
'@libregrid/menu': patch
---

Fix: right-clicking a column header opened the LibreGrid header context menu underneath the browser's native context menu. The header context-menu path now suppresses the native menu when the LibreGrid menu opens (a `suppressHeaderContextMenu` header still keeps the browser default).
