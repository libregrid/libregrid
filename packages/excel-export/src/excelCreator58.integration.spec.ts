/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllCommunityModule, createGrid, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { ExcelExportModule } from './excelExportModule';
import { unzipXlsx, parsePart } from './testing/xlsx';
import { child, children, findAll } from './testing/parseXml';

interface Item {
  name: string;
  category: string;
  amount: number;
}

const rows: Item[] = [
  { name: 'A', category: 'X', amount: 10 },
  { name: 'B', category: 'Y', amount: 20 },
  { name: 'C', category: 'X', amount: 30 },
];

const columnDefs: ColDef<Item>[] = [
  { field: 'name' },
  { field: 'category' },
  { field: 'amount' },
];

let api: GridApi | undefined;

afterEach(() => {
  api?.destroy();
  api = undefined;
  document.body.replaceChildren();
});

function createGridWith(options: Record<string, unknown> = {}): GridApi {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return createGrid(host, { columnDefs, rowData: rows, ...options });
}

async function sheetOf(blob: string | Blob | undefined) {
  if (!(blob instanceof Blob)) throw new Error('expected a Blob');
  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  const parts = unzipXlsx(bytes);
  return { parts, sheet: parsePart(parts, 'xl/worksheets/sheet1.xml') };
}

describe('ExcelCreator scope and page params (5.8)', () => {
  it('exports row numbers as a leading column', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const { sheet } = await sheetOf(api!.getDataAsExcel({ exportRowNumbers: true }));
    const body = children(findAll(sheet, 'row')[1]!, 'c');
    expect(body[0]!.attrs.r).toBe('A2');
    expect(child(body[0]!, 'v')!.text).toBe('1');
    expect(body[1]!.attrs.r).toBe('B2');
    expect(child(child(findAll(sheet, 'row')[3]!, 'c')!, 'v')!.text).toBe('3');
  });

  it('honours columnKeys and allColumns', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith({
      columnDefs: [
        { field: 'name' },
        { field: 'category', hide: true },
        { field: 'amount' },
      ],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const keys = await sheetOf(api!.getDataAsExcel({ columnKeys: ['name', 'amount'] }));
    const keyCells = children(findAll(keys.sheet, 'row')[0]!, 'c');
    expect(keyCells.map((c) => c.attrs.r)).toEqual(['A1', 'B1']);
    const all = await sheetOf(api!.getDataAsExcel({ allColumns: true }));
    const allCells = children(findAll(all.sheet, 'row')[0]!, 'c');
    expect(allCells.map((c) => c.attrs.r)).toEqual(['A1', 'B1', 'C1']);
  });

  it('skips header rows via skipColumnHeaders and skipColumnGroupHeaders', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith({
      columnDefs: [
        { headerName: 'G', children: [{ field: 'name' }, { field: 'category' }] },
        { field: 'amount' },
      ],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const skipAll = await sheetOf(api!.getDataAsExcel({ skipColumnHeaders: true, skipColumnGroupHeaders: true }));
    expect(findAll(skipAll.sheet, 'row')).toHaveLength(3);
    const skipGroups = await sheetOf(api!.getDataAsExcel({ skipColumnGroupHeaders: true }));
    expect(findAll(skipGroups.sheet, 'row')).toHaveLength(4); // leaf header + body
  });

  it('exports only selected rows with onlySelected', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith({
      rowSelection: { mode: 'multiRow', checkboxes: false },
      selectionColumnDef: { hide: true },
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    api.getRowNode('1')!.setSelected(true);
    const { sheet } = await sheetOf(api!.getDataAsExcel({ onlySelected: true }));
    expect(findAll(sheet, 'row')).toHaveLength(2); // header + one selected row
    const body = children(findAll(sheet, 'row')[1]!, 'c');
    expect(body[0]!.attrs.r).toBe('A2');
  });

  it('exports specific rows via rowPositions', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const { sheet } = await sheetOf(
      api!.getDataAsExcel({
        rowPositions: [
          { rowIndex: 0, rowPinned: null },
          { rowIndex: 2, rowPinned: null },
        ],
      }),
    );
    expect(findAll(sheet, 'row')).toHaveLength(3); // header + 2 rows
    const body = children(findAll(sheet, 'row')[1]!, 'c');
    expect(body[0]!.attrs.r).toBe('A2');
  });

  it('exports filtered rows only in the default exportedRows mode', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    api.setGridOption('quickFilterText', 'B');
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(1));
    const filtered = await sheetOf(api!.getDataAsExcel());
    expect(findAll(filtered.sheet, 'row')).toHaveLength(2);
    const all = await sheetOf(api!.getDataAsExcel({ exportedRows: 'all' }));
    expect(findAll(all.sheet, 'row')).toHaveLength(4);
  });

  it('exports pinned rows and skips them via flags', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith({
      pinnedTopRowData: [{ name: 'Pinned', category: 'Z', amount: 99 }],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const withPinned = await sheetOf(api!.getDataAsExcel());
    expect(findAll(withPinned.sheet, 'row')).toHaveLength(5); // header + pinned + 3
    const without = await sheetOf(api!.getDataAsExcel({ skipPinnedTop: true }));
    expect(findAll(without.sheet, 'row')).toHaveLength(4);
  });

  it('applies columnWidth, rowHeight and headerRowHeight', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const { sheet } = await sheetOf(
      api!.getDataAsExcel({
        columnWidth: 140,
        rowHeight: 40,
        headerRowHeight: 20,
      }),
    );
    const col = children(child(sheet, 'cols')!, 'col')[0]!;
    expect(col.attrs.width).toBe('20');
    const rowsEls = findAll(sheet, 'row');
    expect(rowsEls[0]!.attrs).toEqual({ r: '1', ht: '15', customHeight: '1' });
    expect(rowsEls[1]!.attrs).toEqual({ r: '2', ht: '30', customHeight: '1' });
  });

  it('freezes pinned columns and header rows', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith({
      columnDefs: [
        { field: 'name', pinned: 'left' },
        { field: 'category' },
        { field: 'amount' },
      ],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const { sheet } = await sheetOf(
      api!.getDataAsExcel({ freezeColumns: 'pinned', freezeRows: 'headers' }),
    );
    const pane = child(child(child(sheet, 'sheetViews')!, 'sheetView')!, 'pane')!;
    expect(pane.attrs).toEqual({
      xSplit: '1',
      ySplit: '1',
      topLeftCell: 'B2',
      activePane: 'bottomRight',
      state: 'frozen',
    });
  });

  it('writes page setup, margins, header/footer and protection', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const { sheet } = await sheetOf(
      api!.getDataAsExcel({
        pageSetup: { orientation: 'Landscape', pageSize: 'A3' },
        margins: { left: 1 },
        headerFooterConfig: { all: { header: [{ value: 'Report', position: 'Center' }] } },
        protectSheet: true,
      }),
    );
    expect(child(sheet, 'pageSetup')!.attrs).toEqual({ orientation: 'landscape', paperSize: '8' });
    expect(child(sheet, 'pageMargins')!.attrs.left).toBe('1');
    expect(child(child(sheet, 'headerFooter')!, 'oddHeader')!.text).toBe('&L&CReport&R');
    expect(child(sheet, 'sheetProtection')!.attrs.sheet).toBe('1');
  });

  it('writes author, custom metadata and the default font size', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const blob = api!.getDataAsExcel({
      author: 'LibreGrid Docs',
      customMetadata: { exporter: 'libregrid', build: 42 },
      fontSize: 14,
    });
    const { parts, sheet } = await sheetOf(blob);
    expect(child(parsePart(parts, 'docProps/core.xml'), 'dc:creator')!.text).toBe('LibreGrid Docs');
    const custom = parsePart(parts, 'docProps/custom.xml');
    expect(children(custom, 'property')[0]!.attrs.name).toBe('exporter');
    expect(parts['xl/styles.xml']).toBeDefined();
    const styles = parsePart(parts, 'xl/styles.xml');
    expect(children(children(child(styles, 'fonts')!, 'font')[0]!, 'sz')[0]!.attrs.val).toBe('14');
    expect(sheet).toBeDefined();
  });

  it('prepends and appends content rows', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const { sheet } = await sheetOf(
      api!.getDataAsExcel({
        prependContent: [{ cells: [{ data: { type: 'String', value: 'Intro' } }] }],
        appendContent: [{ cells: [{ data: { type: 'String', value: 'End' } }] }],
      }),
    );
    const rowsEls = findAll(sheet, 'row');
    expect(rowsEls).toHaveLength(6); // header + intro + 3 + end
    expect(rowsEls[0]!.attrs.r).toBe('1');
    expect(rowsEls[5]!.attrs.r).toBe('6');
  });

  it('resolves sheetName and fileName getters, mime types and freeze callbacks', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const named = await sheetOf(api!.getDataAsExcel({ sheetName: () => 'FromGetter' }));
    const workbook = parsePart(named.parts, 'xl/workbook.xml');
    expect(child(child(workbook, 'sheets')!, 'sheet')!.attrs.name).toBe('FromGetter');
    const mime = api!.getDataAsExcel({ mimeType: 'application/x-custom' });
    expect((mime as Blob).type).toBe('application/x-custom');
    const freezeCallback = await sheetOf(
      api!.getDataAsExcel({
        freezeRows: ({ node }) => node !== undefined && node.rowIndex !== null && node.rowIndex < 1,
        freezeColumns: ({ column }) => column.getColId() !== 'amount',
      }),
    );
    const pane = child(child(child(freezeCallback.sheet, 'sheetViews')!, 'sheetView')!, 'pane')!;
    expect(pane.attrs).toEqual({
      xSplit: '2',
      ySplit: '1',
      topLeftCell: 'C2',
      activePane: 'bottomRight',
      state: 'frozen',
    });
  });

  it('applies columnWidth and headerRowHeight callbacks', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    const { sheet } = await sheetOf(
      api!.getDataAsExcel({
        columnWidth: ({ index }) => 105 + index * 70,
        headerRowHeight: ({ rowIndex }) => 30 + rowIndex * 10,
      }),
    );
    const colNodes = children(child(sheet, 'cols')!, 'col');
    expect(colNodes[0]!.attrs.width).toBe('15');
    expect(colNodes[1]!.attrs.width).toBe('25');
    expect(findAll(sheet, 'row')[0]!.attrs).toEqual({ r: '1', ht: '22.5', customHeight: '1' });
  });

  it('supports onlySelectedAllPages and skipPinnedBottom', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith({
      rowSelection: { mode: 'multiRow', checkboxes: false },
      selectionColumnDef: { hide: true },
      pinnedBottomRowData: [{ name: 'Bottom', category: 'Z', amount: 1 }],
    });
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    api.getRowNode('0')!.setSelected(true);
    const allPages = await sheetOf(api!.getDataAsExcel({ onlySelectedAllPages: true }));
    // Header + the one selected body row + the pinned bottom row (pinned
    // sections are governed by their own skip flags, not by selection).
    expect(findAll(allPages.sheet, 'row')).toHaveLength(3);
    const noBottom = await sheetOf(api!.getDataAsExcel({ skipPinnedBottom: true }));
    expect(findAll(noBottom.sheet, 'row')).toHaveLength(4);
  });

  it('rejects invalid multi-sheet data with a clear message', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
    await vi.waitFor(() => expect(api?.getDisplayedRowCount()).toBe(3));
    expect(() => api!.getMultipleSheetsAsExcel({ data: ['garbage'] })).toThrow(
      'Invalid sheet data',
    );
    expect(() =>
      api!.getMultipleSheetsAsExcel({ data: [JSON.stringify({ v: 99, name: 'X' })] }),
    ).toThrow('Invalid sheet data');
    expect(() => api!.getMultipleSheetsAsExcel({ data: [JSON.stringify(42)] })).toThrow(
      'Invalid sheet data',
    );
  });

  it('resolves a fileName getter on export', async () => {
    ModuleRegistry.registerModules([AllCommunityModule, ExcelExportModule]);
    api = createGridWith();
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
    api!.exportMultipleSheetsAsExcel({
      data: [
        api!.getSheetDataForExcel({ sheetName: 'One' })!,
        api!.getSheetDataForExcel({ sheetName: 'Two' })!,
      ],
      fileName: () => 'combo.xlsx',
    });
    expect(anchors[0]!.download).toBe('combo.xlsx');
    expect(anchors[0]!.click).toHaveBeenCalled();
  });
});