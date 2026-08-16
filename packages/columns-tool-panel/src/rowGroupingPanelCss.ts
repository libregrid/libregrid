/**
 * Row group / pivot drop zone styles.
 *
 * Members are chips (shared lgr-chip core styles) with icon remove buttons.
 * Empty zones show a centered dashed affordance; a drag-over highlight is
 * applied while a drag hovers the zone.
 */
export const rowGroupingPanelCss = `
.lgr-header-drop-zones { min-height: 0; }

.lgr-row-group-drop-zone,
.lgr-pivot-drop-zone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.5);
  min-height: 32px;
  padding: calc(var(--ag-grid-size, 8px) * 0.5) calc(var(--ag-grid-size, 8px) * 1.5);
}

.lgr-row-group-drop-zone {
  border-block-end: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
}

.lgr-row-group-drop-zone-empty {
  display: inline-block;
  padding: calc(var(--ag-grid-size, 8px) * 0.5) calc(var(--ag-grid-size, 8px) * 1.5);
  border: 1px dashed var(--ag-border-color, #babfc7);
  border-radius: var(--ag-border-radius, 4px);
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
}

.lgr-row-group-drop-zone-member span {
  white-space: nowrap;
}

.lgr-drop-zone-drag-over {
  background: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
  outline: 1px dashed var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
  outline-offset: -1px;
}
`;
