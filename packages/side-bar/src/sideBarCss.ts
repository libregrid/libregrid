/**
 * LibreGrid side bar styles.
 * Injected as inline CSS via Module.css — keeps sideEffects: false valid.
 */
export const sideBarCss = `
.lgr-side-bar {
  position: relative;
  display: flex;
  flex-direction: row;
  height: 100%;
  background: var(--ag-chrome-background-color, #f8f8f8);
  border-left: 1px solid var(--ag-border-color, #ddd);
}

.lgr-side-bar-left {
  flex-direction: row-reverse;
  border-left: none;
  border-right: 1px solid var(--ag-border-color, #ddd);
}

.lgr-side-bar-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 4px;
  border-right: 1px solid var(--ag-border-color, #ddd);
}

.lgr-side-bar-buttons-hidden .lgr-side-bar-buttons {
  display: none;
}

.lgr-side-bar-left .lgr-side-bar-buttons {
  border-right: none;
  border-left: 1px solid var(--ag-border-color, #ddd);
}

.lgr-side-bar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: var(--ag-foreground-color, #000);
}

.lgr-side-bar-button:hover {
  background: var(--ag-row-hover-color, rgba(0, 0, 0, 0.04));
}

.lgr-side-bar-button[aria-expanded="true"] {
  background: var(--ag-selected-row-background-color, rgba(0, 0, 0, 0.08));
}

.lgr-side-bar-panel {
  flex: none;
  min-width: 100px;
  max-width: 500px;
  overflow: auto;
}

.lgr-side-bar-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -3px;
  width: 6px;
  cursor: col-resize;
  z-index: 1;
}

.lgr-side-bar-left .lgr-side-bar-resize-handle {
  left: auto;
  right: -3px;
}

.lgr-tool-panel {
  padding: 8px;
}

.lgr-tool-panel-header {
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--ag-border-color, #ddd);
}

.lgr-tool-panel-body {
  font-size: 0.9em;
  color: var(--ag-foreground-color, #000);
}

.lgr-tool-panel-missing {
  padding: 16px;
  color: var(--ag-foreground-color, #000);
  opacity: 0.6;
  font-style: italic;
}
`;
