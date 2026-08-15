import type { ExcelWorksheet } from 'ag-grid-community';
import type { XlsxBuildOptions } from '../ooxml/xlsxBuilder';

/** One golden scenario: the worksheet inputs plus optional build options. */
export interface Scenario {
  worksheets: ExcelWorksheet[];
  options?: XlsxBuildOptions;
}

/**
 * Representative exports used by the golden regression corpus and by the
 * manual consumer-validation matrix (verificationWorkbooks.spec.ts writes
 * these as real .xlsx files).
 */
export const scenarios: Record<string, Scenario> = {
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
