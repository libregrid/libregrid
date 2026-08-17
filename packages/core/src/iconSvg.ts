/**
 * LibreGrid icon set — inline SVG glyphs keyed by AG Grid Community's
 * `IconName` union.
 *
 * The glyphs are LibreGrid's own 24x24 paths (drawn for this project, not
 * copied from any commercial artwork). They inherit color via
 * `fill: currentColor`, so they follow the active theme automatically.
 * An `IconName` without a glyph here renders as no icon — callers treat
 * `null` as "omit the icon cell".
 */
import type { IconName } from 'ag-grid-community';

/** Inline SVG markup for one 24x24 icon, or `null` for unmapped names. */
export function iconSvg(name: IconName): string | null {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
    path +
    '"/></svg>'
  );
}

const ICON_PATHS: Partial<Record<IconName, string>> = {
  sortAscending: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8z',
  sortDescending: 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8z',
  sortUnSort: 'M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z',
  menuPin:
    'M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z',
  rowPin:
    'M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z',
  rowPinTop:
    'M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z',
  rowPinBottom:
    'M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z',
  columns: 'M14.67 5v14H9.33V5h5.34zm1 14H21V5h-5.33v14zm-7.34 0V5H3v14h5.33z',
  columnsToolPanel: 'M14.67 5v14H9.33V5h5.34zm1 14H21V5h-5.33v14zm-7.34 0V5H3v14h5.33z',
  filter:
    'M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39C20.25 4.95 19.78 4 18.95 4H5.04c-.83 0-1.3.95-.79 1.61z',
  filterActive:
    'M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39C20.25 4.95 19.78 4 18.95 4H5.04c-.83 0-1.3.95-.79 1.61z',
  filterAdd:
    'M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39C20.25 4.95 19.78 4 18.95 4H5.04c-.83 0-1.3.95-.79 1.61zM16.5 16h2v6h-2zM14.5 18h6v2h-6z',
  filterCardExpand: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z',
  filterCardCollapse: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  clipboardCopy:
    'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  clipboardCut:
    'M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z',
  clipboardPaste:
    'M19 2h-4.18C14.4.84 13.3 0 12 0S9.6.84 9.18 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z',
  csvExport:
    'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z',
  excelExport:
    'M10 10.02h5V21h-5V10.02zM17 21h3c1.1 0 2-.9 2-2v-9h-5v11zm3-18H5c-1.1 0-2 .9-2 2v3h19V5c0-1.1-.9-2-2-2zM3 19c0 1.1.9 2 2 2h3V10H3v9z',
  chart:
    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
  subMenuOpen: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  smallDown: 'M7 10l5 5 5-5z',
  search:
    'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  close:
    'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  first: 'M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z',
  last: 'M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z',
  previous: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  next: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  panelDelimiter: 'M12 2h-2v20h2V2z',
  maximize: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
  minimize: 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
  rowUnpin:
    'M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z',
  groupExpanded: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  groupContracted: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
  columnGroupOpened: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z',
  columnGroupClosed: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  columnDrag:
    'M9 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM15 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  pivotPanel: 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
  rowGroupPanel: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
  valuePanel: 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
  filtersToolPanel:
    'M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39C20.25 4.95 19.78 4 18.95 4H5.04c-.83 0-1.3.95-.79 1.61z',
};
