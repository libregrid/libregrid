import type { ExcelCell, ExcelData, ExcelRow, ExcelTable } from 'ag-grid-community';
import { cellRef } from '../cellRef';
import type { SharedStringTable } from '../sharedStringTable';
import type { XmlElement } from '../xml/xmlElement';
import { serializeXml } from '../xml/xmlSerializer';

const SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

/** Data types the worksheet writer maps to cells. */
function cellDataKind(data: ExcelData): 'string' | 'inlineString' | 'number' | 'skip' {
  if (data.value === null) return 'skip';
  switch (data.type) {
    case 'String':
    case 'str':
    case 's':
      return 'string';
    case 'inlineStr':
      return 'inlineString';
    case 'Number':
    case 'n':
      return 'number';
    default:
      throw new Error('Excel data type "' + data.type + '" is not supported yet (Phase 5.2).');
  }
}

/** Intern every string cell of a table into the shared-string table (pass 1). */
export function collectSharedStrings(table: SharedStringTable, sheet: ExcelTable): void {
  for (const row of sheet.rows) {
    for (const cell of row.cells) {
      if (!cell.data) continue;
      const kind = cellDataKind(cell.data);
      if ((kind === 'string' || kind === 'inlineString') && cell.data.value !== null) {
        table.add(cell.data.value);
      }
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
  const kind = cellDataKind(cell.data);
  if (kind === 'skip') return null;
  const ref = cell.ref ?? cellRef(columnIndex, rowIndex);
  if (kind === 'number') {
    return { name: 'c', attrs: { r: ref }, children: [{ name: 'v', text: cell.data.value }] };
  }
  const value = cell.data.value!;
  if (kind === 'inlineString') {
    return {
      name: 'c',
      attrs: { r: ref, t: 'inlineStr' },
      children: [
        {
          name: 'is',
          children: [{ name: 't', attrs: { 'xml:space': 'preserve' }, text: value }],
        },
      ],
    };
  }
  const stringIndex = strings.indexOf(value);
  if (stringIndex === undefined) {
    throw new Error('Shared-string invariant broken: value was not interned before serialising.');
  }
  return {
    name: 'c',
    attrs: { r: ref, t: 's' },
    children: [{ name: 'v', text: String(stringIndex) }],
  };
}

function buildDimension(table: ExcelTable): string {
  let maxColumn = 1;
  for (const row of table.rows) {
    if (row.cells.length > maxColumn) maxColumn = row.cells.length;
  }
  const maxRow = Math.max(table.rows.length, 1);
  return 'A1:' + cellRef(maxColumn - 1, maxRow - 1);
}
