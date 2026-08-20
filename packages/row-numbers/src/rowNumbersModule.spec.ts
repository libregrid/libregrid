import { describe, expect, it } from 'vitest';
import { RowNumbersModule } from './rowNumbersModule';
import { RowNumbersService } from './rowNumbersService';

describe('RowNumbersModule', () => {
  it('registers the row-numbers service and its scoped styling', () => {
    expect(RowNumbersModule.moduleName).toBe('RowNumbers');
    expect(RowNumbersModule.enterprise).toBe(true);
    expect(RowNumbersModule.beans).toContain(RowNumbersService);
    expect(RowNumbersModule.css?.[0]?.includes('.lgr-row-number-resizer')).toBe(true);
  });
});
