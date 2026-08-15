import { describe, expect, it } from 'vitest';
import type { ExcelCell, ExcelData, ExcelTable } from 'ag-grid-community';
import { SharedStringTable } from '../sharedStringTable';
import { collectSharedStrings, buildWorksheetXml } from './worksheetPart';
import { parseXml, children, findAll } from '../../testing/parseXml';

function cell(data?: ExcelData | null, ref?: string): ExcelCell {
  if (data === undefined || data === null) return {};
  return ref === undefined ? { data } : { data, ref };
}

const stringCell = (value: string): ExcelData => ({ type: 'String', value });

describe('collectSharedStrings', () => {
  it('interns string and inlineStr cells only', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [
        {
          cells: [
            cell(stringCell('hello')),
            cell({ type: 'inlineStr', value: 'world' }),
            cell({ type: 'Number', value: '42' }),
            cell(null),
          ],
        },
      ],
    };
    collectSharedStrings(table, sheet);
    expect(table.values()).toEqual(['hello', 'world']);
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

  it('throws for data types that a later sub-PR implements', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell({ type: 'Boolean', value: '1' })] }],
    };
    expect(() => buildWorksheetXml({ table: sheet, sharedStrings: table })).toThrow(
      'Excel data type "Boolean" is not supported yet',
    );
  });
});
