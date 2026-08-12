import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
    :host { display: block; height: 100%; }
    .shell { height: 100%; }
    mat-sidenav { width: 240px; }
    .spacer { flex: 1; }
    .brand { font-weight: 600; letter-spacing: 0.01em; }
    .tagline { font-size: 0.8rem; opacity: 0.75; margin-left: 0.75rem; }
    @media (max-width: 700px) { .tagline { display: none; } }
  `,
  template: `
    <header>
      <mat-toolbar color="primary">
        <span class="brand">LibreGrid</span>
        <span class="tagline">Enterprise-grade features for AG Grid Community</span>
        <span class="spacer"></span>
        <button
          mat-icon-button
          (click)="theme.toggle()"
          [attr.aria-label]="'Switch to ' + (theme.mode() === 'light' ? 'dark' : 'light') + ' theme'"
        >
          <mat-icon>{{ theme.mode() === 'light' ? 'dark_mode' : 'light_mode' }}</mat-icon>
        </button>
      </mat-toolbar>
    </header>

    <mat-sidenav-container class="shell">
      <mat-sidenav mode="side" opened>
        <mat-nav-list>
          @for (item of nav; track item.path) {
            <a
              mat-list-item
              [routerLink]="item.path"
              routerLinkActive
              #rla="routerLinkActive"
              [activated]="rla.isActive"
              [routerLinkActiveOptions]="{ exact: item.path === '' }"
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
}
