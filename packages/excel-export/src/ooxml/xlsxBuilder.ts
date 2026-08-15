import type { ExcelStyle, ExcelWorksheet } from 'ag-grid-community';
import { SharedStringTable } from './sharedStringTable';
import { zipXlsxParts } from './zip/zipAssembler';
import { buildContentTypesXml } from './parts/contentTypesPart';
import { buildRootRelsXml } from './parts/rootRelsPart';
import { buildWorkbookXml, type WorkbookSheetRef } from './parts/workbookPart';
import {
  buildWorkbookRelsXml,
  RELATIONSHIP_TYPES,
  type WorkbookRelationship,
} from './parts/workbookRelsPart';
import { buildSharedStringsXml } from './parts/sharedStringsPart';
import { buildStylesXml } from './parts/stylesPart';
import { buildWorksheetXml, collectSharedStrings } from './parts/worksheetPart';
import { StyleResolver } from './styles/styleResolver';

/** Result of building a workbook: archive bytes plus every XML part as text. */
export interface BuiltXlsx {
  /** Raw .xlsx bytes (a ZIP archive of `parts`). */
  bytes: Uint8Array;
  /** Raw XML text of every part, keyed by archive path. */
  parts: Record<string, string>;
}

/** Optional settings for the workbook build. */
export interface XlsxBuildOptions {
  /** ExcelStyle definitions; cells reference them via `styleId`. */
  styles?: ExcelStyle[];
}

/**
 * Build a complete .xlsx archive from worksheet tables.
 *
 * The `parts` map mirrors the archive so the unzip-and-assert test harness
 * (phase 5.1) can cross-check the ZIP assembly against the generated XML.
 */
export function buildXlsx(worksheets: ExcelWorksheet[], options: XlsxBuildOptions = {}): BuiltXlsx {
  const sharedStrings = new SharedStringTable();
  for (const worksheet of worksheets) {
    collectSharedStrings(sharedStrings, worksheet.table);
  }
  const styleResolver = options.styles?.length ? new StyleResolver(options.styles) : undefined;

  const parts: Record<string, string> = {};
  const sheetRefs: WorkbookSheetRef[] = [];
  const rels: WorkbookRelationship[] = [];

  worksheets.forEach((worksheet, index) => {
    const sheetNumber = index + 1;
    const relationshipId = 'rId' + sheetNumber;
    sheetRefs.push({ name: worksheet.name, sheetId: sheetNumber, relationshipId });
    rels.push({
      id: relationshipId,
      type: RELATIONSHIP_TYPES.worksheet,
      target: 'worksheets/sheet' + sheetNumber + '.xml',
    });
    parts['xl/worksheets/sheet' + sheetNumber + '.xml'] = buildWorksheetXml({
      table: worksheet.table,
      sharedStrings,
      ...(styleResolver ? { styleResolver } : {}),
    });
  });

  const sharedStringsId = 'rId' + (worksheets.length + 1);
  rels.push({ id: sharedStringsId, type: RELATIONSHIP_TYPES.sharedStrings, target: 'sharedStrings.xml' });
  parts['xl/sharedStrings.xml'] = buildSharedStringsXml(sharedStrings);

  if (styleResolver) {
    const stylesId = 'rId' + (worksheets.length + 2);
    rels.push({ id: stylesId, type: RELATIONSHIP_TYPES.styles, target: 'styles.xml' });
    parts['xl/styles.xml'] = buildStylesXml(styleResolver.registry);
  }

  parts['[Content_Types].xml'] = buildContentTypesXml({
    sheets: worksheets.length,
    sharedStrings: true,
    styles: styleResolver !== undefined,
  });
  parts['_rels/.rels'] = buildRootRelsXml();
  parts['xl/workbook.xml'] = buildWorkbookXml(sheetRefs);
  parts['xl/_rels/workbook.xml.rels'] = buildWorkbookRelsXml(rels);

  return { bytes: zipXlsxParts(parts), parts };
}
