import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import type { BeanCollection } from 'ag-grid-community';
import { getStructuredSchema } from './aiToolkitApi';
import { objectSchema, refSchema, stringSchema } from './schemaBuilder';
import {
  buildStructuredSchema,
  STRUCTURED_GRID_FEATURES,
  type StructuredColumnCapability,
  type StructuredSchemaInput,
} from './structuredSchema';

const columns: StructuredColumnCapability[] = [
  {
    aggregationFunctions: [],
    colId: 'region',
    dataType: 'text',
    filter: {
      kind: 'simple',
      filterType: 'text',
      maxNumConditions: 2,
      operators: [
        { key: 'contains', inputs: 1 },
        { key: 'startsWith', inputs: 1 },
        { key: 'endsWith', inputs: 1 },
        { key: 'blank', inputs: 0 },
      ],
    },
    headerName: 'Sales region',
    pivotable: true,
    resizable: true,
    rowGroupable: true,
    sortable: true,
  },
  {
    aggregationFunctions: ['sum', 'avg'],
    colId: 'revenue',
    dataType: 'number',
    filter: {
      kind: 'simple',
      filterType: 'number',
      maxNumConditions: 1,
      operators: [{ key: 'greaterThan', inputs: 1 }, { key: 'inRange', inputs: 2 }],
    },
    headerName: 'Revenue USD',
    pivotable: false,
    resizable: true,
    rowGroupable: false,
    sortable: true,
  },
  {
    aggregationFunctions: [],
    colId: 'segment',
    dataType: 'text',
    filter: { kind: 'set', values: ['Hardware', 'Software', null] },
    pivotable: true,
    resizable: false,
    rowGroupable: true,
    sortable: false,
  },
];

function input(overrides: Partial<StructuredSchemaInput> = {}): StructuredSchemaInput {
  return { advancedFilterEnabled: false, columns, ...overrides };
}

function record(value: unknown): Record<string, unknown> {
  expect(value).toBeTypeOf('object');
  expect(value).not.toBeNull();
  expect(Array.isArray(value)).toBe(false);
  return value as Record<string, unknown>;
}

function properties(value: unknown): Record<string, unknown> {
  return record(record(value).properties);
}

function jsonContains(value: unknown, fragment: string): boolean {
  return JSON.stringify(value).includes(fragment);
}

function assertStrictObjects(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertStrictObjects);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const item = value as Record<string, unknown>;
  if (item.type === 'object') {
    expect(item.additionalProperties).toBe(false);
    expect(item.required).toEqual(Object.keys(record(item.properties)));
  }
  Object.values(item).forEach(assertStrictObjects);
}

describe('buildStructuredSchema', () => {
  it('matches complete golden schemas for full, excluded, and capability-removed grids', () => {
    const schemas = [
      resultSchema(),
      buildStructuredSchema(input(), { exclude: ['sort', 'filter'] }),
      buildStructuredSchema(input({ columns: columns.filter((column) => column.colId !== 'revenue') })),
    ];
    const digests = schemas.map((value) => createHash('sha256').update(JSON.stringify(value)).digest('hex'));
    expect(digests).toEqual([
      'ea43fac2dc4c940b64e0a43e0d215a5a82ed817b9b998c8f08e8feadd243fc81',
      'b995b8aa8ba18f48ae51ca050ad1167b67b1327bc01dd0d32a1292387d922025',
      'f7cc2a98d2944e46617b91de48bb4d3600a5cb4e2280be122b270624970d242e',
    ]);
  });

  it('advertises all seven applicable GridState features as strict nullable properties', () => {
    const result = buildStructuredSchema(input());
    expect(Object.keys(properties(result))).toEqual(STRUCTURED_GRID_FEATURES);
    expect(result.anyOf).toBeUndefined();
    assertStrictObjects(result);
    for (const feature of Object.values(properties(result))) expect(jsonContains(feature, 'null')).toBe(true);
  });

  it('constrains capabilities per column instead of using a global column enum', () => {
    const result = buildStructuredSchema(input());
    expect(jsonContains(properties(result).aggregation, '"colId":{"enum":["revenue"],"type":"string"}')).toBe(true);
    expect(jsonContains(properties(result).aggregation, '"enum":["sum","avg"]')).toBe(true);
    expect(jsonContains(properties(result).sort, 'region')).toBe(true);
    expect(jsonContains(properties(result).sort, 'revenue')).toBe(true);
    expect(jsonContains(properties(result).sort, 'segment')).toBe(false);
    expect(jsonContains(properties(result).columnSizing, 'segment')).toBe(false);
    expect(jsonContains(properties(result).sort, '"type":{"enum":["default","absolute"]')).toBe(true);
    expect(record(result.$defs).allColumnIds).toMatchObject({ enum: ['region', 'revenue', 'segment'] });
  });

  it('encodes exact simple-filter operand shapes, including startsWith, endsWith, blank, and ranges', () => {
    const filter = properties(resultSchema()).filter;
    expect(jsonContains(filter, 'startsWith')).toBe(true);
    expect(jsonContains(filter, 'endsWith')).toBe(true);
    expect(jsonContains(filter, '"enum":["blank"],"type":"string"')).toBe(true);
    expect(jsonContains(filter, '"filter":{"enum":[null],"type":"null"}')).toBe(true);
    expect(jsonContains(filter, '"enum":["inRange"],"type":"string"')).toBe(true);
    expect(jsonContains(filter, '"filterTo":{"type":"number"}')).toBe(true);
    expect(jsonContains(filter, '"minItems":2,"maxItems":2')).toBe(true);
  });

  it('only enumerates set values when explicitly requested', () => {
    const without = properties(buildStructuredSchema(input())).filter;
    const withValues = properties(buildStructuredSchema(input(), {
      columns: { segment: { includeSetValues: true } },
    })).filter;
    expect(jsonContains(without, 'Hardware')).toBe(false);
    expect(jsonContains(withValues, '"enum":["Hardware","Software"]')).toBe(true);
  });

  it('emits recursive advanced filters with the AG Grid dateString discriminator', () => {
    const advancedColumns: StructuredColumnCapability[] = [
      { ...columns[0]!, dataType: 'dateString', colId: 'shipDate', headerName: 'Ship date' },
      columns[1]!,
    ];
    const result = buildStructuredSchema(input({ advancedFilterEnabled: true, columns: advancedColumns }));
    const definitions = record(record(result).$defs);
    expect(jsonContains(definitions, '"filterType":{"enum":["dateString"],"type":"string"}')).toBe(true);
    expect(jsonContains(result, '"$ref":"#/$defs/advancedFilterModel"')).toBe(true);
    expect(definitions.advancedFilterModel).toBeDefined();
    assertStrictObjects(result);
  });

  it('honours feature exclusion and safely handles an empty grid', () => {
    const result = buildStructuredSchema(input(), { exclude: ['filter', 'sort', 'pivot'] });
    expect(Object.keys(properties(result))).toEqual(['aggregation', 'columnVisibility', 'columnSizing', 'rowGroup']);
    expect(properties(buildStructuredSchema(input({ columns: [] })))).toEqual({});
  });

  it('applies per-column descriptions without changing identifiers', () => {
    const result = buildStructuredSchema(input(), { columns: { region: { description: 'Territory chosen by sales operations' } } });
    expect(jsonContains(properties(result).filter, 'Territory chosen by sales operations (column id: region')).toBe(true);
  });
});

function resultSchema(): ReturnType<typeof buildStructuredSchema> {
  return buildStructuredSchema(input());
}

describe('schema builder', () => {
  it('makes nullability idempotent', () => {
    const once = refSchema('node').nullable().toJSON();
    const twice = refSchema('node').nullable().nullable().toJSON();
    expect(twice).toEqual(once);
  });

  it('hoists recursive definitions to the root', () => {
    const result = objectSchema({ child: refSchema('node').nullable() })
      .define('node', objectSchema({ name: stringSchema(), child: refSchema('node').nullable() }))
      .toJSON();
    expect(result.$defs?.node).toBeDefined();
    expect(properties(result).child).toHaveProperty('anyOf');
  });

  it('rejects conflicting shared definitions', () => {
    expect(() => objectSchema({ value: stringSchema() })
      .define('node', stringSchema())
      .define('node', objectSchema({ value: stringSchema() }))).toThrow(/conflicting/);
  });
});

describe('getStructuredSchema bean adapter', () => {
  function fakeColumn(overrides: Record<string, unknown>): unknown {
    return {
      getColDef: () => ({ field: 'fallback', filter: true, resizable: true, sortable: true }),
      getColId: () => 'fallback',
      isAllowPivot: () => false,
      isAllowRowGroup: () => false,
      isAllowValue: () => false,
      isFilterAllowed: () => true,
      isResizable: () => true,
      isSortable: () => true,
      ...overrides,
    };
  }

  function fakeBeans(): BeanCollection {
    return {
      advancedFilter: { isEnabled: () => false },
      aggFuncSvc: { getFuncNames: () => ['sum'] },
      colFilter: {
        getDefaultFilter: () => 'agTextColumnFilter',
        getHandler: () => ({ getFilterKeys: () => ['North America', 'Europe'] }),
      },
      colModel: {
        getCols: () => [
          fakeColumn({
            getColDef: () => ({ headerName: 'Region', filter: 'agSetColumnFilter' }),
            getColId: () => 'region',
          }),
          fakeColumn({
            getColDef: () => ({
              field: 'sales',
              filter: 'agNumberColumnFilter',
              filterParams: { maxNumConditions: 1, filterOptions: ['greaterThan', 'inRange'] },
            }),
            getColId: () => 'sales',
            isAllowValue: () => true,
          }),
        ],
      },
      dataTypeSvc: { getBaseDataType: (column: { getColId(): string }) => column.getColId() === 'sales' ? 'number' : 'text' },
      sortSvc: {},
    } as unknown as BeanCollection;
  }

  it('derives live types, set values, operators, and aggregation capabilities from beans', () => {
    const beans = fakeBeans();
    let createIfMissing: boolean | undefined;
    beans.colFilter!.getHandler = ((_column: unknown, create: boolean | undefined) => {
      createIfMissing = create;
      return { getFilterKeys: () => [null, '', 'North America', 'Europe'] };
    }) as never;
    const result = getStructuredSchema(beans, { columns: { region: { includeSetValues: true } } });
    expect(createIfMissing).toBe(true);
    expect(jsonContains(result, 'North America')).toBe(true);
    expect(jsonContains(result, '"enum":["North America","Europe"]')).toBe(true);
    expect(jsonContains(result, 'greaterThan')).toBe(true);
    expect(jsonContains(result, '"enum":["sum"]')).toBe(true);
  });

  it('does not read set values unless includeSetValues is opted in', () => {
    const beans = fakeBeans();
    let calls = 0;
    beans.colFilter!.getHandler = (() => {
      calls += 1;
      return { getFilterKeys: () => ['secret row-derived value'] };
    }) as never;
    const result = getStructuredSchema(beans);
    expect(calls).toBe(0);
    expect(jsonContains(result, 'secret row-derived value')).toBe(false);
  });

  it('uses configured cell types, default filters, and custom operator arities conservatively', () => {
    const beans = fakeBeans();
    beans.dataTypeSvc = undefined;
    beans.advancedFilter = { isEnabled: () => false } as never;
    beans.colModel!.getCols = (() => [
      fakeColumn({
        getColDef: () => ({
          cellDataType: 'dateString',
          field: 'createdAt',
          filter: true,
          filterParams: { maxNumConditions: 3, useIsoSeparator: true, filterOptions: ['today', 'blank', 'inRange', 'empty', 'customString', { displayKey: 'custom' }] },
        }),
        getColId: () => 'createdAt',
      }),
      fakeColumn({
        getColDef: () => ({ cellDataType: 'boolean', field: 'active', filter: true }),
        getColId: () => 'active',
      }),
    ]) as never;
    beans.colFilter!.getDefaultFilter = ((column: { getColId(): string }) => column.getColId() === 'active'
      ? 'agTextColumnFilter'
      : 'agDateColumnFilter') as never;
    const result = getStructuredSchema(beans);
    expect(jsonContains(result, 'createdAt')).toBe(true);
    expect(jsonContains(result, 'today')).toBe(true);
    expect(jsonContains(result, 'inRange')).toBe(true);
    expect(jsonContains(result, '"maxItems":3')).toBe(true);
    expect(jsonContains(result, 'custom')).toBe(false);
    expect(JSON.stringify(result)).toContain('T\\\\d{2}');

    beans.advancedFilter = { isEnabled: () => true } as never;
    expect(jsonContains(getStructuredSchema(beans), 'advancedFilterModel')).toBe(false);
    beans.dataTypeSvc = { getBaseDataType: () => 'dateString' } as never;
    expect(jsonContains(getStructuredSchema(beans), 'advancedFilterModel')).toBe(true);
  });

  it('omits unavailable/custom filters, row-derived set values, and invalid aggregate metadata', () => {
    const noFilter = fakeColumn({
      getColDef: () => ({ field: 'plain', filter: 'myCustomFilter' }),
      getColId: () => 'plain',
      isFilterAllowed: () => false,
    });
    const emptyOptions = fakeColumn({
      getColDef: () => ({ field: 'configured', filter: 'agTextColumnFilter', filterParams: { filterOptions: [{ displayKey: 'onlyCustom' }] } }),
      getColId: () => 'configured',
    });
    const setColumn = fakeColumn({
      getColDef: () => ({ field: 'segment', filter: 'agSetColumnFilter' }),
      getColId: () => 'segment',
    });
    const beans = fakeBeans();
    beans.colModel!.getCols = (() => [noFilter, emptyOptions, setColumn]) as never;
    beans.colFilter!.getHandler = (() => ({ notAHandler: true })) as never;
    const result = getStructuredSchema(beans, { columns: { segment: { includeSetValues: true } } });
    expect(jsonContains(result, 'onlyCustom')).toBe(false);
    expect(jsonContains(result, 'North America')).toBe(false);
  });

  it('omits sort and column filters when their live services are unavailable', () => {
    const beans = fakeBeans();
    beans.sortSvc = undefined;
    beans.colFilter = undefined;
    const result = getStructuredSchema(beans);
    expect(properties(result).sort).toBeUndefined();
    expect(properties(result).filter).toBeUndefined();
    expect(properties(result).columnVisibility).toBeDefined();
  });

  it('fails clearly when the live column model bean is absent', () => {
    expect(() => getStructuredSchema({} as BeanCollection)).toThrow(/colModel bean missing/);
  });
});
