import { describe, expect, it } from 'vitest';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExcelWorksheet } from 'ag-grid-community';
import { buildXlsx } from '../ooxml/xlsxBuilder';

/**
 * Regression corpus (phase 5.1): golden unzipped XML for representative
 * exports, diffed on every run. Run with UPDATE_GOLDEN=1 to rewrite the
 * fixtures after an intentional output change.
 */

const here = dirname(fileURLToPath(import.meta.url));
const expectedRoot = join(here, '__fixtures__', 'expected');
const update = process.env.UPDATE_GOLDEN === '1';

const scenarios: Record<string, ExcelWorksheet[]> = {
  basic: [
    {
      name: 'Basic',
      table: {
        columns: [],
        rows: [
          {
            cells: [
              { data: { type: 'String', value: 'Name' } },
              { data: { type: 'String', value: 'Amount' } },
            ],
          },
          {
            cells: [
              { data: { type: 'String', value: 'Widget "A" & <B>' } },
              { data: { type: 'Number', value: '42' } },
            ],
          },
          {
            cells: [
              { data: { type: 'String', value: '' } },
              {},
            ],
          },
          {
            cells: [
              { data: { type: 'Boolean', value: '1' } },
              { data: { type: 'DateTime', value: '2020-01-01' } },
            ],
          },
        ],
      },
    },
  ],
  empty: [{ name: 'Empty', table: { columns: [], rows: [] } }],
};

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(path).map((p) => join(entry.name, p)));
    else out.push(entry.name);
  }
  return out;
}

describe('golden xlsx fixtures', () => {
  for (const [scenario, worksheets] of Object.entries(scenarios)) {
    it('matches the recorded XML for scenario ' + scenario, () => {
      const { parts } = buildXlsx(worksheets);
      const scenarioRoot = join(expectedRoot, scenario);
      for (const [path, xml] of Object.entries(parts)) {
        const file = join(scenarioRoot, path);
        if (update) {
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, xml);
          continue;
        }
        expect(readFileSync(file, 'utf8'), path).toBe(xml);
      }
      if (!update) {
        expect(listFiles(scenarioRoot).sort()).toEqual(Object.keys(parts).sort());
      }
    });
  }
});
