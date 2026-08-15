import { describe, expect, it } from 'vitest';
import { buildContentTypesXml, PART_CONTENT_TYPES } from './contentTypesPart';
import { parseXml, children } from '../../testing/parseXml';

describe('buildContentTypesXml', () => {
  it('declares defaults and the workbook override', () => {
    const xml = parseXml(buildContentTypesXml({ sheets: 0, sharedStrings: false, styles: false }));
    const defaults = children(xml, 'Default');
    expect(defaults.map((node) => node.attrs.Extension)).toEqual(['rels', 'xml']);
    const overrides = children(xml, 'Override');
    expect(overrides.map((node) => node.attrs.PartName)).toEqual(['/xl/workbook.xml']);
  });

  it('declares one worksheet override per sheet', () => {
    const xml = parseXml(buildContentTypesXml({ sheets: 2, sharedStrings: false, styles: false }));
    const sheets = children(xml, 'Override').filter((node) =>
      node.attrs.PartName!.includes('/xl/worksheets/'),
    );
    expect(sheets.map((node) => node.attrs.PartName)).toEqual([
      '/xl/worksheets/sheet1.xml',
      '/xl/worksheets/sheet2.xml',
    ]);
    expect(sheets.every((node) => node.attrs.ContentType === PART_CONTENT_TYPES.worksheet)).toBe(true);
  });

  it('declares sharedStrings and styles overrides when requested', () => {
    const xml = parseXml(buildContentTypesXml({ sheets: 0, sharedStrings: true, styles: true }));
    const overrides = children(xml, 'Override');
    expect(overrides.map((node) => node.attrs.PartName)).toEqual([
      '/xl/workbook.xml',
      '/xl/sharedStrings.xml',
      '/xl/styles.xml',
    ]);
    expect(
      overrides.find((node) => node.attrs.PartName === '/xl/sharedStrings.xml')!.attrs.ContentType,
    ).toBe(PART_CONTENT_TYPES.sharedStrings);
    expect(overrides.find((node) => node.attrs.PartName === '/xl/styles.xml')!.attrs.ContentType).toBe(
      PART_CONTENT_TYPES.styles,
    );
  });
});
