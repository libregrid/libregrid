import { describe, expect, it } from 'vitest';
import { dateToExcelSerial, formatExcelSerial, isoToExcelSerial } from './dateSerial';

function utc(year: number, month: number, day: number, hour = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour));
}

describe('dateToExcelSerial', () => {
  it('uses serial 1 for 1900-01-01', () => {
    expect(dateToExcelSerial(utc(1900, 1, 1))).toBe(1);
  });

  it('counts days before the phantom leap day normally', () => {
    expect(dateToExcelSerial(utc(1900, 1, 2))).toBe(2);
    expect(dateToExcelSerial(utc(1900, 2, 28))).toBe(59);
  });

  it('skips serial 60: 1900-03-01 is serial 61', () => {
    expect(dateToExcelSerial(utc(1900, 3, 1))).toBe(61);
  });

  it.each<[number, number, number, number]>([
    [1970, 1, 1, 25569],
    [2000, 1, 1, 36526],
    [2008, 1, 1, 39448],
    [2020, 1, 1, 43831],
    [2024, 3, 1, 45352],
  ])('matches known serials: %i-%i-%i → %i', (year, month, day, expected) => {
    expect(dateToExcelSerial(utc(year, month, day))).toBe(expected);
  });

  it('keeps the time of day as a fractional part', () => {
    expect(dateToExcelSerial(utc(1900, 1, 1, 12))).toBe(1.5);
    expect(dateToExcelSerial(utc(2020, 1, 1, 6))).toBe(43831.25);
  });

  it('returns null for dates before the 1900 epoch', () => {
    expect(dateToExcelSerial(utc(1899, 12, 31))).toBeNull();
    expect(dateToExcelSerial(utc(1800, 6, 15))).toBeNull();
  });

  it('returns null for invalid dates', () => {
    expect(dateToExcelSerial(new Date('not a date'))).toBeNull();
  });
});

describe('isoToExcelSerial', () => {
  it('parses ISO strings, including date-only and timezone forms', () => {
    expect(isoToExcelSerial('2020-01-01')).toBe(43831);
    expect(isoToExcelSerial('2020-01-01T06:00:00.000Z')).toBe(43831.25);
    expect(isoToExcelSerial('1900-03-01')).toBe(61);
  });

  it('returns null for unparseable or pre-1900 strings', () => {
    expect(isoToExcelSerial('garbage')).toBeNull();
    expect(isoToExcelSerial('1800-06-15')).toBeNull();
  });
});

describe('formatExcelSerial', () => {
  it('drops floating-point noise beyond 9 decimals', () => {
    expect(formatExcelSerial(43831.25)).toBe('43831.25');
    expect(formatExcelSerial(1.5)).toBe('1.5');
    expect(formatExcelSerial(43831.25 + 1e-12)).toBe('43831.25');
    expect(formatExcelSerial(25569)).toBe('25569');
  });
});
