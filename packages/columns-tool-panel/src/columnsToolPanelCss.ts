/**
 * Columns tool panel styles — theme-native Quartz metrics.
 *
 * Controls use the shared lgr-* core styles; this file owns the panel layout,
 * the tree list, function sections, and the chooser overlay (see
 * docs/design/ux-1-tool-panel-toolbar.md).
 */
export const columnsToolPanelCss = `
.lgr-columns-tool-panel {
  display: grid;
  gap: calc(var(--ag-grid-size, 8px) * 1);
  padding: calc(var(--ag-grid-size, 8px) * 1.5);
  color: var(--ag-foreground-color, #181d1f);
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
}

.lgr-columns-tool-panel h2,
.lgr-columns-tool-panel h3 {
  margin: 0;
  font: inherit;
  font-weight: 600;
}

.lgr-columns-tool-panel h2 {
  font-size: 1rem;
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
}

.lgr-columns-row,
.lgr-columns-member {
  display: flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.75);
  min-width: 0;
}

.lgr-columns-row {
  padding-left: calc(var(--lgr-column-depth, 0) * 16px);
  padding-block: 2px;
  border-radius: var(--ag-border-radius, 4px);
}

.lgr-columns-row:hover {
  background: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
}

.lgr-columns-row label,
.lgr-columns-member span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lgr-columns-row button {
  flex: none;
}

.lgr-columns-group-toggle {
  width: 2rem;
}

.lgr-columns-children {
  display: grid;
  gap: calc(var(--ag-grid-size, 8px) * 0.75);
}

.lgr-columns-drop-zone {
  min-height: 2rem;
  outline: 1px dashed transparent;
  outline-offset: 3px;
}

.lgr-columns-drop-zone:has([draggable='true']) {
  outline-color: var(--ag-border-color, #babfc7);
}

.lgr-columns-member {
  padding: 2px 0;
}

.lgr-columns-member button {
  margin-left: auto;
}

.lgr-columns-status,
.lgr-columns-unavailable {
  color: var(--ag-secondary-foreground-color, inherit);
  font-size: calc(var(--ag-font-size, 14px) - 2px);
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

.lgr-column-chooser-close {
  float: right;
}
`;
