import { serializeXml } from '../xml/xmlSerializer';
import type { XmlElement } from '../xml/xmlElement';

const CONTENT_TYPES_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const RELS_CONTENT_TYPE = 'application/vnd.openxmlformats-package.relationships+xml';

/** Content types for the fixed part kinds of a workbook. */
export const PART_CONTENT_TYPES = {
  workbook: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
  worksheet: 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml',
  sharedStrings: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml',
  styles: 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml',
} as const;

/** Which optional parts the [Content_Types].xml part must declare. */
export interface ContentTypesConfig {
  sheets: number;
  sharedStrings: boolean;
  styles: boolean;
}

/** Build the [Content_Types].xml part. */
export function buildContentTypesXml(config: ContentTypesConfig): string {
  const children: XmlElement[] = [
    { name: 'Default', attrs: { Extension: 'rels', ContentType: RELS_CONTENT_TYPE } },
    { name: 'Default', attrs: { Extension: 'xml', ContentType: 'application/xml' } },
    {
      name: 'Override',
      attrs: { PartName: '/xl/workbook.xml', ContentType: PART_CONTENT_TYPES.workbook },
    },
  ];
  for (let index = 0; index < config.sheets; index++) {
    children.push({
      name: 'Override',
      attrs: {
        PartName: '/xl/worksheets/sheet' + (index + 1) + '.xml',
        ContentType: PART_CONTENT_TYPES.worksheet,
      },
    });
  }
  if (config.sharedStrings) {
    children.push({
      name: 'Override',
      attrs: { PartName: '/xl/sharedStrings.xml', ContentType: PART_CONTENT_TYPES.sharedStrings },
    });
  }
  if (config.styles) {
    children.push({
      name: 'Override',
      attrs: { PartName: '/xl/styles.xml', ContentType: PART_CONTENT_TYPES.styles },
    });
  }
  return serializeXml({ name: 'Types', attrs: { xmlns: CONTENT_TYPES_NS }, children });
}
