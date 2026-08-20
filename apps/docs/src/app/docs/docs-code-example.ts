import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DocsCodeExample {
  /** Stable id used for tab selection and accessible relationships. */
  id: string;
  /** Short audience or technology label, for example "Angular" or "Backend". */
  label: string;
  /** Language label shown above the code. */
  language: string;
  /** Complete, directly copyable example. */
  code: string;
  /** Optional source-style filename shown beside the language. */
  filename?: string;
  /** One sentence explaining where this code belongs in an application. */
  description?: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

let nextCodeExampleId = 0;

/**
 * Accessible, copyable code tabs for feature documentation.
 *
 * The component intentionally accepts plain text rather than HTML so examples
 * cannot inject markup. Route authors can provide Angular, framework-neutral,
 * and backend variants without duplicating the surrounding UI.
 */
@Component({
  selector: 'lgr-docs-code-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  styles: `
    :host {
      display: block;
      min-width: 0;
      margin-block: 1.5rem;
    }

    .code-example {
      overflow: hidden;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      background: var(--mat-sys-surface-container-low);
    }

    .heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1rem 0.75rem;
    }

    .heading-copy {
      min-width: 0;
    }

    h2 {
      margin: 0;
      font-size: 1.1rem;
    }

    .description {
      margin: 0.3rem 0 0;
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.9rem;
    }

    .copy-action {
      flex: 0 0 auto;
    }

    .copy-action mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }

    .tabs {
      display: flex;
      gap: 0.25rem;
      padding: 0 0.75rem 0.75rem;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .tab {
      flex: 0 0 auto;
      color: var(--mat-sys-on-surface-variant);
    }

    .tab.is-active {
      color: var(--mat-sys-on-secondary-container);
      background: var(--mat-sys-secondary-container);
    }

    .panel-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-height: 2.5rem;
      padding: 0.55rem 1rem;
      border-top: 1px solid var(--mat-sys-outline-variant);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      color: var(--mat-sys-on-surface-variant);
      background: var(--mat-sys-surface-container);
      font-family: 'SF Mono', 'Fira Code', 'Roboto Mono', monospace;
      font-size: 0.78rem;
    }

    .copy-status {
      min-width: 5rem;
      text-align: end;
      font-family: inherit;
      color: var(--mat-sys-primary);
    }

    pre {
      max-width: 100%;
      max-height: 36rem;
      margin: 0;
      padding: 1rem;
      overflow: auto;
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      tab-size: 2;
    }

    code {
      padding: 0;
      border: 0;
      background: transparent;
      font-size: 0.84rem;
      line-height: 1.65;
      white-space: pre;
    }

    .empty {
      margin: 0;
      padding: 1rem;
      color: var(--mat-sys-on-surface-variant);
    }

    @media (max-width: 600px) {
      .heading {
        align-items: stretch;
        flex-direction: column;
      }

      .copy-action {
        align-self: flex-start;
      }
    }
  `,
  template: `
    <section class="code-example" [attr.aria-labelledby]="headingId">
      <div class="heading">
        <div class="heading-copy">
          <h2 [id]="headingId">{{ heading() }}</h2>
          @if (active()?.description; as description) {
            <p class="description">{{ description }}</p>
          }
        </div>
        <button
          matButton="tonal"
          type="button"
          class="copy-action"
          [disabled]="!active()"
          (click)="copyActiveExample()"
          [attr.aria-label]="copyLabel()"
        >
          <mat-icon aria-hidden="true">{{
            copyState() === 'copied' ? 'check' : 'content_copy'
          }}</mat-icon>
          {{ copyState() === 'copied' ? 'Copied' : 'Copy code' }}
        </button>
      </div>

      @if (examples().length > 0) {
        <div class="tabs" role="tablist" [attr.aria-label]="heading() + ' examples'">
          @for (example of examples(); track example.id; let index = $index) {
            <button
              matButton="text"
              type="button"
              class="tab"
              role="tab"
              [class.is-active]="active()?.id === example.id"
              [id]="tabId(example.id)"
              [attr.aria-selected]="active()?.id === example.id"
              [attr.aria-controls]="panelId"
              [attr.tabindex]="active()?.id === example.id ? 0 : -1"
              (click)="select(example.id)"
              (keydown)="onTabKeydown($event, index)"
            >
              {{ example.label }}
            </button>
          }
        </div>

        @if (active(); as example) {
          <div [id]="panelId" role="tabpanel" [attr.aria-labelledby]="tabId(example.id)">
            <div class="panel-meta">
              <span>{{ example.filename ?? example.language }}</span>
              <span class="copy-status" aria-live="polite">{{ copyStatusText() }}</span>
            </div>
            <pre
              tabindex="0"
            ><code [attr.data-language]="example.language">{{ example.code }}</code></pre>
          </div>
        }
      } @else {
        <p class="empty">No examples are available yet.</p>
      }
    </section>
  `,
})
export class DocsCodeExampleComponent implements OnDestroy {
  readonly heading = input('Implementation');
  readonly examples = input.required<readonly DocsCodeExample[]>();

  protected readonly copyState = signal<CopyState>('idle');
  protected readonly instanceId = `lgr-code-example-${nextCodeExampleId++}`;
  protected readonly headingId = `${this.instanceId}-heading`;
  protected readonly panelId = `${this.instanceId}-panel`;

  private readonly document = inject(DOCUMENT);
  private readonly activeId = signal<string | undefined>(undefined);
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

  protected active(): DocsCodeExample | undefined {
    const examples = this.examples();
    return examples.find((example) => example.id === this.activeId()) ?? examples[0];
  }

  protected select(id: string): void {
    this.activeId.set(id);
    this.copyState.set('idle');
  }

  protected tabId(id: string): string {
    return `${this.instanceId}-tab-${id}`;
  }

  protected copyLabel(): string {
    const example = this.active();
    if (!example) return 'No code to copy';
    return this.copyState() === 'copied'
      ? `${example.label} code copied`
      : `Copy ${example.label} code`;
  }

  protected copyStatusText(): string {
    if (this.copyState() === 'copied') return 'Copied to clipboard';
    if (this.copyState() === 'failed') return 'Copy failed';
    return '';
  }

  protected async copyActiveExample(): Promise<void> {
    const example = this.active();
    if (!example) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(example.code);
      } else {
        this.fallbackCopy(example.code);
      }
      this.setCopyResult('copied');
    } catch {
      try {
        this.fallbackCopy(example.code);
        this.setCopyResult('copied');
      } catch {
        this.setCopyResult('failed');
      }
    }
  }

  protected onTabKeydown(event: KeyboardEvent, currentIndex: number): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const examples = this.examples();
    if (examples.length === 0) return;

    let nextIndex = currentIndex;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = examples.length - 1;
    if (event.key === 'ArrowLeft')
      nextIndex = (currentIndex - 1 + examples.length) % examples.length;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % examples.length;

    const next = examples[nextIndex];
    if (!next) return;
    this.select(next.id);

    const tabList = (event.currentTarget as HTMLElement).parentElement;
    queueMicrotask(() =>
      tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus(),
    );
  }

  ngOnDestroy(): void {
    if (this.resetTimer !== undefined) clearTimeout(this.resetTimer);
  }

  private fallbackCopy(text: string): void {
    const textarea = this.document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    this.document.body.appendChild(textarea);
    textarea.select();
    const copied = this.document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Copy command was rejected');
  }

  private setCopyResult(state: CopyState): void {
    this.copyState.set(state);
    if (this.resetTimer !== undefined) clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => this.copyState.set('idle'), 2_000);
  }
}
