/**
 * Row-number cell styles: the row-resizer drag handle on the cell's bottom
 * edge (spec: `enableRowResizer`). Colors follow the theme tokens with the
 * Quartz light values as fallbacks (docs/design/ux-1-tool-panel-toolbar.md).
 */
export const rowNumbersCss = `
/* The handle sits fully inside the cell's bottom edge. With bottom: -2px
   (straddling the row border) the lower half lands under the next row — rows
   are positioned siblings painted in DOM order, so that half is neither hit-
   testable nor visible, and the band's centre falls exactly on the cell
   border where hit-testing flips between the cell and the resizer. */
.lgr-row-number-resizer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  cursor: row-resize;
}

.lgr-row-number-resizer:hover,
.lgr-row-number-resizer:active {
  background: var(--ag-active-color, #2196f3);
  opacity: 0.4;
}
`;
