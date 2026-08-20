---
'@libregrid/batch-edit': minor
'@libregrid/all': minor
---

Add `@libregrid/batch-edit`: batch editing for Community grids. The module registers the four `GridApi` functions the Community build reserves (`startBatchEdit`, `commitBatchEdit`, `cancelBatchEdit`, `isBatchEditing`) on top of the Community edit service, so staged cell edits can be committed in one pass or cancelled — plus the staged-edit highlight styles.
