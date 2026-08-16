/**
 * Filters tool panel styles — theme-native Quartz metrics.
 *
 * Cards follow the panel tokens (docs/design/ux-1-tool-panel-toolbar.md):
 * panel background/border, border-radius, no native disclosure marker, and a
 * chip-like status line for active filters.
 */
export const filtersToolPanelCss = `
.lgr-filters-tool-panel {
  display: grid;
  gap: calc(var(--ag-grid-size, 8px) * 1.25);
  padding: calc(var(--ag-grid-size, 8px) * 1.5);
  color: var(--ag-foreground-color, #181d1f);
  background: var(--ag-background-color, #fff);
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
}

.lgr-filters-tool-panel h2 {
  margin: 0;
  font: inherit;
  font-weight: 600;
}

.lgr-filter-card {
  border: var(--ag-borders, solid 1px) var(--ag-panel-border-color, var(--ag-border-color, #babfc7));
  border-radius: var(--ag-border-radius, 4px);
  background: var(--ag-panel-background-color, var(--ag-background-color, #fff));
  padding: calc(var(--ag-grid-size, 8px) * 1);
}

.lgr-filter-card > summary {
  cursor: pointer;
  font-weight: 600;
  list-style: none;
  display: flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.5);
}

.lgr-filter-card > summary::-webkit-details-marker,
.lgr-filter-card > summary::marker {
  display: none;
  content: '';
}

.lgr-filter-card > summary:hover {
  color: var(--ag-active-color, #2196f3);
}

.lgr-filter-card-active {
  border-color: var(--ag-active-color, #2196f3);
}

.lgr-filter-mode-select {
  width: 100%;
  margin-block: calc(var(--ag-grid-size, 8px) * 0.75);
}

.lgr-filter-card-status {
  display: inline-block;
  margin: 0;
  padding: calc(var(--ag-grid-size, 8px) * 0.25) calc(var(--ag-grid-size, 8px) * 0.75);
  border-radius: var(--ag-border-radius, 4px);
  background: var(--ag-chip-background-color, color-mix(in srgb, transparent, var(--ag-foreground-color, #181d1f) 7%));
  font-size: calc(var(--ag-font-size, 14px) - 2px);
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
}

.lgr-filter-card-active .lgr-filter-card-status {
  background: color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 15%);
  color: var(--ag-foreground-color, #181d1f);
}

.lgr-filters-tool-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--ag-grid-size, 8px) * 0.75);
}
`;
