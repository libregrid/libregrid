import { describe, expect, it } from 'vitest';
import { buildCorePropsXml, buildCustomPropsXml } from './docPropsPart';
import { parseXml, child, children } from '../../testing/parseXml';

describe('buildCorePropsXml', () => {
  it('writes the author as dc:creator', () => {
    const xml = parseXml(buildCorePropsXml('Ada Lovelace'));
    expect(child(xml, 'dc:creator')!.text).toBe('Ada Lovelace');
  });
});

describe('buildCustomPropsXml', () => {
  it('serialises custom metadata as string properties with sequential pids', () => {
    const xml = parseXml(buildCustomPropsXml({ version: '1.2.3', count: 4, active: true }));
    const properties = children(xml, 'property');
    expect(properties.map((p) => p.attrs.name)).toEqual(['version', 'count', 'active']);
    expect(properties.map((p) => p.attrs.pid)).toEqual(['2', '3', '4']);
    expect(properties.every((p) => p.attrs.fmtid === '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}')).toBe(true);
    expect(properties.map((p) => child(p, 'vt:lpwstr')!.text)).toEqual(['1.2.3', '4', 'true']);
  });
});
