import { strToU8, zipSync } from 'fflate';

/** Assemble a .xlsx archive from a map of part paths to XML text. */
export function zipXlsxParts(
  parts: Record<string, string>,
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 6,
): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(parts)) {
    files[path] = strToU8(content);
  }
  return zipSync(files, { level });
}
