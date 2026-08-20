import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface DocsFeatureValue {
  /** Material Symbols icon name. */
  icon: string;
  title: string;
  description: string;
}

/** Product-facing feature introduction shared by every guide. */
@Component({
  selector: 'lgr-docs-feature-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  styles: `
    :host {
      display: block;
      margin-block-end: 1.5rem;
    }

    .header {
      position: relative;
      overflow: hidden;
      padding: clamp(1.35rem, 4vw, 2.4rem);
      border: 1px solid
        color-mix(in srgb, var(--mat-sys-primary) 18%, var(--mat-sys-outline-variant));
      border-radius: 20px;
      background:
        radial-gradient(
          circle at 92% 0%,
          color-mix(in srgb, var(--mat-sys-primary) 13%, transparent),
          transparent 35%
        ),
        var(--mat-sys-surface-container-low);
    }

    .eyebrow {
      margin: 0 0 0.45rem;
      color: var(--mat-sys-primary);
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 54rem;
      margin: 0;
      font-size: clamp(2rem, 5vw, 3.2rem);
      letter-spacing: -0.04em;
    }

    .summary {
      max-width: 52rem;
      margin: 0.8rem 0 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: clamp(1rem, 2vw, 1.16rem);
      line-height: 1.65;
    }

    .packages,
    .audiences {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-block-start: 1rem;
    }

    .package,
    .audience {
      display: inline-flex;
      align-items: center;
      min-height: 1.9rem;
      padding-inline: 0.7rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
    }

    .package {
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
      font-family: 'SF Mono', 'Fira Code', 'Roboto Mono', monospace;
    }

    .audience {
      color: var(--mat-sys-on-secondary-container);
      background: var(--mat-sys-secondary-container);
    }

    .values {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
      gap: 0.75rem;
      margin-block-start: 1.35rem;
    }

    .value {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.7rem;
      padding: 0.9rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 14px;
      background: color-mix(in srgb, var(--mat-sys-surface) 86%, transparent);
    }

    .value mat-icon {
      color: var(--mat-sys-primary);
    }

    .value h2 {
      margin: 0;
      font-size: 0.95rem;
    }

    .value p {
      margin: 0.2rem 0 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.84rem;
      line-height: 1.5;
    }
  `,
  template: `
    <header class="header">
      <p class="eyebrow">{{ eyebrow() }}</p>
      <h1>{{ title() }}</h1>
      <p class="summary">{{ summary() }}</p>

      @if (packages().length > 0) {
        <div class="packages" aria-label="Packages used">
          @for (packageName of packages(); track packageName) {
            <span class="package">{{ packageName }}</span>
          }
        </div>
      }

      @if (audiences().length > 0) {
        <div class="audiences" aria-label="Intended audiences">
          @for (audience of audiences(); track audience) {
            <span class="audience">{{ audience }}</span>
          }
        </div>
      }

      @if (values().length > 0) {
        <div class="values" aria-label="Customer value">
          @for (value of values(); track value.title) {
            <article class="value">
              <mat-icon aria-hidden="true">{{ value.icon }}</mat-icon>
              <div>
                <h2>{{ value.title }}</h2>
                <p>{{ value.description }}</p>
              </div>
            </article>
          }
        </div>
      }
    </header>
  `,
})
export class DocsFeatureHeaderComponent {
  readonly eyebrow = input('Feature guide');
  readonly title = input.required<string>();
  readonly summary = input.required<string>();
  readonly packages = input<readonly string[]>([]);
  readonly audiences = input<readonly string[]>(['Product teams', 'Application developers']);
  readonly values = input<readonly DocsFeatureValue[]>([]);
}
