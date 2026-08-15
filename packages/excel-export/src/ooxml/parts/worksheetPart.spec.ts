import { describe, expect, it } from 'vitest';
import type { ExcelCell, ExcelData, ExcelTable } from 'ag-grid-community';
import { SharedStringTable } from '../sharedStringTable';
import { collectSharedStrings, buildWorksheetXml } from './worksheetPart';
import { parseXml, children, findAll } from '../../testing/parseXml';
import { buildSharedStringsXml } from './sharedStringsPart';

function cell(data?: ExcelData | null, ref?: string): ExcelCell {
  if (data === undefined || data === null) return {};
  return ref === undefined ? { data } : { data, ref };
}

const stringCell = (value: string): ExcelData => ({ type: 'String', value });

describe('collectSharedStrings', () => {
  it('interns shared-string cells only, not inline or numeric cells', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [
        {
          cells: [
            cell(stringCell('hello')),
            cell({ type: 'inlineStr', value: 'world' }),
            cell({ type: 'Number', value: '42' }),
            cell({ type: 'DateTime', value: '1800-06-15' }),
            cell(null),
          ],
        },
      ],
    };
    collectSharedStrings(table, sheet);
    expect(table.values()).toEqual(['hello', '1800-06-15']);
    expect(table.count).toBe(2);
  });
});

describe('buildWorksheetXml', () => {
  it('maps string cells to shared-string indexes', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell(stringCell('Name')), cell(stringCell('Amount'))] }],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const rows = findAll(xml, 'row');
    expect(rows).toHaveLength(1);
    const cells = children(rows[0]!, 'c');
    expect(cells.map((c) => c.attrs.r)).toEqual(['A1', 'B1']);
    expect(cells.map((c) => c.attrs.t)).toEqual(['s', 's']);
    expect(children(cells[0]!, 'v')[0]!.text).toBe('0');
    expect(children(cells[1]!, 'v')[0]!.text).toBe('1');
  });

  it('maps number cells to numeric <v> cells without a t attribute', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = { columns: [], rows: [{ cells: [cell({ type: 'n', value: '43.5' })] }] };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const cellNode = children(findAll(xml, 'row')[0]!, 'c')[0]!;
    expect(cellNode.attrs.t).toBeUndefined();
    expect(children(cellNode, 'v')[0]!.text).toBe('43.5');
  });

  it('emits inlineStr cells with a nested is/t element', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell({ type: 'inlineStr', value: 'direct' })] }],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const cellNode = children(findAll(xml, 'row')[0]!, 'c')[0]!;
    expect(cellNode.attrs.t).toBe('inlineStr');
    const t = children(children(cellNode, 'is')[0]!, 't')[0]!;
    expect(t.text).toBe('direct');
    expect(t.attrs['xml:space']).toBe('preserve');
  });

  it('skips cells without data and cells with null values', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell(null), cell({ type: 'String', value: null })] }],
    };
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const rows = findAll(xml, 'row');
    expect(children(rows[0]!, 'c')).toHaveLength(0);
  });

  it('honours an explicit cell ref', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell(stringCell('x'), 'D7')] }],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    expect(children(findAll(xml, 'row')[0]!, 'c')[0]!.attrs.r).toBe('D7');
  });

  it('reports the used range in the dimension element', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [
        { cells: [cell(stringCell('a')), cell(stringCell('b')), cell(stringCell('c'))] },
        { cells: [cell(stringCell('d'))] },
      ],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    expect(children(xml, 'dimension')[0]!.attrs.ref).toBe('A1:C2');
  });

  it('maps boolean cells to t="b" with 1 or 0', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [
        {
          cells: [
            cell({ type: 'Boolean', value: '1' }),
            cell({ type: 'b', value: 'false' }),
            cell({ type: 'Boolean', value: 'TRUE' }),
            cell({ type: 'Boolean', value: '0' }),
          ],
        },
      ],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const cellNodes = children(findAll(xml, 'row')[0]!, 'c');
    expect(cellNodes.every((c) => c.attrs.t === 'b')).toBe(true);
    expect(cellNodes.map((c) => children(c, 'v')[0]!.text)).toEqual(['1', '0', '1', '0']);
  });

  it('converts date cells to 1900-system serial numbers', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [
        { cells: [cell({ type: 'DateTime', value: '2020-01-01' }), cell({ type: 'd', value: '1900-03-01' })] },
      ],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const cellNodes = children(findAll(xml, 'row')[0]!, 'c');
    expect(cellNodes.every((c) => c.attrs.t === undefined)).toBe(true);
    expect(cellNodes.map((c) => children(c, 'v')[0]!.text)).toEqual(['43831', '61']);
  });

  it('falls back to text for dates the 1900 system cannot represent', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell({ type: 'DateTime', value: '1800-06-15' })] }],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const cellNode = children(findAll(xml, 'row')[0]!, 'c')[0]!;
    expect(cellNode.attrs.t).toBe('s');
    const strings = parseXml(buildSharedStringsXml(table));
    expect(children(strings, 'si')[0]!.children[0]!.text).toBe('1800-06-15');
  });

  it('maps error cells to t="e"', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell({ type: 'Error', value: '#DIV/0!' })] }],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const cellNode = children(findAll(xml, 'row')[0]!, 'c')[0]!;
    expect(cellNode.attrs.t).toBe('e');
    expect(children(cellNode, 'v')[0]!.text).toBe('#DIV/0!');
  });

  it('truncates strings over Excel\'s 32767-character cell limit', () => {
    const table = new SharedStringTable();
    const longValue = 'x'.repeat(40000);
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell(stringCell(longValue))] }],
    };
    collectSharedStrings(table, sheet);
    expect(table.values()[0]).toHaveLength(32767);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const cellNode = children(findAll(xml, 'row')[0]!, 'c')[0]!;
    expect(children(cellNode, 'v')[0]!.text).toBe('0');
  });

  it('throws for data types that a later sub-PR implements', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell({ type: 'Formula', value: '=1+1' })] }],
    };
    expect(() => buildWorksheetXml({ table: sheet, sharedStrings: table })).toThrow(
      'Excel data type "Formula" is not supported yet',
    );
  });
});
