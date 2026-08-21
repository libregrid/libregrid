/**
 * LibreGrid side bar styles — theme-native Quartz metrics.
 *
 * Geometry follows the native recipe in docs/design/ux-1-tool-panel-toolbar.md:
 * 32px control-panel strip, 144px-tall icon-over-label buttons, selected tab
 * on --ag-background-color with top/bottom borders, inset focus ring.
 */
export const sideBarCss = `
.lgr-side-bar {
  position: relative;
  display: flex;
  flex-direction: row;
  height: 100%;
  width: calc(var(--ag-icon-size, 16px) + var(--ag-grid-size, 8px) * 2);
  background: var(--ag-control-panel-background-color, var(--ag-chrome-background-color, #f8f8f8));
  border-left: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
  font-family: var(--ag-font-family, inherit);
  flex: none;
}

/* AG Grid marks hidden framework components as ag-invisible (visibility: hidden).
 * A side bar is a flex sibling of the grid body, so it must also leave the layout. */
.lgr-side-bar.ag-invisible {
  display: none;
}

/* Left position: the bar itself moves to the grid's left (order: -1 in the
 * root wrapper's flex row, mirroring the native .ag-side-bar-left), and the
 * button strip flips to the panel's inner edge, against the grid. */
.lgr-side-bar-left {
  order: -1;
  flex-direction: row-reverse;
  border-left: none;
  border-right: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
}

.lgr-side-bar-buttons {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: calc(var(--ag-grid-size, 8px) * 4);
  background: var(--ag-control-panel-background-color, var(--ag-chrome-background-color, #f8f8f8));
}

.lgr-side-bar-buttons-hidden .lgr-side-bar-buttons {
  display: none;
}

.lgr-side-bar-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 100%;
  min-height: calc(var(--ag-grid-size, 8px) * 18);
  padding: calc(var(--ag-grid-size, 8px) * 2) 0;
  border: none;
  border-top: var(--ag-borders-side-button, none) var(--ag-border-color, #babfc7);
  border-bottom: var(--ag-borders-side-button, none) var(--ag-border-color, #babfc7);
  background: transparent;
  color: var(--ag-foreground-color, #181d1f);
  cursor: pointer;
  position: relative;
}

/* The Material renderer reuses .lgr-side-bar-button on an MDC button. MDC's
 * min-width (64px) and horizontal padding are wider than the 32px strip, so
 * the button overflows it and the icon and label are pushed out of view.
 * Parent-qualify + double the class to win over the MDC selectors. */
.lgr-side-bar-buttons .lgr-side-bar-button.lgr-side-bar-button {
  min-width: 0;
  width: 100%;
  height: auto;
  padding: calc(var(--ag-grid-size, 8px) * 2) 0;
}

/* Angular Material wraps a mat-button's projected content in
 * .mdc-button__label (display: block). The icon and label stop being flex
 * children of the column button and share a baseline, which renders the
 * label above the icon. Restore the icon-over-label column stack. */
.lgr-side-bar-button .mdc-button__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.lgr-side-bar-button:hover {
  background: var(--ag-icon-button-hover-background-color, color-mix(in srgb, transparent, var(--ag-foreground-color, #181d1f) 10%));
}

.lgr-side-bar-button[aria-expanded='true'] {
  background: var(--ag-background-color, #fff);
}

.lgr-side-bar-button:focus-visible {
  outline: none;
}

.lgr-side-bar-button:focus-visible::after {
  content: '';
  position: absolute;
  inset: 4px 1px;
  border: 1px solid var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
  pointer-events: none;
}

.lgr-side-bar-button-icon {
  display: inline-flex;
  width: var(--ag-icon-size, 16px);
  height: var(--ag-icon-size, 16px);
  color: var(--ag-icon-font-color, currentColor);
}

.lgr-side-bar-button-icon svg {
  display: block;
  width: 100%;
  height: 100%;
  fill: currentColor;
}

/* Vertical label: top of the text points to the right of the screen
 * (writing-mode vertical-rl rotates glyphs 90deg clockwise). */
.lgr-side-bar-button-label {
  font-size: calc(var(--ag-font-size, 14px) - 3px);
  line-height: 1;
  writing-mode: vertical-rl;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 100%;
  padding: 2px 0;
}

/* The panel is a drawer over the grid, not a flex sibling: it never
 * changes the grid's footprint. Closed = display:none (no placeholder). */
.lgr-side-bar-panel {
  position: absolute;
  top: 0;
  bottom: 0;
  display: none;
  min-width: 100px;
  max-width: 500px;
  /* Content scrolls inside .lgr-side-bar-panel-content; the panel itself
   * stays overflow-visible so the resize handle is not clipped. */
  overflow: visible;
  background: var(--ag-control-panel-background-color, var(--ag-chrome-background-color, #f8f8f8));
  color: var(--ag-foreground-color, #181d1f);
  font-size: var(--ag-font-size, 14px);
  border: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
  box-shadow: var(--ag-popup-shadow, 0 0 16px 0 rgba(0, 0, 0, 0.15));
  z-index: 5;
}

.lgr-side-bar-panel-open {
  display: block;
}

/* Right position: opens inward, to the left of the bar, over the grid. */
.lgr-side-bar:not(.lgr-side-bar-left) .lgr-side-bar-panel {
  right: 100%;
}

/* Left position: opens inward, to the right of the bar, over the grid. */
.lgr-side-bar-left .lgr-side-bar-panel {
  left: 100%;
}

.lgr-side-bar-panel-content {
  height: 100%;
  overflow: auto;
}

.lgr-side-bar-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 6;
}

.lgr-side-bar:not(.lgr-side-bar-left) .lgr-side-bar-resize-handle {
  left: -3px;
}

.lgr-side-bar-left .lgr-side-bar-resize-handle {
  right: -3px;
}

.lgr-side-bar-resize-handle:hover,
.lgr-side-bar-resize-handle:active {
  background: color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 25%);
}

.lgr-tool-panel {
  padding: calc(var(--ag-grid-size, 8px) * 1.5);
}

.lgr-tool-panel-header {
  font-weight: 600;
  margin-bottom: var(--ag-grid-size, 8px);
  padding-bottom: var(--ag-grid-size, 8px);
  border-bottom: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
}

.lgr-tool-panel-body {
  font-size: calc(var(--ag-font-size, 14px) - 1px);
  color: var(--ag-foreground-color, #181d1f);
}

.lgr-tool-panel-missing {
  padding: 16px;
  color: var(--ag-foreground-color, #181d1f);
  opacity: 0.6;
  font-style: italic;
}
`;
