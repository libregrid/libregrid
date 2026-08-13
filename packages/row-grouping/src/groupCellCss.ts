/**
 * Auto group column / GroupCellRenderer styles.
 * Injected as inline CSS via Module.css — keeps sideEffects: false valid.
 */
export const groupCellCss = `
.lgr-group-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  outline: none;
}

.lgr-group-cell-toggle {
  flex: none;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lgr-group-cell-toggle-hidden {
  visibility: hidden;
  cursor: default;
}

.lgr-group-cell-toggle::before {
  content: '';
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 4px 0 4px 6px;
  border-color: transparent transparent transparent var(--ag-foreground-color, #000);
  transform: rotate(0deg);
  transition: transform 0.1s ease-in-out;
}

.lgr-group-cell-toggle-expanded::before {
  transform: rotate(90deg);
}

.lgr-group-cell-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lgr-group-cell-count {
  flex: none;
  opacity: 0.6;
  font-size: 0.9em;
}
`;
