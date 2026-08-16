/**
 * Shared LibreGrid control styles.
 *
 * One theme-native stylesheet for every LibreGrid control surface. All colors,
 * radii, shadows, and gaps derive from the Quartz theme's `--ag-*` variables
 * (see docs/design/README.md), so light and dark mode are inherited from the
 * grid theme automatically. No hardcoded colors; the only literals are the
 * fallback values, which match Quartz's light defaults.
 *
 * Injected once via `EnterpriseCoreModule.css` — every feature package
 * depends on core, so the classes below are available everywhere without
 * duplication.
 */
export const coreCss = `
.lgr-button,
.lgr-text-button,
.lgr-icon-button {
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
  line-height: var(--ag-icon-size, 16px);
  cursor: pointer;
}

.lgr-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.5);
  padding: calc(var(--ag-grid-size, 8px) * 0.5) calc(var(--ag-grid-size, 8px) * 1.25);
  border: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
  border-radius: var(--ag-border-radius, 4px);
  background: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #181d1f);
}

.lgr-button:hover {
  background: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
}

.lgr-button:active {
  background: var(--ag-selected-row-background-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 8%));
}

.lgr-text-button {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.5);
  padding: calc(var(--ag-grid-size, 8px) * 0.5);
  border: none;
  border-radius: var(--ag-border-radius, 4px);
  background: transparent;
  color: var(--ag-foreground-color, #181d1f);
}

.lgr-text-button:hover {
  background: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
}

.lgr-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--ag-icon-size, 16px) + var(--ag-grid-size, 8px) * 2);
  height: calc(var(--ag-icon-size, 16px) + var(--ag-grid-size, 8px) * 2);
  padding: 0;
  border: none;
  border-radius: var(--ag-border-radius, 4px);
  background: transparent;
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
}

.lgr-icon-button:hover {
  background: var(--ag-icon-button-hover-background-color, color-mix(in srgb, transparent, var(--ag-foreground-color, #181d1f) 10%));
}

.lgr-icon-button:active {
  background: var(--ag-row-hover-color, color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 12%));
}

.lgr-button:focus-visible,
.lgr-text-button:focus-visible,
.lgr-icon-button:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
}

.lgr-button:disabled,
.lgr-text-button:disabled,
.lgr-icon-button:disabled {
  color: var(--ag-disabled-foreground-color, color-mix(in srgb, transparent, var(--ag-foreground-color, #181d1f) 50%));
  background: transparent;
  cursor: default;
}

.lgr-input {
  box-sizing: border-box;
  width: 100%;
  padding: calc(var(--ag-grid-size, 8px) * 0.5) calc(var(--ag-grid-size, 8px) * 0.75);
  border: var(--ag-borders, solid 1px) var(--ag-input-border-color, var(--ag-border-color, #babfc7));
  border-radius: var(--ag-border-radius, 4px);
  background: var(--ag-background-color, #fff);
  color: var(--ag-foreground-color, #181d1f);
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
}

.lgr-input::placeholder {
  color: var(--ag-disabled-foreground-color, color-mix(in srgb, transparent, var(--ag-foreground-color, #181d1f) 50%));
}

.lgr-input:focus {
  outline: none;
  border-color: var(--ag-input-focus-border-color, var(--ag-active-color, #2196f3));
  box-shadow: var(--ag-input-focus-box-shadow, 0 0 0 3px color-mix(in srgb, transparent, #2196f3 47%));
}

.lgr-input:disabled {
  background: var(--ag-input-disabled-background-color, color-mix(in srgb, var(--ag-background-color, #fff), var(--ag-foreground-color, #181d1f) 6%));
  color: var(--ag-disabled-foreground-color, color-mix(in srgb, transparent, var(--ag-foreground-color, #181d1f) 50%));
}

.lgr-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--ag-grid-size, 8px);
  padding: calc(var(--ag-grid-size, 8px) * 0.25) calc(var(--ag-grid-size, 8px) * 0.75);
  border: 1px solid var(--ag-chip-border-color, color-mix(in srgb, var(--ag-header-background-color, #f8f8f8), var(--ag-foreground-color, #181d1f) 13%));
  border-radius: var(--ag-border-radius, 4px);
  background: var(--ag-chip-background-color, var(--ag-background-color, #fff));
  color: var(--ag-foreground-color, #181d1f);
}
`;
