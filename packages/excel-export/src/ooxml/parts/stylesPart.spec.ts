import { describe, expect, it } from 'vitest';
import { StyleRegistry } from '../styles/styleRegistry';
import { buildStylesXml } from './stylesPart';
import { parseXml, child, children } from '../../testing/parseXml';

describe('buildStylesXml', () => {
  it('emits the mandatory fonts, fills, borders and Normal cell style', () => {
    const registry = new StyleRegistry();
    const xml = parseXml(buildStylesXml(registry));
    expect(child(xml, 'fonts')!.attrs.count).toBe('1');
    expect(child(xml, 'fills')!.attrs.count).toBe('2');
    expect(child(xml, 'borders')!.attrs.count).toBe('1');
    expect(child(xml, 'cellXfs')!.attrs.count).toBe('1');
    const cellStyles = child(xml, 'cellStyles')!;
    expect(children(cellStyles, 'cellStyle')[0]!.attrs).toEqual({
      name: 'Normal',
      xfId: '0',
      builtinId: '0',
    });
  });

  it('writes registered styles as cellXfs entries with component indexes', () => {
    const registry = new StyleRegistry();
    registry.register({ id: 'bold', font: { bold: true } });
    registry.register({ id: 'red', interior: { pattern: 'Solid', color: 'red' } });
    const xml = parseXml(buildStylesXml(registry));
    const fonts = child(xml, 'fonts')!;
    expect(fonts.attrs.count).toBe('2');
    expect(children(children(fonts, 'font')[1]!, 'b')).toHaveLength(1);
    const fills = child(xml, 'fills')!;
    expect(fills.attrs.count).toBe('3');
    const redFill = children(fills, 'fill')[2]!;
    const pattern = child(redFill, 'patternFill')!;
    expect(pattern.attrs.patternType).toBe('solid');
    expect(child(pattern, 'fgColor')!.attrs.rgb).toBe('FFFF0000');
    const cellXfs = child(xml, 'cellXfs')!;
    expect(cellXfs.attrs.count).toBe('3');
    expect(children(cellXfs, 'xf')[1]!.attrs).toMatchObject({
      fontId: '1',
      fillId: '0',
      borderId: '0',
      numFmtId: '0',
      applyFont: 'true',
    });
    expect(children(cellXfs, 'xf')[2]!.attrs).toMatchObject({ fontId: '0', fillId: '2' });
  });

  it('writes custom number formats with ids from 164', () => {
    const registry = new StyleRegistry();
    registry.register({ id: 'money', numberFormat: { format: '"$"#,##0.00' } });
    const xml = parseXml(buildStylesXml(registry));
    const numFmts = child(xml, 'numFmts')!;
    expect(numFmts.attrs.count).toBe('1');
    expect(children(numFmts, 'numFmt')[0]!.attrs).toEqual({
      numFmtId: '164',
      formatCode: '"$"#,##0.00',
    });
  });

  it('writes alignment and protection children on the xf', () => {
    const registry = new StyleRegistry();
    registry.register({
      id: 'cell',
      alignment: { horizontal: 'Center', wrapText: true },
      protection: { protected: false, hideFormula: true },
    });
    const xml = parseXml(buildStylesXml(registry));
    const xf = children(child(xml, 'cellXfs')!, 'xf')[1]!;
    expect(xf.attrs.applyAlignment).toBe('true');
    expect(xf.attrs.applyProtection).toBe('true');
    expect(child(xf, 'alignment')!.attrs).toEqual({ horizontal: 'center', wrapText: '1' });
    expect(child(xf, 'protection')!.attrs).toEqual({ locked: '0', hidden: '1' });
  });

  it('serialises every font property when set', () => {
    const registry = new StyleRegistry();
    registry.register({
      id: 'fancy',
      font: {
        bold: true,
        italic: true,
        strikeThrough: true,
        underline: 'Double',
        outline: true,
        shadow: true,
        verticalAlign: 'Superscript',
        size: 14,
        color: '#123456',
        fontName: 'Arial',
        family: 'Modern',
      },
    });
    const xml = parseXml(buildStylesXml(registry));
    const font = children(child(xml, 'fonts')!, 'font')[1]!;
    expect(children(font, 'b')).toHaveLength(1);
    expect(children(font, 'i')).toHaveLength(1);
    expect(children(font, 'strike')).toHaveLength(1);
    expect(children(font, 'u')[0]!.attrs.val).toBe('double');
    expect(children(font, 'outline')).toHaveLength(1);
    expect(children(font, 'shadow')).toHaveLength(1);
    expect(children(font, 'vertAlign')[0]!.attrs.val).toBe('superscript');
    expect(children(font, 'sz')[0]!.attrs.val).toBe('14');
    expect(children(font, 'color')[0]!.attrs.rgb).toBe('FF123456');
    expect(children(font, 'name')[0]!.attrs.val).toBe('Arial');
    expect(children(font, 'family')[0]!.attrs.val).toBe('3');
  });
});
