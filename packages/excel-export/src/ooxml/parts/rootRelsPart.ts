import { serializeXml } from '../xml/xmlSerializer';

const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_DOCUMENT_REL =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument';

/** Build the package-level `_rels/.rels` part pointing at the workbook. */
export function buildRootRelsXml(): string {
  return serializeXml({
    name: 'Relationships',
    attrs: { xmlns: RELS_NS },
    children: [
      { name: 'Relationship', attrs: { Id: 'rId1', Type: OFFICE_DOCUMENT_REL, Target: 'xl/workbook.xml' } },
    ],
  });
}
