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
  /* The highlight is always a light amber/orange, so keep the text dark in
   * both light and dark themes — inheriting would pick up the dark theme's
   * light foreground and fail WCAG contrast. */
  color: var(--ag-find-match-color, #1d1b20);
}

.lgr-find-match-active {
  background: var(--ag-find-active-match-background-color, #ffa500);
  outline: 1px solid var(--ag-active-color, #2196f3);
  outline-offset: -1px;
}
`;
