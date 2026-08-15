import type { ExcelCell, ExcelColumn, ExcelData, ExcelRow, ExcelTable } from 'ag-grid-community';
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
  | { kind: 'formula'; value: string };

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
      if (serial !== null) return { kind: 'number', value: formatExcelSerial(serial) };
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
