/**
 * Copy every `--ag-*` custom property from `source` to `target`.
 *
 * Popups that render outside the themed grid root (body-level submenus,
 * filter popups, chooser dialogs) lose the theme's variables, which live on
 * the `.ag-theme-*` root. Copying the computed values onto the popup root
 * keeps light and dark mode intact everywhere.
 */
export function inheritThemeTokens(source: HTMLElement, target: HTMLElement): void {
  const styles = getComputedStyle(source);
  for (let i = 0; i < styles.length; i++) {
    const prop = styles[i];
    if (prop && prop.startsWith('--ag-')) {
      target.style.setProperty(prop, styles.getPropertyValue(prop).trim());
    }
  }
}
