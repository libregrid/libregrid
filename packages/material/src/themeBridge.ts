import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  effect,
  inject,
  makeEnvironmentProviders,
  signal,
  type EnvironmentProviders,
} from '@angular/core';
import { ApplicationRef, EnvironmentInjector } from '@angular/core';
import { themeQuartz, type Theme } from 'ag-grid-community';
import { installMaterialMenuRenderer } from './materialMenuRenderer';
import { installMaterialSideBarRenderer } from './materialSideBarRenderer';
import { installMaterialColumnsToolPanelDragDrop } from './materialColumnsToolPanelDragDrop';
import { buildGridTheme } from './themeParams';

export { buildGridTheme } from './themeParams';

export type ThemeMode = 'light' | 'dark';

export interface LibreGridMaterialThemeOptions {
  /** Root element carrying the host Material theme class or attributes. */
  root?: HTMLElement;
  /** Angular Material's Sass-time density scale. It cannot be read from CSS at runtime. */
  density?: number;
  /** Initial accent theme name, exposed as `data-lgr-accent`. */
  accent?: string;
}

const MATERIAL_THEME_OPTIONS = new InjectionToken<LibreGridMaterialThemeOptions>(
  'LIBREGRID_MATERIAL_THEME_OPTIONS',
);

/**
 * Material 3 -> AG Grid theme bridge.
 *
 * Material exposes colour tokens as `light-dark()` values. A temporary painted
 * element lets the browser resolve that function in the host document before
 * the concrete colour is passed to AG Grid.
 */
@Injectable()
export class LibreGridThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly options = inject(MATERIAL_THEME_OPTIONS, { optional: true }) ?? {};
  private readonly destroyRef = inject(DestroyRef);
  private readonly applicationRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly root = this.options.root ?? this.document.documentElement;
  private frame: number | undefined;

  readonly mode = signal<ThemeMode>('light');
  /** Selected accent theme name, reflected as `data-lgr-accent`. */
  readonly accent = signal<string>(this.options.accent ?? 'violet');
  /** Runtime grid density (numeric scale). Comfortable=0, compact=-2, dense=-4. */
  readonly density = signal<number>(this.options.density ?? 0);
  readonly gridTheme = signal<Theme>(themeQuartz);

  constructor() {
    if (!isPlatformBrowser(this.platformId) || !this.root) return;

    effect(() => {
      this.root.setAttribute('data-lgr-theme', this.mode());
      this.root.setAttribute('data-lgr-accent', this.accent());
      this.root.setAttribute('data-lgr-density', String(this.density()));
      this.scheduleRefresh();
    });

    const observer = new MutationObserver(() => this.scheduleRefresh());
    observer.observe(this.root, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-lgr-theme', 'data-lgr-accent'],
    });
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      if (this.frame !== undefined) this.document.defaultView?.cancelAnimationFrame(this.frame);
    });
    const uninstallMenuRenderer = installMaterialMenuRenderer(
      this.applicationRef,
      this.environmentInjector,
    );
    const uninstallSideBarRenderer = installMaterialSideBarRenderer(
      this.applicationRef,
      this.environmentInjector,
    );
    const uninstallColumnsToolPanelDragDrop = installMaterialColumnsToolPanelDragDrop(
      this.environmentInjector,
    );
    this.destroyRef.onDestroy(() => {
      uninstallMenuRenderer();
      uninstallSideBarRenderer();
      uninstallColumnsToolPanelDragDrop();
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'light' ? 'dark' : 'light'));
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  setAccent(accent: string): void {
    this.accent.set(accent);
  }

  setDensity(density: number): void {
    this.density.set(density);
  }

  refresh(): void {
    this.gridTheme.set(buildGridTheme(this.root, this.density()));
  }

  private scheduleRefresh(): void {
    if (this.frame !== undefined) return;
    const view = this.document.defaultView;
    if (!view) {
      this.refresh();
      return;
    }
    this.frame = view.requestAnimationFrame(() => {
      this.frame = undefined;
      this.refresh();
    });
  }
}

/** Provide the bridge and opt into host Material token observation. */
export function provideLibreGridMaterialTheme(
  options: LibreGridMaterialThemeOptions = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: MATERIAL_THEME_OPTIONS, useValue: options },
    LibreGridThemeService,
  ]);
}
