import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DocsCodeExampleComponent, type DocsCodeExample } from './docs-code-example';
import { DEMO_EXAMPLES } from './demo-examples';

// Only successful requests are cached. Rejected requests may be retried.
const sources = new Map<string, Promise<string>>();
function readSource(url: string): Promise<string> {
  const cached = sources.get(url);
  if (cached) return cached;
  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Source request failed (${response.status})`);
      const text = await response.text();
      if (
        !text.trim() ||
        (response.headers.get('content-type')?.includes('text/html') && !url.endsWith('.html'))
      ) {
        throw new Error('Source file is unavailable');
      }
      return text;
    })
    .catch((error: unknown) => {
      sources.delete(url);
      throw error;
    });
  sources.set(url, request);
  return request;
}

@Component({
  selector: 'lgr-docs-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, DocsCodeExampleComponent],
  host: { '[attr.data-demo-id]': 'demoId()' },
  styles: `
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      margin-block: 1rem;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.65rem 0;
    }
    .title {
      margin: 0;
      font-size: 1rem;
    }
    .framework {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      padding-top: 0.75rem;
    }
    select {
      font: inherit;
      padding: 0.5rem;
      max-width: 100%;
      color: var(--mat-sys-on-surface);
      background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline);
      border-radius: 0.3rem;
    }
    [hidden] {
      display: none !important;
    }
    :focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 3px;
    }
    lgr-docs-code-example {
      margin-top: 0.75rem;
    }
  `,
  template: `
    <div class="toolbar">
      <strong class="title">{{ example().title }}</strong>
      <button
        matButton="tonal"
        type="button"
        (click)="toggle()"
        [attr.aria-label]="(showCode() ? 'Show demo: ' : 'Show code: ') + example().title"
        [attr.aria-expanded]="showCode()"
        [attr.aria-controls]="demoId() + '-source'"
      >
        <mat-icon aria-hidden="true">{{ showCode() ? 'table_view' : 'code' }}</mat-icon>
        {{ showCode() ? 'Show demo' : 'Show code' }}
      </button>
    </div>
    <div [hidden]="showCode()" [inert]="showCode()"><ng-content /></div>
    <div [id]="demoId() + '-source'" [hidden]="!showCode()">
      <div class="framework">
        <label [for]="demoId() + '-framework'">Framework</label>
        <select
          [id]="demoId() + '-framework'"
          [value]="framework()"
          (change)="choose($any($event.target).value)"
        >
          @for (variant of example().variants; track variant.framework) {
            <option [value]="variant.framework">{{ variant.framework }}</option>
          }
        </select>
      </div>
      <p>Starting configuration. Edits in the demo do not change these files.</p>
      @if (loading()) {
        <p role="status">Loading example files…</p>
      }
      @if (failed()) {
        <p role="alert">Could not load the example files.</p>
        <button matButton="outlined" type="button" (click)="load()">Retry</button>
      }
      @for (variant of example().variants; track variant.framework) {
        @if (loaded()[variant.framework]; as files) {
          <lgr-docs-code-example
            [hidden]="framework() !== variant.framework || loading() || failed()"
            [heading]="variant.framework + ' files'"
            [examples]="files"
            [initialId]="variant.initialFile"
            copyAction="Copy file"
          />
        }
      }
    </div>
  `,
})
export class DocsDemoComponent {
  readonly demoId = input.required<string>();
  protected readonly example = computed(() => {
    const example = DEMO_EXAMPLES.find((entry) => entry.id === this.demoId());
    if (!example) throw new Error(`Unknown public demo: ${this.demoId()}`);
    return example;
  });
  private readonly document = inject(DOCUMENT);
  private readonly chosen = signal<string | undefined>(undefined);
  protected readonly framework = computed(
    () => this.chosen() ?? this.example().variants[0]!.framework,
  );
  protected readonly showCode = signal(false);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly loaded = signal<Record<string, DocsCodeExample[]>>({});
  private request = 0;

  protected toggle(): void {
    this.showCode.update((value) => !value);
    if (this.showCode()) void this.load();
  }
  protected choose(framework: string): void {
    this.chosen.set(framework);
    void this.load();
  }
  protected async load(): Promise<void> {
    const request = ++this.request;
    const variant = this.example().variants.find((entry) => entry.framework === this.framework())!;
    this.failed.set(false);
    this.loading.set(false);
    if (this.loaded()[variant.framework]) return;
    this.loading.set(true);
    try {
      const files = await Promise.all(
        variant.files.map(async (file) => ({
          id: file,
          label: file,
          filename: file,
          language: file.split('.').pop()!,
          code: await readSource(
            new URL(`examples/${variant.directory}/${file}`, this.document.baseURI).href,
          ),
        })),
      );
      this.loaded.update((loaded) => ({ ...loaded, [variant.framework]: files }));
    } catch {
      if (request === this.request) this.failed.set(true);
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }
}
