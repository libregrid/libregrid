/** Spreadsheet column letter for a zero-based column index (0 → 'A', 25 → 'Z', 26 → 'AA'). */
export function columnLetter(index: number): string {
  let n = index;
  let letters = '';
  while (n >= 0) {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

/** A1-style cell reference for zero-based column and row indexes. */
export function cellRef(columnIndex: number, rowIndex: number): string {
  return columnLetter(columnIndex) + String(rowIndex + 1);
}
