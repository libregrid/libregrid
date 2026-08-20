import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface DocsBoundaryResponsibility {
  title: string;
  description: string;
}

export interface DocsBoundaryContract {
  /** For example Request, Response, Event, or Storage. */
  kind: string;
  name: string;
  description: string;
}

let nextBackendBoundaryId = 0;

/** Explains exactly where LibreGrid stops and application/backend code begins. */
@Component({
  selector: 'lgr-docs-backend-boundary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  styles: `
    :host {
      display: block;
      margin-block: 1.5rem;
    }

    .boundary {
      padding: clamp(1rem, 3vw, 1.5rem);
      border: 1px solid
        color-mix(in srgb, var(--mat-sys-tertiary) 28%, var(--mat-sys-outline-variant));
      border-radius: 18px;
      background: color-mix(in srgb, var(--mat-sys-tertiary-container) 24%, var(--mat-sys-surface));
    }

    h2 {
      margin: 0;
      font-size: 1.3rem;
    }

    .summary {
      max-width: 58rem;
      margin: 0.35rem 0 0;
      color: var(--mat-sys-on-surface-variant);
    }

    .sides {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      gap: 0.75rem;
      align-items: stretch;
      margin-block-start: 1rem;
    }

    .side {
      padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 14px;
      background: var(--mat-sys-surface);
    }

    .side-heading {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }

    .side-heading mat-icon {
      color: var(--mat-sys-primary);
    }

    h3 {
      margin: 0;
      font-size: 1rem;
    }

    ul {
      display: grid;
      gap: 0.75rem;
      margin: 0.85rem 0 0;
      padding: 0;
      list-style: none;
    }

    li strong {
      display: block;
      font-size: 0.88rem;
    }

    li span {
      display: block;
      margin-block-start: 0.15rem;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.82rem;
      line-height: 1.5;
    }

    .connector {
      display: grid;
      width: 2.5rem;
      place-items: center;
      color: var(--mat-sys-primary);
    }

    .contracts-heading {
      margin-block-start: 1.25rem;
    }

    .contracts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
      gap: 0.65rem;
      margin-block-start: 0.75rem;
    }

    .contract {
      padding: 0.85rem;
      border-radius: 12px;
      background: var(--mat-sys-surface-container);
    }

    .contract-kind {
      color: var(--mat-sys-primary);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    .contract strong,
    .contract span {
      display: block;
    }

    .contract strong {
      margin-block-start: 0.2rem;
      font-family: 'SF Mono', 'Fira Code', 'Roboto Mono', monospace;
      font-size: 0.82rem;
    }

    .contract span:last-child {
      margin-block-start: 0.25rem;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.8rem;
      line-height: 1.45;
    }

    @media (max-width: 720px) {
      .sides {
        grid-template-columns: minmax(0, 1fr);
      }

      .connector {
        width: auto;
        height: 2rem;
      }

      .connector mat-icon {
        transform: rotate(90deg);
      }
    }
  `,
  template: `
    <section class="boundary" [attr.aria-labelledby]="headingId">
      <h2 [id]="headingId">{{ heading() }}</h2>
      <p class="summary">{{ summary() }}</p>

      <div class="sides">
        <article class="side">
          <div class="side-heading">
            <mat-icon aria-hidden="true">grid_view</mat-icon>
            <h3>{{ clientHeading() }}</h3>
          </div>
          <ul>
            @for (item of clientResponsibilities(); track item.title) {
              <li>
                <strong>{{ item.title }}</strong
                ><span>{{ item.description }}</span>
              </li>
            }
          </ul>
        </article>

        <div class="connector" aria-hidden="true"><mat-icon>sync_alt</mat-icon></div>

        <article class="side">
          <div class="side-heading">
            <mat-icon aria-hidden="true">dns</mat-icon>
            <h3>{{ backendHeading() }}</h3>
          </div>
          <ul>
            @for (item of backendResponsibilities(); track item.title) {
              <li>
                <strong>{{ item.title }}</strong
                ><span>{{ item.description }}</span>
              </li>
            }
          </ul>
        </article>
      </div>

      @if (contracts().length > 0) {
        <h3 class="contracts-heading">Integration contracts</h3>
        <div class="contracts">
          @for (contract of contracts(); track contract.kind + contract.name) {
            <article class="contract">
              <span class="contract-kind">{{ contract.kind }}</span>
              <strong>{{ contract.name }}</strong>
              <span>{{ contract.description }}</span>
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class DocsBackendBoundaryComponent {
  readonly heading = input('Where your backend connects');
  readonly summary = input.required<string>();
  readonly clientHeading = input('LibreGrid and your frontend');
  readonly backendHeading = input('Your API and data systems');
  readonly clientResponsibilities = input.required<readonly DocsBoundaryResponsibility[]>();
  readonly backendResponsibilities = input.required<readonly DocsBoundaryResponsibility[]>();
  readonly contracts = input<readonly DocsBoundaryContract[]>([]);

  protected readonly headingId = `lgr-backend-boundary-${nextBackendBoundaryId++}`;
}
