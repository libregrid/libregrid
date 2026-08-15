import { describe, expect, it } from 'vitest';
import { makeBeanHarness } from '@libregrid/core/testing';
import { ExcelCreator } from './excelCreator';

describe('ExcelCreator', () => {
  it('tracks the factory mode', () => {
    const { bean } = makeBeanHarness(ExcelCreator, { gridOptions: {} });
    expect(bean.getFactoryMode()).toBe('SINGLE_SHEET');
    bean.setFactoryMode('MULTI_SHEET');
    expect(bean.getFactoryMode()).toBe('MULTI_SHEET');
  });
});
