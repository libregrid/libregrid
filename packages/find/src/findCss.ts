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
  /* Highlights stay yellow/orange in every theme. Quartz's
   * --ag-find-match-color tracks foreground and becomes light ink under a
   * dark palette (theme API without a dark color-scheme part), so pin dark
   * ink here for WCAG contrast on the always-light highlight. */
  color: #1d1b20;
}

.lgr-find-match-active {
  background: var(--ag-find-active-match-background-color, #ffa500);
  color: #1d1b20;
  outline: 1px solid var(--ag-active-color, #2196f3);
  outline-offset: -1px;
}
`;
