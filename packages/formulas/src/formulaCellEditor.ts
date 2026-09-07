import { validateExpression } from './expression';
import type { BeanCollection, CellRange, ICellEditor, ICellEditorParams } from 'ag-grid-community';
import type { FormulaInputManager } from './formulaInputManager';
import type { FormulaService } from './formulaService';

export interface FormulaCellEditorParams<TData = unknown, TValue = unknown> extends ICellEditorParams<TData, TValue> {
  /** Validate the formula on every change and surface parse errors while editing. */
  validateFormulas?: boolean;
}

type Params<TData = unknown, TValue = unknown> = FormulaCellEditorParams<TData, TValue> & {
  value?: TValue | null;
  stopEditing?(suppressNavigateAfterEdit?: boolean): void;
};

interface TokenSpan {
  text: string;
  cls: string | null;
}

const TOKEN_RE = /("(?:[^"]*)"|'(?:[^']*)')|(\[[^\]]*\])|(\$?[A-Za-z_][A-Za-z0-9_$]*)|([0-9]+(?:\.[0-9]+)?)|([+\-*/^&=<>!%(),:$])/g;
const CELL_TEXT_RE = /^\$?[A-Za-z]{1,3}\$?[0-9]+$/;
const MAX_SUGGESTIONS = 8;

let nextEditorId = 1;

/**
 * The tokenising formula cell editor — Community's default editor for
 * `allowFormula` columns (registered as `agFormulaCellEditor`).
 *
 * - Shows references, functions, numbers, strings and operators with
 *   token colouring while typing (overlay behind a transparent input).
 * - Function autocomplete while typing a name; keyboard navigable.
 * - `validateFormulas: true` validates on every change; errors show inline.
 * - Referenced cells/ranges highlight through the Cell Selection module when
 *   registered (`cellSelection` enabled); the editor degrades silently
 *   without it, per the docs.
 * - Commits the long-hand storage form (col/row IDs) and displays shorthand.
 * - Registers with the `formulaInputManager` bean while open.
 */
export class FormulaCellEditor<TData = unknown, TValue = unknown> implements ICellEditor<TValue> {
  private readonly gui = document.createElement('div');
  private readonly tokens = document.createElement('div');
  private readonly input = document.createElement('input');
  private readonly suggestions = document.createElement('div');
  private readonly status = document.createElement('div');
  private params!: Params<TData, TValue>;
  private formulaSvc: FormulaService | undefined;
  private inputManager: FormulaInputManager | undefined;
  private editorId = 0;
  private suggestionItems: string[] = [];
  private suggestionActive = 0;
  private restoredRanges: CellRange[] | null = null;

  /** Bean wiring — grid-provided components are created through the context. */
  public wireBeans(beans: BeanCollection): void {
    this.formulaSvc = beans.formula as FormulaService | undefined;
    this.inputManager = beans.formulaInputManager as FormulaInputManager | undefined;
  }

  public init(params: Params<TData, TValue>): void {
    this.params = params;
    this.editorId = nextEditorId++;
    const value = params.value;
    // With a formulaDataSource, Community routes committed formulas into the
    // store and leaves the computed value in the field — params.value is then
    // the evaluated number, so the editor must read the stored formula itself.
    const stored = this.formulaSvc?.getEditableFormula(
      params.column as never,
      params.node as never,
    );
    const source = stored ?? value;
    const text = this.formulaSvc?.isFormula(source)
      ? (this.formulaSvc.normaliseFormula(source, true) ?? source)
      : source == null
        ? ''
        : String(source);
    this.gui.className = 'lgr-formula-editor';
    this.tokens.className = 'lgr-formula-tokens';
    this.tokens.setAttribute('aria-hidden', 'true');
    this.input.className = 'lgr-formula-input';
    this.input.type = 'text';
    this.input.value = text;
    this.input.setAttribute('aria-label', 'Formula editor');
    this.suggestions.className = 'lgr-formula-suggestions';
    this.suggestions.setAttribute('role', 'listbox');
    this.status.className = 'lgr-formula-status';
    this.status.setAttribute('role', 'status');
    this.gui.append(this.tokens, this.input, this.suggestions, this.status);
    this.input.addEventListener('input', () => this.onInput());
    this.input.addEventListener('keydown', (e) => this.onKeydown(e));
    this.input.addEventListener('blur', () => this.closeSuggestions());
    this.onInput();
  }

  public getGui(): HTMLElement {
    return this.gui;
  }

  public afterGuiAttached(): void {
    this.input.focus();
    const end = this.input.value.length;
    this.input.setSelectionRange(end, end);
    this.inputManager?.registerActiveEditor(this.editorId, () => this.closeSuggestions());
  }

  public getValue(): TValue | null | undefined {
    const text = this.input.value;
    if (!this.formulaSvc?.isFormula(text)) return text as TValue | null | undefined;
    // Commit the long-hand storage form so references survive row/column moves.
    return (this.formulaSvc.normaliseFormula(text, false) ?? text) as TValue | null | undefined;
  }

  public isCancelAfterEnd(): boolean {
    // An invalid formula with live validation blocks the commit.
    return this.params.validateFormulas === true && this.validationError() !== null;
  }

  public destroy(): void {
    this.restoreRanges();
    this.inputManager?.unregisterActiveEditor(this.editorId, () => this.closeSuggestions());
    this.gui.replaceChildren();
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------

  private onInput(): void {
    this.renderTokens();
    this.renderValidation();
    this.updateSuggestions();
    this.highlightReferences();
  }

  private renderTokens(): void {
    const text = this.input.value;
    const spans: TokenSpan[] = [];
    let last = 0;
    TOKEN_RE.lastIndex = 0;
    for (let m = TOKEN_RE.exec(text); m !== null; m = TOKEN_RE.exec(text)) {
      if (m.index > last) spans.push({ text: text.slice(last, m.index), cls: null });
      spans.push({ text: m[0], cls: this.tokenClass(m, text) });
      last = m.index + m[0].length;
    }
    if (last < text.length) spans.push({ text: text.slice(last), cls: null });
    this.tokens.replaceChildren(
      ...spans.map((s) => {
        const el = document.createElement('span');
        el.textContent = s.text;
        if (s.cls) el.className = s.cls;
        return el;
      }),
      document.createTextNode(''),
    );
  }

  private tokenClass(m: RegExpExecArray, full: string): string | null {
    if (m[1] !== undefined) return 'lgr-formula-tok-str';
    if (m[2] !== undefined) return 'lgr-formula-tok-ref';
    if (m[4] !== undefined) return 'lgr-formula-tok-num';
    if (m[5] !== undefined) return 'lgr-formula-tok-op';
    if (m[3] !== undefined) {
      const word = m[3];
      if (/^TRUE$|^FALSE$/i.test(word)) return 'lgr-formula-tok-bool';
      const after = full.slice(m.index + m[0].length);
      if (/^\s*\(/.test(after)) return 'lgr-formula-tok-fn';
      if (CELL_TEXT_RE.test(word)) return 'lgr-formula-tok-ref';
      return 'lgr-formula-tok-name';
    }
    return null;
  }

  private validationError(): string | null {
    const text = this.input.value;
    if (!text.startsWith('=')) return null;
    // Local parse check — the same grammar the evaluator uses.
    const error = validateExpression(text.slice(1), { mode: 'cell' });
    return error ? `${error.code} ${error.message}` : null;
  }

  private renderValidation(): void {
    const error = this.params.validateFormulas === true ? this.validationError() : null;
    this.gui.classList.toggle('lgr-formula-invalid', error !== null);
    this.status.textContent = error ?? '';
    this.status.title = error ?? '';
  }

  // ------------------------------------------------------------------
  // Autocomplete
  // ------------------------------------------------------------------

  private suggestionPrefix(): string | null {
    const caret = this.input.selectionStart ?? this.input.value.length;
    const before = this.input.value.slice(0, caret);
    const m = /[A-Za-z_][A-Za-z0-9_]*$/.exec(before);
    if (!m) return null;
    const prefix = m[0];
    // Cell-shaped prefixes (`B2`) are references, not function names.
    if (CELL_TEXT_RE.test(prefix)) return null;
    return prefix;
  }

  private updateSuggestions(): void {
    const prefix = this.suggestionPrefix();
    if (prefix === null || prefix.length < 1 || !this.formulaSvc) {
      this.closeSuggestions();
      return;
    }
    const upper = prefix.toUpperCase();
    const names = this.formulaSvc.getFunctionNames().filter((n) => n.toUpperCase().startsWith(upper) && n.toUpperCase() !== upper);
    if (names.length === 0) {
      this.closeSuggestions();
      return;
    }
    this.suggestionItems = names.slice(0, MAX_SUGGESTIONS);
    this.suggestionActive = 0;
    this.suggestions.replaceChildren(
      ...this.suggestionItems.map((name, i) => {
        const el = document.createElement('div');
        el.className = `lgr-formula-suggestion${i === this.suggestionActive ? ' lgr-formula-suggestion-active' : ''}`;
        el.setAttribute('role', 'option');
        el.setAttribute('aria-selected', String(i === this.suggestionActive));
        el.textContent = name;
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.acceptSuggestion(name);
        });
        return el;
      }),
    );
    this.suggestions.style.display = 'block';
  }

  private closeSuggestions(): void {
    this.suggestionItems = [];
    this.suggestions.replaceChildren();
    this.suggestions.style.display = 'none';
  }

  private acceptSuggestion(name: string): void {
    const caret = this.input.selectionStart ?? this.input.value.length;
    const before = this.input.value.slice(0, caret).replace(/[A-Za-z_][A-Za-z0-9_]*$/, name);
    const after = this.input.value.slice(caret);
    this.input.value = `${before}(${after.startsWith(')') ? after : `)${after}`}`;
    const pos = before.length + 1;
    this.input.setSelectionRange(pos, pos);
    this.closeSuggestions();
    this.onInput();
    this.input.focus();
  }

  private onKeydown(e: KeyboardEvent): void {
    if (this.suggestionItems.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      this.suggestionActive = (this.suggestionActive + delta + this.suggestionItems.length) % this.suggestionItems.length;
      [...this.suggestions.children].forEach((el, i) => {
        el.classList.toggle('lgr-formula-suggestion-active', i === this.suggestionActive);
        el.setAttribute('aria-selected', String(i === this.suggestionActive));
      });
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      this.acceptSuggestion(this.suggestionItems[this.suggestionActive]!);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.closeSuggestions();
    }
  }

  // ------------------------------------------------------------------
  // Reference highlighting (Cell Selection interplay)
  // ------------------------------------------------------------------

  private highlightReferences(): void {
    const api = this.params.api;
    if (!api || typeof (api as { addCellRange?: unknown }).addCellRange !== 'function') return;
    if (!this.formulaSvc) return;
    const text = this.input.value;
    if (!this.formulaSvc.isFormula(text)) return;
    const descriptors = this.formulaSvc.formulaRangeDescriptors(text);
    if (descriptors.length === 0) return;
    if (this.restoredRanges === null) {
      this.restoredRanges = api.getCellRanges?.() ?? [];
    }
    for (const d of descriptors) {
      try {
        api.addCellRange({
          rowStartIndex: d.rowStart,
          rowEndIndex: d.rowEnd,
          columnStart: d.columnStart,
          columnEnd: d.columnEnd,
        });
      } catch {
        // Cell selection present but the range is out of bounds — skip.
      }
    }
  }

  private restoreRanges(): void {
    const api = this.params.api;
    if (!api || typeof (api as { clearRangeSelection?: unknown }).clearRangeSelection !== 'function') return;
    if (this.restoredRanges === null) return;
    const current = api.getCellRanges?.() ?? [];
    const ours = current.every((r) => r.id === undefined || r.id.startsWith('lgr-formula-'));
    if (!ours) return; // user ranges appeared mid-edit — leave selection alone
    api.clearRangeSelection();
    for (const range of this.restoredRanges) {
      api.addCellRange({
        rowStartIndex: range.startRow?.rowIndex ?? null,
        rowEndIndex: range.endRow?.rowIndex ?? null,
        columnStart: range.startColumn,
        columnEnd: range.columns[range.columns.length - 1] ?? range.startColumn,
      });
    }
    this.restoredRanges = null;
  }
}
