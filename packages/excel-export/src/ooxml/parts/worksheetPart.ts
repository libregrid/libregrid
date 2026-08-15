import type {
  ExcelCell,
  ExcelColumn,
  ExcelData,
  ExcelRow,
  ExcelSheetMargin,
  ExcelSheetPageSetup,
  ExcelSheetProtection,
  ExcelTable,
} from 'ag-grid-community';
import { cellRef } from '../cellRef';
import { formatExcelSerial, isoToExcelSerial } from '../dateSerial';
import type { SharedStringTable } from '../sharedStringTable';
import type { StyleResolver } from '../styles/styleResolver';
import type { XmlAttributes, XmlElement } from '../xml/xmlElement';
import { serializeXml } from '../xml/xmlSerializer';

const SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

/** Excel's hard limit for characters in one cell. */
export const EXCEL_CELL_CHAR_LIMIT = 32767;

/** Truncate a string to Excel's per-cell character limit. */
export function truncateExcelString(value: string): string {
  return value.length > EXCEL_CELL_CHAR_LIMIT ? value.slice(0, EXCEL_CELL_CHAR_LIMIT) : value;
}

/** Resolved shape of one ExcelData value after type mapping. */
export type CellShape =
  | { kind: 'skip' }
  | { kind: 'number'; value: string }
  | { kind: 'boolean'; value: '1' | '0' }
  | { kind: 'error'; value: string }
  | { kind: 'string'; value: string }
  | { kind: 'inlineString'; value: string }
  | { kind: 'formula'; value: string }
  /** A date serial: numeric, and displayed with the built-in date format. */
  | { kind: 'date'; value: string };

/**
 * Map an ExcelData value to its cell shape. Dates convert to 1900-system
 * serial numbers; dates the system cannot represent (pre-1900, unparseable)
 * fall back to text so the value survives the export.
 */
export function resolveCellShape(data: ExcelData): CellShape {
  if (data.value === null) return { kind: 'skip' };
  switch (data.type) {
    case 'String':
    case 'str':
    case 's':
      return { kind: 'string', value: truncateExcelString(data.value) };
    case 'inlineStr':
      return { kind: 'inlineString', value: truncateExcelString(data.value) };
    case 'Number':
    case 'n':
      return { kind: 'number', value: data.value };
    case 'Boolean':
    case 'b':
      return { kind: 'boolean', value: booleanValue(data.value) };
    case 'DateTime':
    case 'd': {
      const serial = isoToExcelSerial(data.value);
      if (serial !== null) return { kind: 'date', value: formatExcelSerial(serial) };
      return { kind: 'string', value: truncateExcelString(data.value) };
    }
    case 'Error':
    case 'e':
      return { kind: 'error', value: data.value };
    case 'Formula':
    case 'f':
      return { kind: 'formula', value: data.value };
    case 'empty':
      return { kind: 'skip' };
    default:
      throw new Error('Excel data type "' + data.type + '" is not supported.');
  }
}

function booleanValue(value: string): '1' | '0' {
  return value === '1' || value.toLowerCase() === 'true' ? '1' : '0';
}

/** Intern every shared-string cell of a table (pass 1). */
export function collectSharedStrings(table: SharedStringTable, sheet: ExcelTable): void {
  for (const row of sheet.rows) {
    for (const cell of row.cells) {
      if (!cell.data) continue;
      const shape = resolveCellShape(cell.data);
      if (shape.kind === 'string') table.add(shape.value);
    }
  }
}

/** Sheet-level layout settings resolved from export params (phase 5.4). */
export interface WorksheetLayoutOptions {
  /** Number of leading columns frozen in place. */
  freezeColumns?: number;
  /** Number of leading rows frozen in place. */
  freezeRows?: number;
  /** Render the sheet right-to-left. */
  rightToLeft?: boolean;
  /** Print orientation and paper size (phase 5.8). */
  pageSetup?: ExcelSheetPageSetup;
  /** Print margins in inches (phase 5.8). */
  margins?: ExcelSheetMargin;
  /** Header/footer text, already in OOXML code syntax (phase 5.8). */
  headerFooter?: ResolvedHeaderFooter;
  /** Worksheet protection settings; absent means unprotected (phase 5.8). */
  protectSheet?: ExcelSheetProtection;
}

/** Header/footer text in OOXML code syntax, split by page kind. */
export interface ResolvedHeaderFooter {
  oddHeader?: string;
  oddFooter?: string;
  evenHeader?: string;
  evenFooter?: string;
  firstHeader?: string;
  firstFooter?: string;
}

/** Paper-size names mapped to OOXML paperSize ids (ECMA-376 ST_PaperSize). */
const PAPER_SIZES: Record<string, number> = {
  Letter: 1,
  'Letter Small': 2,
  Tabloid: 3,
  Ledger: 4,
  Legal: 5,
  Statement: 6,
  Executive: 7,
  A3: 8,
  A4: 9,
  'A4 Small': 10,
  A5: 11,
  B4: 12,
  B5: 13,
  Folio: 14,
  // The generic 'Envelope' entry maps to Envelope #10 (the common default).
  Envelope: 20,
  'Envelope DL': 27,
  'Envelope C5': 28,
  'Envelope C3': 29,
  'Envelope C4': 30,
  'Envelope C6': 31,
  'Envelope B5': 34,
  'Envelope Monarch': 37,
  'Japanese Postcard': 43,
  'Japanese Double Postcard': 69,
};

const DEFAULT_MARGINS: Required<ExcelSheetMargin> = {
  top: 0.75,
  right: 0.7,
  bottom: 0.75,
  left: 0.7,
  header: 0.3,
  footer: 0.3,
};

/** Legacy worksheet-protection password hash (15-bit rotation, 0xCE4B salt). */
export function sheetPasswordHash(password: string): string {
  let hash = 0;
  for (let index = password.length - 1; index >= 0; index--) {
    hash = rotateHash(hash) ^ password.charCodeAt(index);
  }
  hash = rotateHash(hash) ^ 0xce4b;
  hash ^= password.length;
  return hash.toString(16).toUpperCase().padStart(4, '0');
}

function rotateHash(hash: number): number {
  return ((hash << 1) & 0x7fff) | ((hash >> 14) & 1);
}

/** Configuration for building one worksheet part. */
export interface WorksheetXmlConfig {
  table: ExcelTable;
  sharedStrings: SharedStringTable;
  styleResolver?: StyleResolver;
  layout?: WorksheetLayoutOptions;
}

/** Build the xl/worksheets/sheetN.xml part. */
export function buildWorksheetXml(config: WorksheetXmlConfig): string {
  const { table, sharedStrings, styleResolver, layout } = config;
  const rowElements = table.rows.map((row, rowIndex) => ({
    name: 'row',
    attrs: rowAttrs(row, rowIndex),
    children: buildRowCells(row, rowIndex, sharedStrings, styleResolver),
  }));
  const children: XmlElement[] = [{ name: 'dimension', attrs: { ref: buildDimension(table) } }];
  const sheetView = sheetViewElement(layout);
  if (sheetView) children.push({ name: 'sheetViews', children: [sheetView] });
  const cols = colsElement(table);
  if (cols) children.push(cols);
  children.push({ name: 'sheetData', children: rowElements });
  if (layout?.protectSheet) children.push(sheetProtectionElement(layout.protectSheet));
  if (layout?.margins) children.push(pageMarginsElement(layout.margins));
  if (layout?.pageSetup) children.push(pageSetupElement(layout.pageSetup));
  if (layout?.headerFooter) children.push(headerFooterElement(layout.headerFooter));
  const mergeCells = mergeCellsElement(table);
  if (mergeCells) children.push(mergeCells);
  return serializeXml({ name: 'worksheet', attrs: { xmlns: SHEET_NS }, children });
}

function rowAttrs(row: ExcelRow, rowIndex: number): XmlAttributes {
  const attrs: XmlAttributes = { r: rowIndex + 1 };
  if (row.height !== undefined) {
    attrs.ht = round2(row.height);
    attrs.customHeight = 1;
  }
  if (row.hidden) attrs.hidden = 1;
  if (row.outlineLevel !== undefined) attrs.outlineLevel = row.outlineLevel;
  if (row.collapsed) attrs.collapsed = 1;
  return attrs;
}

function buildRowCells(
  row: ExcelRow,
  rowIndex: number,
  strings: SharedStringTable,
  styleResolver?: StyleResolver,
): XmlElement[] {
  const elements: XmlElement[] = [];
  let columnIndex = 0;
  for (let index = 0; index < row.cells.length; index++) {
    const cell = row.cells[index]!;
    const element = buildCell(cell, rowIndex, columnIndex, strings, styleResolver);
    if (element) elements.push(element);
    const mergeAcross = cell.mergeAcross ?? 0;
    if (mergeAcross > 0) {
      // Cells covered by the merged region are consumed without advancing
      // the column cursor, keeping positional refs aligned with the table.
      columnIndex += mergeAcross + 1;
      index += mergeAcross;
    } else {
      columnIndex++;
    }
  }
  return elements;
}

function buildCell(
  cell: ExcelCell,
  rowIndex: number,
  columnIndex: number,
  strings: SharedStringTable,
  styleResolver?: StyleResolver,
): XmlElement | null {
  if (!cell.data) return null;
  const shape = resolveCellShape(cell.data);
  if (shape.kind === 'skip') return null;
  const ref = cell.ref ?? cellRef(columnIndex, rowIndex);
  const styleIndex = styleResolver?.indexFor(cell);
  switch (shape.kind) {
    case 'number':
      return {
        name: 'c',
        attrs: styleAttrs(ref, styleIndex),
        children: [{ name: 'v', text: shape.value }],
      };
    case 'date':
      // Without a style resolver the serial exports unformatted; the builder
      // always provides one when a sheet contains date cells.
      return {
        name: 'c',
        attrs: styleAttrs(ref, dateStyleIndexFor(cell, styleResolver)),
        children: [{ name: 'v', text: shape.value }],
      };
    case 'boolean':
      return {
        name: 'c',
        attrs: styleAttrs(ref, styleIndex, 'b'),
        children: [{ name: 'v', text: shape.value }],
      };
    case 'error':
      return {
        name: 'c',
        attrs: styleAttrs(ref, styleIndex, 'e'),
        children: [{ name: 'v', text: shape.value }],
      };
    case 'formula':
      return {
        name: 'c',
        attrs: styleAttrs(ref, styleIndex),
        children: [{ name: 'f', text: shape.value }],
      };
    case 'inlineString':
      return {
        name: 'c',
        attrs: styleAttrs(ref, styleIndex, 'inlineStr'),
        children: [
          {
            name: 'is',
            children: [{ name: 't', attrs: { 'xml:space': 'preserve' }, text: shape.value }],
          },
        ],
      };
    case 'string': {
      const stringIndex = strings.indexOf(shape.value);
      if (stringIndex === undefined) {
        throw new Error('Shared-string invariant broken: value was not interned before serialising.');
      }
      return {
        name: 'c',
        attrs: styleAttrs(ref, styleIndex, 's'),
        children: [{ name: 'v', text: String(stringIndex) }],
      };
    }
  }
}

/** The cellXf index for a date cell: the user's style unless it carries a
 * number format, otherwise the built-in mm-dd-yy date style. */
function dateStyleIndexFor(cell: ExcelCell, styleResolver?: StyleResolver): number | undefined {
  if (!styleResolver) return undefined;
  const userIndex = styleResolver.indexFor(cell);
  if (userIndex !== undefined) {
    const record = styleResolver.registry.styleRecords()[userIndex];
    if (record && record.style.numberFormat.numFmtId !== 0) return userIndex;
  }
  return styleResolver.dateStyleIndex();
}

function styleAttrs(ref: string, styleIndex?: number, t?: string): XmlAttributes {
  const attrs: XmlAttributes = { r: ref };
  if (styleIndex !== undefined) attrs.s = styleIndex;
  if (t !== undefined) attrs.t = t;
  return attrs;
}

/** Column definitions grouped into consecutive runs with identical attributes. */
function colsElement(table: ExcelTable): XmlElement | null {
  const columns = table.columns;
  if (!columns || columns.length === 0) return null;
  const colElements: XmlElement[] = [];
  let runAttrs: XmlAttributes | null = null;
  let runMin = 1;
  for (let index = 0; index < columns.length; index++) {
    const attrs = colAttrs(columns[index]!);
    const same = runAttrs !== null && JSON.stringify(attrs) === JSON.stringify(runAttrs);
    if (same) continue;
    if (runAttrs !== null) {
      colElements.push({ name: 'col', attrs: { ...runAttrs, min: runMin, max: index } });
    }
    runAttrs = attrs;
    runMin = index + 1;
  }
  if (runAttrs !== null) {
    colElements.push({ name: 'col', attrs: { ...runAttrs, min: runMin, max: columns.length } });
  }
  return { name: 'cols', children: colElements };
}

function colAttrs(column: ExcelColumn): XmlAttributes {
  const attrs: XmlAttributes = {};
  if (column.width !== undefined) {
    attrs.width = round2(column.width);
    attrs.customWidth = 1;
  }
  if (column.hidden) attrs.hidden = 1;
  if (column.bestFit) attrs.bestFit = 1;
  if (column.s !== undefined) attrs.style = column.s;
  if (column.outlineLevel !== undefined) attrs.outlineLevel = column.outlineLevel;
  return attrs;
}

/** One merge region per `mergeAcross` cell, skipping the covered cells. */
function mergeCellsElement(table: ExcelTable): XmlElement | null {
  const mergeElements: XmlElement[] = [];
  table.rows.forEach((row, rowIndex) => {
    let columnIndex = 0;
    for (let index = 0; index < row.cells.length; index++) {
      const mergeAcross = row.cells[index]!.mergeAcross ?? 0;
      if (mergeAcross > 0) {
        mergeElements.push({
          name: 'mergeCell',
          attrs: {
            ref: cellRef(columnIndex, rowIndex) + ':' + cellRef(columnIndex + mergeAcross, rowIndex),
          },
        });
        columnIndex += mergeAcross + 1;
        index += mergeAcross;
      } else {
        columnIndex++;
      }
    }
  });
  if (mergeElements.length === 0) return null;
  return { name: 'mergeCells', attrs: { count: mergeElements.length }, children: mergeElements };
}

function sheetViewElement(layout?: WorksheetLayoutOptions): XmlElement | null {
  const freezeColumns = layout?.freezeColumns ?? 0;
  const freezeRows = layout?.freezeRows ?? 0;
  const rightToLeft = layout?.rightToLeft ?? false;
  if (freezeColumns === 0 && freezeRows === 0 && !rightToLeft) return null;
  const attrs: XmlAttributes = { workbookViewId: 0 };
  if (rightToLeft) attrs.rightToLeft = 1;
  const children: XmlElement[] = [];
  if (freezeColumns > 0 || freezeRows > 0) {
    const paneAttrs: XmlAttributes = {
      topLeftCell: cellRef(freezeColumns, freezeRows),
      activePane: activePane(freezeColumns, freezeRows),
      state: 'frozen',
    };
    if (freezeColumns > 0) paneAttrs.xSplit = freezeColumns;
    if (freezeRows > 0) paneAttrs.ySplit = freezeRows;
    children.push({ name: 'pane', attrs: paneAttrs });
  }
  return { name: 'sheetView', attrs, children };
}

function activePane(freezeColumns: number, freezeRows: number): string {
  if (freezeColumns > 0 && freezeRows > 0) return 'bottomRight';
  return freezeColumns > 0 ? 'topRight' : 'bottomLeft';
}

function buildDimension(table: ExcelTable): string {
  let maxColumn = 1;
  for (const row of table.rows) {
    if (row.cells.length > maxColumn) maxColumn = row.cells.length;
  }
  const maxRow = Math.max(table.rows.length, 1);
  return 'A1:' + cellRef(maxColumn - 1, maxRow - 1);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sheetProtectionElement(protection: ExcelSheetProtection): XmlElement {
  const attrs: XmlAttributes = {
    sheet: 1,
    objects: 1,
    scenarios: 1,
    formatCells: protection.formatCells ? 1 : 0,
    formatColumns: protection.formatColumns ? 1 : 0,
    formatRows: protection.formatRows ? 1 : 0,
    insertColumns: protection.insertColumns ? 1 : 0,
    insertRows: protection.insertRows ? 1 : 0,
    insertHyperlinks: protection.insertHyperlinks ? 1 : 0,
    deleteColumns: protection.deleteColumns ? 1 : 0,
    deleteRows: protection.deleteRows ? 1 : 0,
    selectLockedCells: protection.selectLockedCells === false ? 0 : 1,
    sort: protection.autoFilter ? 1 : 0,
    autoFilter: protection.autoFilter ? 1 : 0,
    pivotTables: protection.pivotTables ? 1 : 0,
    selectUnlockedCells: protection.selectUnlockedCells === false ? 0 : 1,
  };
  if (protection.password !== undefined) {
    attrs.password = sheetPasswordHash(protection.password);
  }
  return { name: 'sheetProtection', attrs };
}

function pageMarginsElement(margins: ExcelSheetMargin): XmlElement {
  const resolved = { ...DEFAULT_MARGINS, ...margins };
  return {
    name: 'pageMargins',
    attrs: {
      left: resolved.left,
      right: resolved.right,
      top: resolved.top,
      bottom: resolved.bottom,
      header: resolved.header,
      footer: resolved.footer,
    },
  };
}

function pageSetupElement(pageSetup: ExcelSheetPageSetup): XmlElement {
  const attrs: XmlAttributes = {};
  if (pageSetup.orientation === 'Landscape') attrs.orientation = 'landscape';
  if (pageSetup.pageSize !== undefined) {
    attrs.paperSize = PAPER_SIZES[pageSetup.pageSize] ?? 1;
  }
  return { name: 'pageSetup', attrs };
}

function headerFooterElement(headerFooter: ResolvedHeaderFooter): XmlElement {
  const attrs: XmlAttributes = {};
  if (headerFooter.evenHeader !== undefined || headerFooter.evenFooter !== undefined) {
    attrs.differentOddEven = 1;
  }
  if (headerFooter.firstHeader !== undefined || headerFooter.firstFooter !== undefined) {
    attrs.differentFirst = 1;
  }
  const children: XmlElement[] = [];
  const pushText = (name: string, value: string | undefined): void => {
    children.push({ name, text: value ?? null });
  };
  pushText('oddHeader', headerFooter.oddHeader);
  pushText('oddFooter', headerFooter.oddFooter);
  pushText('evenHeader', headerFooter.evenHeader);
  pushText('evenFooter', headerFooter.evenFooter);
  pushText('firstHeader', headerFooter.firstHeader);
  pushText('firstFooter', headerFooter.firstFooter);
  return { name: 'headerFooter', attrs, children };
}
