import { describe, expect, it } from 'vitest';
import { ModuleRegistry } from 'ag-grid-community';
import { ServerSideRowModelModule } from './serverSideRowModelModule';

describe('ServerSideRowModelModule scaffold', () => {
  it('registers its documented Community module name', () => {
    expect(() => ModuleRegistry.registerModules([ServerSideRowModelModule])).not.toThrow();
    expect(ServerSideRowModelModule.moduleName).toBe('ServerSideRowModel');
  });
});
