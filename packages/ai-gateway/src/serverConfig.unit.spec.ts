import { describe, expect, it } from 'vitest';
import { parseGatewayTimeoutMs } from './serverConfig';

describe('gateway server configuration', () => {
  it('keeps the existing 30-second default and accepts an explicit integer', () => {
    expect(parseGatewayTimeoutMs(undefined)).toBe(30_000);
    expect(parseGatewayTimeoutMs('50000')).toBe(50_000);
  });

  it.each(['', '0', '-1', '1.5', 'not-a-number'])(
    'rejects invalid GATEWAY_TIMEOUT_MS value %j',
    (value) => {
      expect(() => parseGatewayTimeoutMs(value)).toThrow(
        'GATEWAY_TIMEOUT_MS must be a positive integer',
      );
    },
  );
});
