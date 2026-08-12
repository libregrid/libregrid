/**
 * LibreGrid menu styles.
 * Injected as inline CSS via Module.css — keeps sideEffects: false valid.
 */
export const menuCss = `
.lgr-menu {
  min-width: 180px;
  padding: 4px 0;
  background: var(--ag-background-color, #fff);
  border: 1px solid var(--ag-border-color, #ddd);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
  z-index: 1000;
}

.lgr-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  color: var(--ag-foreground-color, #000);
  outline: none;
}

.lgr-menu-item:hover,
.lgr-menu-item:focus {
  background: var(--ag-row-hover-color, rgba(0, 0, 0, 0.04));
}

.lgr-menu-item-disabled {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}

.lgr-menu-item-checked::before {
  content: '✓';
  margin-right: 4px;
}

.lgr-menu-item-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lgr-menu-item-name {
  flex: 1;
}

.lgr-menu-item-shortcut {
  margin-left: 16px;
  opacity: 0.6;
  font-size: 0.85em;
}

.lgr-menu-item-arrow {
  margin-left: 8px;
  font-size: 0.75em;
  opacity: 0.6;
}

.lgr-menu-separator {
  height: 1px;
  margin: 4px 0;
  background: var(--ag-border-color, #ddd);
}
`;
