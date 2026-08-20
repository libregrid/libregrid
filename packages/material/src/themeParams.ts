import { themeQuartz, type Theme } from 'ag-grid-community';

/**
 * Density presets. `scale` is the numeric value passed to
 * `LibreGridThemeService#setDensity`; Quartz derives row height, header
 * height and cell padding from the resulting `spacing`, so a single number
 * gives a coherent comfortable/compact/dense scale without hand-tuning
 * every metric.
 */
export const GRID_DENSITIES = [
  { id: 'comfortable', label: 'Comfortable', scale: 0 },
  { id: 'compact', label: 'Compact', scale: -2 },
  { id: 'dense', label: 'Dense', scale: -4 },
] as const;

export type GridDensityId = (typeof GRID_DENSITIES)[number]['id'];

/** Resolve a numeric density scale to its grid `spacing` value. */
export function spacingForDensity(scale: number): number {
  return Math.max(3, 8 + Math.min(0, Math.max(-5, scale)));
}

/** Build a grid theme from the Material tokens exposed on a host element. */
export function buildGridTheme(root: HTMLElement = document.documentElement, density = 0): Theme {
  const typography = resolveTypography(root);
  const surface = resolveColor(root, '--mat-sys-surface', '#ffffff');
  const spacing = spacingForDensity(density);
  const radius = 10;

  return themeQuartz.withParams({
    // Core palette
    accentColor: resolveColor(root, '--mat-sys-primary', '#6750a4'),
    backgroundColor: surface,
    foregroundColor: resolveColor(root, '--mat-sys-on-surface', '#1d1b20'),
    borderColor: resolveColor(root, '--mat-sys-outline-variant', '#cac4d0'),
    chromeBackgroundColor: resolveColor(root, '--mat-sys-surface-container', '#f3edf7'),
    headerTextColor: resolveColor(root, '--mat-sys-on-surface-variant', '#49454f'),

    // Rows
    oddRowBackgroundColor: resolveColor(root, '--mat-sys-surface-container-low', '#f8f5fa'),
    rowHoverColor: resolveColor(root, '--mat-sys-secondary-container', '#e8def8'),
    selectedRowBackgroundColor: resolveColor(root, '--mat-sys-primary-container', '#e9ddff'),
    headerCellHoverBackgroundColor: resolveColor(
      root,
      '--mat-sys-surface-container-high',
      '#ece6f0',
    ),

    // Cell-range selection (Phase 4)
    rangeSelectionBackgroundColor: resolveColor(root, '--mat-sys-primary-container', '#e9ddff'),
    rangeSelectionBorderColor: resolveColor(root, '--mat-sys-primary', '#6750a4'),

    // Find highlights are always light yellow/orange; dark ink keeps contrast
    // when the grid palette is dark (Quartz dark color-scheme does the same).
    findMatchColor: '#1d1b20',
    findActiveMatchColor: '#1d1b20',

    // Typography
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    dataFontSize: typography.fontSize,
    headerFontSize: Math.max(11, typography.fontSize - 1),
    headerFontWeight: 600,

    // Spacing & geometry — Quartz derives row/header heights and padding
    // from `spacing`, so the density preset cascades everywhere.
    spacing,
    cellHorizontalPadding: spacing * 2,
    wrapperBorderRadius: 14,
    borderRadius: radius,
    // Quartz defaults checkboxBorderRadius to `borderRadius` (10px) — that
    // renders row/checkbox controls round, radio-button-like. Keep genuine
    // checkboxes square regardless of the general corner radius.
    checkboxBorderRadius: 2,

    // Subtle row/column borders for a clean, "table" feel rather than
    // the heavy default strokes.
    rowBorder: { width: 1, style: 'solid', color: borderColorFor(root) },
    columnBorder: { width: 1, style: 'solid', color: borderColorFor(root) },
    headerColumnBorder: false,
    wrapperBorder: { width: 1, style: 'solid', color: borderColorFor(root) },

    // Status bar hierarchy
    statusBarLabelFontWeight: 500,
    statusBarValueFontWeight: 600,
  });
}

/** A hairline border that reads as a grid line, not a box. */
function borderColorFor(root: HTMLElement): string {
  return resolveColor(root, '--mat-sys-outline-variant', '#e0dce6');
}

function resolveColor(root: HTMLElement, name: string, fallback: string): string {
  const document = root.ownerDocument;
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;color:var(${name},${fallback})`;
  root.appendChild(probe);
  const resolved = document.defaultView?.getComputedStyle(probe).color;
  probe.remove();
  return resolved || fallback;
}

function resolveTypography(root: HTMLElement): { fontFamily: string; fontSize: number } {
  const document = root.ownerDocument;
  const probe = document.createElement('span');
  probe.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;font:var(--mat-sys-body-medium,400 14px/20px Roboto,system-ui,sans-serif)';
  root.appendChild(probe);
  const style = document.defaultView?.getComputedStyle(probe);
  const fontFamily = style?.fontFamily || 'Roboto, system-ui, sans-serif';
  const fontSize = Number.parseFloat(style?.fontSize || '14') || 14;
  probe.remove();
  return { fontFamily, fontSize };
}
