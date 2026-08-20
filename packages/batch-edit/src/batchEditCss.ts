/**
 * Batch-edit styles: the pending-value tint Community applies through the
 * `ag-cell-batch-edit` / `ag-row-batch-edit` classes while a batch edit is
 * open. The classes are toggled by Community's own cell and row components;
 * this module only styles them (G4: no new class names, theme tokens with
 * Quartz light fallbacks).
 */
export const batchEditCss = `
/* A cell carrying a staged (not yet committed) value while a batch edit is
   open. The tint uses the theme's active colour at low strength so pending
   values are visible without competing with the selection colour. */
.ag-cell.ag-cell-batch-edit {
  background-color: color-mix(in srgb, var(--ag-active-color, #2196f3) 9%, var(--ag-background-color, #ffffff));
}

/* A row being edited cell-by-cell inside a batch (full-row batch editing).
   The same tint at slightly lower strength on the row, so a pending row
   reads as one unit behind its cells. */
.ag-row.ag-row-batch-edit {
  background-color: color-mix(in srgb, var(--ag-active-color, #2196f3) 5%, var(--ag-background-color, #ffffff));
}
`;
