/** The 16 CSS basic colour names mapped to ARGB, so named colours stay valid. */
const NAMED_COLORS: Record<string, string> = {
  black: 'FF000000',
  silver: 'FFC0C0C0',
  gray: 'FF808080',
  grey: 'FF808080',
  white: 'FFFFFFFF',
  maroon: 'FF800000',
  red: 'FFFF0000',
  purple: 'FF800080',
  fuchsia: 'FFFF00FF',
  green: 'FF008000',
  lime: 'FF00FF00',
  olive: 'FF808000',
  yellow: 'FFFFFF00',
  navy: 'FF000080',
  blue: 'FF0000FF',
  teal: 'FF008080',
  aqua: 'FF00FFFF',
};

/** '#RRGGBB' or a named colour to 8-digit ARGB; already-ARGB values pass through. */
export function toArgb(color: string): string {
  const hex = color.replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return 'FF' + hex.toUpperCase();
  if (/^[0-9a-fA-F]{8}$/.test(hex)) return hex.toUpperCase();
  return NAMED_COLORS[color.toLowerCase()] ?? 'FF000000';
}

/** AG Grid interior pattern names mapped to OOXML patternType values. */
export const FILL_PATTERNS: Record<string, string> = {
  None: 'none',
  Solid: 'solid',
  Gray75: 'darkGray',
  Gray50: 'mediumGray',
  Gray25: 'lightGray',
  Gray125: 'gray125',
  Gray0625: 'gray0625',
  HorzStripe: 'darkHorizontal',
  VertStripe: 'darkVertical',
  ReverseDiagStripe: 'darkDown',
  DiagStripe: 'darkUp',
  DiagCross: 'darkGrid',
  ThickDiagCross: 'darkTrellis',
  ThinHorzStripe: 'lightHorizontal',
  ThinVertStripe: 'lightVertical',
  ThinReverseDiagStripe: 'lightDown',
  ThinDiagStripe: 'lightUp',
  ThinHorzCross: 'lightGrid',
  ThinDiagCross: 'lightTrellis',
};
