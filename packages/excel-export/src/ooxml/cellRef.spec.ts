import { describe, expect, it } from 'vitest';
import { cellRef, columnLetter } from './cellRef';

describe('columnLetter', () => {
  it.each<[number, string]>([
    [0, 'A'],
    [1, 'B'],
    [25, 'Z'],
    [26, 'AA'],
    [27, 'AB'],
    [51, 'AZ'],
    [52, 'BA'],
    [701, 'ZZ'],
    [702, 'AAA'],
    [16383, 'XFD'],
  ])('maps column %i to %s', (index, expected) => {
    expect(columnLetter(index)).toBe(expected);
  });
});

describe('cellRef', () => {
  it('combines column letter and one-based row', () => {
    expect(cellRef(0, 0)).toBe('A1');
    expect(cellRef(1, 2)).toBe('B3');
    expect(cellRef(26, 99)).toBe('AA100');
  });
});
