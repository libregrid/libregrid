import type {
  Column,
  ExcelCell,
  ExcelColumn,
  ExcelData,
  ExcelDataType,
  ExcelExportParams,
  ExcelRow,
  ExcelStyle,
  ExcelTable,
  ExcelWorksheet,
  GridApi,
  IRowNode,
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
): ExtractedSheet {
  const styleList = styles ?? [];
  const styleById = new Map(styleList.map((style) => [style.id, style]));
  const columns = api.getAllDisplayedColumns() ?? [];
  const headerRow: ExcelRow = {
    cells: columns.map((column) => ({
      data: { type: 'String', value: headerName(column) },
    })),
  };
  const rows = extractRows(api, params, columns, styleById);
  const table: ExcelTable = { columns: columns.map(toExcelColumn), rows: [headerRow, ...rows] };
  return {
    worksheet: { name: resolveSheetName(params, api), table },
    layout: {},
    styles: styleList,
  };
}

function extractRows(
  api: GridApi,
  params: ExcelExportParams,
  columns: Column[],
  styleById: Map<string, ExcelStyle>,
): ExcelRow[] {
  const rows: ExcelRow[] = [];
  const expandState = params.rowGroupExpandState ?? 'expanded';
  // Iterate every node, not only displayed rows: children of collapsed
  // groups must exist in the file as hidden rows so Excel can expand them.
  const nodes: IRowNode[] = [];
  api.forEachNode((node) => nodes.push(node));
  for (const node of nodes) {
    const isGroup = node.group === true;
    if (isGroup && params.skipRowGroups) continue;
    const cells = columns.map((column) => cellFor(api, node, column, styleById));
    const row: ExcelRow = { cells };
    if (!params.suppressRowOutline) {
      const outlineLevel = outlineLevelFor(node, isGroup);
      if (outlineLevel !== undefined) {
        row.outlineLevel = outlineLevel;
        if (isGroup && isCollapsed(node, expandState)) row.collapsed = true;
        if (!isGroup && ancestorCollapsed(node, expandState)) row.hidden = true;
      }
    }
    rows.push(row);
  }
  return rows;
}

function cellFor(
  api: GridApi,
  node: IRowNode,
  column: Column,
  styleById: Map<string, ExcelStyle>,
): ExcelCell {
  const value = rawValue(api, node, column);
  const dataTypeHint = styleDataTypeFor(column, styleById);
  const data = excelData(value, dataTypeHint);
  const styleId = resolveCellStyleIds(api, node, column, value);
  if (data && styleId) return { data, styleId };
  return data ? { data } : styleId ? { styleId } : {};
}

/** The raw cell value, with group nodes reading group keys and aggregates. */
function rawValue(api: GridApi, node: IRowNode, column: Column): unknown {
  if (node.group) {
    if (column.isRowGroupActive()) return node.key;
    const field = column.getColDef().field ?? column.getColId();
    if (node.aggData && field in node.aggData) return node.aggData[field];
    return null;
  }
  return api.getCellValue({ rowNode: node, colKey: column, useFormatter: false });
}

/** Map a grid value to ExcelData, honouring an ExcelStyle dataType hint. */
export function excelData(value: unknown, dataTypeHint?: ExcelDataType): ExcelData | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return { type: 'DateTime', value: value.toISOString() };
  switch (dataTypeHint) {
    case 'String':
      return { type: 'String', value: String(value) };
    case 'Number': {
      const numeric = typeof value === 'number' ? value : Number(value);
      return Number.isNaN(numeric) ? { type: 'String', value: String(value) } : { type: 'Number', value: String(numeric) };
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
  if (Array.isArray(cellClass)) return cellClass.filter((entry): entry is string => typeof entry === 'string');
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

function toExcelColumn(column: Column): ExcelColumn {
  // Without a rendered layout (e.g. headless tests) the width is undefined;
  // the documented 75px minimum still applies.
  return { width: pxToExcelWidth(column.getActualWidth() ?? 0) };
}

/** Convert a grid column width in pixels to Excel width units. */
export function pxToExcelWidth(px: number): number {
  return Math.round((Math.max(px, MIN_COLUMN_WIDTH_PX) / PX_PER_EXCEL_CHAR) * 100) / 100;
}

function headerName(column: Column): string {
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
  const parent = node.parent;
  if (parent?.group) return parent.level + 2;
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
    if (parent.group && isCollapsed(parent, expandState)) return true;
  }
  return false;
}
