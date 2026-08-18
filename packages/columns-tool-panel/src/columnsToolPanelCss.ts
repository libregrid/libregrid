/**
 * Columns tool panel styles — theme-native Quartz metrics.
 *
 * Layout follows the native column panel (docs/design/ux-1-tool-panel-toolbar.md
 * §2): a header row with the select-all checkbox and the search input, 24px
 * list rows with per-level indentation, hover-revealed icon controls, a grip
 * drag handle, chip members in the function sections, dashed drop-zone empty
 * states, and a labeled pivot-mode toggle. All tokens are `--ag-*`.
 */
export const columnsToolPanelCss = `
.lgr-columns-tool-panel {
  display: grid;
  gap: calc(var(--ag-grid-size, 8px) * 1.5);
  padding: calc(var(--ag-grid-size, 8px) * 1.5);
  color: var(--ag-foreground-color, #181d1f);
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
}

.lgr-columns-tool-panel h2 {
  margin: 0;
  font: inherit;
  font-weight: 600;
  /* App shells often style h1-h6 globally; the panel must follow the grid
   * theme tokens instead. */
  color: inherit;
  letter-spacing: inherit;
}

/* Header: select-all checkbox + search input on one row. */
.lgr-columns-header {
  display: flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 1.5);
}

.lgr-search {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
}

.lgr-search .lgr-input {
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

.lgr-columns-toolbar,
.lgr-columns-list,
.lgr-columns-section {
  display: grid;
  gap: calc(var(--ag-grid-size, 8px) * 0.75);
}

.lgr-columns-toolbar {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.lgr-columns-actions {
  display: flex;
  justify-content: flex-end;
  gap: calc(var(--ag-grid-size, 8px) * 0.75);
}

.lgr-columns-list {
  overflow: auto;
  gap: 0;
}

/* Rows: native 24px list items, 12px inline padding, 24px per tree level. */
.lgr-columns-row {
  display: flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.75);
  min-width: 0;
  min-height: var(--ag-list-item-height, 24px);
  padding-inline: calc(var(--ag-grid-size, 8px) * 1.5);
  padding-left: calc(
    var(--ag-grid-size, 8px) * 1.5 + var(--lgr-column-depth, 0) * var(--ag-column-select-indent-size, 24px)
  );
  border-radius: var(--ag-border-radius, 4px);
}

.lgr-columns-row:hover {
  background: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
}

.lgr-columns-row label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lgr-columns-row label {
  flex: 1;
  min-width: 0;
}

.lgr-columns-row button {
  flex: none;
}

/* Rows keep the native 24px list-item height: controls are compact. */
.lgr-columns-row .lgr-icon-button {
  width: calc(var(--ag-grid-size, 8px) * 3);
  height: calc(var(--ag-grid-size, 8px) * 3);
}

.lgr-columns-row .lgr-icon-button svg {
  display: block;
  width: var(--ag-icon-size, 16px);
  height: var(--ag-icon-size, 16px);
  fill: currentColor;
}

/* Pin / move controls appear on hover (and stay reachable by keyboard). */
.lgr-columns-row-actions {
  display: flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.25);
  margin-left: auto;
  opacity: 0;
}

.lgr-columns-row:hover .lgr-columns-row-actions,
.lgr-columns-row:focus-within .lgr-columns-row-actions {
  opacity: 1;
}

.lgr-columns-drag-handle {
  display: inline-flex;
  flex: none;
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
  cursor: grab;
}

.lgr-columns-drag-handle svg {
  display: block;
  width: var(--ag-icon-size, 16px);
  height: var(--ag-icon-size, 16px);
  fill: currentColor;
}

.lgr-columns-children {
  display: grid;
  gap: 0;
}

.lgr-columns-drop-zone {
  min-height: 2rem;
  outline: 1px dashed transparent;
  outline-offset: 3px;
}

.lgr-columns-drop-zone:has([draggable='true']) {
  outline-color: var(--ag-border-color, #babfc7);
}

.lgr-drop-zone-drag-over {
  background: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
  outline: 1px dashed var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
  outline-offset: -1px;
}

.lgr-columns-members {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.5);
  padding-inline: calc(var(--ag-grid-size, 8px) * 0.5);
}

/* Empty function sections: native centered dashed box (12px/16px margin,
 * 16px padding, full foreground color). */
.lgr-columns-drop-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: calc(var(--ag-grid-size, 8px) * 1.5) calc(var(--ag-grid-size, 8px) * 2);
  padding: calc(var(--ag-grid-size, 8px) * 2);
  border: 1px dashed var(--ag-border-color, #babfc7);
  color: var(--ag-foreground-color, #181d1f);
}

.lgr-columns-status,
.lgr-columns-unavailable {
  color: var(--ag-secondary-foreground-color, inherit);
  font-size: calc(var(--ag-font-size, 14px) - 2px);
}

.lgr-pivot-mode {
  display: flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 1.5);
  padding: calc(var(--ag-grid-size, 8px) * 0.5) calc(var(--ag-grid-size, 8px) * 1.5);
}

.lgr-pivot-mode > span:not(.lgr-toggle) {
  flex: 1;
  min-width: 0;
}

.lgr-column-chooser-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  background: var(--ag-modal-overlay-background-color, rgb(0 0 0 / 45%));
}

.lgr-column-chooser-dialog {
  width: min(420px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 16px;
  background: var(--ag-background-color, #fff);
  border: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
  border-radius: var(--ag-wrapper-border-radius, 8px);
  box-shadow: var(--ag-popup-shadow, 0 0 16px 0 rgba(0, 0, 0, 0.15));
  font-family: var(--ag-font-family, inherit);
}

.lgr-column-chooser-dialog h2 {
  margin: 0 0 calc(var(--ag-grid-size, 8px) * 1.5);
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  color: inherit;
}

.lgr-column-chooser-close {
  float: right;
}
`;
