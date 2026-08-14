import { describe, expect, it } from 'vitest';
import { ClipboardService } from './clipboardService';

describe('ClipboardService', () => {
  it('serialises and parses a browser-independent clipboard payload', () => {
    const service = new ClipboardService();
    expect(
      service.copy(
        [
          ['name', 'amount'],
          ['A', 1],
        ],
        ';',
      ),
    ).toBe('name;amount\r\nA;1');
    expect(service.lastCopied).toBe('name;amount\r\nA;1');
    expect(service.paste('name;amount\r\nA;1', ';')).toEqual([
      ['name', 'amount'],
      ['A', '1'],
    ]);
  });
});
