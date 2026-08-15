import { themeQuartz, type Theme } from 'ag-grid-community';

/** Build a grid theme from the Material tokens exposed on a host element. */
export function buildGridTheme(root: HTMLElement = document.documentElement, density = 0): Theme {
  const typography = resolveTypography(root);
  return themeQuartz.withParams({
    accentColor: resolveColor(root, '--mat-sys-primary', '#6750a4'),
    backgroundColor: resolveColor(root, '--mat-sys-surface', '#ffffff'),
    foregroundColor: resolveColor(root, '--mat-sys-on-surface', '#1d1b20'),
    borderColor: resolveColor(root, '--mat-sys-outline', '#79747e'),
    chromeBackgroundColor: resolveColor(root, '--mat-sys-surface-container', '#f3edf7'),
    headerTextColor: resolveColor(root, '--mat-sys-on-surface-variant', '#49454f'),
    oddRowBackgroundColor: resolveColor(root, '--mat-sys-surface-container-low', '#f8f5fa'),
    rowHoverColor: resolveColor(root, '--mat-sys-secondary-container', '#e8def8'),
    selectedRowBackgroundColor: resolveColor(root, '--mat-sys-primary-container', '#e9ddff'),
    headerCellHoverBackgroundColor: resolveColor(
      root,
      '--mat-sys-surface-container-high',
      '#ece6f0',
    ),
    wrapperBorderRadius: 12,
    borderRadius: 8,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    dataFontSize: typography.fontSize,
    spacing: Math.max(2, 8 + Math.min(0, Math.max(-5, density))),
  });
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
