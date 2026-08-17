import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  GRID_DENSITIES,
  LibreGridThemeService,
  type ThemeMode,
} from '@libregrid/material';

interface AccentTheme {
  id: string;
  label: string;
  color: string;
}

/** Accent themes. `id` matches the `data-lgr-accent` SCSS selector. */
const ACCENT_THEMES: readonly AccentTheme[] = [
  { id: 'violet', label: 'Violet', color: '#7d00fa' },
  { id: 'azure', label: 'Azure', color: '#005cbb' },
  { id: 'emerald', label: 'Emerald', color: '#026e00' },
  { id: 'rose', label: 'Rose', color: '#ba005c' },
  { id: 'amber', label: 'Amber', color: '#964900' },
  { id: 'magenta', label: 'Magenta', color: '#a900a9' },
];

const MODES: readonly { id: ThemeMode; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: 'light_mode' },
  { id: 'dark', label: 'Dark', icon: 'dark_mode' },
];

@Component({
  selector: 'lgr-theme-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule, MatTooltipModule],
  styles: `
    .lgr-theme-menu {
      min-width: 260px;
      padding: 0.5rem;
    }

    .lgr-theme-section {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--mat-sys-on-surface-variant);
      padding: 0.5rem 0.6rem 0.4rem;
      opacity: 0.75;
    }

    .lgr-swatches {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem;
      padding: 0 0.25rem;
    }

    .lgr-swatch {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 0.6rem;
      border-radius: 10px;
      border: 1px solid var(--mat-sys-outline-variant);
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      text-align: left;
      transition: background 120ms ease, border-color 120ms ease;
    }

    .lgr-swatch:hover {
      background: var(--mat-sys-surface-container-hover);
    }

    .lgr-swatch.active {
      border-color: var(--mat-sys-primary);
      background: color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);
    }

    .lgr-swatch-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
    }

    .lgr-swatch-check {
      margin-left: auto;
      color: var(--mat-sys-primary);
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }

    .lgr-segment {
      display: flex;
      gap: 0.25rem;
      padding: 0.25rem;
      border-radius: 10px;
      background: var(--mat-sys-surface-container);
      margin: 0.25rem 0.25rem 0.5rem;
    }

    .lgr-segment button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 0.45rem 0.5rem;
      border-radius: 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      transition: background 120ms ease, color 120ms ease;
    }

    .lgr-segment button mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .lgr-segment button.active {
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
  `,
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="menu"
      matTooltip="Theme & density"
      aria-label="Open theme picker"
    >
      <mat-icon>palette</mat-icon>
    </button>

    <mat-menu #menu="matMenu" [overlapTrigger]="false">
      <div class="lgr-theme-menu" (click)="$event.stopPropagation()">
        <div class="lgr-theme-section">Color theme</div>
        <div class="lgr-swatches" role="radiogroup" aria-label="Color theme">
          @for (theme of themes; track theme.id) {
            <button
              class="lgr-swatch"
              role="radio"
              [attr.aria-checked]="themeService.accent() === theme.id"
              [class.active]="themeService.accent() === theme.id"
              (click)="themeService.setAccent(theme.id)"
            >
              <span class="lgr-swatch-dot" [style.background]="theme.color"></span>
              {{ theme.label }}
              @if (themeService.accent() === theme.id) {
                <mat-icon class="lgr-swatch-check">check_circle</mat-icon>
              }
            </button>
          }
        </div>

        <mat-divider style="margin: 0.5rem 0"></mat-divider>

        <div class="lgr-theme-section">Mode</div>
        <div class="lgr-segment" role="radiogroup" aria-label="Color mode">
          @for (mode of modes; track mode.id) {
            <button
              role="radio"
              [attr.aria-checked]="themeService.mode() === mode.id"
              [class.active]="themeService.mode() === mode.id"
              (click)="themeService.setMode(mode.id)"
            >
              <mat-icon>{{ mode.icon }}</mat-icon>
              {{ mode.label }}
            </button>
          }
        </div>

        <mat-divider style="margin: 0.5rem 0"></mat-divider>

        <div class="lgr-theme-section">Density</div>
        <div class="lgr-segment" role="radiogroup" aria-label="Grid density">
          @for (density of densities; track density.id) {
            <button
              role="radio"
              [attr.aria-checked]="themeService.density() === density.scale"
              [class.active]="themeService.density() === density.scale"
              (click)="themeService.setDensity(density.scale)"
            >
              {{ density.label }}
            </button>
          }
        </div>
      </div>
    </mat-menu>
  `,
})
export class ThemePicker {
  protected readonly themeService = inject(LibreGridThemeService);
  protected readonly themes = ACCENT_THEMES;
  protected readonly modes = MODES;
  protected readonly densities = GRID_DENSITIES;
}
