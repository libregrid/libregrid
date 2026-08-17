import { describe, expect, it } from 'vitest';
import { excelData, pxToExcelWidth } from './sheetExtractor';

describe('excelData', () => {
  it('maps primitive values to their native types', () => {
    expect(excelData('text')).toEqual({ type: 'String', value: 'text' });
    expect(excelData(42.5)).toEqual({ type: 'Number', value: '42.5' });
    expect(excelData(true)).toEqual({ type: 'Boolean', value: '1' });
    expect(excelData(false)).toEqual({ type: 'Boolean', value: '0' });
    expect(excelData(null)).toBeNull();
    expect(excelData(undefined)).toBeNull();
  });

  it('exports Date objects as ISO DateTime values', () => {
    const date = new Date('2024-03-01T10:00:00.000Z');
    expect(excelData(date)).toEqual({ type: 'DateTime', value: '2024-03-01T10:00:00.000Z' });
  });

  it('stringifies unknown values', () => {
    expect(excelData({ a: 1 })).toEqual({ type: 'String', value: '[object Object]' });
  });

  it('honours a String dataType hint', () => {
    expect(excelData(123, 'String')).toEqual({ type: 'String', value: '123' });
  });

  it('honours a Number dataType hint, falling back to text when unparseable', () => {
    expect(excelData('42', 'Number')).toEqual({ type: 'Number', value: '42' });
    expect(excelData(7, 'Number')).toEqual({ type: 'Number', value: '7' });
    expect(excelData('abc', 'Number')).toEqual({ type: 'String', value: 'abc' });
  });

  it('honours a Boolean dataType hint', () => {
    expect(excelData('true', 'Boolean')).toEqual({ type: 'Boolean', value: '1' });
    expect(excelData('0', 'Boolean')).toEqual({ type: 'Boolean', value: '0' });
  });

  it('honours a DateTime dataType hint for parseable strings only', () => {
    expect(excelData('2020-01-01', 'DateTime')).toEqual({ type: 'DateTime', value: '2020-01-01' });
    expect(excelData('not-a-date', 'DateTime')).toEqual({ type: 'String', value: 'not-a-date' });
  });
});

describe('pxToExcelWidth', () => {
  it('converts pixels to Excel width units', () => {
    expect(pxToExcelWidth(140)).toBe(20);
    expect(pxToExcelWidth(100)).toBe(14.29);
  });

  it('enforces the documented 75px minimum', () => {
    expect(pxToExcelWidth(10)).toBe(pxToExcelWidth(75));
    expect(pxToExcelWidth(75)).toBe(10.71);
  });
});
