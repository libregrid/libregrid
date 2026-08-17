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
    // 2024-01-15 = serial 45306 (2024-01-01 is 45292), displayed with the
    // built-in mm-dd-yy format via the auto-registered date style.
    expect(child(body[4]!, 'v')!.text).toBe('45306');
    expect(body[4]!.attrs.s).toBeDefined();
    const styles = parsePart(parts, 'xl/styles.xml');
    expect(children(child(styles, 'cellXfs')!, 'xf')[1]!.attrs.numFmtId).toBe('14');

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
    // Money style (164), rule style (red font), and the auto date style (14).
    expect(xfs).toHaveLength(4);
    // Money style: custom number format 164. Negative style: red font.
    expect(xfs[1]!.attrs.numFmtId).toBe('164');
    expect(xfs[2]!.attrs.fontId).toBe('1');
    expect(xfs[3]!.attrs.numFmtId).toBe('14');
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

  it('converts = strings into formulas only when autoConvertFormulas is set', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createTradeGrid({
      columnDefs: [{ field: 'country' }, { field: 'product' }],
      rowData: [{ country: 'X', product: '=1+1' }],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    const asText = unzipXlsx(await blobBytes(expectBlob(api!.getDataAsExcel())));
    const textCell = children(findAll(parsePart(asText, 'xl/worksheets/sheet1.xml'), 'row')[1]!, 'c')[1]!;
    expect(textCell.attrs.t).toBe('s');
    const textEntries = children(parsePart(asText, 'xl/sharedStrings.xml'), 'si').map(
      (si) => child(si, 't')!.text,
    );
    expect(textEntries).toContain('=1+1');

    const asFormula = unzipXlsx(
      await blobBytes(expectBlob(api!.getDataAsExcel({ autoConvertFormulas: true }))),
    );
    const formulaCell = children(
      findAll(parsePart(asFormula, 'xl/worksheets/sheet1.xml'), 'row')[1]!,
      'c',
    )[1]!;
    expect(formulaCell.attrs.t).toBeUndefined();
    expect(child(formulaCell, 'f')!.text).toBe('1+1');
  });

  it('invokes processCellCallback with parseValue/formatValue utilities', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createTradeGrid({
      columnDefs: [
        { field: 'country' },
        {
          field: 'amount',
          valueFormatter: (p: { value?: unknown }) => '$' + String(p.value),
          valueParser: (p: { newValue?: string }) => Number(p.newValue),
        },
      ],
      rowData: [{ country: 'X', amount: 100 }],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    const seen: unknown[] = [];
    const blob = api!.getDataAsExcel({
      processCellCallback: (p) => {
        seen.push({ value: p.value, accumulatedRowIndex: p.accumulatedRowIndex, type: p.type });
        return p.formatValue(p.parseValue('200'));
      },
    });
    const parts = unzipXlsx(await blobBytes(expectBlob(blob)));
    const bodyRow = children(findAll(parsePart(parts, 'xl/worksheets/sheet1.xml'), 'row')[1]!, 'c');
    expect(seen).toEqual([
      { value: 'X', accumulatedRowIndex: 0, type: 'excel' },
      { value: 100, accumulatedRowIndex: 0, type: 'excel' },
    ]);
    const strings = parsePart(parts, 'xl/sharedStrings.xml');
    expect(children(strings, 'si').map((si) => child(si, 't')!.text)).toContain('$200');
    expect(bodyRow[1]!.attrs.t).toBe('s');
  });

  it('overrides header text through processHeaderCallback', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createTradeGrid();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const blob = api!.getDataAsExcel({
      processHeaderCallback: (p) =>
        p.column.getColId() === 'amount'
          ? 'Total Amount'
          : p.column.getColDef().headerName ?? p.column.getColId(),
    });
    const parts = unzipXlsx(await blobBytes(expectBlob(blob)));
    const headerCells = children(findAll(parsePart(parts, 'xl/worksheets/sheet1.xml'), 'row')[0]!, 'c');
    const strings = parsePart(parts, 'xl/sharedStrings.xml');
    const texts = children(strings, 'si').map((si) => child(si, 't')!.text);
    expect(texts[Number(child(headerCells[2]!, 'v')!.text)]).toBe('Total Amount');
  });

  it('renders column group header rows with merges and processGroupHeaderCallback', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createTradeGrid({
      columnDefs: [
        { headerName: 'Details', children: [{ field: 'country' }, { field: 'product' }] },
        { field: 'amount' },
      ],
      rowData: [{ country: 'X', product: 'A', amount: 1 }],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    const blob = api!.getDataAsExcel({
      processGroupHeaderCallback: () => 'Renamed Group Header',
    });
    const parts = unzipXlsx(await blobBytes(expectBlob(blob)));
    const sheet = parsePart(parts, 'xl/worksheets/sheet1.xml');
    const rows = findAll(sheet, 'row');
    expect(rows).toHaveLength(3); // group header + column header + body
    const groupCells = children(rows[0]!, 'c');
    expect(groupCells[0]!.attrs.r).toBe('A1');
    expect(child(sheet, 'mergeCells')!).toBeDefined();
    expect(children(child(sheet, 'mergeCells')!, 'mergeCell')[0]!.attrs.ref).toBe('A1:B1');
    const strings = parsePart(parts, 'xl/sharedStrings.xml');
    const texts = children(strings, 'si').map((si) => child(si, 't')!.text);
    expect(texts).toContain('Renamed Group Header');
  });

  it('overrides group cell text through processRowGroupCallback', async () => {
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
    const blob = api!.getDataAsExcel({
      processRowGroupCallback: (p) => 'Region: ' + String(p.node.key),
    });
    const parts = unzipXlsx(await blobBytes(expectBlob(blob)));
    const strings = parsePart(parts, 'xl/sharedStrings.xml');
    const texts = children(strings, 'si').map((si) => child(si, 't')!.text);
    expect(texts).toContain('Region: US');
    expect(texts).toContain('Region: DE');
  });

  it('skips rows via shouldRowBeSkipped and inserts custom rows below', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createTradeGrid();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const blob = api!.getDataAsExcel({
      shouldRowBeSkipped: (p) => p.node.data?.product === 'Gadget',
      getCustomContentBelowRow: (p) =>
        p.node.data?.product === 'Widget'
          ? [{ cells: [{ data: { type: 'String', value: 'Custom row' } }] }]
          : undefined,
    });
    const parts = unzipXlsx(await blobBytes(expectBlob(blob)));
    const sheet = parsePart(parts, 'xl/worksheets/sheet1.xml');
    const strings = parsePart(parts, 'xl/sharedStrings.xml');
    const texts = children(strings, 'si').map((si) => child(si, 't')!.text);
    const stringOf = (cell: ReturnType<typeof findAll>[0]) =>
      texts[Number(child(cell, 'v')!.text)];
    const rows = findAll(sheet, 'row');
    // Header + US/Widget + Custom row + DE/Widget + Custom row (Gadget rows skipped).
    expect(rows).toHaveLength(5);
    const productCells = rows.slice(1).map((row) => {
      const cells = children(row, 'c');
      return cells.length > 1 ? stringOf(cells[1]!) : stringOf(cells[0]!);
    });
    expect(productCells).toEqual(['Widget', 'Custom row', 'Widget', 'Custom row']);
  });

  it('applies the Show Values As transform unless transformValues is false', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, RowGroupingModule, ExcelExportModule]);
    api = createTradeGrid({
      columnDefs: [
        { field: 'country' },
        { field: 'product' },
        { field: 'amount', showValuesAs: 'percentOfGrandTotal' },
      ],
      rowData: [
        { country: 'X', product: 'A', amount: 100 },
        { country: 'Y', product: 'B', amount: 300 },
      ],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(2));
    const transformed = unzipXlsx(await blobBytes(expectBlob(api!.getDataAsExcel())));
    const strings = parsePart(transformed, 'xl/sharedStrings.xml');
    const texts = children(strings, 'si').map((si) => child(si, 't')!.text);
    expect(texts.some((text) => text.includes('%'))).toBe(true);

    const raw = unzipXlsx(
      await blobBytes(expectBlob(api!.getDataAsExcel({ transformValues: false }))),
    );
    const rawSheet = parsePart(raw, 'xl/worksheets/sheet1.xml');
    const amountCell = children(findAll(rawSheet, 'row')[1]!, 'c')[2]!;
    expect(child(amountCell, 'v')!.text).toBe('100');
  });
});