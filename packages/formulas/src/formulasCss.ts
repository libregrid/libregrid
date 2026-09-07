/**
 * Styles for the formula cell editor. Tokens follow the LibreGrid theme
 * variables so the editor inherits the host theme in light and dark modes.
 */
export const formulasCss = `
.lgr-formula-editor {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
  background: var(--ag-background-color, #fff);
  font-family: var(--ag-font-family, monospace);
  font-size: var(--ag-font-size, 13px);
}
.lgr-formula-editor .lgr-formula-tokens,
.lgr-formula-editor .lgr-formula-input {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0 var(--ag-cell-horizontal-padding, 12px);
  border: 0;
  font: inherit;
  line-height: inherit;
  letter-spacing: inherit;
  white-space: pre;
  overflow: hidden;
}
.lgr-formula-editor .lgr-formula-tokens {
  pointer-events: none;
  color: var(--ag-header-cell-text-color, #181d1f);
  /* Centre the tokenised formula vertically so it sits on the same line as
     the input's caret (inputs always centre their text). */
  display: flex;
  align-items: center;
}
.lgr-formula-editor .lgr-formula-input {
  background: transparent;
  color: transparent;
  caret-color: var(--ag-header-cell-text-color, #181d1f);
  outline: none;
  width: 100%;
  height: 100%;
}
.lgr-formula-editor .lgr-formula-tok-ref { color: #0b7285; }
.lgr-formula-editor .lgr-formula-tok-fn { color: #6741d9; }
.lgr-formula-editor .lgr-formula-tok-num { color: #087f5b; }
.lgr-formula-editor .lgr-formula-tok-str { color: #b02a37; }
.lgr-formula-editor .lgr-formula-tok-bool { color: #8b4513; font-weight: 600; }
.lgr-formula-editor .lgr-formula-tok-op { color: #5c6b70; }
.lgr-formula-editor .lgr-formula-tok-name { color: #c05621; }
.lgr-formula-editor.lgr-formula-invalid .lgr-formula-tokens { color: var(--ag-algae-color, #d63333); }
.lgr-formula-editor.lgr-formula-invalid .lgr-formula-tokens * { color: var(--ag-algae-color, #d63333); }
.lgr-formula-editor .lgr-formula-status {
  position: absolute;
  inset-inline-end: 4px;
  bottom: -18px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--ag-algae-color, #d63333);
  background: var(--ag-background-color, #fff);
  padding: 0 4px;
  border-radius: 2px;
  z-index: 2;
}
.lgr-formula-editor .lgr-formula-status:empty { display: none; }
.lgr-formula-editor .lgr-formula-suggestions {
  display: none;
  position: absolute;
  inset-inline-start: 0;
  top: 100%;
  min-width: 160px;
  max-height: 180px;
  overflow-y: auto;
  background: var(--ag-background-color, #fff);
  border: 1px solid var(--ag-border-color, #e2e2e2);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.2);
  z-index: 3;
}
.lgr-formula-editor .lgr-formula-suggestion {
  padding: 4px 8px;
  cursor: pointer;
  color: var(--ag-data-color, #181d1f);
}
.lgr-formula-editor .lgr-formula-suggestion-active {
  background: var(--ag-row-hover-color, #c8e6d9);
}
`;
