/**
 * Find match highlight styles.
 *
 * Colors follow the Quartz theme tokens, with the theme's own light values as
 * fallbacks (docs/design/ux-1-tool-panel-toolbar.md). The active match is
 * distinguished by the stronger `--ag-active-color` outline on top of the
 * themed background.
 */
export const findCss = `
.lgr-find-match {
  background: var(--ag-find-match-background-color, #ffff00);
  color: inherit;
}

.lgr-find-match-active {
  background: var(--ag-find-active-match-background-color, #ffa500);
  outline: 1px solid var(--ag-active-color, #2196f3);
  outline-offset: -1px;
}
`;
