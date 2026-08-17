/**
 * LibreGrid status bar styles — theme-native Quartz metrics.
 *
 * Geometry follows the native recipe documented in
 * docs/design/ux-3-menu-items-status-bar.md: flex row, 1px top border,
 * 32px side padding, 12px vertical padding, 8px name/value margins,
 * 500-weight tabular-numeral values. No background, no shadow, no radius.
 */
export const statusBarCss = `
.lgr-status-bar {
  display: flex;
  justify-content: space-between;
  overflow: auto hidden;
  scrollbar-width: thin;
  border-top: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
  padding: calc(var(--ag-grid-size, 8px) * 1.5) calc(var(--ag-grid-size, 8px) * 4);
  line-height: 1.5;
  color: var(--ag-header-foreground-color, var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f)));
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
  font-weight: normal;
}

.lgr-status-bar.ag-invisible,
.lgr-status-bar.ag-hidden {
  display: none;
}

.lgr-status-bar-left,
.lgr-status-bar-center,
.lgr-status-bar-right {
  display: inline-flex;
}

.lgr-status-bar-center {
  text-align: center;
}

.lgr-status-panel {
  display: inline-flex;
}

.lgr-status-panel-hidden {
  display: none;
}

.lgr-status-name-value {
  display: inline-flex;
  gap: calc(var(--ag-grid-size, 8px) * 0.5);
  margin: 0 var(--ag-grid-size, 8px);
  padding: calc(var(--ag-grid-size, 8px) * 1.5) 0;
  white-space: nowrap;
}

.lgr-status-name-value-value {
  color: var(--ag-foreground-color, #181d1f);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
`;
