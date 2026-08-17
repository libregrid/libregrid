/**
 * Simple Filter and selectable filter styles — theme-native Quartz metrics.
 *
 * The Simple Filter is the rule-based comparison card mode (operator select,
 * input, AND/OR join, secondary condition); the selectable filter wraps it in
 * a filter-type mode selector above the active filter UI.
 */
export const selectableFilterCss = `
.lgr-select {
  box-sizing: border-box;
  width: 100%;
  padding: calc(var(--ag-grid-size, 8px) * 0.5) calc(var(--ag-grid-size, 8px) * 0.75);
  border: var(--ag-borders, solid 1px) var(--ag-input-border-color, var(--ag-border-color, #babfc7));
  border-radius: var(--ag-border-radius, 4px);
  background: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #181d1f);
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
  min-height: calc(var(--ag-grid-size, 8px) * 4);
}

.lgr-select:focus {
  outline: none;
  border-color: var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
  box-shadow: var(--ag-input-focus-box-shadow, 0 0 0 3px color-mix(in srgb, transparent, #2196f3 47%));
}

.lgr-selectable-filter {
  display: grid;
  gap: calc(var(--ag-grid-size, 8px) * 0.75);
  min-width: 0;
}

.lgr-filter-type-select {
  max-width: 100%;
}

.lgr-selectable-filter-body {
  min-width: 0;
}

.lgr-simple-filter {
  display: grid;
  gap: calc(var(--ag-grid-size, 8px) * 0.75);
  min-width: 0;
}

/* Operator select first, value input stacked beneath it. */
.lgr-simple-filter-condition {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: calc(var(--ag-grid-size, 8px) * 0.5);
}

.lgr-simple-filter-condition[hidden],
.lgr-simple-filter-join[hidden],
.lgr-simple-filter-condition .lgr-input[hidden] {
  display: none;
}

.lgr-simple-filter-join {
  display: flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 1.5);
}

.lgr-simple-filter-join label {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.5);
  cursor: pointer;
}

.lgr-simple-filter-join input {
  margin: 0;
  accent-color: var(--ag-active-color, #2196f3);
}
`;
