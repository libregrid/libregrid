import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildXlsx } from '../ooxml/xlsxBuilder';
import { scenarios } from './scenarios';

/**
 * Writes the five golden scenarios as real .xlsx files for the manual
 * consumer-validation matrix (phase 5 acceptance): open each file in
 * Microsoft Excel, LibreOffice Calc and Google Sheets and confirm it opens
 * without a repair prompt.
 *
 * Run: npx vitest run packages/excel-export/src/testing/verificationWorkbooks.spec.ts
 * Output: src/testing/__fixtures__/verification/*.xlsx (gitignored).
 */

const here = dirname(fileURLToPath(import.meta.url));
const outRoot = join(here, '__fixtures__', 'verification');

describe('verification workbooks', () => {
  it('writes the golden scenarios as .xlsx files', () => {
    mkdirSync(outRoot, { recursive: true });
    const written: string[] = [];
    for (const [scenario, definition] of Object.entries(scenarios)) {
      const { bytes } = buildXlsx(definition.worksheets, definition.options);
      const file = join(outRoot, scenario + '.xlsx');
      writeFileSync(file, bytes);
      written.push(scenario + '.xlsx');
    }
    expect(written).toEqual(['paged.xlsx', 'basic.xlsx', 'empty.xlsx', 'styled.xlsx', 'layout.xlsx', 'grouped.xlsx']);
  });
});
