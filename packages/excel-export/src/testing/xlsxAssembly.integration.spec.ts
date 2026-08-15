import { describe, expect, it } from 'vitest';
import type { ExcelWorksheet } from 'ag-grid-community';
import { buildXlsx } from '../ooxml/xlsxBuilder';
import { parsePart, unzipXlsx } from './xlsx';
import { child, children, findAll } from './parseXml';

/**
 * Unzip-and-assert tier (phase 5.1): a real ZIP round-trip plus structural
 * assertions on every part the skeleton writes.
 */

const fixture: ExcelWorksheet = {
  name: 'Export',
  table: {
    columns: [],
    rows: [
      {
        cells: [
          { data: { type: 'String', value: 'Name' } },
          { data: { type: 'String', value: 'Amount' } },
        ],
      },
      {
        cells: [
          { data: { type: 'String', value: 'Widget "A" & <B>' } },
          { data: { type: 'Number', value: '42' } },
        ],
      },
      {
        cells: [
          { data: { type: 'String', value: 'Widget "A" & <B>' } },
          { data: { type: 'Number', value: '43.5' } },
        ],
      },
    ],
  },
};

const EXPECTED_PARTS = [
  '[Content_Types].xml',
  '_rels/.rels',
  'xl/_rels/workbook.xml.rels',
  'xl/sharedStrings.xml',
  'xl/workbook.xml',
  'xl/worksheets/sheet1.xml',
];

describe('xlsx assembly (unzip-and-assert)', () => {
  it('unzips to exactly the expected part set', () => {
    const { bytes, parts } = buildXlsx([fixture]);
    const unzipped = unzipXlsx(bytes);
    expect(Object.keys(unzipped).sort()).toEqual(EXPECTED_PARTS);
    // The ZIP must contain byte-for-byte what the parts map says it does.
    for (const path of EXPECTED_PARTS) {
      expect(unzipped[path], path).toBe(parts[path]);
    }
  });

  it('declares content types for every part kind', () => {
    const { parts } = buildXlsx([fixture]);
    const types = parsePart(parts, '[Content_Types].xml');
    expect(children(types, 'Default').map((node) => node.attrs.Extension)).toEqual(['rels', 'xml']);
    const overrides = children(types, 'Override');
    expect(
      overrides.find((node) => node.attrs.PartName === '/xl/workbook.xml')!.attrs.ContentType,
    ).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml');
    expect(
      overrides.find((node) => node.attrs.PartName === '/xl/worksheets/sheet1.xml')!.attrs
        .ContentType,
    ).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml');
    expect(
      overrides.find((node) => node.attrs.PartName === '/xl/sharedStrings.xml')!.attrs.ContentType,
    ).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml');
  });

  it('links the package, workbook and worksheet relationships', () => {
    const { parts } = buildXlsx([fixture]);
    const rootRels = parsePart(parts, '_rels/.rels');
    const officeDocument = child(rootRels, 'Relationship')!;
    expect(officeDocument.attrs.Target).toBe('xl/workbook.xml');

    const workbook = parsePart(parts, 'xl/workbook.xml');
    const sheet = child(child(workbook, 'sheets')!, 'sheet')!;
    expect(sheet.attrs.name).toBe('Export');
    expect(sheet.attrs.sheetId).toBe('1');
    expect(sheet.attrs['r:id']).toBe('rId1');

    const workbookRels = parsePart(parts, 'xl/_rels/workbook.xml.rels');
    const worksheetRel = children(workbookRels, 'Relationship').find(
      (node) => node.attrs.Id === 'rId1',
    )!;
    expect(worksheetRel.attrs.Target).toBe('worksheets/sheet1.xml');
  });

  it('writes cells with correct refs, types and shared-string indexes', () => {
    const { parts } = buildXlsx([fixture]);
    const sheet = parsePart(parts, 'xl/worksheets/sheet1.xml');
    expect(child(sheet, 'dimension')!.attrs.ref).toBe('A1:B3');

    const rows = findAll(sheet, 'row');
    expect(rows.map((row) => row.attrs.r)).toEqual(['1', '2', '3']);

    const header = children(rows[0]!, 'c');
    expect(header.map((c) => c.attrs.r)).toEqual(['A1', 'B1']);
    expect(header.every((c) => c.attrs.t === 's')).toBe(true);

    const second = children(rows[1]!, 'c');
    expect(second[0]!.attrs).toMatchObject({ r: 'A2', t: 's' });
    expect(child(second[0]!, 'v')!.text).toBe('2');
    expect(second[1]!.attrs).toEqual({ r: 'B2' });
    expect(child(second[1]!, 'v')!.text).toBe('42');

    // Duplicate strings must reuse the same shared-string index.
    const third = children(rows[2]!, 'c');
    expect(child(third[0]!, 'v')!.text).toBe('2');
    expect(child(third[1]!, 'v')!.text).toBe('43.5');
  });

  it('round-trips special characters through shared strings', () => {
    const { parts } = buildXlsx([fixture]);
    const strings = parsePart(parts, 'xl/sharedStrings.xml');
    expect(strings.attrs.count).toBe('4');
    expect(strings.attrs.uniqueCount).toBe('3');
    const texts = children(strings, 'si').map((si) => child(si, 't')!.text);
    expect(texts).toEqual(['Name', 'Amount', 'Widget "A" & <B>']);
  });

  it('handles booleans, dates, errors, unicode and strings over the cell limit', () => {
    const long = 'y'.repeat(40000);
    const typesSheet: ExcelWorksheet = {
      name: 'Types',
      table: {
        columns: [],
        rows: [
          {
            cells: [
              { data: { type: 'Boolean', value: 'true' } },
              { data: { type: 'DateTime', value: '1900-03-01' } },
              { data: { type: 'Error', value: '#N/A' } },
              { data: { type: 'String', value: 'emoji \ud83d\ude80 RTL \u0645\u0631\u062d\u0628\u0627' } },
              { data: { type: 'String', value: long } },
            ],
          },
        ],
      },
    };
    const { parts } = buildXlsx([typesSheet]);
    const sheetXml = parsePart(parts, 'xl/worksheets/sheet1.xml');
    const cells = children(findAll(sheetXml, 'row')[0]!, 'c');
    expect(cells.map((c) => c.attrs.t)).toEqual(['b', undefined, 'e', 's', 's']);
    expect(child(cells[0]!, 'v')!.text).toBe('1');
    expect(child(cells[1]!, 'v')!.text).toBe('61');
    expect(child(cells[2]!, 'v')!.text).toBe('#N/A');
    const strings = parsePart(parts, 'xl/sharedStrings.xml');
    const texts = children(strings, 'si').map((si) => child(si, 't')!.text);
    expect(texts[0]).toBe('emoji \ud83d\ude80 RTL \u0645\u0631\u062d\u0628\u0627');
    expect(texts[1]).toHaveLength(32767);
  });
});
