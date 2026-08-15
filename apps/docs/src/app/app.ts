import { Component, ChangeDetectionStrategy, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';

import { LibreGridThemeService } from '@libregrid/material';
import { NAV } from './routes';

@Component({
  selector: 'lgr-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
  ],
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .shell {
      height: 100%;
    }
    mat-sidenav {
      width: 240px;
    }
    mat-sidenav-content,
    main {
      min-width: 0;
    }
    .spacer {
      flex: 1;
    }
    .brand {
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .tagline {
      font-size: 0.8rem;
      opacity: 0.75;
      margin-left: 0.75rem;
    }
    .menu-button {
      margin-right: 0.25rem;
    }
    @media (max-width: 700px) {
      .tagline {
        display: none;
      }
      mat-sidenav {
        width: min(280px, 86vw);
      }
    }
  `,
  template: `
    <header>
      <mat-toolbar color="primary">
        @if (isHandset()) {
          <button
            mat-icon-button
            class="menu-button"
            (click)="toggleNavigation()"
            aria-label="Toggle navigation"
          >
            <mat-icon>menu</mat-icon>
          </button>
        }
        <span class="brand">LibreGrid</span>
        <span class="tagline">Enterprise-grade features for AG Grid Community</span>
        <span class="spacer"></span>
        <button
          mat-icon-button
          (click)="theme.toggle()"
          [attr.aria-label]="
            'Switch to ' + (theme.mode() === 'light' ? 'dark' : 'light') + ' theme'
          "
        >
          <mat-icon>{{ theme.mode() === 'light' ? 'dark_mode' : 'light_mode' }}</mat-icon>
        </button>
      </mat-toolbar>
    </header>

    <mat-sidenav-container class="shell">
      <mat-sidenav
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="navOpen()"
        (openedChange)="navOpen.set($event)"
      >
        <mat-nav-list>
          @for (item of nav; track item.path) {
            <a
              mat-list-item
              [routerLink]="item.path"
              routerLinkActive
              #rla="routerLinkActive"
              [activated]="rla.isActive"
              [routerLinkActiveOptions]="{ exact: item.path === '' }"
              (click)="closeNavigationOnHandset()"
            >
              {{ item.label }}
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <main>
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class App {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly nav = NAV;
  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly isHandset = toSignal(
    this.breakpoints.observe('(max-width: 700px)').pipe(map((state) => state.matches)),
    { initialValue: this.breakpoints.isMatched('(max-width: 700px)') },
  );
  protected readonly navOpen = signal(!this.isHandset());

  constructor() {
    effect(() => this.navOpen.set(!this.isHandset()));
  }

  protected toggleNavigation(): void {
    this.navOpen.update((open) => !open);
  }

  protected closeNavigationOnHandset(): void {
    if (this.isHandset()) this.navOpen.set(false);
  }
}
