import { describe, expect, it } from 'vitest';
import { SharedStringTable } from './sharedStringTable';

describe('SharedStringTable', () => {
  it('assigns increasing indexes and deduplicates', () => {
    const table = new SharedStringTable();
    expect(table.add('alpha')).toBe(0);
    expect(table.add('beta')).toBe(1);
    expect(table.add('alpha')).toBe(0);
    expect(table.uniqueCount).toBe(2);
    expect(table.count).toBe(3);
    expect(table.values()).toEqual(['alpha', 'beta']);
  });

  it('indexOf does not count a reference', () => {
    const table = new SharedStringTable();
    table.add('alpha');
    expect(table.indexOf('alpha')).toBe(0);
    expect(table.indexOf('missing')).toBeUndefined();
    expect(table.count).toBe(1);
  });

  it('keeps an empty string distinct from nothing', () => {
    const table = new SharedStringTable();
    table.add('');
    expect(table.uniqueCount).toBe(1);
    expect(table.indexOf('')).toBe(0);
  });
});
