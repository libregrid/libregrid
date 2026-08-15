import type {
  ExcelAlignment,
  ExcelBorder,
  ExcelBorders,
  ExcelFont,
  ExcelInterior,
  ExcelNumberFormat,
  ExcelProtection,
  ExcelStyle,
} from 'ag-grid-community';
import { FILL_PATTERNS, toArgb } from './colorMaps';

/** Resolved font with all defaults applied. */
export interface ResolvedFont {
  bold: boolean;
  color: string;
  family: number;
  fontName: string;
  italic: boolean;
  outline: boolean;
  shadow: boolean;
  size: number;
  strikeThrough: boolean;
  underline: 'Single' | 'Double' | null;
  verticalAlign: 'Superscript' | 'Subscript' | null;
}

/** Resolved fill with all defaults applied. */
export interface ResolvedFill {
  pattern: string;
  fgColor: string | null;
  bgColor: string | null;
}

/** One resolved border side. `style: null` means no border. */
export interface ResolvedBorderSide {
  style: string | null;
  color: string | null;
}

/** Resolved borders with all four sides. */
export interface ResolvedBorders {
  left: ResolvedBorderSide;
  right: ResolvedBorderSide;
  top: ResolvedBorderSide;
  bottom: ResolvedBorderSide;
}

/** Resolved number format: a built-in id or a custom code. */
export interface ResolvedNumberFormat {
  numFmtId: number;
  formatCode?: string;
}

/** Resolved alignment: every field already mapped to OOXML vocabulary. */
export interface ResolvedAlignment {
  horizontal?: string;
  indent?: number;
  readingOrder?: number;
  rotate?: number;
  shrinkToFit?: boolean;
  vertical?: string;
  wrapText?: boolean;
}

/** Resolved protection. */
export interface ResolvedProtection {
  locked: boolean;
  hidden: boolean;
}

/** One fully resolved style record, index-aligned with `cellXfs`. */
export interface ResolvedStyle {
  font: ResolvedFont;
  fill: ResolvedFill;
  borders: ResolvedBorders;
  numberFormat: ResolvedNumberFormat;
  alignment: ResolvedAlignment | null;
  protection: ResolvedProtection | null;
}

const FONT_FAMILIES: Record<string, number> = {
  Automatic: 2,
  Roman: 1,
  Swiss: 2,
  Modern: 3,
  Script: 4,
  Decorative: 5,
};

const HORIZONTAL_ALIGNMENTS: Record<string, string> = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
  Fill: 'fill',
  Justify: 'justify',
  CenterAcrossSelection: 'centerContinuous',
  Distributed: 'distributed',
  JustifyDistributed: 'justifyDistributed',
};

const VERTICAL_ALIGNMENTS: Record<string, string> = {
  Top: 'top',
  Bottom: 'bottom',
  Center: 'center',
  Justify: 'justify',
  Distributed: 'distributed',
  JustifyDistributed: 'justifyDistributed',
};

const READING_ORDERS: Record<string, number> = { Context: 0, LeftToRight: 1, RightToLeft: 2 };

/** Number formats Excel ships built in. Formats not listed get a custom id. */
const BUILT_IN_NUMBER_FORMATS = new Map<string, number>([
  ['0', 1],
  ['0.00', 2],
  ['#,##0', 3],
  ['#,##0.00', 4],
  ['0%', 9],
  ['0.00%', 10],
  ['0.00E+00', 11],
  ['# ?/?', 12],
  ['# ??/??', 13],
  ['mm-dd-yy', 14],
  ['d-mmm-yy', 15],
  ['d-mmm', 16],
  ['mmm-yy', 17],
  ['h:mm AM/PM', 18],
  ['h:mm:ss AM/PM', 19],
  ['h:mm', 20],
  ['h:mm:ss', 21],
  ['m/d/yy h:mm', 22],
  ['#,##0 ;(#,##0)', 37],
  ['#,##0 ;[Red](#,##0)', 38],
  ['#,##0.00;(#,##0.00)', 39],
  ['#,##0.00;[Red](#,##0.00)', 40],
  ['mm:ss', 45],
  ['[h]:mm:ss', 46],
  ['mmss.0', 47],
  ['##0.0E+0', 48],
  ['@', 49],
]);

/** First id available for custom number formats (built-ins end at 163). */
const FIRST_CUSTOM_NUM_FMT_ID = 164;

const DEFAULT_FONT: ResolvedFont = {
  bold: false,
  color: 'FF000000',
  family: 2,
  fontName: 'Calibri',
  italic: false,
  outline: false,
  shadow: false,
  size: 11,
  strikeThrough: false,
  underline: null,
  verticalAlign: null,
};

const NO_FILL: ResolvedFill = { pattern: 'none', fgColor: null, bgColor: null };
const GRAY125_FILL: ResolvedFill = { pattern: 'gray125', fgColor: null, bgColor: null };
const NO_SIDE: ResolvedBorderSide = { style: null, color: null };
const NO_BORDERS: ResolvedBorders = { left: NO_SIDE, right: NO_SIDE, top: NO_SIDE, bottom: NO_SIDE };



/** Map one AG Grid border definition to an OOXML border style. */
function borderStyle(border: ExcelBorder | undefined): string | null {
  if (!border || !border.lineStyle || border.lineStyle === 'None') return null;
  const weight = border.weight ?? 0;
  const heavy = weight >= 1;
  switch (border.lineStyle) {
    case 'Continuous':
      return weight >= 2 ? 'thick' : heavy ? 'medium' : 'thin';
    case 'Dash':
      return heavy ? 'mediumDashed' : 'dashed';
    case 'Dot':
      return 'dotted';
    case 'DashDot':
      return heavy ? 'mediumDashDot' : 'dashDot';
    case 'DashDotDot':
      return heavy ? 'mediumDashDotDot' : 'dashDotDot';
    case 'SlantDashDot':
      return 'slantDashDot';
    case 'Double':
      return 'double';
    default:
      return null;
  }
}

function resolveFont(font?: ExcelFont): ResolvedFont {
  if (!font) return DEFAULT_FONT;
  const resolved: ResolvedFont = { ...DEFAULT_FONT };
  if (font.bold !== undefined) resolved.bold = font.bold;
  if (font.color !== undefined) resolved.color = toArgb(font.color);
  if (font.family !== undefined) resolved.family = FONT_FAMILIES[font.family] ?? 2;
  if (font.fontName !== undefined) resolved.fontName = font.fontName;
  if (font.italic !== undefined) resolved.italic = font.italic;
  if (font.outline !== undefined) resolved.outline = font.outline;
  if (font.shadow !== undefined) resolved.shadow = font.shadow;
  if (font.size !== undefined) resolved.size = font.size;
  if (font.strikeThrough !== undefined) resolved.strikeThrough = font.strikeThrough;
  if (font.underline !== undefined) resolved.underline = font.underline;
  if (font.verticalAlign !== undefined) resolved.verticalAlign = font.verticalAlign;
  return resolved;
}

function resolveFill(interior?: ExcelInterior): ResolvedFill {
  if (!interior || !interior.pattern || interior.pattern === 'None') return NO_FILL;
  const fgColor = interior.patternColor ? toArgb(interior.patternColor) : null;
  const bgColor = interior.color ? toArgb(interior.color) : null;
  const pattern = FILL_PATTERNS[interior.pattern] ?? 'none';
  if (pattern === 'solid' && !fgColor && bgColor) {
    // Solid fills read `color` as the visible colour.
    return { pattern: 'solid', fgColor: bgColor, bgColor };
  }
  return { pattern, fgColor, bgColor };
}

function resolveSide(border?: ExcelBorder): ResolvedBorderSide {
  const style = borderStyle(border);
  if (style === null) return NO_SIDE;
  return { style, color: toArgb(border!.color ?? 'black') };
}

function resolveBorders(borders?: ExcelBorders): ResolvedBorders {
  if (!borders) return NO_BORDERS;
  return {
    left: resolveSide(borders.borderLeft),
    right: resolveSide(borders.borderRight),
    top: resolveSide(borders.borderTop),
    bottom: resolveSide(borders.borderBottom),
  };
}

function resolveNumberFormat(numberFormat?: ExcelNumberFormat): ResolvedNumberFormat {
  if (!numberFormat?.format) return { numFmtId: 0 };
  const builtIn = BUILT_IN_NUMBER_FORMATS.get(numberFormat.format);
  if (builtIn !== undefined) return { numFmtId: builtIn };
  return { numFmtId: -1, formatCode: numberFormat.format };
}

function resolveAlignment(alignment?: ExcelAlignment): ResolvedAlignment | null {
  if (!alignment) return null;
  const resolved: ResolvedAlignment = {};
  if (alignment.horizontal && alignment.horizontal !== 'Automatic') {
    const horizontal = HORIZONTAL_ALIGNMENTS[alignment.horizontal];
    if (horizontal !== undefined) resolved.horizontal = horizontal;
  }
  if (alignment.indent !== undefined) resolved.indent = alignment.indent;
  if (alignment.readingOrder !== undefined) {
    resolved.readingOrder = READING_ORDERS[alignment.readingOrder] ?? 0;
  }
  if (alignment.rotate !== undefined) resolved.rotate = alignment.rotate;
  if (alignment.shrinkToFit !== undefined) resolved.shrinkToFit = alignment.shrinkToFit;
  if (alignment.vertical && alignment.vertical !== 'Automatic') {
    const vertical = VERTICAL_ALIGNMENTS[alignment.vertical];
    if (vertical !== undefined) resolved.vertical = vertical;
  }
  if (alignment.wrapText !== undefined) resolved.wrapText = alignment.wrapText;
  return resolved;
}

function resolveProtection(protection?: ExcelProtection): ResolvedProtection | null {
  if (!protection) return null;
  return { locked: protection.protected, hidden: protection.hideFormula };
}

/** Resolve an ExcelStyle to a serialisable record with all defaults applied. */
export function resolveStyle(style: ExcelStyle): ResolvedStyle {
  return {
    font: resolveFont(style.font),
    fill: resolveFill(style.interior),
    borders: resolveBorders(style.borders),
    numberFormat: resolveNumberFormat(style.numberFormat),
    alignment: resolveAlignment(style.alignment),
    protection: resolveProtection(style.protection),
  };
}

/** Stable signature for one resolved style (id and dataType excluded). */
export function styleSignature(style: ResolvedStyle): string {
  return JSON.stringify(style);
}

/** One registered cellXf record: the resolved style plus component indexes. */
export interface StyleRecord {
  style: ResolvedStyle;
  fontId: number;
  fillId: number;
  borderId: number;
}

/**
 * Deduplicating style registry (phase 5.3). Identical resolved styles share
 * one `cellXf` index; the registry also deduplicates the fonts, fills,
 * borders and number formats those styles reference, so every `styles.xml`
 * index cross-reference is computed here, in one place. Index 0 is always
 * the all-defaults style.
 */
export class StyleRegistry {
  private readonly records: StyleRecord[] = [];
  private readonly cellXfIndex = new Map<string, number>();
  private readonly fonts: ResolvedFont[] = [DEFAULT_FONT];
  private readonly fontIndex = new Map<string, number>([[JSON.stringify(DEFAULT_FONT), 0]]);
  private readonly fills: ResolvedFill[] = [NO_FILL, GRAY125_FILL];
  private readonly fillIndex = new Map<string, number>([
    [JSON.stringify(NO_FILL), 0],
    [JSON.stringify(GRAY125_FILL), 1],
  ]);
  private readonly borders: ResolvedBorders[] = [NO_BORDERS];
  private readonly borderIndex = new Map<string, number>([[JSON.stringify(NO_BORDERS), 0]]);
  private readonly customNumFmts = new Map<string, number>();

  constructor() {
    const defaultStyle = resolveStyle({ id: '' });
    this.cellXfIndex.set(styleSignature(defaultStyle), 0);
    this.records.push({ style: defaultStyle, fontId: 0, fillId: 0, borderId: 0 });
  }

  /** Register a style and return its `cellXf` index. */
  public register(style: ExcelStyle): number {
    const resolved = resolveStyle(style);
    const signature = styleSignature(resolved);
    const existing = this.cellXfIndex.get(signature);
    if (existing !== undefined) return existing;
    const fontId = this.registerFont(resolved.font);
    const fillId = this.registerFill(resolved.fill);
    const borderId = this.registerBorders(resolved.borders);
    this.registerNumberFormat(resolved.numberFormat);
    const index = this.records.length;
    this.records.push({ style: resolved, fontId, fillId, borderId });
    this.cellXfIndex.set(signature, index);
    return index;
  }

  /** All registered records, index-aligned with the `cellXfs` entries. */
  public styleRecords(): readonly StyleRecord[] {
    return this.records;
  }

  public fontEntries(): readonly ResolvedFont[] {
    return this.fonts;
  }

  public fillEntries(): readonly ResolvedFill[] {
    return this.fills;
  }

  public borderEntries(): readonly ResolvedBorders[] {
    return this.borders;
  }

  /** Custom number formats as [id, formatCode] pairs. */
  public customNumberFormats(): readonly (readonly [number, string])[] {
    return [...this.customNumFmts.entries()].map(([formatCode, id]) => [id, formatCode] as const);
  }

  /** The numFmtId a resolved number format resolves to (custom ids assigned lazily). */
  public numberFormatId(numberFormat: ResolvedNumberFormat): number {
    if (numberFormat.numFmtId !== -1) return numberFormat.numFmtId;
    const code = numberFormat.formatCode ?? '';
    const existing = this.customNumFmts.get(code);
    if (existing !== undefined) return existing;
    const id = FIRST_CUSTOM_NUM_FMT_ID + this.customNumFmts.size;
    this.customNumFmts.set(code, id);
    return id;
  }

  private registerFont(font: ResolvedFont): number {
    const signature = JSON.stringify(font);
    const existing = this.fontIndex.get(signature);
    if (existing !== undefined) return existing;
    const index = this.fonts.length;
    this.fonts.push(font);
    this.fontIndex.set(signature, index);
    return index;
  }

  private registerFill(fill: ResolvedFill): number {
    const signature = JSON.stringify(fill);
    const existing = this.fillIndex.get(signature);
    if (existing !== undefined) return existing;
    const index = this.fills.length;
    this.fills.push(fill);
    this.fillIndex.set(signature, index);
    return index;
  }

  private registerBorders(borders: ResolvedBorders): number {
    const signature = JSON.stringify(borders);
    const existing = this.borderIndex.get(signature);
    if (existing !== undefined) return existing;
    const index = this.borders.length;
    this.borders.push(borders);
    this.borderIndex.set(signature, index);
    return index;
  }

  private registerNumberFormat(numberFormat: ResolvedNumberFormat): void {
    if (numberFormat.numFmtId === -1) this.numberFormatId(numberFormat);
  }
}
