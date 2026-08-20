/**
 * Styles for the server-side selection footer panel (G4: `lgr-` prefix).
 *
 * The footer is service-built DOM (see `SsrmSelectionService.attachFooter`),
 * mounted by the app into its own layout. Buttons reuse the shared
 * `.lgr-text-button` class from `@libregrid/core` — this stylesheet only
 * lays out the panel. All spacing derives from the grid theme's `--ag-*`
 * variables, so light and dark mode are inherited.
 */
export const ssrmSelectionCss = `
.lgr-ssrm-selection-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: calc(var(--ag-grid-size, 8px) * 1.25);
  padding: calc(var(--ag-grid-size, 8px) * 0.75) calc(var(--ag-grid-size, 8px) * 1);
  border-top: var(--ag-borders, solid 1px) var(--ag-border-color, #babfc7);
  font-family: var(--ag-font-family, inherit);
  font-size: var(--ag-font-size, 14px);
  color: var(--ag-secondary-foreground-color, var(--ag-foreground-color, #181d1f));
}

.lgr-ssrm-selection-footer__page,
.lgr-ssrm-selection-footer__total {
  font-variant-numeric: tabular-nums;
}

.lgr-ssrm-selection-footer__page {
  margin-right: auto;
}
`;
