/**
 * Notes styles: the note-presence marker on a cell or full width row, and the
 * built-in note editor popup. Colors follow the AG Grid theme tokens with the
 * Quartz light values as fallbacks (G4: every rule is `lgr-` prefixed).
 */
export const notesCss = `
/* Note-presence marker: a small dot in the cell's top-right corner. The
   marker sits above the cell value without affecting layout or hit-testing
   of the value itself (pointer-events none). */
.ag-cell.lgr-cell-has-note::after,
.ag-full-width-row.lgr-cell-has-note::after {
  content: '';
  position: absolute;
  top: 2px;
  right: 3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ag-active-color, #2196f3);
  pointer-events: none;
  z-index: 1;
}

/* The built-in note editor popup. */
.lgr-note-popup {
  position: absolute;
  width: 300px;
  min-width: 180px;
  max-width: 480px;
  background: var(--ag-background-color, #ffffff);
  border: 1px solid var(--ag-border-color, #d3d3d3);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: var(--ag-font-size, 13px);
  color: var(--ag-foreground-color, #323232);
}

.lgr-note-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px 4px 8px;
  background: var(--ag-header-background-color, #f8f8f8);
  border-bottom: 1px solid var(--ag-border-color, #d3d3d3);
  border-radius: 4px 4px 0 0;
  font-weight: 600;
}

.lgr-note-popup-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lgr-note-popup-close {
  flex: none;
  border: none;
  background: transparent;
  color: var(--ag-foreground-color, #323232);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
}

.lgr-note-popup-close:hover {
  color: var(--ag-active-color, #2196f3);
}

/* Built-in metadata (author, createdAt, updatedAt) — rendered exactly as
   provided by the data source. */
.lgr-note-popup-meta {
  padding: 4px 8px;
  font-size: 11px;
  color: var(--ag-secondary-foreground-color, #757575);
  white-space: pre-line;
}

.lgr-note-popup-body {
  padding: 6px 8px;
}

.lgr-note-popup-text {
  width: 100%;
  min-height: 60px;
  box-sizing: border-box;
  resize: none;
  border: 1px solid var(--ag-border-color, #d3d3d3);
  border-radius: 3px;
  padding: 4px 6px;
  font: inherit;
  color: var(--ag-foreground-color, #323232);
  background: var(--ag-input-background-color, #ffffff);
}

.lgr-note-popup-text:focus {
  outline: none;
  border-color: var(--ag-active-color, #2196f3);
}

.lgr-note-popup-text[readonly] {
  background: var(--ag-odd-row-background-color, #f8f8f8);
}

.lgr-note-popup-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 4px 8px 8px;
}

.lgr-note-popup-remove {
  border: 1px solid var(--ag-border-color, #d3d3d3);
  background: transparent;
  color: var(--ag-foreground-color, #323232);
  border-radius: 3px;
  padding: 2px 10px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.lgr-note-popup-remove:hover:not(:disabled) {
  border-color: var(--ag-danger-color, #b00020);
  color: var(--ag-danger-color, #b00020);
}

.lgr-note-popup-remove:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Drag handle for resizing the popup (bottom-right corner). */
.lgr-note-popup-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}

.lgr-note-popup-resize::after {
  content: '';
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 6px;
  height: 6px;
  border-right: 2px solid var(--ag-secondary-foreground-color, #757575);
  border-bottom: 2px solid var(--ag-secondary-foreground-color, #757575);
}
`;
