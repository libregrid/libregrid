import { describe, expect, it } from 'vitest';
import type { ExcelCell, ExcelData, ExcelDataType, ExcelTable } from 'ag-grid-community';
import { SharedStringTable } from '../sharedStringTable';
import { buildWorksheetXml, collectSharedStrings, sheetPasswordHash } from './worksheetPart';
import { parseXml, child, children, findAll } from '../../testing/parseXml';
import { buildSharedStringsXml } from './sharedStringsPart';
import { StyleResolver } from '../styles/styleResolver';

function cell(data?: ExcelData | null, ref?: string, styleId?: string | string[]): ExcelCell {
  const base = ref === undefined ? {} : { ref };
  const styled = styleId === undefined ? {} : { styleId };
  if (data === undefined || data === null) return { ...base, ...styled };
  return { data, ...base, ...styled };
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

  it('writes formula cells as f elements', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell({ type: 'Formula', value: 'SUM(A2:A3)' })] }],
    };
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const cellNode = children(findAll(xml, 'row')[0]!, 'c')[0]!;
    expect(cellNode.attrs.t).toBeUndefined();
    expect(child(cellNode, 'f')!.text).toBe('SUM(A2:A3)');
  });

  it('throws for data types that no sub-PR implements', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell({ type: 'unknown' as ExcelDataType, value: 'x' })] }],
    };
    expect(() => buildWorksheetXml({ table: sheet, sharedStrings: table })).toThrow(
      'Excel data type "unknown" is not supported.',
    );
  });

  it('applies a string styleId as the cellXf index', () => {
    const table = new SharedStringTable();
    const resolver = new StyleResolver([{ id: 'bold', font: { bold: true } }]);
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell(stringCell('x'), undefined, 'bold')] }],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table, styleResolver: resolver }));
    expect(children(findAll(xml, 'row')[0]!, 'c')[0]!.attrs.s).toBe('1');
    expect(resolver.registry.styleRecords()).toHaveLength(2);
  });

  it('merges array styleIds left to right with later styles winning', () => {
    const table = new SharedStringTable();
    const resolver = new StyleResolver([
      { id: 'red', interior: { pattern: 'Solid', color: 'red' } },
      { id: 'bold', font: { bold: true } },
    ]);
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell(stringCell('x'), undefined, ['red', 'bold'])] }],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table, styleResolver: resolver }));
    const cellNode = children(findAll(xml, 'row')[0]!, 'c')[0]!;
    const record = resolver.registry.styleRecords()[Number(cellNode.attrs.s)]!;
    expect(record.style.font.bold).toBe(true);
    expect(record.style.fill.pattern).toBe('solid');
  });

  it('ignores unknown styleIds', () => {
    const table = new SharedStringTable();
    const resolver = new StyleResolver([{ id: 'bold', font: { bold: true } }]);
    const sheet: ExcelTable = {
      columns: [],
      rows: [{ cells: [cell(stringCell('x'), undefined, 'missing')] }],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table, styleResolver: resolver }));
    expect(children(findAll(xml, 'row')[0]!, 'c')[0]!.attrs.s).toBeUndefined();
  });

  it('writes column widths, hidden and bestFit flags grouped into runs', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [
        { width: 20.5 },
        { width: 20.5 },
        { width: 10, hidden: true },
        { bestFit: true },
      ],
      rows: [],
    };
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const cols = child(xml, 'cols')!;
    const colNodes = children(cols, 'col');
    expect(colNodes.map((c) => c.attrs)).toEqual([
      { width: '20.5', customWidth: '1', min: '1', max: '2' },
      { width: '10', customWidth: '1', hidden: '1', min: '3', max: '3' },
      { bestFit: '1', min: '4', max: '4' },
    ]);
  });

  it('omits the cols element when no columns are defined', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = { columns: [], rows: [] };
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    expect(child(xml, 'cols')).toBeUndefined();
  });

  it('writes row heights and hidden flags', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [
        { cells: [cell(stringCell('a'))], height: 22.5 },
        { cells: [cell(stringCell('b'))], hidden: true },
      ],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const rows = findAll(xml, 'row');
    expect(rows[0]!.attrs).toEqual({ r: '1', ht: '22.5', customHeight: '1' });
    expect(rows[1]!.attrs).toEqual({ r: '2', hidden: '1' });
  });

  it('writes row outline levels with collapse state', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [
        { cells: [cell(stringCell('group'))], outlineLevel: 1, collapsed: true },
        { cells: [cell(stringCell('child'))], outlineLevel: 2 },
        { cells: [cell(stringCell('hidden-child'))], outlineLevel: 2, hidden: true },
      ],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const rows = findAll(xml, 'row');
    expect(rows[0]!.attrs).toEqual({ r: '1', outlineLevel: '1', collapsed: '1' });
    expect(rows[1]!.attrs).toEqual({ r: '2', outlineLevel: '2' });
    expect(rows[2]!.attrs).toEqual({ r: '3', outlineLevel: '2', hidden: '1' });
  });

  it('writes column outline levels', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [{ outlineLevel: 1 }, { outlineLevel: 2 }, { outlineLevel: 2 }],
      rows: [],
    };
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const colNodes = children(child(xml, 'cols')!, 'col');
    expect(colNodes.map((c) => c.attrs)).toEqual([
      { outlineLevel: '1', min: '1', max: '1' },
      { outlineLevel: '2', min: '2', max: '3' },
    ]);
  });

  it('writes mergeCells for mergeAcross and skips the covered cells', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = {
      columns: [],
      rows: [
        {
          cells: [
            { data: { type: 'String', value: 'wide' }, mergeAcross: 2 },
            cell(null),
            cell(null),
            cell(stringCell('tail')),
          ],
        },
      ],
    };
    collectSharedStrings(table, sheet);
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    const mergeCells = child(xml, 'mergeCells')!;
    expect(mergeCells.attrs.count).toBe('1');
    expect(children(mergeCells, 'mergeCell')[0]!.attrs.ref).toBe('A1:C1');
    const cellNodes = children(findAll(xml, 'row')[0]!, 'c');
    expect(cellNodes.map((c) => c.attrs.r)).toEqual(['A1', 'D1']);
  });

  it('writes freeze panes for column, row and both-axis freezes', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = { columns: [], rows: [] };
    const columnsOnly = parseXml(
      buildWorksheetXml({ table: sheet, sharedStrings: table, layout: { freezeColumns: 2 } }),
    );
    const pane1 = child(child(child(columnsOnly, 'sheetViews')!, 'sheetView')!, 'pane')!;
    expect(pane1.attrs).toEqual({
      xSplit: '2',
      topLeftCell: 'C1',
      activePane: 'topRight',
      state: 'frozen',
    });
    const rowsOnly = parseXml(
      buildWorksheetXml({ table: sheet, sharedStrings: table, layout: { freezeRows: 1 } }),
    );
    const pane2 = child(child(child(rowsOnly, 'sheetViews')!, 'sheetView')!, 'pane')!;
    expect(pane2.attrs).toEqual({
      ySplit: '1',
      topLeftCell: 'A2',
      activePane: 'bottomLeft',
      state: 'frozen',
    });
    const both = parseXml(
      buildWorksheetXml({ table: sheet, sharedStrings: table, layout: { freezeColumns: 1, freezeRows: 2 } }),
    );
    const pane3 = child(child(child(both, 'sheetViews')!, 'sheetView')!, 'pane')!;
    expect(pane3.attrs).toEqual({
      xSplit: '1',
      ySplit: '2',
      topLeftCell: 'B3',
      activePane: 'bottomRight',
      state: 'frozen',
    });
  });

  it('writes a rightToLeft sheetView', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = { columns: [], rows: [] };
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table, layout: { rightToLeft: true } }));
    const sheetView = child(child(xml, 'sheetViews')!, 'sheetView')!;
    expect(sheetView.attrs.rightToLeft).toBe('1');
  });

  it('omits sheetViews without layout settings', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = { columns: [], rows: [] };
    const xml = parseXml(buildWorksheetXml({ table: sheet, sharedStrings: table }));
    expect(child(xml, 'sheetViews')).toBeUndefined();
  });

  it('writes page setup with orientation and paper size', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = { columns: [], rows: [] };
    const xml = parseXml(
      buildWorksheetXml({
        table: sheet,
        sharedStrings: table,
        layout: { pageSetup: { orientation: 'Landscape', pageSize: 'A4' } },
      }),
    );
    expect(child(xml, 'pageSetup')!.attrs).toEqual({ orientation: 'landscape', paperSize: '9' });
  });

  it('writes page margins with documented defaults filled in', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = { columns: [], rows: [] };
    const xml = parseXml(
      buildWorksheetXml({
        table: sheet,
        sharedStrings: table,
        layout: { margins: { left: 1 } },
      }),
    );
    expect(child(xml, 'pageMargins')!.attrs).toEqual({
      left: '1',
      right: '0.7',
      top: '0.75',
      bottom: '0.75',
      header: '0.3',
      footer: '0.3',
    });
  });

  it('writes sheet protection flags and a hashed password', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = { columns: [], rows: [] };
    const xml = parseXml(
      buildWorksheetXml({
        table: sheet,
        sharedStrings: table,
        layout: { protectSheet: { formatCells: true, insertRows: true, password: 'secret' } },
      }),
    );
    const protection = child(xml, 'sheetProtection')!;
    expect(protection.attrs).toMatchObject({
      sheet: '1',
      formatCells: '1',
      insertRows: '1',
      deleteRows: '0',
      selectLockedCells: '1',
    });
    expect(protection.attrs.password).toMatch(/^[0-9A-F]{4}$/);
  });

  it('writes header/footer text with page-kind flags', () => {
    const table = new SharedStringTable();
    const sheet: ExcelTable = { columns: [], rows: [] };
    const xml = parseXml(
      buildWorksheetXml({
        table: sheet,
        sharedStrings: table,
        layout: {
          headerFooter: {
            oddHeader: '&CCompany Report',
            oddFooter: '&LPage &P of &N',
            firstHeader: '&CFirst Page',
          },
        },
      }),
    );
    const headerFooter = child(xml, 'headerFooter')!;
    expect(headerFooter.attrs.differentFirst).toBe('1');
    expect(child(headerFooter, 'oddHeader')!.text).toBe('&CCompany Report');
    expect(child(headerFooter, 'oddFooter')!.text).toBe('&LPage &P of &N');
    expect(child(headerFooter, 'firstHeader')!.text).toBe('&CFirst Page');
    expect(child(headerFooter, 'evenHeader')).toBeDefined();
  });

  it('hashes worksheet passwords deterministically', () => {
    expect(sheetPasswordHash('secret')).toBe(sheetPasswordHash('secret'));
    expect(sheetPasswordHash('')).toMatch(/^[0-9A-F]{4}$/);
    expect(sheetPasswordHash('a')).not.toBe(sheetPasswordHash('b'));
  });
});