/** Serialises grid values as RFC-4180-compatible TSV for spreadsheet applications. @feature Clipboard */
export function toDelimited(rows: readonly (readonly unknown[])[], delimiter = '\t'): string {
  return rows
    .map((row) => row.map((value) => escape(value, delimiter)).join(delimiter))
    .join('\r\n');
}
/** Parses TSV/CSV fields including quoted delimiters, quotes, and newlines. @feature Clipboard */
export function fromDelimited(value: string, delimiter = '\t'): string[][] {
  const rows: string[][] = [[]];
  let field = '';
  let quoted = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index]!;
    if (quoted) {
      if (char === '"' && value[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      rows.at(-1)!.push(field);
      field = '';
      continue;
    }
    if (char === '\r' && value[index + 1] === '\n') {
      rows.at(-1)!.push(field);
      rows.push([]);
      field = '';
      index++;
      continue;
    }
    if (char === '\n') {
      rows.at(-1)!.push(field);
      rows.push([]);
      field = '';
      continue;
    }
    field += char;
  }
  rows.at(-1)!.push(field);
  return rows.length > 1 && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === ''
    ? rows.slice(0, -1)
    : rows;
}
function escape(value: unknown, delimiter: string): string {
  const text = value == null ? '' : String(value);
  return text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r') ||
    text.includes(delimiter)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}
