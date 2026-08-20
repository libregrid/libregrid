/**
 * Calculated-column dialog styles (G4: `lgr-` prefix).
 *
 * The calculated-column cell/header tint and the edit-highlight tint are
 * Community CSS (`.ag-calculated-column` + `.ag-calculated-column-highlighted`,
 * driven by `calculatedColsSvc.isHighlightedColumn`); this sheet styles the
 * dialog chrome only.
 */
export const calculatedColumnsCss = `*
.lgr-calc-dialog {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #111);
  border: 1px solid var(--ag-border-color, #ddd);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  font: inherit;
}

.lgr-calc-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lgr-calc-dialog-heading {
  font-weight: 600;
  font-size: 13px;
}

.lgr-calc-dialog-close {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.lgr-calc-dialog-close:hover {
  background: var(--ag-hover-color, rgba(0, 0, 0, 0.06));
}

.lgr-calc-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lgr-calc-dialog-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.lgr-calc-dialog-field-label {
  font-size: 11px;
  color: var(--ag-secondary-foreground-color, #555);
}

.lgr-calc-dialog-title-input,
.lgr-calc-dialog-type,
.lgr-calc-dialog-expression {
  border: 1px solid var(--ag-border-color, #ccc);
  border-radius: 4px;
  padding: 4px 6px;
  font: inherit;
  background: var(--ag-input-background-color, #fff);
  color: inherit;
  width: 100%;
  box-sizing: border-box;
}

.lgr-calc-dialog-expression {
  font-family: var(--ag-font-family-monospace, monospace);
}

.lgr-calc-dialog-pickers {
  display: flex;
  gap: 4px;
}

.lgr-calc-dialog-picker-wrap {
  position: relative;
  display: inline-block;
}

.lgr-calc-dialog-picker {
  border: 1px solid var(--ag-border-color, #ccc);
  background: var(--ag-background-color, #fff);
  color: inherit;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
}

.lgr-calc-dialog-picker-list {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  min-width: 260px;
  max-height: 240px;
  overflow-y: auto;
  background: var(--ag-background-color, #fff);
  border: 1px solid var(--ag-border-color, #ddd);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 2px;
}

.lgr-calc-dialog-picker-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 4px 6px;
  border-radius: 3px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.lgr-calc-dialog-picker-item:hover {
  background: var(--ag-hover-color, rgba(0, 0, 0, 0.06));
}

.lgr-calc-dialog-picker-item code {
  flex: none;
  font-family: var(--ag-font-family-monospace, monospace);
}

.lgr-calc-dialog-picker-label {
  color: var(--ag-secondary-foreground-color, #666);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lgr-calc-dialog-suggest {
  position: absolute;
  z-index: 11;
  left: 0;
  right: 0;
  top: 100%;
  max-height: 200px;
  overflow-y: auto;
  background: var(--ag-background-color, #fff);
  border: 1px solid var(--ag-border-color, #ddd);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 2px;
}

.lgr-calc-dialog-suggest-item {
  display: flex;
  gap: 8px;
  align-items: baseline;
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  padding: 4px 6px;
  border-radius: 3px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.lgr-calc-dialog-suggest-item code {
  flex: none;
  font-family: var(--ag-font-family-monospace, monospace);
}

.lgr-calc-dialog-suggest-active,
.lgr-calc-dialog-suggest-item:hover {
  background: var(--ag-hover-color, rgba(0, 0, 0, 0.06));
}

.lgr-calc-dialog-error {
  font-size: 12px;
  color: var(--ag-error-foreground-color, #b00020);
  white-space: pre-wrap;
}

.lgr-calc-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.lgr-calc-dialog-footer button {
  border: 1px solid var(--ag-border-color, #ccc);
  background: var(--ag-background-color, #fff);
  color: inherit;
  border-radius: 4px;
  padding: 4px 12px;
  font: inherit;
  cursor: pointer;
}

.lgr-calc-dialog-apply {
  background: var(--ag-accent-color, #007aff);
  border-color: var(--ag-accent-color, #007aff);
  color: #fff;
}
`;
