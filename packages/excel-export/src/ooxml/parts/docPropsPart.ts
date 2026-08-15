import type { ExcelCustomMetadata } from 'ag-grid-community';
import { serializeXml } from '../xml/xmlSerializer';
import type { XmlElement } from '../xml/xmlElement';

/** Build the docProps/core.xml part (author metadata). */
export function buildCorePropsXml(author: string): string {
  return serializeXml({
    name: 'cp:coreProperties',
    attrs: {
      'xmlns:cp': 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
      'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
      'xmlns:dcterms': 'http://purl.org/dc/terms/',
      'xmlns:dcmitype': 'http://purl.org/dc/dcmitype/',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    },
    children: [{ name: 'dc:creator', text: author }],
  });
}

const CUSTOM_PROPS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/custom-properties';
const VTYPES_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes';
const PROPERTY_FMTID = '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}';

/** Build the docProps/custom.xml part from the customMetadata map. */
export function buildCustomPropsXml(metadata: ExcelCustomMetadata): string {
  const children: XmlElement[] = [];
  let pid = 2;
  for (const [name, value] of Object.entries(metadata)) {
    children.push({
      name: 'property',
      attrs: { fmtid: PROPERTY_FMTID, pid, name },
      children: [{ name: 'vt:lpwstr', text: String(value) }],
    });
    pid++;
  }
  return serializeXml({
    name: 'Properties',
    attrs: { xmlns: CUSTOM_PROPS_NS, 'xmlns:vt': VTYPES_NS },
    children,
  });
}
