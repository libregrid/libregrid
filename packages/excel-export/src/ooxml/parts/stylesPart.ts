import type {
  ResolvedAlignment,
  ResolvedBorderSide,
  ResolvedBorders,
  ResolvedFill,
  ResolvedFont,
  StyleRecord,
  StyleRegistry,
} from '../styles/styleRegistry';
import type { XmlAttributes, XmlElement } from '../xml/xmlElement';
import { serializeXml } from '../xml/xmlSerializer';

const SHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

/** Build the xl/styles.xml part from a populated style registry. */
export function buildStylesXml(registry: StyleRegistry): string {
  const customFormats = registry.customNumberFormats();
  const children: XmlElement[] = [];
  if (customFormats.length > 0) {
    children.push({
      name: 'numFmts',
      attrs: { count: customFormats.length },
      children: customFormats.map(([id, formatCode]) => ({
        name: 'numFmt',
        attrs: { numFmtId: id, formatCode },
      })),
    });
  }
  children.push(
    {
      name: 'fonts',
      attrs: { count: registry.fontEntries().length },
      children: registry.fontEntries().map(fontElement),
    },
    {
      name: 'fills',
      attrs: { count: registry.fillEntries().length },
      children: registry.fillEntries().map(fillElement),
    },
    {
      name: 'borders',
      attrs: { count: registry.borderEntries().length },
      children: registry.borderEntries().map(borderElement),
    },
    {
      name: 'cellStyleXfs',
      attrs: { count: 1 },
      children: [{ name: 'xf', attrs: { numFmtId: 0, fontId: 0, fillId: 0, borderId: 0 } }],
    },
    {
      name: 'cellXfs',
      attrs: { count: registry.styleRecords().length },
      children: registry.styleRecords().map((record) => xfElement(record, registry)),
    },
    {
      name: 'cellStyles',
      attrs: { count: 1 },
      children: [{ name: 'cellStyle', attrs: { name: 'Normal', xfId: 0, builtinId: 0 } }],
    },
  );
  return serializeXml({ name: 'styleSheet', attrs: { xmlns: SHEET_NS }, children });
}

function xfElement(record: StyleRecord, registry: StyleRegistry): XmlElement {
  const { style, fontId, fillId, borderId } = record;
  const attrs: XmlAttributes = {
    numFmtId: registry.numberFormatId(style.numberFormat),
    fontId,
    fillId,
    borderId,
    xfId: 0,
    applyNumberFormat: true,
    applyFont: true,
    applyFill: true,
    applyBorder: true,
  };
  const children: XmlElement[] = [];
  if (style.alignment) {
    attrs.applyAlignment = true;
    children.push(alignmentElement(style.alignment));
  }
  if (style.protection) {
    attrs.applyProtection = true;
    children.push({
      name: 'protection',
      attrs: { locked: style.protection.locked ? 1 : 0, hidden: style.protection.hidden ? 1 : 0 },
    });
  }
  return { name: 'xf', attrs, children };
}

function fontElement(font: ResolvedFont): XmlElement {
  const children: XmlElement[] = [];
  if (font.bold) children.push({ name: 'b' });
  if (font.italic) children.push({ name: 'i' });
  if (font.strikeThrough) children.push({ name: 'strike' });
  if (font.underline) {
    children.push(
      font.underline === 'Double' ? { name: 'u', attrs: { val: 'double' } } : { name: 'u' },
    );
  }
  if (font.outline) children.push({ name: 'outline' });
  if (font.shadow) children.push({ name: 'shadow' });
  if (font.verticalAlign) {
    children.push({
      name: 'vertAlign',
      attrs: { val: font.verticalAlign === 'Superscript' ? 'superscript' : 'subscript' },
    });
  }
  children.push(
    { name: 'sz', attrs: { val: font.size } },
    { name: 'color', attrs: { rgb: font.color } },
    { name: 'name', attrs: { val: font.fontName } },
    { name: 'family', attrs: { val: font.family } },
  );
  return { name: 'font', children };
}

function fillElement(fill: ResolvedFill): XmlElement {
  const patternChildren: XmlElement[] = [];
  if (fill.fgColor) patternChildren.push({ name: 'fgColor', attrs: { rgb: fill.fgColor } });
  if (fill.bgColor) patternChildren.push({ name: 'bgColor', attrs: { rgb: fill.bgColor } });
  return {
    name: 'fill',
    children: [
      { name: 'patternFill', attrs: { patternType: fill.pattern }, children: patternChildren },
    ],
  };
}

function borderElement(borders: ResolvedBorders): XmlElement {
  return {
    name: 'border',
    children: [
      sideElement('left', borders.left),
      sideElement('right', borders.right),
      sideElement('top', borders.top),
      sideElement('bottom', borders.bottom),
      { name: 'diagonal' },
    ],
  };
}

function sideElement(name: string, side: ResolvedBorderSide): XmlElement {
  if (side.style === null) return { name };
  const attrs: XmlAttributes = { style: side.style };
  const children: XmlElement[] = [];
  if (side.color) children.push({ name: 'color', attrs: { rgb: side.color } });
  return { name, attrs, children };
}

function alignmentElement(alignment: ResolvedAlignment): XmlElement {
  const attrs: XmlAttributes = {};
  if (alignment.horizontal !== undefined) attrs.horizontal = alignment.horizontal;
  if (alignment.indent !== undefined) attrs.indent = alignment.indent;
  if (alignment.readingOrder !== undefined) attrs.readingOrder = alignment.readingOrder;
  if (alignment.rotate !== undefined) attrs.textRotation = alignment.rotate;
  if (alignment.shrinkToFit !== undefined) attrs.shrinkToFit = alignment.shrinkToFit ? 1 : 0;
  if (alignment.vertical !== undefined) attrs.vertical = alignment.vertical;
  if (alignment.wrapText !== undefined) attrs.wrapText = alignment.wrapText ? 1 : 0;
  return { name: 'alignment', attrs };
}
