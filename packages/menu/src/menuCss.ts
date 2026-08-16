/**
 * LibreGrid menu styles — theme-native Quartz metrics.
 *
 * Geometry, colors, and states follow the native menu recipe documented in
 * docs/design/ux-2-menus.md: table layout (icon / name / shortcut / arrow
 * cells), 8px list padding, 36px rows, 17px separators, `--ag-card-shadow`,
 * `--ag-menu-*` surface tokens, and the inset focus ring from
 * `--ag-input-focus-border-color`.
 */
export const menuCss = `
.lgr-menu {
  /* Absolute so the grid's popup positioning (top/left on the child) takes
   * effect — without it the menu flows as a full-width block over the grid. */
  position: absolute;
  min-width: var(--ag-menu-min-width, 181px);
  max-height: 100%;
  overflow-y: auto;
  padding: 0;
  background-color: var(--ag-menu-background-color, var(--ag-background-color, #fff));
  border: var(--ag-borders, solid 1px) var(--ag-menu-border-color, var(--ag-border-color, #babfc7));
  border-radius: var(--ag-card-radius, var(--ag-border-radius, 4px));
  box-shadow: var(--ag-card-shadow, 0 1px 4px 1px rgba(186, 191, 199, 0.4));
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
  color: var(--ag-foreground-color, #181d1f);
  user-select: none;
  z-index: 1000;
}

.lgr-menu-list {
  display: table;
  width: 100%;
  padding: var(--ag-grid-size, 8px) 0;
  cursor: default;
}

.lgr-menu-item {
  display: table-row;
  position: relative;
  font-weight: 500;
}

.lgr-menu-item-icon,
.lgr-menu-item-name,
.lgr-menu-item-shortcut,
.lgr-menu-item-arrow {
  display: table-cell;
  vertical-align: middle;
  padding: calc(var(--ag-grid-size, 8px) + 2px) 0;
  line-height: var(--ag-icon-size, 16px);
}

.lgr-menu-item-icon {
  width: var(--ag-icon-size, 16px);
  padding-left: calc(var(--ag-grid-size, 8px) * 1.5);
  color: var(--ag-icon-font-color, currentColor);
}

.lgr-menu-item-icon svg,
.lgr-menu-item-arrow svg {
  display: block;
  width: var(--ag-icon-size, 16px);
  height: var(--ag-icon-size, 16px);
  fill: currentColor;
}

.lgr-menu-item-name {
  padding-left: calc(var(--ag-grid-size, 8px) * 2);
  padding-right: calc(var(--ag-grid-size, 8px) * 2);
  white-space: nowrap;
}

.lgr-menu-item-shortcut {
  padding-right: var(--ag-grid-size, 8px);
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
}

.lgr-menu-item-arrow {
  width: var(--ag-icon-size, 16px);
  padding-right: var(--ag-grid-size, 8px);
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
}

.lgr-menu-item:hover,
.lgr-menu-item-active {
  background-color: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
}

.lgr-menu-item:focus {
  outline: none;
}

.lgr-menu-item:focus-visible::after {
  content: '';
  position: absolute;
  inset: 1px;
  display: block;
  border: 1px solid var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
  background-color: transparent;
  pointer-events: none;
}

.lgr-menu-item-disabled {
  opacity: 0.5;
  cursor: default;
}

.lgr-menu-separator {
  display: table-row;
  height: calc(var(--ag-grid-size, 8px) * 2 + 1px);
}

.lgr-menu-separator-part {
  display: table-cell;
}

.lgr-menu-separator-part::after {
  content: '';
  display: block;
  border-top: var(--ag-borders-critical, solid 1px) var(--ag-border-color, #babfc7);
}

.lgr-sub-menu {
  position: fixed;
  z-index: 1001;
}

/* Custom menu item components participate in the table-row layout: the
 * wrapper has display:contents, so the component's root becomes a cell. */
.lgr-menu-item-custom {
  display: contents;
}

.lgr-column-filter-popup {
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
}
`;
