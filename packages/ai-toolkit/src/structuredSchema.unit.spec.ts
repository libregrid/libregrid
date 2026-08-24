import { describe, expect, it } from 'vitest';
import type { BeanCollection } from 'ag-grid-community';
import { getStructuredSchema } from './aiToolkitApi';
import { buildStructuredSchema, V1_FEATURES, type AiColumnInfo, type StructuredSchemaInput } from './structuredSchema';

const columns: AiColumnInfo[] = [
  { colId: 'country', headerName: 'Country', filterable: true },
  { colId: 'age', headerName: 'Age', filterable: true },
  { colId: 'notes', headerName: 'Notes', filterable: false },
];

function input(overrides: Partial<StructuredSchemaInput> = {}): StructuredSchemaInput {
  return { columns, ...overrides };
}

function sections(schema: Record<string, unknown>): Record<string, unknown> {
  return schema.properties as Record<string, unknown>;
}

describe('buildStructuredSchema', () => {
  it('emits the three v1 sections by default', () => {
    const schema = buildStructuredSchema(input());
    expect(schema.type).toBe('object');
    expect(Object.keys(sections(schema)).sort()).toEqual(['filterModel', 'hiddenColIds', 'sortModel']);
    expect(V1_FEATURES).toEqual(['filter', 'sort', 'columnVisibility']);
  });

  it('constrains colId enums to the live column ids, with header-name descriptions', () => {
    const schema = buildStructuredSchema(input());
    const sortItems = (sections(schema).sortModel as any).items;
    expect(sortItems.properties.colId.enum).toEqual(['country', 'age', 'notes']);
    expect(sortItems.properties.sort.enum).toEqual(['asc', 'desc']);
    expect(sortItems.required).toEqual(['colId']);
  });

  it('excludes non-filterable columns from filterModel but keeps them in sort/visibility enums', () => {
    const schema = buildStructuredSchema(input());
    const filterModel = sections(schema).filterModel as any;
    expect(Object.keys(filterModel.properties)).toEqual(['country', 'age']);
    expect((sections(schema).hiddenColIds as any).items.enum).toEqual(['country', 'age', 'notes']);
  });

  it('exclude removes whole sections and ignores features outside the v1 set', () => {
    const schema = buildStructuredSchema(input(), { exclude: ['sort', 'aggregation', 'pivot'] });
    expect(Object.keys(sections(schema)).sort()).toEqual(['filterModel', 'hiddenColIds']);
  });

  it('excluding every v1 feature yields an empty-but-valid object schema', () => {
    const schema = buildStructuredSchema(input(), { exclude: [...V1_FEATURES] });
    expect(sections(schema)).toEqual({});
    expect(schema.type).toBe('object');
  });

  it('per-column description overrides the header-name hint in every section', () => {
    const schema = buildStructuredSchema(input(), { columns: { country: { description: 'competitor country' } } });
    const filterModel = sections(schema).filterModel as any;
    expect(filterModel.properties.country.description).toBe('competitor country');
    expect(filterModel.properties.age.description).toBe('column "Age"');
  });

  it('includeSetValues adds an items enum hint for small current value sets', () => {
    const schema = buildStructuredSchema(
      input({ currentFilterModel: { country: { filterType: 'set', values: ['USA', 'China'] } } }),
      { columns: { country: { includeSetValues: true } } },
    );
    const country = (sections(schema).filterModel as any).properties.country;
    expect(country.properties.values.items.enum).toEqual(['USA', 'China']);
    expect(country.properties.values.description).toContain('currently set');
  });

  it('includeSetValues accepts bare-array current values and skips sets above the cap', () => {
    const many = Array.from({ length: 9 }, (_, i) => `v${i}`);
    const schema = buildStructuredSchema(
      input({ currentFilterModel: { country: ['USA'], age: many } }),
      { columns: { country: { includeSetValues: true }, age: { includeSetValues: true } } },
    );
    const props = (sections(schema).filterModel as any).properties;
    expect(props.country.properties.values.items.enum).toEqual(['USA']);
    expect(props.age.properties.values.items).toBeUndefined();
  });

  it('without includeSetValues no value hints appear', () => {
    const schema = buildStructuredSchema(input({ currentFilterModel: { country: ['USA'] } }));
    const country = (sections(schema).filterModel as any).properties.country;
    expect(country.properties.values.items).toBeUndefined();
  });

  it('handles an empty column set', () => {
    const schema = buildStructuredSchema(input({ columns: [] }));
    expect((sections(schema).sortModel as any).items.properties.colId.enum).toEqual([]);
    expect((sections(schema).filterModel as any).properties).toEqual({});
  });

  it('omits descriptions when the column has neither header name nor field hint', () => {
    const schema = buildStructuredSchema(input({ columns: [{ colId: 'x', filterable: true }] }));
    expect((sections(schema).filterModel as any).properties.x.description).toBeUndefined();
  });
});

describe('getStructuredSchema (bean adapter)', () => {
  function fakeBeans(overrides: Record<string, unknown> = {}): BeanCollection {
    return {
      colModel: {
        getCols: () => [
          { getColId: () => 'country', getColDef: () => ({ headerName: 'Country' }) },
          { getColId: () => 'age', getColDef: () => ({ field: 'age', filter: false }) },
        ],
      },
      filterManager: { getFilterModel: () => ({ country: { values: ['USA'] } }) },
      ...overrides,
    } as unknown as BeanCollection;
  }

  it('maps colDefs to column info (headerName ?? field, filter !== false)', () => {
    const schema = getStructuredSchema(fakeBeans());
    expect((sections(schema).filterModel as any).properties.country.description).toBe('column "Country"');
    expect(sections(schema).filterModel && Object.keys((sections(schema).filterModel as any).properties)).toEqual(['country']);
  });

  it('passes current filter values through for includeSetValues hints', () => {
    const schema = getStructuredSchema(fakeBeans(), { columns: { country: { includeSetValues: true } } });
    expect((sections(schema).filterModel as any).properties.country.properties.values.items.enum).toEqual(['USA']);
  });

  it('works without a filterManager bean', () => {
    const beans = fakeBeans();
    delete (beans as Record<string, unknown>).filterManager;
    expect(() => getStructuredSchema(beans)).not.toThrow();
  });

  it('throws a named error when the colModel bean is missing', () => {
    const beans = fakeBeans();
    delete (beans as Record<string, unknown>).colModel;
    expect(() => getStructuredSchema(beans)).toThrowError(/colModel bean missing/);
  });
});
