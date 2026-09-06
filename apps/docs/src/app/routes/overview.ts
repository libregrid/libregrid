import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface FeatureCard {
  icon: string;
  title: string;
  desc: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: 'swap_horiz',
    title: 'Drop-in replacement',
    desc: 'Swap Enterprise imports for @libregrid equivalents. Same grid options, same API contracts — your code barely changes.',
  },
  {
    icon: 'lock_open',
    title: 'MIT, no licence key',
    desc: 'Free for commercial use. No seats, no keys, no tracking. Just open source you can vendor and audit.',
  },
  {
    icon: 'extension',
    title: 'Install only what you use',
    desc: 'Every feature is its own package. You never pay bundle cost for a feature your app never touches.',
  },
  {
    icon: 'integration_instructions',
    title: 'Not a fork',
    desc: 'Built on stock ag-grid-community. Install both packages and keep your existing grid instance and events.',
  },
];

const INSTALL_COMMAND = 'npm install ag-grid-community @libregrid/angular @libregrid/row-grouping';

@Component({
  selector: 'lgr-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule],
  styles: `
    /* ── Hero ───────────────────────────────────── */
    .hero {
      padding: clamp(2.5rem, 6vw, 5rem) clamp(1.5rem, 4vw, 3rem);
      border-radius: var(--lgr-radius-lg);
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .hero-content {
      max-width: 780px;
    }

    .hero h1 {
      font-size: clamp(2rem, 5vw, 3.25rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      margin: 0 0 0.75rem;
      line-height: 1.12;
    }

    .hero-sub {
      font-size: clamp(1rem, 2vw, 1.22rem);
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.6;
      margin: 0 0 1.75rem;
      max-width: 640px;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .hero-actions a {
      font-family: 'Roboto', system-ui, sans-serif;
      font-weight: 600;
    }

    /* ── Install ────────────────────────────────── */
    .install {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 1.5rem 0 2.25rem;
      padding: 0.85rem 1.1rem;
      border-radius: var(--lgr-radius-md);
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
      overflow-x: auto;
    }

    .install .prompt {
      color: var(--mat-sys-primary);
      font-weight: 600;
      user-select: none;
      flex-shrink: 0;
    }

    .install code {
      flex: 1 1 auto;
      white-space: nowrap;
      border: none;
      background: transparent;
      font-size: 0.9rem;
      color: var(--mat-sys-on-surface);
    }

    /* ── Callout ────────────────────────────────── */
    .note {
      border-left: 4px solid var(--mat-sys-primary);
      padding: 0.75rem 0 0.75rem 1.25rem;
      margin: 1.5rem 0;
      background: var(--mat-sys-surface-container-low);
      border-radius: 0 var(--lgr-radius-md) var(--lgr-radius-md) 0;
    }
    .note p { margin: 0.3rem 0; }

    /* ── Feature grid ───────────────────────────── */
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr));
      gap: 1rem;
      margin: 1.25rem 0 2.25rem;
    }

    .feature-card {
      padding: 1.5rem;
      border-radius: var(--lgr-radius-md);
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .feature-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: var(--lgr-radius-sm);
      background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent);
      color: var(--mat-sys-primary);
      margin-bottom: 0.75rem;
    }

    .feature-icon mat-icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
    }

    .feature-card h3 {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0 0 0.4rem;
      letter-spacing: -0.01em;
    }

    .feature-card p {
      font-size: 0.85rem;
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.55;
    }

    /* ── CTA section ────────────────────────────── */
    .cta-section {
      text-align: center;
      padding: 2rem;
      margin: 2rem 0 1rem;
      border-radius: var(--lgr-radius-lg);
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .cta-section h2 { margin-top: 0; }

    .cta-section p {
      color: var(--mat-sys-on-surface-variant);
      max-width: 480px;
      margin: 0 auto 1.25rem;
    }

    .cta-section .hero-actions { justify-content: center; }

    /* ── Licence block ─────────────────────────── */
    .licence {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--mat-sys-outline-variant);
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  template: `
    <div class="lgr-page">
      <!-- Hero -->
      <div class="hero">
        <div class="hero-content">
          <h1>
            Enterprise grid features.<br />
            Free and open source.
          </h1>
          <p class="hero-sub">
            LibreGrid adds an enterprise feature set to the AG Grid Community
            edition you already run — menus, grouping, pivot, server-side rows,
            charts, Excel export and more. No licence key. No fork. MIT licensed.
          </p>
          <div class="hero-actions">
            <a matButton="filled" routerLink="/getting-started">Get started</a>
            <a matButton="tonal" routerLink="/packages">Browse features</a>
            <a matButton="tonal" href="https://github.com/libregrid/libregrid" target="_blank">
              <mat-icon>open_in_new</mat-icon>
              GitHub
            </a>
          </div>
        </div>
      </div>

      <!-- Install -->
      <h2>Install it like any other package</h2>
      <div class="install">
        <span class="prompt">$</span>
        <code>{{ installCommand }}</code>
        <button
          mat-icon-button
          (click)="copyInstall()"
          [attr.aria-label]="copied() ? 'Copied' : 'Copy install command'"
          matTooltip="Copy to clipboard"
        >
          <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
        </button>
      </div>

      <!-- Why -->
      <h2>Why LibreGrid</h2>
      <div class="feature-grid">
        @for (feature of FEATURES; track feature.title) {
          <div class="feature-card">
            <div class="feature-icon">
              <mat-icon>{{ feature.icon }}</mat-icon>
            </div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.desc }}</p>
          </div>
        }
      </div>

      <!-- How it works -->
      <h2>How is this possible?</h2>
      <div class="note">
        <p>
          AG Grid Community already ships the <strong>seams</strong> for its
          Enterprise features — a module registry, reserved service slots, and the
          same public contracts — under MIT. LibreGrid plugs real implementations
          into those seams, so each package drops into your existing grid and
          behaves the way you'd expect it to.
        </p>
        <p>
          Before adopting, read the
          <a href="https://github.com/libregrid/libregrid/blob/main/docs/guides/migration-guide.md">migration guide</a>
          and the
          <a href="https://github.com/libregrid/libregrid/blob/main/docs/parity/gap-list.md">honest gap list</a> —
          they state exactly what's identical, what differs, and what's not yet shipped.
        </p>
      </div>

      <!-- CTA -->
      <div class="cta-section">
        <h2>Ready to see it in action?</h2>
        <p>
          Every feature has a live demo on this site. Start with the quick start,
          or jump straight to whichever feature matters most to you.
        </p>
        <div class="hero-actions">
          <a matButton="filled" routerLink="/getting-started">Get started</a>
          <a matButton="tonal" routerLink="/packages">Browse features</a>
        </div>
      </div>

      <!-- Licence -->
      <div class="licence">
        <p>
          <strong>MIT licensed.</strong> LibreGrid is an independent open-source project.
          It is not affiliated with, endorsed by, or sponsored by AG Grid Ltd.
          "AG Grid" is a trademark of AG Grid Ltd.
        </p>
      </div>
    </div>
  `,
})
export class Overview {
  protected readonly FEATURES = FEATURES;
  protected readonly installCommand = INSTALL_COMMAND;
  protected readonly copied = signal(false);

  protected copyInstall(): void {
    const done = () => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(INSTALL_COMMAND).then(done).catch(() => fallbackCopy(INSTALL_COMMAND, done));
    } else {
      fallbackCopy(INSTALL_COMMAND, done);
    }
  }
}

function fallbackCopy(text: string, done: () => void): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    textarea.remove();
    done();
  }
}
