import type { XmlAttributes, XmlElement } from './xmlElement';

/**
 * Remove characters that are illegal in XML 1.0 documents: control
 * characters (except tab, LF and CR) and the two noncharacters.
 */
export function stripIllegalXmlChars(value: string): string {
  let out = '';
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    const illegal =
      code <= 0x08 ||
      (code >= 0x0b && code <= 0x0c) ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0xfffe ||
      code === 0xffff;
    if (!illegal) out += value[index];
  }
  return out;
}

/** Escape a string for XML text or attribute content. Illegal characters are stripped. */
export function escapeXml(value: string): string {
  return stripIllegalXmlChars(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function serializeAttrs(attrs?: XmlAttributes): string {
  if (!attrs) return '';
  let out = '';
  for (const [name, value] of Object.entries(attrs)) {
    out += ` ${name}="${escapeXml(String(value))}"`;
  }
  return out;
}

/** Serialise a single element (no XML declaration). */
export function serializeElement(element: XmlElement): string {
  const attrs = serializeAttrs(element.attrs);
  const children = element.children ?? [];
  const text = element.text ?? null;
  if (children.length === 0 && text === null) {
    return `<${element.name}${attrs}/>`;
  }
  const textXml = text === null ? '' : escapeXml(text);
  const childrenXml = children.map(serializeElement).join('');
  return `<${element.name}${attrs}>${textXml}${childrenXml}</${element.name}>`;
}

/** Serialise a complete part document: declaration followed by the root element. */
export function serializeXml(root: XmlElement): string {
  return DECLARATION + serializeElement(root);
}
