import { serializeXml } from '../xml/xmlSerializer';

const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';

/** Relationship types reachable from xl/_rels/workbook.xml.rels. */
export const RELATIONSHIP_TYPES = {
  worksheet: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet',
  sharedStrings: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings',
  styles: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles',
} as const;

/** One `<Relationship>` entry in xl/_rels/workbook.xml.rels. */
export interface WorkbookRelationship {
  id: string;
  type: string;
  target: string;
}

/** Build the xl/_rels/workbook.xml.rels part. */
export function buildWorkbookRelsXml(rels: WorkbookRelationship[]): string {
  return serializeXml({
    name: 'Relationships',
    attrs: { xmlns: RELS_NS },
    children: rels.map((rel) => ({
      name: 'Relationship',
      attrs: { Id: rel.id, Type: rel.type, Target: rel.target },
    })),
  });
}
