import { strFromU8, unzipSync } from 'fflate';
import { parseXml, type XmlNode } from './parseXml';

/** Unzipped .xlsx parts, keyed by archive path. */
export interface XlsxParts {
  [path: string]: string;
}

/** Unzip a .xlsx byte array into its parts (path → XML text). */
export function unzipXlsx(bytes: Uint8Array): XlsxParts {
  const archive = unzipSync(bytes);
  const parts: XlsxParts = {};
  for (const [path, data] of Object.entries(archive)) {
    parts[path] = strFromU8(data);
  }
  return parts;
}

/** Parse one part, failing loudly (with the part inventory) when it is missing. */
export function parsePart(parts: XlsxParts, path: string): XmlNode {
  const xml = parts[path];
  if (xml === undefined) {
    throw new Error('Missing part ' + path + ' — archive has: ' + Object.keys(parts).join(', '));
  }
  return parseXml(xml);
}
