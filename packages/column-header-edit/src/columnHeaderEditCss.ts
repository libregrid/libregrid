/**
 * Header-name editor styles: a small inline editor overlaid on the header
 * cell being edited. Colors follow the theme tokens with the Quartz light
 * values as fallbacks.
 *
 * The editor is appended to the grid's root div (`eRootDiv`) and positioned
 * absolutely over the header cell; `.ag-root-wrapper` is `position: relative`
 * in the theme, so the absolute coordinates resolve against the grid.
 */
export const columnHeaderEditCss = `
.lgr-header-name-editor {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  overflow: hidden;
  background: var(--ag-header-background-color, #f3f3f3);
  border: 1px solid var(--ag-active-color, #2196f3);
  box-sizing: border-box;
}

.lgr-header-name-editor-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: var(--ag-input-background-color, #ffffff);
  color: var(--ag-header-text-color, #000000);
  font: inherit;
  padding: 2px 4px;
}

.lgr-header-name-editor-apply,
.lgr-header-name-editor-cancel {
  flex: none;
  border: 1px solid var(--ag-border-color, #c8c8c8);
  border-radius: 2px;
  background: var(--ag-input-background-color, #ffffff);
  color: var(--ag-input-text-color, #000000);
  font: inherit;
  font-size: 11px;
  padding: 1px 6px;
  cursor: pointer;
}

.lgr-header-name-editor-apply:hover,
.lgr-header-name-editor-cancel:hover {
  border-color: var(--ag-active-color, #2196f3);
}
`;
