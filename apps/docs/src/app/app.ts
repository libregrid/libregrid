import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter, map, startWith } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { LibreGridThemeService } from '@libregrid/material';
import { ConsentService } from './consent.service';
import { NAV } from './routes';
import { ThemePicker } from './theme-picker';
import { snapThemeChange } from './theme';
import { DOCS_SECTIONS, featureForPath, type DocsSectionId } from './docs/feature-catalog';

interface NavItem {
  path: string;
  label: string;
  section: DocsSectionId;
  searchText: string;
}

const ITEMS: NavItem[] = NAV.map((item) => {
  const feature = featureForPath(item.path);
  return {
    ...item,
    // The feature catalog is the single source of truth for labels, so the
    // sidenav, pager, and page headers can never disagree.
    label: feature?.label ?? item.label,
    section: feature?.section ?? 'reference',
    searchText: [item.label, ...(feature?.packages ?? []), ...(feature?.keywords ?? [])]
      .join(' ')
      .toLowerCase(),
  };
});

/** Sidebar reading order: sections in catalog order, items within each section. */
const SECTIONED_ITEMS: readonly NavItem[] = DOCS_SECTIONS.flatMap((section) =>
  ITEMS.filter((item) => item.section === section.id),
);

interface NavSection {
  id: DocsSectionId;
  label: string;
  items: readonly NavItem[];
}

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
    MatFormFieldModule,
    MatInputModule,
    ThemePicker,
  ],
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    /* ── Toolbar (full-width, above the side nav) ── */
    .lgr-toolbar {
      flex: 0 0 auto;
      z-index: 100;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
    }

    .lgr-toolbar mat-toolbar {
      background: transparent;
      gap: 0.25rem;
    }

    .lgr-brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-family: 'Shippori Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif;
      font-weight: 700;
      font-size: 1.12rem;
      letter-spacing: 0.01em;
      color: var(--mat-sys-on-surface);
      text-decoration: none;
      user-select: none;
      margin-right: 0.25rem;
    }

    .lgr-brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: var(--lgr-radius-md);
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }

    .lgr-brand-mark mat-icon {
      font-size: 1.15rem;
      width: auto;
      height: auto;
    }

    .lgr-tagline {
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
      margin-left: 0.35rem;
      display: none;
    }

    @media (min-width: 960px) {
      .lgr-tagline { display: inline; }
    }

    .lgr-spacer { flex: 1 1 auto; }

    .lgr-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 0.15rem;
    }

    /* ── Side nav ───────────────────────────────── */
    .shell {
      flex: 1 1 auto;
      min-height: 0;
    }

    mat-sidenav {
      width: 272px;
      border-right: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
    }

    .lgr-sidenav-scroll {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 0.75rem 0.5rem 1rem;
      overflow-y: auto;
    }

    .lgr-nav-search {
      margin: 0 0.25rem 0.5rem;
    }

    .lgr-nav-search mat-form-field {
      width: 100%;
    }

    .lgr-nav-section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.55rem 0.75rem;
      border: none;
      border-radius: var(--lgr-radius-md);
      background: transparent;
      cursor: pointer;
      font-family: 'Roboto', system-ui, sans-serif;
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--mat-sys-on-surface);
      transition: background var(--lgr-duration) var(--lgr-ease);
    }

    .lgr-nav-section-title:hover {
      background: var(--mat-sys-surface-container-hover);
    }

    .lgr-nav-section-title mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: var(--mat-sys-on-surface-variant);
      transition: transform var(--lgr-duration) var(--lgr-ease);
    }

    .lgr-nav-section-title[aria-expanded='false'] mat-icon {
      transform: rotate(-90deg);
    }

    .lgr-nav-list {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .lgr-nav-item {
      display: flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-radius: var(--lgr-radius-md);
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      border: none;
      background: transparent;
      cursor: pointer;
      width: 100%;
      transition: background var(--lgr-duration) var(--lgr-ease), color var(--lgr-duration) var(--lgr-ease);
      font-family: inherit;
      text-decoration: none;
      user-select: none;
    }

    .lgr-nav-item:hover {
      background: var(--mat-sys-surface-container-hover);
      color: var(--mat-sys-on-surface);
    }

    .lgr-nav-item.active {
      background: color-mix(in srgb, var(--mat-sys-primary) 13%, transparent);
      color: var(--mat-sys-primary);
    }

    .lgr-nav-empty {
      padding: 0.75rem;
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
    }

    /* ── Content ─────────────────────────────────── */
    mat-sidenav-content,
    main {
      min-width: 0;
    }

    /* ── Prev / next pager ──────────────────────── */
    .lgr-pager {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      max-width: 1280px;
      margin: 0 auto;
      padding: 1rem clamp(1rem, 3vw, 2.5rem) 1.75rem;
    }

    .lgr-pager-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      max-width: 48%;
      padding: 0.7rem 1rem;
      border-radius: var(--lgr-radius-md);
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 500;
      transition: border-color var(--lgr-duration) var(--lgr-ease);
    }

    /* Quiet affordance: a border-colour shift, no lift or shadow. */
    .lgr-pager-link:hover {
      border-color: var(--mat-sys-primary);
    }

    .lgr-pager-link.next { text-align: right; margin-left: auto; }
    .lgr-pager-link.prev { margin-right: auto; }

    .lgr-pager-label {
      display: block;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mat-sys-on-surface-variant);
    }

    .lgr-pager-link mat-icon { flex-shrink: 0; }

    .lgr-site-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      align-items: center;
      max-width: 1280px;
      margin: 0 auto;
      padding: 1rem clamp(1rem, 3vw, 2.5rem) 1.5rem;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.8rem;
    }

    .lgr-site-footer a,
    .lgr-site-footer button {
      color: inherit;
      font: inherit;
    }

    .lgr-site-footer button {
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
      text-decoration: underline;
    }

    /* ── Responsive ──────────────────────────────── */
    @media (max-width: 700px) {
      mat-sidenav {
        width: min(300px, 88vw);
      }
    }
  `,
  template: `
    <!-- Full-width toolbar -->
    <header class="lgr-toolbar">
      <mat-toolbar>
        @if (isHandset()) {
          <button
            mat-icon-button
            (click)="toggleNavigation()"
            aria-label="Toggle navigation"
          >
            <mat-icon>menu</mat-icon>
          </button>
        }

        <a class="lgr-brand" routerLink="/">
          <span class="lgr-brand-mark">
            <mat-icon>grid_view</mat-icon>
          </span>
          <span>LibreGrid</span>
          <span class="lgr-tagline">Enterprise-grade features for AG Grid Community</span>
        </a>

        <span class="lgr-spacer"></span>

        <div class="lgr-toolbar-actions">
          <lgr-theme-picker />

          <button
            mat-icon-button
            (click)="toggleTheme()"
            [attr.aria-label]="'Switch to ' + (theme.mode() === 'light' ? 'dark' : 'light') + ' theme'"
          >
            <mat-icon>{{ theme.mode() === 'light' ? 'dark_mode' : 'light_mode' }}</mat-icon>
          </button>
        </div>
      </mat-toolbar>
    </header>

    <mat-sidenav-container class="shell" autosize>
      <mat-sidenav
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="navOpen()"
        (openedChange)="navOpen.set($event)"
      >
        <nav class="lgr-sidenav-scroll" aria-label="Features">
          <mat-form-field class="lgr-nav-search" appearance="outline" [subscriptSizing]="'dynamic'">
            <mat-icon matPrefix>search</mat-icon>
            <input
              matInput
              type="search"
              placeholder="Filter features"
              [value]="filterQuery()"
              (input)="filterQuery.set($any($event.target).value)"
              aria-label="Filter features"
            />
            @if (filterQuery()) {
              <button
                matSuffix
                mat-icon-button
                aria-label="Clear filter"
                (click)="filterQuery.set('')"
              >
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>

          @for (section of filteredSections(); track section.id) {
            <button
              type="button"
              class="lgr-nav-section-title"
              [attr.aria-expanded]="!isSectionCollapsed(section.id)"
              (click)="toggleSection(section.id)"
            >
              {{ section.label }}
              <mat-icon>expand_more</mat-icon>
            </button>
            @if (!isSectionCollapsed(section.id) || filterQuery()) {
              <div class="lgr-nav-list">
                @for (item of section.items; track item.path) {
                  <a
                    class="lgr-nav-item"
                    [routerLink]="item.path"
                    routerLinkActive
                    #rla="routerLinkActive"
                    [class.active]="rla.isActive"
                    [routerLinkActiveOptions]="{ exact: item.path === '' }"
                    (click)="closeNavigationOnHandset()"
                  >
                    {{ item.label }}
                  </a>
                }
              </div>
            }
          }
          @if (filteredNav().length === 0) {
            <div class="lgr-nav-empty">No features match "{{ filterQuery() }}".</div>
          }
        </nav>
      </mat-sidenav>

      <mat-sidenav-content>
        <main id="main-content">
          <router-outlet />
        </main>

        <!-- Prev / next feature navigation -->
        @if (currentIndex() >= 0) {
          <nav class="lgr-pager" aria-label="Feature navigation">
            @if (prevItem(); as prev) {
              <a class="lgr-pager-link prev" [routerLink]="prev.path">
                <mat-icon>arrow_back</mat-icon>
                <span>
                  <span class="lgr-pager-label">Previous</span>
                  {{ prev.label }}
                </span>
              </a>
            } @else {
              <span></span>
            }

            @if (nextItem(); as next) {
              <a class="lgr-pager-link next" [routerLink]="next.path">
                <span>
                  <span class="lgr-pager-label">Next</span>
                  {{ next.label }}
                </span>
                <mat-icon>arrow_forward</mat-icon>
              </a>
            }
          </nav>
        }

        <footer class="lgr-site-footer">
          <span>© {{ currentYear }} LibreGrid</span>
          <a routerLink="/privacy">Privacy</a>
          <a routerLink="/cookies">Cookies</a>
          <button type="button" (click)="consent.showSettings()">Privacy choices</button>
        </footer>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class App {
  protected readonly theme = inject(LibreGridThemeService);
  protected readonly consent = inject(ConsentService);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly nav = ITEMS;
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly filterQuery = signal('');

  protected readonly filteredNav = computed(() => {
    const query = this.filterQuery().trim().toLowerCase();
    if (!query) return ITEMS;
    return ITEMS.filter((item) => item.searchText.includes(query));
  });

  protected readonly filteredSections = computed<readonly NavSection[]>(() => {
    const visible = this.filteredNav();
    return DOCS_SECTIONS.map((section) => ({
      id: section.id,
      label: section.label,
      items: visible.filter((item) => item.section === section.id),
    })).filter((section) => section.items.length > 0);
  });

  /** Collapsed sidenav groups. Empty by default, so every group starts open. */
  private readonly collapsedSections = signal<ReadonlySet<DocsSectionId>>(new Set());

  protected isSectionCollapsed(id: DocsSectionId): boolean {
    return this.collapsedSections().has(id);
  }

  protected toggleSection(id: DocsSectionId): void {
    this.collapsedSections.update((collapsed) => {
      const next = new Set(collapsed);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected readonly isHandset = toSignal(
    this.breakpoints.observe('(max-width: 700px)').pipe(map((state) => state.matches)),
    { initialValue: this.breakpoints.isMatched('(max-width: 700px)') },
  );
  protected readonly navOpen = signal(!this.isHandset());

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => stripQuery(event.urlAfterRedirects)),
      startWith(stripQuery(this.router.url)),
    ),
    { initialValue: stripQuery(this.router.url) },
  );

  protected readonly currentIndex = computed(() => {
    const path = stripQuery(this.currentPath()).replace(/^\//, '');
    return SECTIONED_ITEMS.findIndex((item) => item.path === path);
  });

  protected readonly prevItem = computed(() => {
    const index = this.currentIndex();
    return index > 0 ? SECTIONED_ITEMS[index - 1] : null;
  });

  protected readonly nextItem = computed(() => {
    const index = this.currentIndex();
    return index >= 0 && index < SECTIONED_ITEMS.length - 1 ? SECTIONED_ITEMS[index + 1] : null;
  });

  constructor() {
    effect(() => this.navOpen.set(!this.isHandset()));
  }

  protected toggleNavigation(): void {
    this.navOpen.update((open) => !open);
  }

  protected toggleTheme(): void {
    snapThemeChange(() => this.theme.toggle());
  }

  protected closeNavigationOnHandset(): void {
    if (this.isHandset()) this.navOpen.set(false);
  }
}

/** Drop the query string from a router URL, tolerating an empty result. */
function stripQuery(url: string): string {
  return url.split('?')[0] ?? url;
}
