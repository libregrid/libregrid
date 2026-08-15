import { describe, expect, it } from 'vitest';
import type { ExcelStyle } from 'ag-grid-community';
import { resolveStyle, StyleRegistry } from './styleRegistry';
import { toArgb } from './colorMaps';

describe('toArgb', () => {
  it('prefixes 6-digit hex colours with FF', () => {
    expect(toArgb('#FF0000')).toBe('FFFF0000');
    expect(toArgb('#a1b2c3')).toBe('FFA1B2C3');
  });

  it('passes 8-digit ARGB through uppercased', () => {
    expect(toArgb('#80ff0000')).toBe('80FF0000');
  });

  it('maps named colours, defaulting unknowns to black', () => {
    expect(toArgb('black')).toBe('FF000000');
    expect(toArgb('Blue')).toBe('FF0000FF');
    expect(toArgb('not-a-colour')).toBe('FF000000');
  });
});

describe('resolveStyle', () => {
  it('applies documented defaults', () => {
    const style = resolveStyle({ id: 'x' });
    expect(style.font).toMatchObject({ fontName: 'Calibri', size: 11, color: 'FF000000', family: 2 });
    expect(style.fill.pattern).toBe('none');
    expect(style.borders.left.style).toBeNull();
    expect(style.numberFormat.numFmtId).toBe(0);
    expect(style.alignment).toBeNull();
    expect(style.protection).toBeNull();
  });

  it('maps interiors to OOXML pattern names and ARGB colours', () => {
    const style = resolveStyle({ id: 'x', interior: { pattern: 'ThinDiagCross', color: 'yellow', patternColor: '#112233' } });
    expect(style.fill).toEqual({ pattern: 'lightTrellis', fgColor: 'FF112233', bgColor: 'FFFFFF00' });
  });

  it('treats `color` as the visible colour of a solid fill', () => {
    const style = resolveStyle({ id: 'x', interior: { pattern: 'Solid', color: 'blue' } });
    expect(style.fill).toEqual({ pattern: 'solid', fgColor: 'FF0000FF', bgColor: 'FF0000FF' });
  });

  it('maps border styles and weights to OOXML values', () => {
    const style = resolveStyle({
      id: 'x',
      borders: {
        borderLeft: { lineStyle: 'Continuous', weight: 2 },
        borderRight: { lineStyle: 'Dash', weight: 1 },
        borderTop: { lineStyle: 'Dot', color: 'red' },
        borderBottom: { lineStyle: 'Double' },
      },
    });
    expect(style.borders.left).toEqual({ style: 'thick', color: 'FF000000' });
    expect(style.borders.right).toEqual({ style: 'mediumDashed', color: 'FF000000' });
    expect(style.borders.top).toEqual({ style: 'dotted', color: 'FFFF0000' });
    expect(style.borders.bottom).toEqual({ style: 'double', color: 'FF000000' });
  });

  it('maps alignment vocabulary to OOXML', () => {
    const style = resolveStyle({
      id: 'x',
      alignment: { horizontal: 'CenterAcrossSelection', vertical: 'Top', readingOrder: 'RightToLeft', wrapText: true, indent: 2 },
    });
    expect(style.alignment).toEqual({
      horizontal: 'centerContinuous',
      vertical: 'top',
      readingOrder: 2,
      wrapText: true,
      indent: 2,
    });
  });
});

describe('StyleRegistry', () => {
  const bold: ExcelStyle = { id: 'bold', font: { bold: true } };
  const boldAgain: ExcelStyle = { id: 'bold-copy', font: { bold: true } };
  const redFill: ExcelStyle = { id: 'red', interior: { pattern: 'Solid', color: 'red' } };

  it('seeds index 0 with the all-defaults style', () => {
    const registry = new StyleRegistry();
    expect(registry.styleRecords()).toHaveLength(1);
    expect(registry.register({ id: 'default-like' })).toBe(0);
    expect(registry.styleRecords()).toHaveLength(1);
  });

  it('collapses identical styles to one cellXf index', () => {
    const registry = new StyleRegistry();
    const first = registry.register(bold);
    const second = registry.register(boldAgain);
    expect(second).toBe(first);
    expect(registry.styleRecords()).toHaveLength(2); // default + bold
    expect(registry.fontEntries()).toHaveLength(2); // default + bold font
  });

  it('keeps differing styles apart and dedupes their components', () => {
    const registry = new StyleRegistry();
    const boldIndex = registry.register(bold);
    const redIndex = registry.register(redFill);
    const boldRedIndex = registry.register({ id: 'both', font: { bold: true }, interior: { pattern: 'Solid', color: 'red' } });
    expect(new Set([boldIndex, redIndex, boldRedIndex]).size).toBe(3);
    expect(registry.fontEntries()).toHaveLength(2);
    expect(registry.fillEntries()).toHaveLength(3); // none, gray125, red
    const record = registry.styleRecords()[boldRedIndex]!;
    expect(record.fontId).toBe(1);
    expect(record.fillId).toBe(2);
  });

  it('reuses built-in number format ids and assigns custom ids from 164', () => {
    const registry = new StyleRegistry();
    const builtIn = registry.register({ id: 'pct', numberFormat: { format: '0.00%' } });
    const custom = registry.register({ id: 'money', numberFormat: { format: '"$"#,##0.00' } });
    const sameCustom = registry.register({ id: 'money2', numberFormat: { format: '"$"#,##0.00' } });
    expect(registry.styleRecords()[builtIn]!.style.numberFormat).toEqual({ numFmtId: 10 });
    expect(registry.numberFormatId(registry.styleRecords()[custom]!.style.numberFormat)).toBe(164);
    expect(registry.numberFormatId(registry.styleRecords()[sameCustom]!.style.numberFormat)).toBe(164);
    expect(registry.customNumberFormats()).toEqual([[164, '"$"#,##0.00']]);
  });

  it('ignores id and dataType in the dedupe signature', () => {
    const registry = new StyleRegistry();
    const a = registry.register({ id: 'a', dataType: 'String', font: { bold: true } });
    const b = registry.register({ id: 'b', dataType: 'DateTime', font: { bold: true } });
    expect(b).toBe(a);
  });
});
