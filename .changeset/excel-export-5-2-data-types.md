---
"@libregrid/excel-export": minor
---

Add Excel data types to the writer (Phase 5.2): booleans, errors, and dates as 1900-system serial numbers including the phantom-leap-day rule. Pre-1900 dates fall back to text, and strings over Excel's 32767-character cell limit are truncated.
