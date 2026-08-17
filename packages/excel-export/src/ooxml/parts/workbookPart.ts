import { serializeXml } from '../xml/xmlSerializer';
import type { XmlElement } from '../xml/xmlElement';

const SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** One `<sheet>` entry in xl/workbook.xml. */
export interface WorkbookSheetRef {
  name: string;
  sheetId: number;
  relationshipId: string;
}

/** Build the xl/workbook.xml part. */
export function buildWorkbookXml(sheets: WorkbookSheetRef[], activeTab?: number): string {
  const sheetElements: XmlElement[] = sheets.map((sheet) => ({
    name: 'sheet',
    attrs: { name: sheet.name, sheetId: sheet.sheetId, 'r:id': sheet.relationshipId },
  }));
  const children: XmlElement[] = [];
  if (activeTab !== undefined) {
    children.push({ name: 'bookViews', children: [{ name: 'workbookView', attrs: { activeTab } }] });
  }
  children.push({ name: 'sheets', children: sheetElements });
  return serializeXml({
    name: 'workbook',
    attrs: { xmlns: SHEET_NS, 'xmlns:r': REL_NS },
    children,
  });
}
