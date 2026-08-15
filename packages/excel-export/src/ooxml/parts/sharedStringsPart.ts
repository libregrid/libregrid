import type { SharedStringTable } from '../sharedStringTable';
import { serializeXml } from '../xml/xmlSerializer';

const SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

/** Build the xl/sharedStrings.xml part from the deduplicated string table. */
export function buildSharedStringsXml(table: SharedStringTable): string {
  return serializeXml({
    name: 'sst',
    attrs: {
      xmlns: SHEET_NS,
      count: table.count,
      uniqueCount: table.uniqueCount,
    },
    children: table.values().map((value) => ({
      name: 'si',
      children: [{ name: 't', attrs: { 'xml:space': 'preserve' }, text: value }],
    })),
  });
}
