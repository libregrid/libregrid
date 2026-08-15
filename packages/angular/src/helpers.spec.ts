import { AllCommunityModule } from 'ag-grid-community';
import { describe, expect, it } from 'vitest';
import { createColumnDefs, defineGridOptions, withCommunityModules } from './helpers';

describe('Angular helpers', () => {
  it('defineGridOptions returns its input unchanged', () => {
    const options = defineGridOptions<{ name: string }>({
      columnDefs: createColumnDefs<{ name: string }>([{ field: 'name' }]),
      rowData: [{ name: 'Ada' }],
    });
    expect(options.columnDefs).toHaveLength(1);
    expect(options.rowData).toEqual([{ name: 'Ada' }]);
  });

  it('createColumnDefs preserves column and group defs', () => {
    const defs = createColumnDefs<{ name: string; score: number }>([
      { headerName: 'Person', children: [{ field: 'name' }, { field: 'score' }] },
    ]);
    expect(defs).toHaveLength(1);
    expect(defs[0]!.children).toHaveLength(2);
  });

  it('withCommunityModules leads with AllCommunityModule', () => {
    const modules = withCommunityModules();
    expect(modules[0]).toBe(AllCommunityModule);
  });
});
