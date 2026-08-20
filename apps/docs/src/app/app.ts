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
import { NAV } from './routes';
import { ThemePicker } from './theme-picker';
import { DOCS_SECTIONS, featureForPath, type DocsSectionId } from './docs/feature-catalog';
import { DocsDemoGuideComponent, DocsFeatureHeaderComponent, DocsRouteCompanionComponent, ROUTE_GUIDES } from './docs';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  section: DocsSectionId;
  searchText: string;
}

const NAV_ICONS: Record<string, string> = {
  '': 'grid_view',
  'grid': 'table_chart',
  'menus': 'menu',
  'side-bar': 'vertical_split',
  'toolbar': 'build',
  'row-grouping': 'folder',
  'pivot': 'pivot_table_chart',
  'columns': 'view_column',
  'filters': 'filter_alt',
  'selection': 'select_all',
  'excel-export': 'file_download',
  'server-side': 'cloud',
  'server-side-advanced': 'analytics',
  'server-side-selection': 'playlist_add_check',
  'viewport': 'visibility',
  'tree-data': 'account_tree',
  'master-detail': 'stacked_bar_chart',
  'advanced-filter-find': 'manage_search',
  'batch-edit': 'edit_note',
  'charts': 'insert_chart',
  'row-numbers': 'format_list_numbered',
  'column-header-edit': 'title',
  'notes': 'sticky_note_2',
  'angular': 'code',
  'api': 'api',
};

const ITEMS: NavItem[] = NAV.map((item) => {
  const feature = featureForPath(item.path);
  return {
    ...item,
    icon: feature?.icon ?? NAV_ICONS[item.path] ?? 'circle',
    section: feature?.section ?? 'reference',
    searchText: [item.label, ...(feature?.packages ?? []), ...(feature?.keywords ?? [])]
      .join(' ')
      .toLowerCase(),
  };
});

interface NavSection {
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
    DocsDemoGuideComponent,
    DocsFeatureHeaderComponent,
    DocsRouteCompanionComponent,
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
      background: color-mix(in srgb, var(--mat-sys-surface) 94%, transparent);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .lgr-toolbar mat-toolbar {
      background: transparent;
      gap: 0.25rem;
    }

    .lgr-brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-family: 'Inter', 'Roboto', system-ui, sans-serif;
      font-weight: 700;
      font-size: 1.12rem;
      letter-spacing: -0.02em;
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
      border-radius: 10px;
      background: linear-gradient(
        135deg,
        var(--mat-sys-primary),
        color-mix(in srgb, var(--mat-sys-tertiary) 70%, var(--mat-sys-primary))
      );
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
      font-family: 'Inter', 'Roboto', system-ui, sans-serif;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--mat-sys-on-surface-variant);
      padding: 0.75rem 0.75rem 0.4rem;
    }

    .lgr-nav-list {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .lgr-nav-item {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.5rem 0.75rem;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      border: none;
      background: transparent;
      cursor: pointer;
      width: 100%;
      transition: background 120ms ease, color 120ms ease;
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

    .lgr-nav-item mat-icon {
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
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

    .lgr-route-frame {
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: clamp(1rem, 3vw, 2.5rem) clamp(1.5rem, 3vw, 2.5rem) 0;
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
      border-radius: 12px;
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 500;
      transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease;
    }

    .lgr-pager-link:hover {
      border-color: var(--mat-sys-primary);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px color-mix(in srgb, var(--mat-sys-primary) 12%, transparent);
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
            (click)="theme.toggle()"
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

          @for (section of filteredSections(); track section.label) {
            <div class="lgr-nav-section-title">{{ section.label }}</div>
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
                  <mat-icon>{{ item.icon }}</mat-icon>
                  {{ item.label }}
                </a>
              }
            </div>
          }
          @if (filteredNav().length === 0) {
            <div class="lgr-nav-empty">No features match "{{ filterQuery() }}".</div>
          }
        </nav>
      </mat-sidenav>

      <mat-sidenav-content>
        <main id="main-content" [class.lgr-guided-route]="currentGuide() !== undefined">
          @if (currentFeature(); as feature) {
            @if (currentGuide(); as guide) {
              <div class="lgr-route-frame">
                <lgr-docs-feature-header
                  [title]="feature.label"
                  [summary]="feature.outcome"
                  [packages]="feature.packages"
                  [values]="featureValues()"
                />
                <lgr-docs-demo-guide [intro]="guide.intro" [steps]="guide.steps" />
              </div>
            }
          }
          <router-outlet />
          @if (currentFeature(); as feature) {
            @if (currentGuide(); as guide) {
              <lgr-docs-route-companion [feature]="feature" [guide]="guide" />
            }
          }
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
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class App {
  protected readonly theme = inject(LibreGridThemeService);
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
      label: section.label,
      items: visible.filter((item) => item.section === section.id),
    })).filter((section) => section.items.length > 0);
  });

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
    return ITEMS.findIndex((item) => item.path === path);
  });

  protected readonly currentFeature = computed(() => {
    const path = stripQuery(this.currentPath()).replace(/^\//, '');
    return featureForPath(path);
  });

  protected readonly currentGuide = computed(() => {
    const feature = this.currentFeature();
    return feature ? ROUTE_GUIDES[feature.path] : undefined;
  });

  protected readonly featureValues = computed(() => {
    const feature = this.currentFeature();
    if (!feature) return [];
    const dataBoundary = feature.boundary !== 'Browser';
    return [
      {
        icon: 'workspace_premium',
        title: 'Customer outcome',
        description: feature.outcome,
      },
      {
        icon: dataBoundary ? 'sync_alt' : 'extension',
        title: dataBoundary ? 'Application data boundary' : 'Composable browser capability',
        description: dataBoundary
          ? 'The guide identifies the request, response, and ownership that belong in your systems.'
          : 'Install and register only this capability without adding unrelated product surface.',
      },
    ];
  });

  protected readonly prevItem = computed(() => {
    const index = this.currentIndex();
    return index > 0 ? ITEMS[index - 1] : null;
  });

  protected readonly nextItem = computed(() => {
    const index = this.currentIndex();
    return index >= 0 && index < ITEMS.length - 1 ? ITEMS[index + 1] : null;
  });

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

/** Drop the query string from a router URL, tolerating an empty result. */
function stripQuery(url: string): string {
  return url.split('?')[0] ?? url;
}
