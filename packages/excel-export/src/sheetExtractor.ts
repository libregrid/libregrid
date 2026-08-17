import type {
  Column,
  ColumnGroup,
  ExcelCell,
  ExcelColumn,
  ExcelData,
  ExcelDataType,
  ExcelExportParams,
  ExcelHeaderFooter,
  ExcelHeaderFooterConfig,
  ExcelHeaderFooterContent,
  ExcelRow,
  ExcelStyle,
  ExcelTable,
  ExcelWorksheet,
  AgColumn,
  GridApi,
  IRowNode,
  IShowValuesAsService,
  ProvidedColumnGroup,
} from 'ag-grid-community';
import { isoToExcelSerial } from './ooxml/dateSerial';
import type { WorksheetLayoutOptions } from './ooxml/parts/worksheetPart';

/** A worksheet ready for the writer, plus the styles and layout that go with it. */
export interface ExtractedSheet {
  worksheet: ExcelWorksheet;
  layout: WorksheetLayoutOptions;
  styles: ExcelStyle[];
}

const DEFAULT_SHEET_NAME = 'ag-grid';
const MAX_SHEET_NAME_LENGTH = 31;
/** Docs: exported columns keep their grid width with a minimum of 75px. */
const MIN_COLUMN_WIDTH_PX = 75;
/** Excel column-width unit ≈ characters of the default 11pt Calibri (≈7px each). */
const PX_PER_EXCEL_CHAR = 7;

/** Build the worksheet for one grid from its current state. */
export function extractSheet(
  api: GridApi,
  params: ExcelExportParams,
  styles: ExcelStyle[] | null | undefined,
  showValuesAs: IShowValuesAsService | null | undefined,
  columnTree: readonly (Column | ProvidedColumnGroup)[],
): ExtractedSheet {
  const styleList = styles ?? [];
  const styleById = new Map(styleList.map((style) => [style.id, style]));
  const columns = selectColumns(api, params);
  const rowNumberColumn = params.exportRowNumbers ? rowNumbersColumn() : null;
  const headerRows = extractHeaderRows(api, params, columns, columnTree, rowNumberColumn);
  const rows = extractRows(api, params, columns, styleById, showValuesAs, rowNumberColumn);
  const pinnedTop = params.skipPinnedTop ? [] : extractPinnedRows(api, 'top', columns);
  const pinnedBottom = params.skipPinnedBottom ? [] : extractPinnedRows(api, 'bottom', columns);
  const bodyRows = [...params.prependContent ?? [], ...pinnedTop, ...rows, ...pinnedBottom, ...params.appendContent ?? []];
  const allRows = [...headerRows, ...bodyRows];
  const table: ExcelTable = {
    columns: columns.map((column, index) => toExcelColumn(column, params, index)),
    rows: allRows,
  };
  return {
    worksheet: { name: resolveSheetName(params, api), table },
    layout: resolveLayout(api, params, headerRows.length),
    styles: styleList,
  };
}

/** Columns for the export: visible (default), all, or a columnKeys subset. */
function selectColumns(api: GridApi, params: ExcelExportParams): Column[] {
  if (params.columnKeys !== undefined) {
    return params.columnKeys
      .map((key) => (typeof key === 'string' ? api.getColumn(key) : key))
      .filter((column): column is Column => column !== null && column !== undefined);
  }
  if (params.allColumns) return api.getAllGridColumns() ?? [];
  return api.getAllDisplayedColumns() ?? [];
}

/** Synthetic first column for exportRowNumbers. */
function rowNumbersColumn(): Column {
  return {
    getColId: () => '__libregrid_row_numbers__',
    getColDef: () => ({ headerName: '#', field: undefined }),
    getActualWidth: () => 50,
    isRowGroupActive: () => false,
  } as unknown as Column;
}

/** One cell of a header row: a leaf column or a spanning group cell. */
interface HeaderCellInput {
  column: Column | null;
  group: ColumnGroup | null;
  headerName: string;
  leafCount: number;
}

/** Build group-header rows (one per tree level above the leaves) plus the leaf header row. */
function extractHeaderRows(
  api: GridApi,
  params: ExcelExportParams,
  columns: Column[],
  columnTree: readonly (Column | ProvidedColumnGroup)[],
  rowNumberColumn: Column | null,
): ExcelRow[] {
  const context = api.getGridOption('context');
  const rows = params.skipColumnGroupHeaders
    ? []
    : headerRowsFromTree(columnTree, params, api, context);
  if (!params.skipColumnHeaders) {
    const cells: ExcelCell[] = [];
    if (rowNumberColumn) {
      cells.push({ data: { type: 'String', value: '#' } });
    }
    for (const column of columns) {
      const headerName =
        params.processHeaderCallback?.({ column, api, context }) ?? columnHeaderName(column);
      cells.push({ data: { type: 'String', value: headerName } });
    }
    rows.push({ cells });
  }
  if (params.headerRowHeight !== undefined) {
    for (let index = 0; index < rows.length; index++) {
      const height = resolveRowHeight(params.headerRowHeight, index);
      if (height !== undefined) rows[index]!.height = height;
    }
  }
  return rows;
}

/** Recursively flatten the column-group tree into one header row per level. */
function headerRowsFromTree(
  tree: readonly (Column | ProvidedColumnGroup)[],
  params: ExcelExportParams,
  api: GridApi,
  context: unknown,
): ExcelRow[] {
  const rows: HeaderCellInput[][] = [];
  const walk = (nodes: readonly (Column | ProvidedColumnGroup)[], level: number): void => {
    for (const node of nodes) {
      if (node.isColumn) {
        const column = node as Column;
        const levelRows = (rows[level] ??= []);
        levelRows.push({
          column,
          group: null,
          headerName:
            params.processHeaderCallback?.({ column, api, context }) ?? columnHeaderName(column),
          leafCount: 1,
        });
        continue;
      }
      const group = node as ProvidedColumnGroup;
      const children = group.getChildren();
      const leafCount = group.getLeafColumns().length;
      const groupHeaderName = group.getColGroupDef()?.headerName ?? group.getGroupId();
      const levelRows = (rows[level] ??= []);
      levelRows.push({
        column: null,
        group: null,
        headerName:
          params.processGroupHeaderCallback?.({
            columnGroup: group as unknown as ColumnGroup,
            api,
            context,
          }) ?? groupHeaderName,
        leafCount,
      });
      walk(children, level + 1);
    }
  };
  walk(tree, 0);
  // The last level holds the leaf columns; extractHeaderRows adds that row
  // itself, so only the group levels above the leaves become rows here.
  return rows.slice(0, -1).map((levelRow) => {
    const cells: ExcelCell[] = [];
    for (const input of levelRow) {
      const data: ExcelData = { type: 'String', value: input.headerName };
      cells.push(input.leafCount > 1 ? { data, mergeAcross: input.leafCount - 1 } : { data });
    }
    return { cells };
  });
}

function extractRows(
  api: GridApi,
  params: ExcelExportParams,
  columns: Column[],
  styleById: Map<string, ExcelStyle>,
  showValuesAs: IShowValuesAsService | null | undefined,
  rowNumberColumn: Column | null,
): ExcelRow[] {
  const rows: ExcelRow[] = [];
  const expandState = params.rowGroupExpandState ?? 'expanded';
  const context = api.getGridOption('context');
  // Iterate every node, not only displayed rows: children of collapsed
  // groups must exist in the file as hidden rows so Excel can expand them.
  let nodes: IRowNode[] = [];
  api.forEachNode((node) => nodes.push(node));
  if (params.skipPinnedRowDuplicates) {
    nodes = withoutPinnedDuplicates(api, nodes);
  }
  const selected = selectNodes(api, params, nodes);
  let rowNumber = 1;
  let accumulatedRowIndex = params.prependContent?.length ?? 0;
  for (const node of selected) {
    const isGroup = node.group === true;
    if (isGroup && params.skipRowGroups) continue;
    if (params.shouldRowBeSkipped?.({ node, api, context })) continue;
    const cells: ExcelCell[] = [];
    if (rowNumberColumn) {
      cells.push({ data: { type: 'Number', value: String(rowNumber) } });
    }
    for (const column of columns) {
      cells.push(cellFor(api, node, column, styleById, params, accumulatedRowIndex, showValuesAs));
    }
    const row: ExcelRow = { cells };
    if (params.rowHeight !== undefined) {
      const height = resolveRowHeight(params.rowHeight, accumulatedRowIndex);
      if (height !== undefined) row.height = height;
    }
    if (!params.suppressRowOutline) {
      const outlineLevel = outlineLevelFor(node, isGroup);
      if (outlineLevel !== undefined) {
        row.outlineLevel = outlineLevel;
        if (isGroup && isCollapsed(node, expandState)) row.collapsed = true;
        if (!isGroup && ancestorCollapsed(node, expandState)) row.hidden = true;
      }
    }
    rows.push(row);
    rowNumber++;
    accumulatedRowIndex++;
    const customRows = params.getCustomContentBelowRow?.({ node, api, context });
    if (customRows) {
      rows.push(...customRows);
      accumulatedRowIndex += customRows.length;
    }
  }
  return rows;
}

/** Node subset per exportedRows / onlySelected / onlySelectedAllPages / rowPositions. */
function selectNodes(api: GridApi, params: ExcelExportParams, nodes: IRowNode[]): IRowNode[] {
  if (params.rowPositions !== undefined) {
    const positions = new Set(
      params.rowPositions
        .filter((position) => !position.rowPinned)
        .map((position) => position.rowIndex),
    );
    return nodes.filter((node) => node.rowIndex !== null && positions.has(node.rowIndex));
  }
  if (params.onlySelected || params.onlySelectedAllPages) {
    const selected = api.getSelectedNodes() as IRowNode[];
    if (params.onlySelectedAllPages) return selected;
    return selected.filter((node) => node.displayed);
  }
  if ((params.exportedRows ?? 'filteredAndSorted') === 'filteredAndSorted') {
    return nodes.filter((node) => node.displayed || ancestorCollapsed(node, 'match'));
  }
  return nodes;
}

/** Drop body rows whose data object also backs a manually pinned row. */
function withoutPinnedDuplicates(api: GridApi, nodes: IRowNode[]): IRowNode[] {
  const pinnedData = new Set<unknown>();
  for (let index = 0; index < api.getPinnedTopRowCount(); index++) {
    const node = api.getPinnedTopRow(index);
    if (node?.data !== undefined) pinnedData.add(node.data);
  }
  for (let index = 0; index < api.getPinnedBottomRowCount(); index++) {
    const node = api.getPinnedBottomRow(index);
    if (node?.data !== undefined) pinnedData.add(node.data);
  }
  return nodes.filter((node) => node.data === undefined || !pinnedData.has(node.data));
}

/** Pinned rows of one section, as export rows. */
function extractPinnedRows(
  api: GridApi,
  position: 'top' | 'bottom',
  columns: Column[],
): ExcelRow[] {
  const count =
    position === 'top' ? api.getPinnedTopRowCount() : api.getPinnedBottomRowCount();
  const rows: ExcelRow[] = [];
  for (let index = 0; index < count; index++) {
    const node =
      position === 'top' ? api.getPinnedTopRow(index) : api.getPinnedBottomRow(index);
    if (!node) continue;
    rows.push({
      cells: columns.map((column) => {
        const value = api.getCellValue({ rowNode: node, colKey: column, useFormatter: false });
        const data = excelData(value, undefined, undefined);
        return data ? { data } : {};
      }),
    });
  }
  return rows;
}

/** Layout settings from the export params. */
function resolveLayout(
  api: GridApi,
  params: ExcelExportParams,
  headerRowCount: number,
): WorksheetLayoutOptions {
  const layout: WorksheetLayoutOptions = {};
  const freezeColumns = resolveFreezeColumns(api, params);
  if (freezeColumns !== undefined) layout.freezeColumns = freezeColumns;
  const freezeRows = resolveFreezeRows(api, params, headerRowCount);
  if (freezeRows !== undefined) layout.freezeRows = freezeRows;
  const rightToLeft = params.rightToLeft ?? api.getGridOption('enableRtl') ?? false;
  if (rightToLeft) layout.rightToLeft = true;
  if (params.pageSetup) layout.pageSetup = params.pageSetup;
  if (params.margins) layout.margins = params.margins;
  if (params.headerFooterConfig) {
    layout.headerFooter = resolveHeaderFooter(params.headerFooterConfig);
  }
  if (params.protectSheet) {
    layout.protectSheet = params.protectSheet === true ? {} : params.protectSheet;
  }
  return layout;
}

/** Resolve the header/footer config into OOXML code-syntax strings. */
function resolveHeaderFooter(config: ExcelHeaderFooterConfig): {
  oddHeader?: string;
  oddFooter?: string;
  evenHeader?: string;
  evenFooter?: string;
  firstHeader?: string;
  firstFooter?: string;
} {
  const resolved: {
    oddHeader?: string;
    oddFooter?: string;
    evenHeader?: string;
    evenFooter?: string;
    firstHeader?: string;
    firstFooter?: string;
  } = {};
  if (config.all) {
    const odd = headerFooterText(config.all);
    if (odd.header !== undefined) resolved.oddHeader = odd.header;
    if (odd.footer !== undefined) resolved.oddFooter = odd.footer;
  }
  if (config.first) {
    const first = headerFooterText(config.first);
    if (first.header !== undefined) resolved.firstHeader = first.header;
    if (first.footer !== undefined) resolved.firstFooter = first.footer;
  }
  if (config.even) {
    const even = headerFooterText(config.even);
    if (even.header !== undefined) resolved.evenHeader = even.header;
    if (even.footer !== undefined) resolved.evenFooter = even.footer;
  }
  return resolved;
}

function headerFooterText(section: ExcelHeaderFooter): {
  header?: string;
  footer?: string;
} {
  const out: { header?: string; footer?: string } = {};
  if ('header' in section) out.header = buildHeaderFooterLine(section.header);
  if ('footer' in section) out.footer = buildHeaderFooterLine(section.footer);
  return out;
}

function buildHeaderFooterLine(items: ExcelHeaderFooterContent[]): string {
  const parts = { Left: '', Center: '', Right: '' };
  for (const item of items) {
    const position = item.position ?? 'Left';
    let text = item.value;
    if (item.image) text += '&G';
    if (item.font) {
      const flags: string[] = [];
      if (item.font.fontName) flags.push(item.font.fontName);
      if (item.font.bold) flags.push('Bold');
      if (item.font.italic) flags.push('Italic');
      const fontSpec = flags.length > 0 ? '&"' + flags.join(',') + '"' : '';
      const size = item.font.size !== undefined ? '&' + item.font.size : '';
      text = fontSpec + size + text;
    }
    parts[position] += text;
  }
  return '&L' + parts.Left + '&C' + parts.Center + '&R' + parts.Right;
}

function resolveFreezeColumns(api: GridApi, params: ExcelExportParams): number | undefined {
  const freeze = params.freezeColumns;
  if (freeze === undefined || freeze === 'pinned') {
    const columns = api.getAllDisplayedColumns() ?? [];
    const frozen = columns.filter((column) => column.isPinned?.());
    return frozen.length > 0 ? frozen.length : undefined;
  }
  if (typeof freeze === 'function') {
    const columns = api.getAllDisplayedColumns() ?? [];
    let count = 0;
    for (const column of columns) {
      if (!freeze({ column, api, context: api.getGridOption('context') })) break;
      count++;
    }
    return count > 0 ? count : undefined;
  }
  return undefined;
}

function resolveFreezeRows(
  api: GridApi,
  params: ExcelExportParams,
  headerRowCount: number,
): number | undefined {
  const freeze = params.freezeRows;
  if (freeze === 'headers') {
    return headerRowCount;
  }
  if (freeze === 'headersAndPinnedRows') {
    return headerRowCount + api.getPinnedTopRowCount();
  }
  if (typeof freeze === 'function') {
    let count = 0;
    api.forEachNode((node) => {
      if (freeze({ node, api, context: api.getGridOption('context') })) count++;
    });
    return count > 0 ? count : undefined;
  }
  return undefined;
}

/** Pixels to Excel points (1px = 0.75pt). */
function pxToPoints(px: number): number {
  return Math.round(px * 75) / 100;
}

function resolveRowHeight(
  rowHeight: ExcelExportParams['rowHeight'],
  rowIndex: number,
): number | undefined {
  const value = typeof rowHeight === 'function' ? rowHeight({ rowIndex }) : rowHeight;
  return value === undefined ? undefined : pxToPoints(value);
}

function cellFor(
  api: GridApi,
  node: IRowNode,
  column: Column,
  styleById: Map<string, ExcelStyle>,
  params: ExcelExportParams,
  accumulatedRowIndex: number,
  showValuesAs: IShowValuesAsService | null | undefined,
): ExcelCell {
  const context = api.getGridOption('context');
  let value = rawValue(api, node, column, params);
  if (node.group && column.isRowGroupActive()) {
    value = params.processRowGroupCallback?.({ node, column, api, context }) ?? value;
  }
  const agColumn = column as unknown as AgColumn;
  if (
    params.transformValues !== false &&
    showValuesAs?.isApplying(agColumn) &&
    value !== null &&
    value !== undefined
  ) {
    const transformed = showValuesAs.transform(agColumn, node, value);
    if (transformed !== null) {
      value = showValuesAs.formatValue(agColumn, node, transformed, value, false) ?? value;
    }
  }
  if (params.processCellCallback) {
    value =
      params.processCellCallback({
        value,
        accumulatedRowIndex,
        node,
        column,
        type: 'excel',
        parseValue: (text: string) => parseValue(api, column, node, text, value, context),
        formatValue: (raw: unknown) => formatValue(api, column, node, raw, context),
        api,
        context,
      }) ?? value;
  }
  const dataTypeHint = styleDataTypeFor(column, styleById);
  const data = excelData(value, dataTypeHint, params);
  const styleId = resolveCellStyleIds(api, node, column, value);
  if (data && styleId) return { data, styleId };
  return data ? { data } : styleId ? { styleId } : {};
}

function parseValue(
  api: GridApi,
  column: Column,
  node: IRowNode,
  text: string,
  oldValue: unknown,
  context: unknown,
): unknown {
  const parser = column.getColDef().valueParser;
  if (typeof parser !== 'function') return text;
  const colDef = column.getColDef();
  return parser({
    newValue: text,
    oldValue,
    data: node.data,
    node,
    colDef,
    column,
    api,
    context,
  } as never);
}

function formatValue(
  api: GridApi,
  column: Column,
  node: IRowNode,
  raw: unknown,
  context: unknown,
): string {
  const formatter = column.getColDef().valueFormatter;
  if (typeof formatter !== 'function') return String(raw);
  const colDef = column.getColDef();
  return (
    formatter({
      value: raw,
      data: node.data,
      node,
      colDef,
      column,
      api,
      context,
    } as never) ?? String(raw)
  );
}

/** The raw cell value, with group nodes reading group keys and aggregates. */
function rawValue(
  api: GridApi,
  node: IRowNode,
  column: Column,
  params: ExcelExportParams,
): unknown {
  if (node.group) {
    if (column.isRowGroupActive()) return node.key;
    const field = column.getColDef().field ?? column.getColId();
    if (node.aggData && field in node.aggData) return node.aggData[field];
    return null;
  }
  return api.getCellValue({
    rowNode: node,
    colKey: column,
    useFormatter: false,
    ...(params.valueFrom !== undefined ? { valueFrom: params.valueFrom } : {}),
  });
}

/** Map a grid value to ExcelData, honouring an ExcelStyle dataType hint. */
export function excelData(
  value: unknown,
  dataTypeHint?: ExcelDataType,
  params?: ExcelExportParams,
): ExcelData | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return { type: 'DateTime', value: value.toISOString() };
  if (typeof value === 'string' && params?.autoConvertFormulas && value.startsWith('=')) {
    return { type: 'Formula', value: value.slice(1) };
  }
  switch (dataTypeHint) {
    case 'String':
      return { type: 'String', value: String(value) };
    case 'Number': {
      const numeric = typeof value === 'number' ? value : Number(value);
      return Number.isNaN(numeric)
        ? { type: 'String', value: String(value) }
        : { type: 'Number', value: String(numeric) };
    }
    case 'Boolean':
      return {
        type: 'Boolean',
        value: value === true || value === 'true' || value === 1 || value === '1' ? '1' : '0',
      };
    case 'DateTime':
      return typeof value === 'string' && isoToExcelSerial(value) !== null
        ? { type: 'DateTime', value }
        : { type: 'String', value: String(value) };
  }
  if (typeof value === 'string') return { type: 'String', value };
  if (typeof value === 'number') return { type: 'Number', value: String(value) };
  if (typeof value === 'boolean') return { type: 'Boolean', value: value ? '1' : '0' };
  return { type: 'String', value: String(value) };
}

function styleDataTypeFor(
  column: Column,
  styleById: Map<string, ExcelStyle>,
): ExcelDataType | undefined {
  for (const id of cellClassIds(column.getColDef().cellClass)) {
    const dataType = styleById.get(id)?.dataType;
    if (dataType) return dataType;
  }
  return undefined;
}

function cellClassIds(cellClass: unknown): string[] {
  if (typeof cellClass === 'string') return [cellClass];
  if (Array.isArray(cellClass)) {
    return cellClass.filter((entry): entry is string => typeof entry === 'string');
  }
  return [];
}

/** Cell classes from cellClass plus matching cellClassRules, in order. */
function resolveCellStyleIds(
  api: GridApi,
  node: IRowNode,
  column: Column,
  value: unknown,
): string[] | undefined {
  const colDef = column.getColDef();
  const ids = cellClassIds(colDef.cellClass);
  if (colDef.cellClassRules) {
    for (const [className, rule] of Object.entries(colDef.cellClassRules)) {
      if (typeof rule === 'string') {
        ids.push(rule);
      } else if (
        rule({
          value,
          data: node.data,
          node,
          colDef,
          column,
          rowIndex: node.rowIndex ?? 0,
          api,
          context: api.getGridOption('context'),
        })
      ) {
        ids.push(className);
      }
    }
  }
  return ids.length > 0 ? ids : undefined;
}

function toExcelColumn(column: Column, params: ExcelExportParams, index: number): ExcelColumn {
  if (params.columnWidth !== undefined) {
    const px =
      typeof params.columnWidth === 'function'
        ? params.columnWidth({ column, index })
        : params.columnWidth;
    if (px !== undefined) return { width: pxToExcelWidth(px) };
  }
  // Without a rendered layout (e.g. headless tests) the width is undefined;
  // the documented 75px minimum still applies.
  return { width: pxToExcelWidth(column.getActualWidth() ?? 0) };
}

/** Convert a grid column width in pixels to Excel width units. */
export function pxToExcelWidth(px: number): number {
  return Math.round((Math.max(px, MIN_COLUMN_WIDTH_PX) / PX_PER_EXCEL_CHAR) * 100) / 100;
}

function columnHeaderName(column: Column): string {
  const colDef = column.getColDef();
  return colDef.headerName ?? colDef.field ?? column.getColId();
}

function resolveSheetName(params: ExcelExportParams, api: GridApi): string {
  const sheetName = params.sheetName;
  const name =
    typeof sheetName === 'function'
      ? sheetName({ api, context: api.getGridOption('context') })
      : sheetName ?? DEFAULT_SHEET_NAME;
  return name.slice(0, MAX_SHEET_NAME_LENGTH);
}

function outlineLevelFor(node: IRowNode, isGroup: boolean): number | undefined {
  if (isGroup) return node.level + 1;
  // The invisible root node reports group=true with level -1; only real
  // group parents contribute outline levels.
  const parent = node.parent;
  if (parent?.group && parent.level >= 0) return parent.level + 2;
  return undefined;
}

function isCollapsed(node: IRowNode, expandState: 'expanded' | 'collapsed' | 'match'): boolean {
  if (expandState === 'expanded') return false;
  if (expandState === 'collapsed') return true;
  return !node.expanded;
}

function ancestorCollapsed(
  node: IRowNode,
  expandState: 'expanded' | 'collapsed' | 'match',
): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.group && parent.level >= 0 && isCollapsed(parent, expandState)) return true;
  }
  return false;
}
