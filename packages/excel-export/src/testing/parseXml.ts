/** Parsed XML element: name, attributes, children and concatenated text. */
export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

/**
 * Minimal XML parser for asserting our own SpreadsheetML output.
 * Supports prologs, comments, single- and double-quoted attributes, and the
 * five predefined entities plus numeric character references. It is
 * deliberately small: the harness only ever reads XML this package wrote.
 */
export function parseXml(xml: string): XmlNode {
  let position = 0;
  skipMisc();
  skipWhitespace();
  const root = parseElement();
  skipMisc();
  return root;

  function skipMisc(): void {
    for (;;) {
      if (xml.startsWith('<?', position)) {
        skipUntil('?>');
      } else if (xml.startsWith('<!--', position)) {
        skipUntil('-->');
      } else {
        return;
      }
    }
  }

  function skipUntil(end: string): void {
    const index = xml.indexOf(end, position);
    if (index === -1) throw new Error('Malformed XML: missing ' + end);
    position = index + end.length;
  }

  function skipWhitespace(): void {
    while (position < xml.length && /\s/.test(xml[position]!)) position++;
  }

  function parseName(): string {
    const start = position;
    while (position < xml.length && /[A-Za-z0-9_:.-]/.test(xml[position]!)) position++;
    if (position === start) throw new Error('Malformed XML: expected a name at ' + position);
    return xml.slice(start, position);
  }

  function parseAttrs(): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (;;) {
      skipWhitespace();
      const char = xml[position];
      if (char === '>' || char === '/' || char === undefined) break;
      const name = parseName();
      skipWhitespace();
      if (xml[position] !== '=') throw new Error('Malformed XML: expected = after ' + name);
      position++;
      skipWhitespace();
      const quote = xml[position];
      if (quote !== '"' && quote !== "'") {
        throw new Error('Malformed XML: expected a quoted attribute value at ' + position);
      }
      position++;
      const end = xml.indexOf(quote, position);
      if (end === -1) throw new Error('Malformed XML: unterminated attribute value');
      attrs[name] = decodeEntities(xml.slice(position, end));
      position = end + 1;
    }
    return attrs;
  }

  function parseElement(): XmlNode {
    if (xml[position] !== '<') throw new Error('Malformed XML: expected < at ' + position);
    position++;
    const name = parseName();
    const attrs = parseAttrs();
    skipWhitespace();
    const node: XmlNode = { name, attrs, children: [], text: '' };
    if (xml[position] === '/') {
      position += 2; // '/>'
      return node;
    }
    if (xml[position] === '>') {
      position++;
      for (;;) {
        if (xml.startsWith('</', position)) break;
        if (xml.startsWith('<?', position) || xml.startsWith('<!--', position)) {
          const end = xml.startsWith('<?', position) ? '?>' : '-->';
          skipUntil(end);
          continue;
        }
        if (xml[position] === '<') {
          node.children.push(parseElement());
          continue;
        }
        const start = position;
        while (position < xml.length && xml[position] !== '<') position++;
        node.text += decodeEntities(xml.slice(start, position));
      }
      position += 2; // '</'
      const closingName = parseName();
      if (closingName !== name) {
        throw new Error('Malformed XML: expected </' + name + '> but got </' + closingName + '>');
      }
      skipWhitespace();
      if (xml[position] !== '>') throw new Error('Malformed XML: expected > at ' + position);
      position++;
      return node;
    }
    throw new Error('Malformed XML: unexpected character at ' + position);
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, code: string) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/&amp;/g, '&');
}

/** First direct child with the given name, or undefined when absent. */
export function child(node: XmlNode, name: string): XmlNode | undefined {
  return node.children.find((candidate) => candidate.name === name);
}

/** All direct children with the given name. */
export function children(node: XmlNode, name: string): XmlNode[] {
  return node.children.filter((candidate) => candidate.name === name);
}

/** All descendants with the given name, in document order. */
export function findAll(node: XmlNode, name: string): XmlNode[] {
  const found: XmlNode[] = [];
  for (const childNode of node.children) {
    if (childNode.name === name) found.push(childNode);
    found.push(...findAll(childNode, name));
  }
  return found;
}
