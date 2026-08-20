import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface DocsDemoStep {
  title: string;
  instruction: string;
  /** Observable outcome that proves the feature did the work. */
  expected?: string;
  /** Material Symbols icon name. */
  icon?: string;
}

let nextDemoGuideId = 0;

/** Task-oriented instructions placed immediately before or beside a live demo. */
@Component({
  selector: 'lgr-docs-demo-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  styles: `
    :host {
      display: block;
      margin-block: 1.5rem;
    }

    .guide {
      padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      background: var(--mat-sys-surface-container-low);
    }

    .heading {
      margin: 0;
      font-size: 1.2rem;
    }

    .intro {
      margin: 0.3rem 0 0;
      color: var(--mat-sys-on-surface-variant);
    }

    ol {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
      gap: 0.75rem;
      margin: 1rem 0 0;
      padding: 0;
      list-style: none;
      counter-reset: demo-step;
    }

    li {
      position: relative;
      min-width: 0;
      padding: 1rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 14px;
      background: var(--mat-sys-surface);
      counter-increment: demo-step;
    }

    .step-heading {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }

    .number {
      display: inline-grid;
      flex: 0 0 auto;
      width: 1.65rem;
      height: 1.65rem;
      place-items: center;
      border-radius: 50%;
      color: var(--mat-sys-on-primary-container);
      background: var(--mat-sys-primary-container);
      font-size: 0.78rem;
      font-weight: 700;
    }

    .number::before {
      content: counter(demo-step);
    }

    mat-icon {
      margin-inline-start: auto;
      color: var(--mat-sys-primary);
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
    }

    h3 {
      margin: 0;
      font-size: 0.95rem;
    }

    .instruction {
      margin: 0.65rem 0 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.88rem;
      line-height: 1.55;
    }

    .expected {
      margin: 0.65rem 0 0;
      padding-block-start: 0.65rem;
      border-top: 1px solid var(--mat-sys-outline-variant);
      font-size: 0.82rem;
      line-height: 1.5;
    }

    .expected strong {
      color: var(--mat-sys-primary);
    }
  `,
  template: `
    <section class="guide" [attr.aria-labelledby]="headingId">
      <h2 class="heading" [id]="headingId">{{ heading() }}</h2>
      @if (intro()) {
        <p class="intro">{{ intro() }}</p>
      }
      <ol>
        @for (step of steps(); track step.title) {
          <li>
            <div class="step-heading">
              <span class="number" aria-hidden="true"></span>
              <h3>{{ step.title }}</h3>
              @if (step.icon) {
                <mat-icon aria-hidden="true">{{ step.icon }}</mat-icon>
              }
            </div>
            <p class="instruction">{{ step.instruction }}</p>
            @if (step.expected) {
              <p class="expected"><strong>Look for:</strong> {{ step.expected }}</p>
            }
          </li>
        }
      </ol>
    </section>
  `,
})
export class DocsDemoGuideComponent {
  readonly heading = input('Try the feature');
  readonly intro = input('Follow these steps to see the important behavior in the live demo.');
  readonly steps = input.required<readonly DocsDemoStep[]>();

  protected readonly headingId = `lgr-demo-guide-${nextDemoGuideId++}`;
}
