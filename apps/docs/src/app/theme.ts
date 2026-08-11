import { Injectable, signal, effect } from '@angular/core';
import { themeQuartz, type Theme } from 'ag-grid-community';

export type ThemeMode = 'light' | 'dark';

/**
 * Material-3 → grid theme bridge (prototype).
 *
 * Phase 1 replaces this with `provideLibreGridMaterialTheme()` in
 * `@libregrid/material`, which reads the live `--mat-sys-*` custom properties
 * off the document and maps them onto the grid's Theming API params.
 *
 * It exists here now so the Phase 1 acceptance criterion — "toggling the app's
 * Material theme visibly restyles the grid **without reload**" — has somewhere
 * to be demonstrated, and so the mapping approach is validated before it is
 * formalised into a package.
 *
 * See docs/reference/api-seams.md §8 for the full param list.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>('light');

  /** The grid theme, recomputed whenever the Material theme changes. */
  readonly gridTheme = signal<Theme>(themeQuartz);

  constructor() {
    effect(() => {
      const mode = this.mode();
      document.documentElement.setAttribute('data-lgr-theme', mode);
      // rAF, not queueMicrotask: the token values must be recomputed *after*
      // the browser has applied the new color-scheme, or we read stale colours.
      requestAnimationFrame(() => this.gridTheme.set(buildGridTheme()));
    });
  }

  toggle(): void {
    this.mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }
}

/**
 * ⚠️ Resolve a Material token to a CONCRETE colour.
 *
 * Angular Material 3 emits its system tokens as `light-dark()` functions:
 *
 *     --mat-sys-surface: light-dark(#fef8fc, #151316)
 *
 * `getComputedStyle().getPropertyValue()` returns that string **unresolved**.
 * Handing it to the grid's Theming API "works" — the value lands as
 * `--ag-background-color: light-dark(...)` — but `light-dark()` then resolves
 * against the *grid wrapper's* `color-scheme`, which the grid sets itself. The
 * result is a dark page containing a stubbornly light grid.
 *
 * So we resolve it ourselves: paint the value onto a throwaway element and read
 * back the computed colour, which the browser has already resolved against the
 * document's `color-scheme`.
 *
 * Phase 1 must carry this behaviour into `provideLibreGridMaterialTheme()`.
 * Naive `getPropertyValue` is a trap.
 */
function token(name: string, fallback: string): string {
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;color:var(${name},${fallback})`;
  document.documentElement.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || fallback;
}

/**
 * Map Material 3 system tokens onto grid Theming API params.
 * Deliberately small — Phase 1 expands this to density and typography.
 */
export function buildGridTheme(): Theme {
  return themeQuartz.withParams({
    accentColor: token('--mat-sys-primary', '#6750a4'),
    backgroundColor: token('--mat-sys-surface', '#ffffff'),
    foregroundColor: token('--mat-sys-on-surface', '#1d1b20'),
    borderColor: token('--mat-sys-outline-variant', '#cac4d0'),
    chromeBackgroundColor: token('--mat-sys-surface-container', '#f3edf7'),
    headerTextColor: token('--mat-sys-on-surface-variant', '#49454f'),
    fontFamily: 'Roboto, system-ui, sans-serif',
  });
}
