/**
 * Row group / pivot drop zone styles.
 *
 * Members are Quartz pills (shared `lgr-chip` core styles): order badge, ellipsized
 * label, hover-revealed reorder controls, and a compact remove. Empty zones show a
 * dashed affordance; drag-over highlights the active target.
 */
export const rowGroupingPanelCss = `
.lgr-header-drop-zones {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--ag-header-background-color, #f8f8f8);
}

.lgr-row-group-drop-zone,
.lgr-pivot-drop-zone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.5);
  min-height: calc(var(--ag-grid-size, 8px) * 4);
  padding: calc(var(--ag-grid-size, 8px) * 0.5) calc(var(--ag-grid-size, 8px) * 1.5);
}

.lgr-row-group-drop-zone {
  border-block-end: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
}

.lgr-row-group-drop-zone-horizontal,
.lgr-pivot-drop-zone-horizontal {
  flex: 1 1 auto;
  min-width: 10rem;
  border-block-end: none;
}

.lgr-row-group-drop-zone-embedded,
.lgr-pivot-drop-zone-embedded {
  min-height: calc(var(--ag-grid-size, 8px) * 3.5);
  padding-block: calc(var(--ag-grid-size, 8px) * 0.25);
  background: transparent;
}

.lgr-row-group-drop-zone-empty {
  display: inline-flex;
  align-items: center;
  min-height: calc(var(--ag-grid-size, 8px) * 3);
  padding: 0 calc(var(--ag-grid-size, 8px) * 1.5);
  border: 1px dashed var(--ag-border-color, #babfc7);
  border-radius: calc(var(--ag-grid-size, 8px) * 3);
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
  font-size: var(--ag-font-size, 14px);
  line-height: 1;
  white-space: nowrap;
}

.lgr-drop-zone-drag-over,
.lgr-row-group-drop-zone.cdk-drop-list-receiving,
.lgr-pivot-drop-zone.cdk-drop-list-receiving {
  background: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
  outline: 1px dashed var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
  outline-offset: -1px;
  border-radius: var(--ag-border-radius, 4px);
}
`;
