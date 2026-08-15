import { describe, expect, it } from 'vitest';
import type { ExcelWorksheet } from 'ag-grid-community';
import { buildXlsx } from './xlsxBuilder';
import { parsePart } from '../testing/xlsx';
import { child, children, findAll } from '../testing/parseXml';

const stringCell = (value: string) => ({ data: { type: 'String', value } as const });

const emptySheet: ExcelWorksheet = { name: 'Empty', table: { columns: [], rows: [] } };

describe('buildXlsx', () => {
  it('produces a valid minimal workbook for an empty sheet', () => {
    const { bytes, parts } = buildXlsx([emptySheet]);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);
    // ZIP local-file-header signature PK\x03\x04.
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
    expect(Object.keys(parts).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/sharedStrings.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
    ]);
    const sheet = parsePart(parts, 'xl/worksheets/sheet1.xml');
    expect(children(sheet, 'row')).toHaveLength(0);
    expect(child(sheet, 'dimension')!.attrs.ref).toBe('A1:A1');
    const strings = parsePart(parts, 'xl/sharedStrings.xml');
    expect(strings.attrs.count).toBe('0');
    expect(strings.attrs.uniqueCount).toBe('0');
  });

  it('writes one workbook entry and one relationship per sheet', () => {
    const sheets: ExcelWorksheet[] = [
      { name: 'First', table: { columns: [], rows: [] } },
      { name: 'Second', table: { columns: [], rows: [] } },
    ];
    const { parts } = buildXlsx(sheets);
    expect(parts['xl/worksheets/sheet1.xml']).toBeDefined();
    expect(parts['xl/worksheets/sheet2.xml']).toBeDefined();

    const workbook = parsePart(parts, 'xl/workbook.xml');
    const sheetNodes = children(child(workbook, 'sheets')!, 'sheet');
    expect(sheetNodes.map((node) => node.attrs.name)).toEqual(['First', 'Second']);
    expect(sheetNodes.map((node) => node.attrs['r:id'])).toEqual(['rId1', 'rId2']);

    const rels = parsePart(parts, 'xl/_rels/workbook.xml.rels');
    const relNodes = children(rels, 'Relationship');
    expect(relNodes.map((node) => node.attrs.Target)).toEqual([
      'worksheets/sheet1.xml',
      'worksheets/sheet2.xml',
      'sharedStrings.xml',
    ]);

    const contentTypes = parsePart(parts, '[Content_Types].xml');
    expect(
      children(contentTypes, 'Override')
        .filter((node) => node.attrs.PartName.includes('worksheets'))
        .map((node) => node.attrs.PartName),
    ).toEqual(['/xl/worksheets/sheet1.xml', '/xl/worksheets/sheet2.xml']);
  });

  it('interns strings across sheets into one table', () => {
    const sheets: ExcelWorksheet[] = [
      { name: 'One', table: { columns: [], rows: [{ cells: [stringCell('shared')] }] } },
      { name: 'Two', table: { columns: [], rows: [{ cells: [stringCell('shared')] }] } },
    ];
    const { parts } = buildXlsx(sheets);
    const strings = parsePart(parts, 'xl/sharedStrings.xml');
    expect(strings.attrs.uniqueCount).toBe('1');
    expect(strings.attrs.count).toBe('2');
    const firstSheetCell = children(
      findAll(parsePart(parts, 'xl/worksheets/sheet1.xml'), 'row')[0]!,
      'c',
    )[0]!;
    const secondSheetCell = children(
      findAll(parsePart(parts, 'xl/worksheets/sheet2.xml'), 'row')[0]!,
      'c',
    )[0]!;
    expect(child(firstSheetCell, 'v')!.text).toBe('0');
    expect(child(secondSheetCell, 'v')!.text).toBe('0');
  });

  it('emits styles.xml when styles are provided and resolves cell indexes', () => {
    const styles = [
      { id: 'bold', font: { bold: true } },
      { id: 'red', interior: { pattern: 'Solid', color: 'red' } },
    ];
    const sheet: ExcelWorksheet = {
      name: 'Styled',
      table: {
        columns: [],
        rows: [
          {
            cells: [
              { data: { type: 'String', value: 'bold' }, styleId: 'bold' },
              { data: { type: 'Number', value: '7' }, styleId: 'red' },
              { data: { type: 'String', value: 'plain' } },
            ],
          },
        ],
      },
    };
    const { parts } = buildXlsx([sheet], { styles });
    expect(parts['xl/styles.xml']).toBeDefined();
    const contentTypes = parsePart(parts, '[Content_Types].xml');
    expect(
      children(contentTypes, 'Override').some((node) => node.attrs.PartName === '/xl/styles.xml'),
    ).toBe(true);
    const rels = parsePart(parts, 'xl/_rels/workbook.xml.rels');
    const stylesRel = children(rels, 'Relationship').find(
      (node) => node.attrs.Type.includes('/styles'),
    )!;
    expect(stylesRel.attrs.Target).toBe('styles.xml');

    const cells = children(findAll(parsePart(parts, 'xl/worksheets/sheet1.xml'), 'row')[0]!, 'c');
    expect(cells.map((c) => c.attrs.s)).toEqual(['1', '2', undefined]);
    const stylesXml = parsePart(parts, 'xl/styles.xml');
    const xfs = children(child(stylesXml, 'cellXfs')!, 'xf');
    expect(xfs).toHaveLength(3);
    expect(child(children(child(stylesXml, 'fonts')!, 'font')[1]!, 'b')).toBeDefined();
  });

  it('omits styles.xml when no styles are configured', () => {
    const { parts } = buildXlsx([emptySheet]);
    expect(parts['xl/styles.xml']).toBeUndefined();
  });

  it('emits styles.xml with the date format when a sheet contains dates', () => {
    const sheet: ExcelWorksheet = {
      name: 'Dates',
      table: {
        columns: [],
        rows: [{ cells: [{ data: { type: 'DateTime', value: '2020-01-01' } }] }],
      },
    };
    const { parts } = buildXlsx([sheet]);
    expect(parts['xl/styles.xml']).toBeDefined();
    const styles = parsePart(parts, 'xl/styles.xml');
    const xfs = children(child(styles, 'cellXfs')!, 'xf');
    expect(xfs[1]!.attrs.numFmtId).toBe('14');
    const cell = children(findAll(parsePart(parts, 'xl/worksheets/sheet1.xml'), 'row')[0]!, 'c')[0]!;
    expect(cell.attrs.s).toBe('1');
    expect(child(cell, 'v')!.text).toBe('43831');
  });
});
