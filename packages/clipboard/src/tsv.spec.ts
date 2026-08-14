import { describe, expect, it } from 'vitest';
import { fromDelimited, toDelimited } from './tsv';
describe('clipboard TSV', () => {
  it('round-trips delimiters, newlines, and quotes', () => {
    const rows = [
      ['tab\tvalue', 'line\none', '"quoted"'],
      ['plain', '', null],
    ];
    expect(fromDelimited(toDelimited(rows))).toEqual([
      ['tab\tvalue', 'line\none', '"quoted"'],
      ['plain', '', ''],
    ]);
  });
  it('supports a custom delimiter', () =>
    expect(fromDelimited(toDelimited([['a,b', 'c']], ','), ',')).toEqual([['a,b', 'c']]));
});
