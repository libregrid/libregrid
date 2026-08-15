import { describe, expect, it } from 'vitest';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExcelWorksheet } from 'ag-grid-community';
import { buildXlsx, type XlsxBuildOptions } from '../ooxml/xlsxBuilder';

/**
 * Regression corpus (phase 5.1): golden unzipped XML for representative
 * exports, diffed on every run. Run with UPDATE_GOLDEN=1 to rewrite the
 * fixtures after an intentional output change.
 */

const here = dirname(fileURLToPath(import.meta.url));
const expectedRoot = join(here, '__fixtures__', 'expected');
const update = process.env.UPDATE_GOLDEN === '1';

interface Scenario {
  worksheets: ExcelWorksheet[];
  options?: XlsxBuildOptions;
}

const scenarios: Record<string, Scenario> = {
  paged: {
    worksheets: [
      {
        name: 'Paged',
        table: {
          columns: [{ width: 30 }],
          rows: [{ cells: [{ data: { type: 'String', value: 'Cell' } }] }],
        },
      },
    ],
    options: {
      author: 'LibreGrid',
      customMetadata: { exporter: 'libregrid' },
      worksheets: [
        {
          pageSetup: { orientation: 'Landscape', pageSize: 'A4' },
          margins: { left: 1 },
          headerFooter: {
            oddHeader: '&CReport',
            oddFooter: '&LPage &P of &N',
            firstHeader: '&CFirst Page',
          },
          protectSheet: { formatCells: true },
        },
      ],
    },
  },
  basic: {
    worksheets: [
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
  },
  empty: {
    worksheets: [{ name: 'Empty', table: { columns: [], rows: [] } }],
  },
  styled: {
    worksheets: [
      {
        name: 'Styled',
        table: {
          columns: [],
          rows: [
            {
              cells: [
                { data: { type: 'String', value: 'Total' }, styleId: 'header' },
                { data: { type: 'Number', value: '1234.5' }, styleId: 'money' },
              ],
            },
          ],
        },
      },
    ],
    options: {
      styles: [
        {
          id: 'header',
          font: { bold: true, color: '#FFFFFF' },
          interior: { pattern: 'Solid', color: '#4472C4' },
        },
        { id: 'money', numberFormat: { format: '"$"#,##0.00' } },
      ],
    },
  },
  layout: {
    worksheets: [
      {
        name: 'Layout',
        table: {
          columns: [{ width: 25 }, { width: 25 }, { width: 8 }],
          rows: [
            {
              cells: [{ data: { type: 'String', value: 'Report' }, mergeAcross: 2 }, {}, {}],
              height: 30,
            },
            {
              cells: [
                { data: { type: 'String', value: 'a' } },
                { data: { type: 'Number', value: '1' } },
                { data: { type: 'Number', value: '2' } },
              ],
            },
          ],
        },
      },
    ],
    options: {
      worksheets: [{ freezeColumns: 1, freezeRows: 1, rightToLeft: true }],
    },
  },
  grouped: {
    worksheets: [
      {
        name: 'Grouped',
        table: {
          columns: [{ width: 20, outlineLevel: 1 }, { width: 20, outlineLevel: 1 }],
          rows: [
            {
              cells: [
                { data: { type: 'String', value: 'Europe' } },
                { data: { type: 'String', value: '' } },
              ],
              outlineLevel: 1,
              collapsed: true,
            },
            {
              cells: [
                { data: { type: 'String', value: 'Germany' } },
                { data: { type: 'Number', value: '10' } },
              ],
              outlineLevel: 2,
              hidden: true,
            },
          ],
        },
      },
    ],
  },
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
  for (const [scenario, definition] of Object.entries(scenarios)) {
    it('matches the recorded XML for scenario ' + scenario, () => {
      const { parts } = buildXlsx(definition.worksheets, definition.options);
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
