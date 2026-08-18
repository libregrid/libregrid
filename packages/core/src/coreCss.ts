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

/* Quartz drop-cell pill: 24px tall, fully rounded, ellipsized label + compact
 * remove control. Used by header/toolbar drop zones and Columns panel members. */
.lgr-chip {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: calc(var(--ag-grid-size, 8px) * 0.25);
  max-width: 100%;
  height: calc(var(--ag-grid-size, 8px) * 3);
  padding: 0 calc(var(--ag-grid-size, 8px) * 0.25) 0 calc(var(--ag-grid-size, 8px) * 0.75);
  border: 1px solid var(--ag-chip-border-color, color-mix(in srgb, var(--ag-header-background-color, #f8f8f8), var(--ag-foreground-color, #181d1f) 13%));
  border-radius: calc(var(--ag-grid-size, 8px) * 3);
  background: var(--ag-chip-background-color, color-mix(in srgb, transparent, var(--ag-foreground-color, #181d1f) 7%));
  color: var(--ag-foreground-color, #181d1f);
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
  line-height: 1;
  vertical-align: middle;
}

.lgr-chip-index {
  box-sizing: border-box;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  min-width: calc(var(--ag-grid-size, 8px) * 2);
  height: calc(var(--ag-grid-size, 8px) * 2);
  padding: 0 calc(var(--ag-grid-size, 8px) * 0.25);
  border-radius: 999px;
  background: color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 18%);
  color: var(--ag-active-color, #2196f3);
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.lgr-chip-label {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 12em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-inline-end: calc(var(--ag-grid-size, 8px) * 0.25);
}

.lgr-chip-actions {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0;
  max-width: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-width 120ms ease-out, opacity 80ms ease-out;
}

.lgr-chip:hover .lgr-chip-actions,
.lgr-chip:focus-within .lgr-chip-actions {
  max-width: 3.5rem;
  opacity: 1;
}

.lgr-chip .lgr-icon-button {
  width: calc(var(--ag-grid-size, 8px) * 2.25);
  height: calc(var(--ag-grid-size, 8px) * 2.25);
  border-radius: 999px;
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
}

.lgr-chip .lgr-icon-button svg {
  display: block;
  width: 12px;
  height: 12px;
  fill: currentColor;
}

.lgr-chip-remove {
  flex: none;
  margin-inline-start: calc(var(--ag-grid-size, 8px) * 0.125);
}

.lgr-chip-remove:hover:not(:disabled) {
  background: color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 16%);
  color: var(--ag-active-color, #2196f3);
}

/* Checkbox — painted 16px box matching the native theme (the input itself
 * stays for semantics, keyboard and screen-reader access). */
.lgr-checkbox {
  position: relative;
  box-sizing: border-box;
  display: inline-flex;
  flex: none;
  width: var(--ag-icon-size, 16px);
  height: var(--ag-icon-size, 16px);
  background-color: var(--ag-checkbox-background-color, var(--ag-background-color, #fff));
  border: 1px solid var(--ag-checkbox-unchecked-color, color-mix(in srgb, var(--ag-background-color, #fff), var(--ag-foreground-color, #181d1f) 30%));
  border-radius: var(--ag-checkbox-border-radius, var(--ag-border-radius, 4px));
}

.lgr-checkbox input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.lgr-checkbox::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.lgr-checkbox:has(input:checked) {
  background-color: var(--ag-checkbox-checked-color, var(--ag-active-color, #2196f3));
  border-color: var(--ag-checkbox-checked-color, var(--ag-active-color, #2196f3));
}

.lgr-checkbox:has(input:checked)::after {
  background-color: var(--ag-checkbox-background-color, var(--ag-background-color, #fff));
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E") center / 12px 12px no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E") center / 12px 12px no-repeat;
}

.lgr-checkbox:has(input:indeterminate)::after {
  left: 3px;
  right: 3px;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
  background-color: var(--ag-checkbox-indeterminate-color, var(--ag-checkbox-unchecked-color, #babfc7));
}

.lgr-checkbox:focus-within {
  outline: none;
  box-shadow: var(--ag-input-focus-box-shadow, 0 0 0 3px color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 47%));
}

.lgr-checkbox:has(input:disabled) {
  opacity: 0.5;
}

/* Toggle switch — native labeled toggle (pivot mode). */
.lgr-toggle {
  position: relative;
  box-sizing: border-box;
  display: inline-flex;
  flex: none;
  width: var(--ag-toggle-button-width, 28px);
  height: var(--ag-toggle-button-height, 18px);
  background-color: var(--ag-toggle-button-off-background-color, var(--ag-checkbox-unchecked-color, #babfc7));
  border: var(--ag-toggle-button-border-width, 2px) solid var(--ag-toggle-button-off-border-color, var(--ag-checkbox-unchecked-color, #babfc7));
  border-radius: calc(var(--ag-toggle-button-height, 18px) * 0.5);
}

.lgr-toggle input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.lgr-toggle::before {
  content: '';
  position: absolute;
  top: calc(0px - var(--ag-toggle-button-border-width, 2px));
  left: calc(0px - var(--ag-toggle-button-border-width, 2px));
  box-sizing: border-box;
  width: var(--ag-toggle-button-height, 18px);
  height: var(--ag-toggle-button-height, 18px);
  background-color: var(--ag-toggle-button-switch-background-color, var(--ag-background-color, #fff));
  border: var(--ag-toggle-button-border-width, 2px) solid var(--ag-toggle-button-switch-border-color, var(--ag-checkbox-unchecked-color, #babfc7));
  border-radius: 100%;
  transition: left 100ms;
}

.lgr-toggle:has(input:checked) {
  background-color: var(--ag-toggle-button-on-background-color, var(--ag-checkbox-checked-color, var(--ag-active-color, #2196f3)));
  border-color: var(--ag-toggle-button-on-border-color, var(--ag-checkbox-checked-color, var(--ag-active-color, #2196f3)));
}

.lgr-toggle:has(input:checked)::before {
  left: calc(100% - var(--ag-toggle-button-height, 18px) + var(--ag-toggle-button-border-width, 2px));
}

.lgr-toggle:focus-within {
  outline: none;
  box-shadow: var(--ag-input-focus-box-shadow, 0 0 0 3px color-mix(in srgb, transparent, var(--ag-active-color, #2196f3) 47%));
}

.lgr-toggle:has(input:disabled) {
  opacity: 0.5;
}
`;
