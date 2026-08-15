import type { ExcelCell, ExcelData, ExcelRow, ExcelTable } from 'ag-grid-community';
import { cellRef } from '../cellRef';
import { formatExcelSerial, isoToExcelSerial } from '../dateSerial';
import type { SharedStringTable } from '../sharedStringTable';
import type { XmlElement } from '../xml/xmlElement';
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
  | { kind: 'inlineString'; value: string };

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
    case 'empty':
      return { kind: 'skip' };
    default:
      throw new Error('Excel data type "' + data.type + '" is not supported yet (Phase 5.7).');
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

/** Configuration for building one worksheet part. */
export interface WorksheetXmlConfig {
  table: ExcelTable;
  sharedStrings: SharedStringTable;
}

/** Build the xl/worksheets/sheetN.xml part. */
export function buildWorksheetXml(config: WorksheetXmlConfig): string {
  const { table, sharedStrings } = config;
  const rowElements = table.rows.map((row, rowIndex) => ({
    name: 'row',
    attrs: { r: rowIndex + 1 },
    children: buildRowCells(row, rowIndex, sharedStrings),
  }));
  const children: XmlElement[] = [
    { name: 'dimension', attrs: { ref: buildDimension(table) } },
    { name: 'sheetData', children: rowElements },
  ];
  return serializeXml({ name: 'worksheet', attrs: { xmlns: SHEET_NS }, children });
}

function buildRowCells(row: ExcelRow, rowIndex: number, strings: SharedStringTable): XmlElement[] {
  const elements: XmlElement[] = [];
  let columnIndex = 0;
  for (const cell of row.cells) {
    const element = buildCell(cell, rowIndex, columnIndex, strings);
    columnIndex++;
    if (element) elements.push(element);
  }
  return elements;
}

function buildCell(
  cell: ExcelCell,
  rowIndex: number,
  columnIndex: number,
  strings: SharedStringTable,
): XmlElement | null {
  if (!cell.data) return null;
  const shape = resolveCellShape(cell.data);
  if (shape.kind === 'skip') return null;
  const ref = cell.ref ?? cellRef(columnIndex, rowIndex);
  switch (shape.kind) {
    case 'number':
      return { name: 'c', attrs: { r: ref }, children: [{ name: 'v', text: shape.value }] };
    case 'boolean':
      return { name: 'c', attrs: { r: ref, t: 'b' }, children: [{ name: 'v', text: shape.value }] };
    case 'error':
      return { name: 'c', attrs: { r: ref, t: 'e' }, children: [{ name: 'v', text: shape.value }] };
    case 'inlineString':
      return {
        name: 'c',
        attrs: { r: ref, t: 'inlineStr' },
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
        attrs: { r: ref, t: 's' },
        children: [{ name: 'v', text: String(stringIndex) }],
      };
    }
  }
}

function buildDimension(table: ExcelTable): string {
  let maxColumn = 1;
  for (const row of table.rows) {
    if (row.cells.length > maxColumn) maxColumn = row.cells.length;
  }
  const maxRow = Math.max(table.rows.length, 1);
  return 'A1:' + cellRef(maxColumn - 1, maxRow - 1);
}
