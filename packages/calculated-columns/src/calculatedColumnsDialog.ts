import type { FormulaError } from './expression';
import { FORMULA_FUNCTION_DESCRIPTIONS, FORMULA_FUNCTION_NAMES, FORMULA_OPERATORS } from './expression';

/** One pickable column reference for the Columns picker / autocomplete. */
export interface ColumnReference {
  colId: string;
  /** Human label shown next to the colId (header name, or group path for duplicates). */
  label: string;
}

export interface CalcDialogProps {
  headerName: string;
  cellDataType: string;
  expression: string;
}

export interface CalcDialogOptions {
  dataTypes: string[];
  expressionPickers: Array<'columns' | 'functions' | 'operators'>;
  applyMode: 'live' | 'deferred';
}

export interface CalcDialogHost {
  /** Column id the dialog is open for. */
  readonly colId: string;
  /** Validate without committing (deferred-mode preview, picker feedback). */
  validate(props: CalcDialogProps): FormulaError | null;
  /** Commit the new props to the grid. Returns the validation error (`null` = valid). */
  apply(props: CalcDialogProps): FormulaError | null;
  /** Deferred-mode cancel: restore the props in effect when the dialog opened. */
  revert(): void;
  /** Dismiss the dialog (after commit/revert semantics are handled). */
  close(): void;
}

const SUGGEST_LIMIT = 8;

/**
 * Framework-neutral DOM dialog for creating/editing a calculated column's
 * title, data type and expression (public AG Grid docs, 36.1 "Calculated
 * Columns": the dialog shows references, a data-type selector from
 * `calculatedColumns.dataTypes`, expression pickers, and — in `deferred`
 * apply mode — Apply/Cancel buttons; `live` mode applies every change).
 *
 * v1 editor surface: references are typed/inserted as `[colId]` (the storage
 * form) with the header-name label shown in the picker and autocomplete —
 * the docs' header-name display reference for grouped duplicates is the
 * documented simplification (see parity `calculated-columns.md`).
 */
export class CalculatedColumnDialog {
  private root: HTMLElement | null = null;
  private eTitle: HTMLInputElement | null = null;
  private eType: HTMLSelectElement | null = null;
  private eExpression: HTMLInputElement | null = null;
  private eError: HTMLElement | null = null;
  private eSuggest: HTMLElement | null = null;
  private ePickerLists: Map<'columns' | 'functions' | 'operators', HTMLElement> = new Map();
  private props: CalcDialogProps;
  private closed = false;
  private suggestIndex = -1;
  private suggestItems: Array<{ text: string; insert: string; label: string }> = [];
  private docListener: ((e: Event) => void) | null = null;
  private restoreFocusElement: HTMLElement | null = null;

  public constructor(
    private readonly host: CalcDialogHost,
    private readonly options: CalcDialogOptions,
    private readonly columnReferences: ColumnReference[],
    initial: CalcDialogProps,
  ) {
    this.props = { ...initial };
  }

  /** Render into `eRoot`, position near the column header, focus the expression input. */
  public open(eRoot: HTMLElement, focus: boolean, restoreFocus?: HTMLElement | null): void {
    this.restoreFocusElement = restoreFocus ?? null;
    this.build(eRoot);
    this.syncControls();
    this.updateSuggest(false);
    if (focus) {
      this.eExpression?.focus();
    }
  }

  /** Destroy the dialog DOM and re-focus the trigger. */
  public destroy(): void {
    this.closed = true;
    this.root?.remove();
    this.root = null;
    if (this.docListener) {
      document.removeEventListener('mousedown', this.docListener);
      this.docListener = null;
    }
    if (this.restoreFocusElement && this.restoreFocusElement.isConnected) {
      this.restoreFocusElement.focus();
    }
  }

  // ------------------------------------------------------------------
  // Construction
  // ------------------------------------------------------------------

  private build(eRoot: HTMLElement): void {
    const root = document.createElement('div');
    root.className = 'lgr-calc-dialog';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Calculated Column');

    const header = document.createElement('div');
    header.className = 'lgr-calc-dialog-header';
    const title = document.createElement('span');
    title.className = 'lgr-calc-dialog-heading';
    title.textContent = 'Calculated Column';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'lgr-calc-dialog-close';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    close.addEventListener('click', () => this.closeDialog());
    header.append(title, close);

    const body = document.createElement('div');
    body.className = 'lgr-calc-dialog-body';

    const titleRow = this.field('Title');
    this.eTitle = document.createElement('input');
    this.eTitle.type = 'text';
    this.eTitle.className = 'lgr-calc-dialog-title-input';
    this.eTitle.addEventListener('input', () => this.onPropChange());
    titleRow.control.append(this.eTitle);

    const typeRow = this.field('Type');
    this.eType = document.createElement('select');
    this.eType.className = 'lgr-calc-dialog-type';
    for (const dt of this.options.dataTypes) {
      const opt = document.createElement('option');
      opt.value = dt;
      opt.textContent = dataTypeLabel(dt);
      this.eType.append(opt);
    }
    this.eType.addEventListener('change', () => this.onPropChange());
    typeRow.control.append(this.eType);

    const exprRow = document.createElement('div');
    exprRow.className = 'lgr-calc-dialog-field lgr-calc-dialog-expression-field';
    const exprLabel = document.createElement('span');
    exprLabel.className = 'lgr-calc-dialog-field-label';
    exprLabel.textContent = 'Expression';

    const pickers = document.createElement('div');
    pickers.className = 'lgr-calc-dialog-pickers';
    if (this.options.expressionPickers.includes('columns')) {
      pickers.append(this.picker('columns', 'Columns', () => this.renderColumnEntries()));
    }
    if (this.options.expressionPickers.includes('functions')) {
      pickers.append(this.picker('functions', 'Functions', () => this.renderFunctionEntries()));
    }
    if (this.options.expressionPickers.includes('operators')) {
      pickers.append(this.picker('operators', 'Operators', () => this.renderOperatorEntries()));
    }

    this.eExpression = document.createElement('input');
    this.eExpression.type = 'text';
    this.eExpression.className = 'lgr-calc-dialog-expression';
    this.eExpression.placeholder = '[revenue] - [cost]';
    this.eExpression.spellcheck = false;
    this.eExpression.addEventListener('input', () => this.onExpressionInput());
    this.eExpression.addEventListener('keydown', (e) => this.onExpressionKeydown(e));
    this.eExpression.addEventListener('click', () => this.updateSuggest(true));

    this.eSuggest = document.createElement('div');
    this.eSuggest.className = 'lgr-calc-dialog-suggest';
    this.eSuggest.hidden = true;

    this.eError = document.createElement('div');
    this.eError.className = 'lgr-calc-dialog-error';
    this.eError.setAttribute('role', 'alert');

    exprRow.append(exprLabel, pickers, this.eExpression, this.eSuggest, this.eError);
    body.append(titleRow.row, typeRow.row, exprRow);

    let footer: HTMLElement | null = null;
    if (this.options.applyMode === 'deferred') {
      footer = document.createElement('div');
      footer.className = 'lgr-calc-dialog-footer';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'lgr-calc-dialog-cancel';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => this.closeDialog());
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'lgr-calc-dialog-apply';
      apply.textContent = 'Apply';
      apply.addEventListener('click', () => this.applyDeferred());
      footer.append(cancel, apply);
    }

    root.append(header, body, ...(footer ? [footer] : []));
    eRoot.append(root);
    this.root = root;

    // Clicks outside the dialog close it (commit semantics = close semantics).
    this.docListener = (e: Event) => {
      if (this.root && !this.root.contains(e.target as Node)) {
        this.closeDialog();
      }
    };
    document.addEventListener('mousedown', this.docListener);

    this.position(eRoot);
  }

  private field(labelText: string): { row: HTMLElement; control: HTMLElement } {
    const row = document.createElement('div');
    row.className = 'lgr-calc-dialog-field';
    const label = document.createElement('label');
    label.className = 'lgr-calc-dialog-field-label';
    label.textContent = labelText;
    const control = document.createElement('div');
    control.className = 'lgr-calc-dialog-field-control';
    row.append(label, control);
    return { row, control };
  }

  private picker(
    kind: 'columns' | 'functions' | 'operators',
    label: string,
    entries: () => void,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lgr-calc-dialog-picker';
    button.textContent = `${label} ▾`;
    button.setAttribute('aria-haspopup', 'true');
    const list = document.createElement('div');
    list.className = 'lgr-calc-dialog-picker-list';
    list.hidden = true;
    this.ePickerLists.set(kind, list);
    entries();
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      for (const [other, otherList] of this.ePickerLists) {
        if (other !== kind) otherList.hidden = true;
      }
      list.hidden = !list.hidden;
    });
    const wrap = document.createElement('span');
    wrap.className = 'lgr-calc-dialog-picker-wrap';
    wrap.append(button, list);
    // The button is the visible control; the list is positioned absolutely by CSS.
    return wrap as unknown as HTMLButtonElement;
  }

  private renderColumnEntries(): void {
    const list = this.ePickerLists.get('columns');
    if (!list) return;
    for (const ref of this.columnReferences) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lgr-calc-dialog-picker-item';
      const code = document.createElement('code');
      code.textContent = `[${ref.colId}]`;
      const label = document.createElement('span');
      label.className = 'lgr-calc-dialog-picker-label';
      label.textContent = ref.label;
      item.append(code, label);
      item.title = ref.label;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.insertAtCursor(`[${ref.colId}]`);
        list.hidden = true;
        this.eExpression?.focus();
      });
      list.append(item);
    }
  }

  private renderFunctionEntries(): void {
    const list = this.ePickerLists.get('functions');
    if (!list) return;
    for (const name of FORMULA_FUNCTION_NAMES) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lgr-calc-dialog-picker-item';
      const code = document.createElement('code');
      code.textContent = `${name}()`;
      const label = document.createElement('span');
      label.className = 'lgr-calc-dialog-picker-label';
      label.textContent = FORMULA_FUNCTION_DESCRIPTIONS[name] ?? '';
      item.append(code, label);
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.insertAtCursor(`${name}(`);
        list.hidden = true;
        this.eExpression?.focus();
      });
      list.append(item);
    }
  }

  private renderOperatorEntries(): void {
    const list = this.ePickerLists.get('operators');
    if (!list) return;
    for (const { op, description } of FORMULA_OPERATORS) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lgr-calc-dialog-picker-item';
      const code = document.createElement('code');
      code.textContent = op;
      const label = document.createElement('span');
      label.className = 'lgr-calc-dialog-picker-label';
      label.textContent = description;
      item.append(code, label);
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.insertAtCursor(` ${op} `);
        list.hidden = true;
        this.eExpression?.focus();
      });
      list.append(item);
    }
  }

  private position(eRoot: HTMLElement): void {
    if (!this.root) return;
    const headerCell = eRoot.querySelector<HTMLElement>(`.ag-header-cell[col-id="${cssEscape(this.host.colId)}"]`);
    const rootRect = eRoot.getBoundingClientRect();
    let left = 12;
    let top = 12;
    if (headerCell) {
      const r = headerCell.getBoundingClientRect();
      left = Math.max(4, r.left - rootRect.left);
      top = Math.max(4, r.bottom - rootRect.top + 6);
    }
    // Keep the dialog inside the grid viewport horizontally.
    const width = 420;
    if (left + width > rootRect.width) left = Math.max(4, rootRect.width - width - 4);
    this.root.style.position = 'absolute';
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
    this.root.style.zIndex = '10000';
    this.root.style.minWidth = '320px';
    this.root.style.maxWidth = `${width}px`;
  }

  // ------------------------------------------------------------------
  // Control state
  // ------------------------------------------------------------------

  private syncControls(): void {
    if (this.eTitle) this.eTitle.value = this.props.headerName;
    if (this.eType) {
      this.eType.value = this.props.cellDataType;
      if (this.eType.value !== this.props.cellDataType && this.options.dataTypes.length > 0) {
        this.eType.value = this.options.dataTypes[0]!;
      }
    }
    if (this.eExpression) this.eExpression.value = this.props.expression;
  }

  private readControls(): CalcDialogProps {
    return {
      headerName: this.eTitle?.value ?? this.props.headerName,
      cellDataType: this.eType?.value ?? this.props.cellDataType,
      expression: this.eExpression?.value ?? this.props.expression,
    };
  }

  /** `input` on title/type: live mode applies, deferred mode only previews. */
  private onPropChange(): void {
    this.props = this.readControls();
    if (this.options.applyMode === 'live') {
      this.showError(this.host.apply(this.props));
    } else {
      this.showError(this.host.validate(this.props));
    }
  }

  private onExpressionInput(): void {
    this.props = this.readControls();
    this.updateSuggest(true);
    if (this.options.applyMode === 'live') {
      this.showError(this.host.apply(this.props));
    } else {
      this.showError(this.host.validate(this.props));
    }
  }

  private onExpressionKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.closeDialog();
      return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && this.eSuggest && !this.eSuggest.hidden) {
      e.preventDefault();
      this.moveSuggest(e.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this.suggestIndex >= 0 && this.eSuggest && !this.eSuggest.hidden) {
        const item = this.suggestItems[this.suggestIndex];
        if (item) {
          this.acceptSuggest(item);
          return;
        }
      }
      if (this.options.applyMode === 'deferred') {
        this.applyDeferred();
      } else {
        this.eSuggest?.removeAttribute('hidden');
        if (this.eSuggest) this.eSuggest.hidden = true;
      }
    }
  }

  private applyDeferred(): void {
    const props = this.readControls();
    const error = this.host.validate(props);
    if (error) {
      this.showError(error);
      return;
    }
    this.showError(this.host.apply(props));
    this.closeDialog();
  }

  private closeDialog(): void {
    if (this.closed) return;
    // Live mode has committed every change as it was typed; deferred mode
    // never committed, so there is nothing to roll back on plain close.
    this.host.close();
    this.destroy();
  }

  private showError(error: FormulaError | null): void {
    if (!this.eError) return;
    this.eError.textContent = error ? `${error.code} — ${error.message}` : '';
    this.eError.hidden = !error;
  }

  // ------------------------------------------------------------------
  // Autocomplete
  // ------------------------------------------------------------------

  /**
   * Suggest column references while typing `[prefix` and function names while
   * typing an identifier. Selection replaces the in-progress token.
   */
  private updateSuggest(force: boolean): void {
    const input = this.eExpression;
    const suggest = this.eSuggest;
    if (!input || !suggest) return;
    const text = input.value;
    const caret = input.selectionStart ?? text.length;
    const before = text.slice(0, caret);

    let items: Array<{ text: string; insert: string; label: string }> = [];
    const bracket = before.lastIndexOf('[');
    const identStart = matchIdentEnd(before);
    if (bracket >= 0 && !before.slice(bracket).includes(']')) {
      const prefix = before.slice(bracket + 1).toLowerCase();
      items = this.columnReferences
        .filter((r) => r.colId.toLowerCase().startsWith(prefix))
        .slice(0, SUGGEST_LIMIT)
        .map((r) => ({ text: `[${r.colId}]`, insert: `[${r.colId}]`, label: r.label }));
      this.pendingReplace = { start: bracket, end: caret };
    } else if (identStart >= 0) {
      const prefix = before.slice(identStart).toLowerCase();
      if (prefix.length > 0 && /[A-Za-z]/.test(prefix.charAt(0))) {
        items = FORMULA_FUNCTION_NAMES.filter((n) => n.toLowerCase().startsWith(prefix))
          .slice(0, SUGGEST_LIMIT)
          .map((n) => ({ text: n, insert: `${n}(`, label: FORMULA_FUNCTION_DESCRIPTIONS[n] ?? '' }));
        this.pendingReplace = { start: identStart, end: caret };
      }
    } else {
      this.pendingReplace = null;
    }

    if (items.length === 0 || (force === false && !this.pendingReplace)) {
      suggest.hidden = true;
      suggest.replaceChildren();
      this.suggestItems = [];
      this.suggestIndex = -1;
      return;
    }
    suggest.replaceChildren();
    this.suggestItems = items;
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lgr-calc-dialog-suggest-item';
      const code = document.createElement('code');
      code.textContent = item.text;
      const label = document.createElement('span');
      label.className = 'lgr-calc-dialog-picker-label';
      label.textContent = item.label;
      button.append(code, label);
      button.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep input focus
        this.acceptSuggest(item);
      });
      suggest.append(button);
    }
    suggest.hidden = false;
    this.suggestIndex = items.length > 0 ? 0 : -1;
    this.paintSuggest();
  }

  private pendingReplace: { start: number; end: number } | null = null;

  private moveSuggest(delta: number): void {
    const count = this.eSuggest?.children.length ?? 0;
    if (count === 0) return;
    this.suggestIndex = (this.suggestIndex + delta + count) % count;
    this.paintSuggest();
  }

  private paintSuggest(): void {
    const suggest = this.eSuggest;
    if (!suggest) return;
    for (let i = 0; i < suggest.children.length; i++) {
      suggest.children[i]!.classList.toggle('lgr-calc-dialog-suggest-active', i === this.suggestIndex);
    }
  }

  private acceptSuggest(item: { text: string; insert: string; label: string }): void {
    const input = this.eExpression;
    if (!input || !this.pendingReplace) return;
    const { start, end } = this.pendingReplace;
    const text = input.value;
    input.value = text.slice(0, start) + item.insert + text.slice(end);
    const caret = start + item.insert.length;
    input.setSelectionRange(caret, caret);
    this.pendingReplace = null;
    this.eSuggest?.removeAttribute('hidden');
    this.eSuggest!.hidden = true;
    this.suggestIndex = -1;
    this.onExpressionInput();
  }

  private insertAtCursor(text: string): void {
    const input = this.eExpression;
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    const caret = start + text.length;
    input.setSelectionRange(caret, caret);
    this.onExpressionInput();
  }
}

function matchIdentEnd(before: string): number {
  let i = before.length;
  while (i > 0 && /[A-Za-z0-9_]/.test(before.charAt(i - 1))) i--;
  if (i === before.length) return -1;
  return i;
}

function dataTypeLabel(dt: string): string {
  const builtIn: Record<string, string> = {
    text: 'Text',
    number: 'Number',
    date: 'Date',
    boolean: 'Boolean',
    bigNumber: 'Big Number',
    datestring: 'Date String',
    datetime: 'Date & Time',
  };
  if (builtIn[dt]) return builtIn[dt]!;
  return dt
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function cssEscape(value: string): string {
  return value.replace(/"/g, '\\"');
}
