/**
 * Filters tool panel styles — theme-native Quartz metrics for the New Filters
 * Tool Panel (docs/design/ux-1-tool-panel-toolbar.md §1.4 and
 * https://www.ag-grid.com/angular-data-grid/tool-panel-filters-new/).
 *
 * Anatomy: a full-height flex column whose first child is a scrollable card
 * container (cards float to the top, the Add Filter type-ahead sits below
 * them) and whose last child is a pinned Cancel/Apply row. All colors derive
 * from --ag-* tokens (see docs/design/README.md).
 */
export const filtersToolPanelCss = `
.lgr-filter-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  color: var(--ag-foreground-color, #181d1f);
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
}

/* Scrollable card area — cards float to the top; the Add Filter affordance
 * sits at the foot of the list. */
.lgr-filter-panel-container {
  flex: 1;
  overflow: auto;
  padding: var(--ag-widget-container-vertical-padding, 12px) var(--ag-widget-container-horizontal-padding, 12px) 0;
}

.lgr-filter-panel-container > *:not(:last-child) {
  margin-bottom: var(--ag-widget-container-vertical-padding, 12px);
}

/* Card — native border/radius/surface. */
.lgr-filter-card {
  border: 1px solid var(--ag-border-color, #babfc7);
  border-radius: var(--ag-border-radius, 4px);
  background-color: var(--ag-background-color, #fff);
}

.lgr-filter-card-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-top: var(--ag-widget-vertical-spacing, 8px);
}

.lgr-filter-card-header > *:not(:last-child) {
  padding-right: var(--ag-grid-size, 8px);
}

.lgr-filter-card-heading {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding-top: calc(var(--ag-widget-container-vertical-padding, 12px) - var(--ag-widget-vertical-spacing, 8px));
  padding-bottom: calc(var(--ag-widget-container-vertical-padding, 12px) - var(--ag-widget-vertical-spacing, 8px));
  padding-left: var(--ag-widget-horizontal-spacing, 12px);
}

.lgr-filter-card-expand {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--ag-grid-size, 8px);
  width: 100%;
}

.lgr-filter-card-title {
  display: flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.75);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.lgr-filter-card-active-dot {
  flex: none;
  width: var(--ag-grid-size, 8px);
  height: var(--ag-grid-size, 8px);
  border-radius: 50%;
  background: var(--ag-active-color, #2196f3);
}

.lgr-filter-card-expand-icon {
  display: inline-flex;
  flex: 1;
  justify-content: flex-end;
  color: var(--ag-filter-panel-card-subtle-color, var(--ag-foreground-color, #181d1f));
  transition: color 0.25s ease-in-out;
}

.lgr-filter-card-expand-icon svg,
.lgr-filter-card-delete svg,
.lgr-filter-add-button-icon svg {
  display: block;
  width: var(--ag-icon-size, 16px);
  height: var(--ag-icon-size, 16px);
  fill: currentColor;
}

.lgr-filter-card-expand:hover .lgr-filter-card-expand-icon,
.lgr-filter-card-expand:focus-visible .lgr-filter-card-expand-icon {
  color: var(--ag-filter-panel-card-subtle-hover-color, var(--ag-foreground-color, #181d1f));
}

.lgr-filter-card-expand,
.lgr-filter-card-delete {
  border-radius: var(--ag-button-border-radius, var(--ag-border-radius, 4px));
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.lgr-filter-card-expand:focus-visible,
.lgr-filter-card-delete:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
}

.lgr-filter-card-delete {
  margin-right: var(--ag-widget-horizontal-spacing, 12px);
  width: var(--ag-icon-size, 16px);
  height: var(--ag-icon-size, 16px);
  color: var(--ag-filter-panel-card-subtle-color, var(--ag-foreground-color, #181d1f));
  transition: color 0.25s ease-in-out;
}

.lgr-filter-card-delete:hover {
  color: var(--ag-filter-panel-card-subtle-hover-color, var(--ag-foreground-color, #181d1f));
}

/* Body — the real filter UI under the header. */
.lgr-filter-card-body {
  display: grid;
  gap: calc(var(--ag-grid-size, 8px) * 0.75);
  padding: var(--ag-widget-vertical-spacing, 8px) var(--ag-widget-container-horizontal-padding, 12px)
    var(--ag-widget-container-vertical-padding, 12px);
}

.lgr-filter-card-filter {
  min-width: 0;
}

/* Add Filter — borderless card shell around a full-width standard button. */
.lgr-filter-card-add {
  padding: 0;
  border: 0;
}

.lgr-filter-add-button {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: var(--ag-grid-size, 8px);
  width: 100%;
  padding: calc(var(--ag-grid-size, 8px) * 0.5) calc(var(--ag-grid-size, 8px) * 1.25);
  border: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
  border-radius: var(--ag-border-radius, 4px);
  background: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #181d1f);
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
  line-height: 1.5;
  cursor: pointer;
}

.lgr-filter-add-button:hover {
  background: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
}

.lgr-filter-add-button:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
}

.lgr-filter-add-button-icon {
  display: inline-flex;
  flex: none;
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
}

/* Add Filter type-ahead. */
.lgr-filter-add-select {
  border: 1px solid var(--ag-border-color, #babfc7);
  border-radius: var(--ag-border-radius, 4px);
  background: var(--ag-background-color, #fff);
  overflow: hidden;
}

.lgr-filter-add-select .lgr-search {
  padding: var(--ag-widget-vertical-spacing, 8px);
  padding-bottom: 0;
}

.lgr-search {
  position: relative;
  display: flex;
  min-width: 0;
}

.lgr-search .lgr-input {
  width: 100%;
  padding-left: calc(var(--ag-grid-size, 8px) * 3);
}

.lgr-search-icon {
  position: absolute;
  left: var(--ag-grid-size, 8px);
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
  pointer-events: none;
}

.lgr-search-icon svg {
  display: block;
  width: var(--ag-icon-size, 16px);
  height: var(--ag-icon-size, 16px);
  fill: currentColor;
}

.lgr-filter-add-list {
  max-height: calc(var(--ag-list-item-height, 24px) * 8);
  overflow: auto;
  margin-top: var(--ag-widget-vertical-spacing, 8px);
}

.lgr-filter-add-option {
  display: flex;
  align-items: center;
  min-height: var(--ag-list-item-height, 24px);
  padding: 0 calc(var(--ag-grid-size, 8px) * 1.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.lgr-filter-add-option:hover {
  background: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
}

.lgr-filter-add-option.lgr-filter-add-active {
  background: var(--ag-selected-row-background-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 8%));
}

.lgr-filter-add-empty {
  padding: calc(var(--ag-grid-size, 8px) * 1.5);
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
}

/* Pinned Cancel/Apply row. */
.lgr-filter-panel-buttons {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--ag-widget-vertical-spacing, 8px) var(--ag-widget-horizontal-spacing, 12px);
  padding: var(--ag-widget-container-vertical-padding, 12px) var(--ag-widget-container-horizontal-padding, 12px) 0;
}

.lgr-filter-panel > *:where(:last-child) {
  padding-bottom: var(--ag-widget-container-vertical-padding, 12px);
}

.lgr-filter-panel-buttons-button {
  line-height: 1.5;
}

/* Apply commits staged changes — native panel apply-button tokens. */
.lgr-filter-panel-buttons-apply-button {
  background: var(--ag-filter-panel-apply-button-background-color, var(--ag-active-color, #2196f3));
  border-color: var(--ag-filter-panel-apply-button-background-color, var(--ag-active-color, #2196f3));
  color: var(--ag-filter-panel-apply-button-color, var(--ag-background-color, #fff));
}

.lgr-filter-panel-buttons-apply-button:disabled {
  background: var(--ag-input-disabled-background-color, color-mix(in srgb, var(--ag-background-color, #fff), var(--ag-foreground-color, #181d1f) 6%));
  border-color: var(--ag-border-color, #babfc7);
  color: var(--ag-disabled-foreground-color, color-mix(in srgb, transparent, var(--ag-foreground-color, #181d1f) 50%));
  cursor: default;
}
`;
