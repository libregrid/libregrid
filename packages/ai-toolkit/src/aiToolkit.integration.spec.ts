/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import {
  AllCommunityModule,
  ModuleRegistry,
  createGrid,
  type GridApi,
  type GridOptions,
  type GridState,
} from 'ag-grid-community';
import { AdvancedFilterModule } from '@libregrid/advanced-filter';
import { PivotModule } from '@libregrid/pivot';
import { RowGroupingModule } from '@libregrid/row-grouping';
import { SetFilterModule } from '@libregrid/set-filter';
import { AiToolkitModule } from './aiToolkitModule';

ModuleRegistry.registerModules([
  AllCommunityModule,
  AdvancedFilterModule,
  AiToolkitModule,
  PivotModule,
  RowGroupingModule,
  SetFilterModule,
]);

let api: GridApi | undefined;
let host: HTMLElement | undefined;

afterEach(() => {
  api?.destroy();
  host?.remove();
  api = undefined;
  host = undefined;
});

function grid(options: GridOptions): GridApi {
  host = document.createElement('div');
  host.style.width = '800px';
  host.style.height = '400px';
  document.body.append(host);
  api = createGrid(host, options);
  return api;
}

describe('AiToolkitModule live Grid API', () => {
  it('generates and round-trips all seven supported state sections', () => {
    const gridApi = grid({
      columnDefs: [
        { field: 'order', cellDataType: 'text', filter: 'agTextColumnFilter' },
        { field: 'amountUsd', cellDataType: 'number', filter: 'agNumberColumnFilter', enableValue: true },
        {
          field: 'region',
          cellDataType: 'text',
          filter: 'agSetColumnFilter',
          filterParams: { values: ['North America', 'Europe'] },
          enablePivot: true,
          enableRowGroup: true,
        },
        { field: 'category', cellDataType: 'text', filter: 'agSetColumnFilter', enablePivot: true, enableRowGroup: true },
      ],
      defaultColDef: { sortable: true, resizable: true },
      rowData: [
        { order: 'SO-1', amountUsd: 7_800, region: 'North America', category: 'Hardware' },
        { order: 'SO-2', amountUsd: 3_100, region: 'Europe', category: 'Software' },
      ],
    });

    const schema = gridApi.getStructuredSchema({
      columns: { region: { description: 'Sales territory', includeSetValues: true } },
    }) as Record<string, unknown>;
    const serialized = JSON.stringify(schema);
    expect(Object.keys(schema.properties as Record<string, unknown>)).toEqual([
      'aggregation',
      'filter',
      'sort',
      'pivot',
      'columnVisibility',
      'columnSizing',
      'rowGroup',
    ]);
    expect(serialized).toContain('allColumnIds');
    expect(serialized).toContain('North America');
    expect(serialized).toContain('"default"');
    expect(serialized).toContain('"absolute"');

    const next: GridState = {
      ...gridApi.getState(),
      aggregation: { aggregationModel: [{ colId: 'amountUsd', aggFunc: 'sum' }] },
      filter: {
        filterModel: {
          amountUsd: { filterType: 'number', type: 'greaterThan', filter: 5_000 },
        },
        advancedFilterModel: null,
      },
      sort: { sortModel: [{ colId: 'amountUsd', sort: 'desc', type: 'default' }] },
      pivot: { pivotMode: true, pivotColIds: ['region'], pivotSortModel: null },
      columnVisibility: { hiddenColIds: ['order'] },
      columnSizing: { columnSizingModel: [{ colId: 'amountUsd', width: 180 }] },
      rowGroup: { groupColIds: ['category'] },
    };
    gridApi.setState(next);

    const actual = gridApi.getState();
    expect(actual.aggregation?.aggregationModel).toContainEqual({ colId: 'amountUsd', aggFunc: 'sum' });
    expect(actual.filter?.filterModel).toMatchObject({
      amountUsd: { filterType: 'number', type: 'greaterThan', filter: 5_000 },
    });
    expect(actual.sort?.sortModel).toContainEqual({ colId: 'amountUsd', sort: 'desc', type: 'default' });
    expect(actual.pivot).toMatchObject({ pivotMode: true, pivotColIds: ['region'] });
    expect(actual.columnVisibility?.hiddenColIds).toContain('order');
    expect(actual.columnSizing?.columnSizingModel).toContainEqual(expect.objectContaining({ colId: 'amountUsd', width: 180 }));
    expect(actual.rowGroup?.groupColIds).toEqual(['category']);
  });

  it('round-trips the AG Grid 36.1 dateString Advanced Filter discriminator', () => {
    const gridApi = grid({
      columnDefs: [
        { field: 'shipDate', cellDataType: 'dateString', filter: true },
        { field: 'amountUsd', cellDataType: 'number', filter: true },
      ],
      enableAdvancedFilter: true,
      rowData: [{ shipDate: '2026-08-25', amountUsd: 7_800 }],
    });
    const schema = gridApi.getStructuredSchema() as Record<string, unknown>;
    expect(JSON.stringify(schema)).toContain('"filterType":{"enum":["dateString"]');

    gridApi.setAdvancedFilterModel({
      filterType: 'dateString',
      colId: 'shipDate',
      type: 'greaterThan',
      filter: '2026-01-01',
    });
    expect(gridApi.getState().filter?.advancedFilterModel).toEqual({
      filterType: 'dateString',
      colId: 'shipDate',
      type: 'greaterThan',
      filter: '2026-01-01',
    });
  });

  it('returns a valid strict empty schema for an empty grid', () => {
    const schema = grid({ columnDefs: [], rowData: [] }).getStructuredSchema() as Record<string, unknown>;
    expect(schema).toMatchObject({ type: 'object', properties: {}, required: [], additionalProperties: false });
    expect(schema.$defs).toBeUndefined();
  });
});
