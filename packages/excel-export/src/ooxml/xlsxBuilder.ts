import type { ExcelCustomMetadata, ExcelStyle, ExcelWorksheet } from 'ag-grid-community';
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
import { buildCorePropsXml, buildCustomPropsXml } from './parts/docPropsPart';
import {
  buildWorksheetXml,
  collectSharedStrings,
  type WorksheetLayoutOptions,
} from './parts/worksheetPart';
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
  /** Per-sheet layout settings, index-aligned with `worksheets`. */
  worksheets?: ReadonlyArray<WorksheetLayoutOptions>;
  /** Zero-based index of the sheet shown when the workbook opens. */
  activeSheetIndex?: number;
  /** Document author written to docProps/core.xml. */
  author?: string;
  /** Custom document metadata written to docProps/custom.xml. */
  customMetadata?: ExcelCustomMetadata;
  /** Default font size for the workbook's styles. */
  fontSize?: number;
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
  const hasStyles = (options.styles?.length ?? 0) > 0 || options.fontSize !== undefined;
  const styleResolver = hasStyles
    ? new StyleResolver(options.styles ?? [], options.fontSize)
    : undefined;

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
    const layout = options.worksheets?.[index];
    parts['xl/worksheets/sheet' + sheetNumber + '.xml'] = buildWorksheetXml({
      table: worksheet.table,
      sharedStrings,
      ...(styleResolver ? { styleResolver } : {}),
      ...(layout ? { layout } : {}),
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

  const coreProps = options.author !== undefined;
  const customProps = options.customMetadata !== undefined;
  if (coreProps) {
    parts['docProps/core.xml'] = buildCorePropsXml(options.author!);
  }
  if (customProps) {
    parts['docProps/custom.xml'] = buildCustomPropsXml(options.customMetadata!);
  }
  parts['[Content_Types].xml'] = buildContentTypesXml({
    sheets: worksheets.length,
    sharedStrings: true,
    styles: styleResolver !== undefined,
    coreProps,
    customProps,
  });
  parts['_rels/.rels'] = buildRootRelsXml([
    ...(coreProps
      ? [
          {
            id: 'rId2',
            type: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties',
            target: 'docProps/core.xml',
          },
        ]
      : []),
    ...(customProps
      ? [
          {
            id: 'rId3',
            type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties',
            target: 'docProps/custom.xml',
          },
        ]
      : []),
  ]);
  parts['xl/workbook.xml'] = buildWorkbookXml(sheetRefs, options.activeSheetIndex);
  parts['xl/_rels/workbook.xml.rels'] = buildWorkbookRelsXml(rels);

  return { bytes: zipXlsxParts(parts), parts };
}
