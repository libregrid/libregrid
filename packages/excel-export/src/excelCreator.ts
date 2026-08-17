import {
  BeanStub,
  type Column,
  type ExcelExportMultipleSheetParams,
  type ExcelExportParams,
  type ExcelFactoryMode,
  type ExcelStyle,
  type ExcelTable,
  type ExcelWorksheet,
  type GridApi,
  type IExcelCreator,
  type NamedBean,
  type ProvidedColumnGroup,
} from 'ag-grid-community';
import { buildXlsx } from './ooxml/xlsxBuilder';
import type { WorksheetLayoutOptions } from './ooxml/parts/worksheetPart';
import { extractSheet, type ExtractedSheet } from './sheetExtractor';
import { downloadFile } from './download';

const DEFAULT_FILE_NAME = 'export.xlsx';
const DEFAULT_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Serialised form of getSheetDataForExcel output. */
interface SheetEnvelope {
  v: number;
  name: string;
  styles: ExcelStyle[];
  table: ExcelTable;
  layout: WorksheetLayoutOptions;
}

const ENVELOPE_VERSION = 1;

/** Grid-backed Excel export implementation. @feature Excel Export */
export class ExcelCreator extends BeanStub implements NamedBean, IExcelCreator {
  public beanName = 'excelCreator' as const;
  private factoryMode: ExcelFactoryMode = 'SINGLE_SHEET';

  public setFactoryMode(factoryMode: ExcelFactoryMode): void {
    this.factoryMode = factoryMode;
  }

  public getFactoryMode(): ExcelFactoryMode {
    return this.factoryMode;
  }

  public getDataAsExcel(params?: ExcelExportParams): Blob | undefined {
    const sheet = this.extract(params ?? {});
    const { bytes } = buildXlsx([sheet.worksheet], {
      styles: sheet.styles,
      worksheets: [sheet.layout],
      ...(params?.author !== undefined ? { author: params.author } : {}),
      ...(params?.customMetadata !== undefined ? { customMetadata: params.customMetadata } : {}),
      ...(params?.fontSize !== undefined ? { fontSize: params.fontSize } : {}),
    });
    // fflate returns a fresh Uint8Array over a plain ArrayBuffer.
    return new Blob([bytes.buffer as ArrayBuffer], { type: params?.mimeType ?? DEFAULT_MIME_TYPE });
  }

  public exportDataAsExcel(params?: ExcelExportParams): void {
    const blob = this.getDataAsExcel(params);
    if (!blob) return;
    downloadFile(resolveFileName(params?.fileName, this.beans.gridApi), blob);
  }

  public getSheetDataForExcel(params?: ExcelExportParams): string {
    const sheet = this.extract(params ?? {});
    const envelope: SheetEnvelope = {
      v: ENVELOPE_VERSION,
      name: sheet.worksheet.name,
      styles: sheet.styles,
      table: sheet.worksheet.table,
      layout: sheet.layout,
    };
    return JSON.stringify(envelope);
  }

  public getMultipleSheetsAsExcel(params: ExcelExportMultipleSheetParams): Blob | undefined {
    const sheets = params.data.map((entry) => parseEnvelope(entry));
    const { bytes } = buildXlsx(
      sheets.map((sheet) => sheet.worksheet),
      {
        styles: sheets.flatMap((sheet) => sheet.styles),
        worksheets: sheets.map((sheet) => sheet.layout),
        ...(params.activeSheetIndex !== undefined
          ? { activeSheetIndex: params.activeSheetIndex }
          : {}),
        ...(params.author !== undefined ? { author: params.author } : {}),
        ...(params.customMetadata !== undefined ? { customMetadata: params.customMetadata } : {}),
        ...(params.fontSize !== undefined ? { fontSize: params.fontSize } : {}),
      },
    );
    return new Blob([bytes.buffer as ArrayBuffer], { type: params.mimeType ?? DEFAULT_MIME_TYPE });
  }

  public exportMultipleSheetsAsExcel(params: ExcelExportMultipleSheetParams): void {
    const blob = this.getMultipleSheetsAsExcel(params);
    if (!blob) return;
    downloadFile(resolveFileName(params.fileName, this.beans.gridApi), blob);
  }

  private extract(params: ExcelExportParams): ExtractedSheet {
    const styles = this.gos.get('excelStyles') as ExcelStyle[] | null | undefined;
    const colModel = this.beans.colModel as {
      colsTree?: readonly (Column | ProvidedColumnGroup)[];
    };
    return extractSheet(
      this.beans.gridApi,
      params,
      styles,
      this.beans.showValuesAsSvc,
      colModel.colsTree ?? [],
    );
  }
}

function parseEnvelope(entry: string): ExtractedSheet {
  let parsed: unknown;
  try {
    parsed = JSON.parse(entry);
  } catch {
    throw new Error('Invalid sheet data. Create each sheet with getSheetDataForExcel().');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid sheet data. Create each sheet with getSheetDataForExcel().');
  }
  const envelope = parsed as Partial<SheetEnvelope>;
  if (envelope.v !== ENVELOPE_VERSION || typeof envelope.name !== 'string' || !envelope.table) {
    throw new Error('Invalid sheet data. Create each sheet with getSheetDataForExcel().');
  }
  const worksheet: ExcelWorksheet = { name: envelope.name, table: envelope.table };
  return {
    worksheet,
    styles: envelope.styles ?? [],
    layout: envelope.layout ?? {},
  };
}

function resolveFileName(fileName: ExcelExportParams['fileName'], api: GridApi): string {
  if (typeof fileName === 'function') {
    const resolved = fileName({ api, context: api.getGridOption('context') });
    return resolved ?? DEFAULT_FILE_NAME;
  }
  return fileName ?? DEFAULT_FILE_NAME;
}
