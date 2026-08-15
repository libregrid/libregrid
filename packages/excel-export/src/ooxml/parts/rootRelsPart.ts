import { serializeXml } from '../xml/xmlSerializer';

const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_DOCUMENT_REL =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument';

export interface RootRelationship {
  id: string;
  type: string;
  target: string;
}

/** Build the package-level `_rels/.rels` part pointing at the workbook. */
export function buildRootRelsXml(extra: RootRelationship[] = []): string {
  return serializeXml({
    name: 'Relationships',
    attrs: { xmlns: RELS_NS },
    children: [
      { name: 'Relationship', attrs: { Id: 'rId1', Type: OFFICE_DOCUMENT_REL, Target: 'xl/workbook.xml' } },
      ...extra.map((rel) => ({
        name: 'Relationship',
        attrs: { Id: rel.id, Type: rel.type, Target: rel.target },
      })),
    ],
  });
}
