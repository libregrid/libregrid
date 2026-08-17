import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Phase {
  num: string;
  label: string;
}

const PHASES: Phase[] = [
  { num: '00', label: 'Foundation & guardrails' },
  { num: '01', label: 'Menus & side bar' },
  { num: '02', label: 'Row grouping & aggregation' },
  { num: '03', label: 'Columns tool panel' },
  { num: '04', label: 'Selection, clipboard & status bar' },
  { num: '05', label: 'Excel export' },
  { num: '06', label: 'Set/Multi filter & filters tool panel' },
  { num: '07', label: 'Server-Side Row Model' },
  { num: '08', label: 'Pivot' },
  { num: '09', label: 'SSRM grouping/pivot & viewport model' },
  { num: '10', label: 'Tree data & master/detail' },
  { num: '11', label: 'Advanced filter, find & rich select' },
  { num: '12', label: 'Integrated charts & sparklines' },
  { num: '13', label: 'Long tail & 1.0 hardening' },
];

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

const INSTALL_COMMAND = 'npm install ag-grid-community @libregrid/all';

@Component({
  selector: 'lgr-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule, MatTooltipModule],
  styles: `
    /* ── Hero ───────────────────────────────────── */
    .hero {
      position: relative;
      overflow: hidden;
      padding: clamp(2.5rem, 6vw, 5rem) clamp(1.5rem, 4vw, 3rem);
      border-radius: 24px;
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--mat-sys-primary) 12%, var(--mat-sys-surface)),
        color-mix(in srgb, var(--mat-sys-tertiary) 8%, var(--mat-sys-surface))
      );
      border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 12%, var(--mat-sys-outline-variant));
    }

    .hero-glow {
      position: absolute;
      top: -30%;
      right: -15%;
      width: 50%;
      height: 160%;
      border-radius: 50%;
      background: radial-gradient(
        circle,
        color-mix(in srgb, var(--mat-sys-primary) 12%, transparent) 0%,
        transparent 70%
      );
      pointer-events: none;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      max-width: 780px;
    }

    .hero h1 {
      font-size: clamp(2rem, 5vw, 3.25rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      margin: 0 0 0.75rem;
      line-height: 1.12;
    }

    .hero h1 .highlight {
      background: linear-gradient(
        135deg,
        var(--mat-sys-primary),
        color-mix(in srgb, var(--mat-sys-tertiary) 60%, var(--mat-sys-primary))
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
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
      font-family: 'Inter', 'Roboto', system-ui, sans-serif;
      font-weight: 600;
    }

    /* ── Badge bar ──────────────────────────────── */
    .badge-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      justify-content: center;
      margin: 1.5rem 0 2.25rem;
    }

    .badge-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      padding: 0.45rem 1rem;
      border-radius: 99px;
      border: 1px solid var(--mat-sys-outline-variant);
    }

    .badge-item mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: var(--mat-sys-primary);
    }

    /* ── Install ────────────────────────────────── */
    .install {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 1.5rem 0 2.25rem;
      padding: 0.85rem 1.1rem;
      border-radius: 14px;
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
      border-radius: 0 12px 12px 0;
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
      border-radius: 16px;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid var(--mat-sys-outline-variant);
      transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
    }

    .feature-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px color-mix(in srgb, var(--mat-sys-primary) 12%, transparent);
      border-color: color-mix(in srgb, var(--mat-sys-primary) 30%, var(--mat-sys-outline-variant));
    }

    .feature-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
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

    /* ── Roadmap ────────────────────────────────── */
    .roadmap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 2rem 0 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .roadmap-header h2 { margin: 0; }

    .roadmap-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.9rem;
    }

    .roadmap-progress progress {
      width: 140px;
      height: 6px;
      border-radius: 99px;
      border: none;
      background: var(--mat-sys-surface-container-high);
      accent-color: var(--mat-sys-primary);
    }
    .roadmap-progress progress::-webkit-progress-bar {
      background: var(--mat-sys-surface-container-high);
      border-radius: 99px;
    }
    .roadmap-progress progress::-webkit-progress-value {
      background: linear-gradient(90deg, var(--mat-sys-primary), color-mix(in srgb, var(--mat-sys-tertiary) 50%, var(--mat-sys-primary)));
      border-radius: 99px;
    }

    .roadmap {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
      gap: 0.5rem;
      margin: 0 0 2rem;
    }

    .phase-card {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.6rem 0.85rem;
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
      border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 20%, var(--mat-sys-outline-variant));
      font-size: 0.85rem;
      font-weight: 500;
      transition: border-color 120ms ease, background 120ms ease;
    }

    .phase-check {
      color: var(--mat-sys-primary);
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }

    /* ── CTA section ────────────────────────────── */
    .cta-section {
      text-align: center;
      padding: 2rem;
      margin: 2rem 0 1rem;
      border-radius: 20px;
      background: color-mix(in srgb, var(--mat-sys-primary) 6%, var(--mat-sys-surface));
      border: 1px solid color-mix(in srgb, var(--mat-sys-primary) 12%, var(--mat-sys-outline-variant));
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
        <div class="hero-glow"></div>
        <div class="hero-content">
          <h1>
            Enterprise grid features.<br />
            <span class="highlight">Free and open source.</span>
          </h1>
          <p class="hero-sub">
            LibreGrid adds the AG Grid Enterprise feature set to the Community
            edition you already run — menus, grouping, pivot, server-side rows,
            charts, Excel export and more. No licence key. No fork. MIT licensed.
          </p>
          <div class="hero-actions">
            <a mat-flat-button color="primary" routerLink="/row-grouping">See a live grid</a>
            <a mat-stroked-button routerLink="/validation">Try every feature</a>
            <a mat-stroked-button href="https://github.com/libregrid/libregrid" target="_blank">
              <mat-icon>open_in_new</mat-icon>
              GitHub
            </a>
          </div>
        </div>
      </div>

      <!-- Badge bar -->
      <div class="badge-bar">
        <span class="badge-item"><mat-icon>check_circle</mat-icon> {{ PHASES.length }}/{{ PHASES.length }} phases shipped</span>
        <span class="badge-item"><mat-icon>verified</mat-icon> v1.0 on npm</span>
        <span class="badge-item"><mat-icon>tag</mat-icon> ag-grid-community 36.1</span>
        <span class="badge-item"><mat-icon>lock_open</mat-icon> MIT licensed</span>
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

      <!-- Roadmap -->
      <div class="roadmap-header">
        <h2>Roadmap — complete</h2>
        <div class="roadmap-progress">
          <progress [value]="PHASES.length" [max]="PHASES.length"></progress>
          <span>{{ PHASES.length }} / {{ PHASES.length }}</span>
        </div>
      </div>
      <div class="roadmap">
        @for (phase of PHASES; track phase.num) {
          <div class="phase-card">
            <mat-icon class="phase-check">check_circle</mat-icon>
            <span>{{ phase.label }}</span>
          </div>
        }
      </div>

      <!-- CTA -->
      <div class="cta-section">
        <h2>Ready to see it in action?</h2>
        <p>
          Every feature has a live demo on this site. Start with grouping, or
          jump straight to whichever feature matters most to you.
        </p>
        <div class="hero-actions">
          <a mat-flat-button color="primary" routerLink="/row-grouping">Row grouping</a>
          <a mat-flat-button color="primary" routerLink="/charts">Charts</a>
          <a mat-stroked-button routerLink="/grid">Grid</a>
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
  protected readonly PHASES = PHASES;
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
