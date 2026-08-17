import { describe, expect, it } from 'vitest';
import { escapeXml, serializeElement, serializeXml } from './xmlSerializer';

describe('escapeXml', () => {
  it('escapes all five predefined entities', () => {
    expect(escapeXml('& < > " \'')).toBe('&amp; &lt; &gt; &quot; &apos;');
  });

  it('strips control characters that are illegal in XML 1.0', () => {
    expect(escapeXml('a\u0000b\u0008c\u000bd\u000ce\u001ff')).toBe('abcdef');
  });

  it('strips the U+FFFE and U+FFFF noncharacters', () => {
    expect(escapeXml('a\ufffeb\uffffc')).toBe('abc');
  });

  it('preserves tab, newline and carriage return', () => {
    expect(escapeXml('a\tb\nc\rd')).toBe('a\tb\nc\rd');
  });

  it('returns unescaped input unchanged', () => {
    expect(escapeXml('plain \u00e9\u65e5\ud83d\ude00')).toBe('plain \u00e9\u65e5\ud83d\ude00');
  });
});

describe('serializeElement', () => {
  it('self-closes elements without text or children', () => {
    expect(serializeElement({ name: 'a' })).toBe('<a/>');
  });

  it('serialises attributes with escaping', () => {
    expect(serializeElement({ name: 'a', attrs: { b: 'x&y' } })).toBe('<a b="x&amp;y"/>');
  });

  it('serialises text content with escaping', () => {
    expect(serializeElement({ name: 't', text: 'A < B & C' })).toBe('<t>A &lt; B &amp; C</t>');
  });

  it('writes an explicit open/close pair for empty text', () => {
    expect(serializeElement({ name: 't', text: '' })).toBe('<t></t>');
  });

  it('nests children in document order', () => {
    const xml = serializeElement({
      name: 'root',
      children: [{ name: 'a', text: '1' }, { name: 'b', children: [{ name: 'c' }] }],
    });
    expect(xml).toBe('<root><a>1</a><b><c/></b></root>');
  });

  it('supports the xml:space attribute name', () => {
    expect(serializeElement({ name: 't', attrs: { 'xml:space': 'preserve' }, text: ' x ' })).toBe(
      '<t xml:space="preserve"> x </t>',
    );
  });
});

describe('serializeXml', () => {
  it('prefixes the XML declaration', () => {
    expect(serializeXml({ name: 'root' })).toBe(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<root/>',
    );
  });
});
