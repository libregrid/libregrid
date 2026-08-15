---
"@libregrid/excel-export": minor
---

Add styling (Phase 5.3): a `xl/styles.xml` part backed by a deduplicating style registry keyed by resolved `ExcelStyle`. Fonts, fills, borders, alignment, protection and number formats map from the AG Grid vocabulary to OOXML, and cells reference styles through the `cellXf` index.
