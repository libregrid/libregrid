/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AllCommunityModule,
  createGrid,
  ModuleRegistry,
  type ColDef,
  type GridApi,
} from 'ag-grid-community';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { ExcelExportModule } from './excelExportModule';
import { unzipXlsx, parsePart } from './testing/xlsx';
import { child, children, findAll } from './testing/parseXml';

interface Trade {
  country: string;
  product: string;
  amount: number;
  closed: boolean;
  date: Date;
}

const trades: Trade[] = [
  { country: 'US', product: 'Widget', amount: 100, closed: true, date: new Date('2024-01-15T00:00:00.000Z') },
  { country: 'US', product: 'Gadget', amount: 250.5, closed: false, date: new Date('2024-02-20T00:00:00.000Z') },
  { country: 'DE', product: 'Widget', amount: -30, closed: true, date: new Date('2024-03-05T00:00:00.000Z') },
];

const tradeColumnDefs: ColDef<Trade>[] = [
  { field: 'country' },
  { field: 'product' },
  { field: 'amount' },
  { field: 'closed' },
  { field: 'date' },
];

let api: GridApi | undefined;
let grids: GridApi[] = [];

afterEach(() => {
  api?.destroy();
  api = undefined;
  for (const grid of grids) grid.destroy();
  grids = [];
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

function createTradeGrid(options: Record<string, unknown> = {}): GridApi {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return createGrid(host, { columnDefs: tradeColumnDefs, rowData: trades, ...options });
}

function expectBlob(value: string | Blob | undefined): Blob {
  if (value instanceof Blob) return value;
  throw new Error('Expected getDataAsExcel to return a Blob');
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  // FileReader works with the Blob implementations of both jsdom and Node.
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('ExcelCreator (integration)', () => {
  it('exports plain grid values with correct cell types through GridApi', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createTradeGrid();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const blob = api!.getDataAsExcel({ sheetName: 'Trades' });
    expect(blob).toBeDefined();
    const parts = unzipXlsx(await blobBytes(expectBlob(blob)));

    const workbook = parsePart(parts, 'xl/workbook.xml');
    expect(child(child(workbook, 'sheets')!, 'sheet')!.attrs.name).toBe('Trades');

    const sheet = parsePart(parts, 'xl/worksheets/sheet1.xml');
    expect(child(sheet, 'dimension')!.attrs.ref).toBe('A1:E4');
    const rows = findAll(sheet, 'row');
    const headerCells = children(rows[0]!, 'c');
    expect(headerCells.map((c) => c.attrs.r)).toEqual(['A1', 'B1', 'C1', 'D1', 'E1']);
    const strings = parsePart(parts, 'xl/sharedStrings.xml');
    const texts = children(strings, 'si').map((si) => child(si, 't')!.text);
    expect(texts.slice(0, 5)).toEqual(['country', 'product', 'amount', 'closed', 'date']);

    const body = children(rows[1]!, 'c');
    expect(body.map((c) => c.attrs.t)).toEqual(['s', 's', undefined, 'b', undefined]);
    // Amount stays numeric; boolean is 1; date becomes a 1900 serial.
    expect(child(body[2]!, 'v')!.text).toBe('100');
    expect(child(body[3]!, 'v')!.text).toBe('1');
    // 2024-01-15 = serial 45306 (2024-01-01 is 45292).
    expect(child(body[4]!, 'v')!.text).toBe('45306');

    // Column widths: the default 200px column in jsdom layout.
    const colNodes = children(child(sheet, 'cols')!, 'col');
    expect(colNodes).toHaveLength(1);
    expect(colNodes[0]!.attrs.width).toBe('28.57');
  });

  it('writes grouped rows with outline levels, collapse state and hidden children', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, ExcelExportModule]);
    api = createTradeGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'product' },
        { field: 'amount' },
        { field: 'closed' },
        { field: 'date' },
      ],
      groupDefaultExpanded: 0,
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(2));
    // Default rowGroupExpandState is 'expanded': all groups open in the file.
    const expanded = unzipXlsx(await blobBytes(expectBlob(api!.getDataAsExcel())));
    const rows = findAll(parsePart(expanded, 'xl/worksheets/sheet1.xml'), 'row');
    expect(rows).toHaveLength(6); // header + 2 groups + 3 children
    expect(rows[1]!.attrs).toEqual({ r: '2', outlineLevel: '1' });
    expect(rows[2]!.attrs).toEqual({ r: '3', outlineLevel: '2' });

    // 'match' preserves the grid's collapse state in the file.
    const matched = unzipXlsx(
      await blobBytes(expectBlob(api!.getDataAsExcel({ rowGroupExpandState: 'match' }))),
    );
    const matchedRows = findAll(parsePart(matched, 'xl/worksheets/sheet1.xml'), 'row');
    expect(matchedRows).toHaveLength(6);
    expect(matchedRows[1]!.attrs).toEqual({ r: '2', outlineLevel: '1', collapsed: '1' });
    expect(matchedRows[2]!.attrs).toEqual({ r: '3', outlineLevel: '2', hidden: '1' });
    expect(matchedRows[3]!.attrs).toEqual({ r: '4', outlineLevel: '2', hidden: '1' });
  });

  it('honours rowGroupExpandState, suppressRowOutline and skipRowGroups', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, ExcelExportModule]);
    api = createTradeGrid({
      columnDefs: [
        { field: 'country', rowGroup: true },
        { field: 'product' },
        { field: 'amount' },
        { field: 'closed' },
        { field: 'date' },
      ],
      groupDefaultExpanded: -1,
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(5));

    const collapsed = unzipXlsx(
      await blobBytes(expectBlob(api!.getDataAsExcel({ rowGroupExpandState: 'collapsed' }))),
    );
    const collapsedRows = findAll(parsePart(collapsed, 'xl/worksheets/sheet1.xml'), 'row');
    expect(collapsedRows).toHaveLength(6); // header + 2 groups + 3 hidden children
    expect(collapsedRows[1]!.attrs.collapsed).toBe('1');
    expect(collapsedRows[2]!.attrs.hidden).toBe('1');

    const suppressed = unzipXlsx(
      await blobBytes(expectBlob(api!.getDataAsExcel({ suppressRowOutline: true }))),
    );
    const suppressedRows = findAll(parsePart(suppressed, 'xl/worksheets/sheet1.xml'), 'row');
    expect(suppressedRows.some((row) => row.attrs.outlineLevel !== undefined)).toBe(false);

    const skipped = unzipXlsx(
      await blobBytes(expectBlob(api!.getDataAsExcel({ skipRowGroups: true }))),
    );
    const skippedRows = findAll(parsePart(skipped, 'xl/worksheets/sheet1.xml'), 'row');
    expect(skippedRows).toHaveLength(4); // header + 3 leaf rows
  });

  it('applies excelStyles through cellClass and cellClassRules', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createTradeGrid({
      excelStyles: [
        { id: 'money', dataType: 'Number', numberFormat: { format: '"$"#,##0.00' } },
        { id: 'negative', font: { color: 'red' } },
      ],
      columnDefs: [
        { field: 'country' },
        { field: 'product' },
        { field: 'amount', cellClass: 'money' },
        {
          field: 'closed',
          cellClassRules: {
            negative: (params: { value: unknown }) => typeof params.value === 'boolean',
          },
        },
        { field: 'date' },
      ],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const blob = api!.getDataAsExcel();
    const parts = unzipXlsx(await blobBytes(expectBlob(blob)));
    const sheet = parsePart(parts, 'xl/worksheets/sheet1.xml');
    const styles = parsePart(parts, 'xl/styles.xml');
    const xfs = children(child(styles, 'cellXfs')!, 'xf');
    expect(xfs).toHaveLength(3);
    // Money style: custom number format 164. Negative style: red font.
    expect(xfs[1]!.attrs.numFmtId).toBe('164');
    expect(xfs[2]!.attrs.fontId).toBe('1');
    expect(child(children(child(styles, 'fonts')!, 'font')[1]!, 'color')!.attrs.rgb).toBe('FFFF0000');
    // Amount cells carry the money style; the boolean column carries the rule style.
    const bodyRow = children(findAll(sheet, 'row')[1]!, 'c');
    expect(bodyRow[2]!.attrs.s).toBe('1');
    expect(child(bodyRow[2]!, 'v')!.text).toBe('100');
    expect(bodyRow[3]!.attrs.s).toBe('2');
  });

  it('round-trips multiple sheets through getSheetDataForExcel', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    const first = createTradeGrid();
    const secondHost = document.createElement('div');
    document.body.appendChild(secondHost);
    const second = createGrid(secondHost, {
      columnDefs: [{ field: 'label' }, { field: 'score' }],
      rowData: [
        { label: 'A', score: 1 },
        { label: 'B', score: 2 },
      ],
    });
    grids = [first, second];
    api = first;
    await vi.waitFor(() => expect(first.getDisplayedRowCount()).toBe(3));
    await vi.waitFor(() => expect(second.getDisplayedRowCount()).toBe(2));

    const sheetOne = first.getSheetDataForExcel({ sheetName: 'Trades' })!;
    const sheetTwo = second.getSheetDataForExcel({ sheetName: 'Scores' })!;
    const blob = first.getMultipleSheetsAsExcel({
      data: [sheetOne, sheetTwo],
      fileName: 'multi.xlsx',
      activeSheetIndex: 1,
    })!;
    const parts = unzipXlsx(await blobBytes(expectBlob(blob)));
    expect(parts['xl/worksheets/sheet1.xml']).toBeDefined();
    expect(parts['xl/worksheets/sheet2.xml']).toBeDefined();
    const workbook = parsePart(parts, 'xl/workbook.xml');
    const sheetNodes = children(child(workbook, 'sheets')!, 'sheet');
    expect(sheetNodes.map((node) => node.attrs.name)).toEqual(['Trades', 'Scores']);
    const bookView = child(child(workbook, 'bookViews')!, 'workbookView')!;
    expect(bookView.attrs.activeTab).toBe('1');
    // Shared strings are merged into one table across the two sheets.
    const secondSheet = parsePart(parts, 'xl/worksheets/sheet2.xml');
    const secondCells = children(findAll(secondSheet, 'row')[1]!, 'c');
    expect(secondCells).toHaveLength(2);
  });

  it('downloads with the configured file name', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createTradeGrid();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const anchors: HTMLAnchorElement[] = [];
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const element = originalCreate(tag);
      if (tag === 'a') {
        anchors.push(element as HTMLAnchorElement);
        (element as HTMLAnchorElement).click = vi.fn();
      }
      return element;
    });
    api!.exportDataAsExcel({ fileName: 'report.xlsx' });
    expect(anchors).toHaveLength(1);
    expect(anchors[0]!.download).toBe('report.xlsx');
    expect(anchors[0]!.click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
