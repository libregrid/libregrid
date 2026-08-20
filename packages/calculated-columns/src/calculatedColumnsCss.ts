/** Calculated-column expression builder modal styles (G4: `lgr-` prefix). */
export const calculatedColumnsCss = `
.lgr-calc-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.35);
}

.lgr-calc-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(860px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 20px;
  box-sizing: border-box;
  background: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #111);
  border: 1px solid var(--ag-border-color, #ddd);
  border-radius: 8px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.3);
  font: inherit;
}

.lgr-calc-dialog-header,
.lgr-calc-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lgr-calc-dialog-heading {
  margin: 0;
  font: inherit;
  font-size: 17px;
  font-weight: 650;
}

.lgr-calc-dialog-close {
  border: none;
  border-radius: 4px;
  padding: 3px 7px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.lgr-calc-dialog-close:hover,
.lgr-calc-dialog-close:focus-visible {
  background: var(--ag-hover-color, rgba(0, 0, 0, 0.08));
}

.lgr-calc-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lgr-calc-dialog-meta {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(160px, 0.35fr);
  gap: 12px;
}

.lgr-calc-dialog-field,
.lgr-calc-dialog-expression-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  position: relative;
}

.lgr-calc-dialog-field-label,
.lgr-calc-dialog-palette-title {
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #333));
  font-size: 12px;
  font-weight: 600;
}

.lgr-calc-dialog-title-input,
.lgr-calc-dialog-type,
.lgr-calc-dialog-expression,
.lgr-calc-dialog-column-search {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--ag-border-color, #ccc);
  border-radius: 4px;
  padding: 7px 8px;
  background: var(--ag-input-background-color, #fff);
  color: inherit;
  font: inherit;
}

.lgr-calc-dialog-builder {
  display: grid;
  grid-template-columns: minmax(235px, 0.75fr) minmax(0, 1.25fr);
  gap: 16px;
  align-items: stretch;
}

.lgr-calc-dialog-palette,
.lgr-calc-dialog-expression-field {
  min-height: 300px;
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid var(--ag-border-color, #ddd);
  border-radius: 6px;
  background: var(--ag-subtle-background-color, rgba(0, 0, 0, 0.018));
}

.lgr-calc-dialog-palette {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.lgr-calc-dialog-palette-drop-target {
  outline: 2px dashed var(--ag-accent-color, #007aff);
  outline-offset: 2px;
  background: var(--ag-hover-color, rgba(0, 0, 0, 0.06));
}

.lgr-calc-dialog-palette-tabs {
  display: flex;
  gap: 3px;
  border-bottom: 1px solid var(--ag-border-color, #ddd);
}

.lgr-calc-dialog-palette-tab {
  flex: 1 1 auto;
  margin-bottom: -1px;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 6px 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.lgr-calc-dialog-palette-tab[aria-selected="true"] {
  border-bottom-color: var(--ag-accent-color, #007aff);
  color: var(--ag-accent-color, #007aff);
  font-weight: 650;
}

.lgr-calc-dialog-palette-panel {
  min-height: 0;
  overflow: auto;
}

.lgr-calc-dialog-palette-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 8px;
}

.lgr-calc-dialog-palette-item,
.lgr-calc-dialog-suggest-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 6px 7px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.lgr-calc-dialog-palette-item:hover,
.lgr-calc-dialog-palette-item:focus-visible,
.lgr-calc-dialog-suggest-item:hover,
.lgr-calc-dialog-suggest-active {
  border-color: var(--ag-border-color, #ccc);
  background: var(--ag-hover-color, rgba(0, 0, 0, 0.06));
}

.lgr-calc-dialog-palette-item code,
.lgr-calc-dialog-suggest-item code,
.lgr-calc-dialog-expression {
  font-family: var(--ag-font-family-monospace, monospace);
}

.lgr-calc-dialog-palette-item-detail {
  overflow: hidden;
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #333));
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lgr-calc-dialog-palette-item-column { border-left-color: #4daacb; }
.lgr-calc-dialog-palette-item-function { border-left-color: #ab84d4; }
.lgr-calc-dialog-palette-item-operator { border-left-color: #d68b41; }
.lgr-calc-dialog-palette-item-literal { border-left-color: #6fab69; }

.lgr-calc-dialog-palette-item-dragging {
  border-radius: 999px;
  opacity: 0.62;
}

.lgr-calc-dialog-operator-group + .lgr-calc-dialog-operator-group { margin-top: 12px; }
.lgr-calc-dialog-operator-group h3 {
  margin: 0;
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #333));
  font: inherit;
  font-size: 11px;
  font-weight: 650;
}

.lgr-calc-dialog-palette-empty,
.lgr-calc-dialog-expression-canvas-message {
  margin: 8px 0;
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #333));
  font-size: 12px;
}

.lgr-calc-dialog-expression-canvas {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: center;
  gap: 4px;
  min-height: 145px;
  padding: 10px 50px 48px 10px;
  border: 1px dashed var(--ag-border-color, #bbb);
  border-radius: 5px;
  background: var(--ag-background-color, #fff);
}

.lgr-calc-dialog-expression-canvas[data-invalid="true"] {
  border-color: var(--ag-error-foreground-color, #b00020);
}

.lgr-calc-dialog-expression-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 2px 7px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-family: var(--ag-font-family-monospace, monospace);
  font-size: 12px;
  white-space: pre;
}

.lgr-calc-dialog-expression-chip-column { border-color: #82cbe9; background: #e9f7fc; color: #075c81; }
.lgr-calc-dialog-expression-chip-function { border-color: #c6a9e8; background: #f4edfc; color: #5c278c; }
.lgr-calc-dialog-expression-chip-operator { border-color: #efbe8d; background: #fff3e5; color: #8a4300; }
.lgr-calc-dialog-expression-chip-literal { border-color: #a9d7a6; background: #edf9ec; color: #216421; }
.lgr-calc-dialog-expression-chip-punctuation { border-color: #c9c9c9; background: #f5f5f5; color: #454545; }

.lgr-calc-dialog-expression-chip-draggable { cursor: grab; }
.lgr-calc-dialog-expression-chip-dragging { cursor: grabbing; opacity: 0.55; }

.lgr-calc-dialog-expression-chip-inline-edit {
  padding: 0;
  overflow: hidden;
}

.lgr-calc-dialog-inline-value-input {
  min-width: 72px;
  height: 26px;
  box-sizing: border-box;
  border: 0;
  padding: 2px 7px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  outline: 2px solid var(--ag-accent-color, #007aff);
  outline-offset: -2px;
}

.lgr-calc-dialog-inline-value-input[type="date"] { min-width: 130px; }

.lgr-calc-dialog-expression-gap {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border: 1px dashed color-mix(in srgb, var(--ag-background-color, #fff) 58%, #000);
  border-radius: 5px;
  padding: 0;
  background: color-mix(in srgb, var(--ag-background-color, #fff) 84%, #000);
  cursor: pointer;
  opacity: 0.9;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.lgr-calc-dialog-expression-gap:hover,
.lgr-calc-dialog-expression-gap:focus-visible,
.lgr-calc-dialog-expression-gap-dragover {
  border-color: var(--ag-accent-color, #007aff);
  opacity: 1;
}

.lgr-calc-dialog-expression-gap:focus-visible {
  outline: 2px solid var(--ag-accent-color, #007aff);
  outline-offset: 1px;
}

.lgr-calc-dialog-expression-gap-dragover {
  background: color-mix(in srgb, var(--ag-background-color, #fff) 76%, var(--ag-accent-color, #007aff));
  opacity: 1;
}

/* Keep drag coordinates stable while advertising that gaps accept a drop. */
.lgr-calc-dialog-expression-canvas[data-dragging="true"] .lgr-calc-dialog-expression-gap {
  border-color: color-mix(in srgb, var(--ag-background-color, #fff) 58%, #000);
  background: color-mix(in srgb, var(--ag-background-color, #fff) 84%, #000);
  opacity: 1;
}

.lgr-calc-dialog-expression-canvas[data-dragging="true"] .lgr-calc-dialog-expression-gap-dragover {
  border-color: var(--ag-accent-color, #007aff);
  background: var(--ag-hover-color, rgba(0, 0, 0, 0.06));
}

.lgr-calc-dialog-expression-trash-target {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 1;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  box-sizing: border-box;
  border: 1px dashed var(--ag-border-color, #999);
  border-radius: 5px;
  background: var(--ag-header-background-color, #e3e3e3);
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #333));
  font-size: 15px;
  line-height: 1;
  opacity: 0.8;
}

.lgr-calc-dialog-expression-trash-target-dragover {
  border-color: var(--ag-error-foreground-color, #b00020);
  background: var(--ag-error-background-color, #fdecef);
  color: var(--ag-error-foreground-color, #b00020);
  opacity: 1;
}

.lgr-calc-dialog-drag-preview {
  position: fixed;
  top: -100px;
  left: -100px;
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 2px 10px;
  box-sizing: border-box;
  border: 1px solid var(--ag-accent-color, #007aff);
  border-radius: 999px;
  background: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #111);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  font-family: var(--ag-font-family-monospace, monospace);
  font-size: 12px;
  white-space: nowrap;
}

.lgr-calc-dialog-expression-help {
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #333));
  font-size: 11px;
}

.lgr-calc-dialog-suggest {
  position: absolute;
  z-index: 1;
  max-height: 190px;
  overflow-y: auto;
  margin-top: 77px;
  padding: 2px;
  background: var(--ag-background-color, #fff);
  border: 1px solid var(--ag-border-color, #ddd);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.lgr-calc-dialog-error {
  color: var(--ag-error-foreground-color, #b00020);
  font-size: 12px;
  white-space: pre-wrap;
}

.lgr-calc-dialog-footer { justify-content: flex-end; }
.lgr-calc-dialog-footer button {
  border: 1px solid var(--ag-border-color, #ccc);
  border-radius: 4px;
  padding: 6px 12px;
  background: var(--ag-background-color, #fff);
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.lgr-calc-dialog-apply {
  background: var(--ag-accent-color, #007aff) !important;
  border-color: var(--ag-accent-color, #007aff) !important;
  color: #fff !important;
}

@media (max-width: 640px) {
  .lgr-calc-dialog-overlay { padding: 8px; }
  .lgr-calc-dialog { width: calc(100vw - 16px); max-height: calc(100vh - 16px); padding: 14px; }
  .lgr-calc-dialog-meta,
  .lgr-calc-dialog-builder { grid-template-columns: 1fr; }
  .lgr-calc-dialog-palette,
  .lgr-calc-dialog-expression-field { min-height: 0; }
  .lgr-calc-dialog-expression-canvas { min-height: 110px; }
}
`;
