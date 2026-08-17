/**
 * Quick Access Toolbar styles — theme-native Quartz metrics.
 *
 * Geometry follows the native recipe in docs/design/ux-1-tool-panel-toolbar.md
 * §2.4: header-height bar, 16px item margins, 8px button padding/gap, hover
 * via --ag-icon-button-hover-background-color, focus via
 * --ag-input-focus-box-shadow, horizontal-scroll overflow.
 */
export const toolbarCss = `
.lgr-toolbar {
  display: flex;
  align-items: center;
  overflow: auto hidden;
  scrollbar-width: thin;
  border-bottom: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
  min-height: var(--ag-header-height, 48px);
  background-color: var(--ag-toolbar-background-color, var(--ag-header-background-color, #f8f8f8));
  color: var(--ag-toolbar-text-color, var(--ag-foreground-color, #181d1f));
  font-family: var(--ag-header-font-family, var(--ag-font-family, inherit));
  font-size: var(--ag-header-font-size, var(--ag-font-size, 14px));
  white-space: nowrap;
}

.lgr-toolbar.ag-invisible,
.lgr-toolbar.ag-hidden {
  display: none;
}

.lgr-toolbar-right-start {
  margin-inline-start: auto;
}

.lgr-toolbar-item {
  display: inline-flex;
  align-items: center;
  margin: 0 calc(var(--ag-grid-size, 8px) * 2);
}

.lgr-toolbar-button {
  display: inline-flex;
  align-items: center;
  gap: var(--ag-grid-size, 8px);
  padding: var(--ag-grid-size, 8px);
  border: 0;
  background: transparent;
  color: var(--ag-toolbar-text-color, var(--ag-foreground-color, #181d1f));
  cursor: pointer;
  line-height: 1;
  font-family: inherit;
  font-size: inherit;
  border-radius: calc(var(--ag-border-radius, 4px) + 1px);
}

.lgr-toolbar-button:hover {
  background: var(--ag-icon-button-hover-background-color, color-mix(in srgb, transparent, var(--ag-foreground-color, #181d1f) 10%));
}

.lgr-toolbar-button:focus-visible {
  outline: none;
  box-shadow: var(--ag-input-focus-box-shadow, 0 0 0 3px color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 47%));
}

.lgr-toolbar-button:disabled {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}

.lgr-toolbar-button svg {
  display: block;
  width: var(--ag-icon-size, 16px);
  height: var(--ag-icon-size, 16px);
  fill: currentColor;
}

.lgr-toolbar-separator {
  width: var(--ag-toolbar-separator-width, 1px);
  height: calc(var(--ag-grid-size, 8px) * 2);
  margin: 0 calc(var(--ag-grid-size, 8px) * 1.75);
  background: var(--ag-toolbar-separator-color, var(--ag-border-color, #babfc7));
}

.lgr-toolbar-input-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.lgr-toolbar-input {
  min-width: 200px;
  padding-block: calc(var(--ag-grid-size, 8px) * 0.5);
  padding-inline: calc(var(--ag-icon-size, 16px) + var(--ag-grid-size, 8px) * 2) var(--ag-grid-size, 8px);
  border: var(--ag-borders, solid 1px) var(--ag-input-border-color, var(--ag-border-color, #babfc7));
  border-radius: var(--ag-border-radius, 4px);
  background: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #181d1f);
  font-family: inherit;
  font-size: inherit;
}

.lgr-toolbar-input::placeholder {
  color: var(--ag-disabled-foreground-color, color-mix(in srgb, transparent, var(--ag-foreground-color, #181d1f) 50%));
}

.lgr-toolbar-input:focus {
  outline: none;
  border-color: var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
  box-shadow: var(--ag-input-focus-box-shadow, 0 0 0 3px color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 47%));
}

.lgr-toolbar-input-icon {
  position: absolute;
  inset-inline-start: var(--ag-grid-size, 8px);
  opacity: 0.5;
  pointer-events: none;
  display: inline-flex;
}

.lgr-toolbar-input-icon svg {
  display: block;
  width: var(--ag-icon-size, 16px);
  height: var(--ag-icon-size, 16px);
  fill: currentColor;
}

.lgr-toolbar-find-input {
  width: 280px;
  min-width: 220px;
}

.lgr-toolbar-find-group {
  display: inline-flex;
  align-items: center;
}

.lgr-toolbar-find-count {
  margin: 0 var(--ag-grid-size, 8px);
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
`;
