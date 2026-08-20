import type { FormulaError, FormulaToken } from './expression';
import { FORMULA_FUNCTION_DESCRIPTIONS, FORMULA_FUNCTION_NAMES, FORMULA_OPERATORS, tokenize } from './expression';

/** One pickable column reference for the expression builder. */
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
  readonly colId: string;
  validate(props: CalcDialogProps): FormulaError | null;
  apply(props: CalcDialogProps): FormulaError | null;
  revert(): void;
  close(): void;
}

type PaletteTab = 'columns' | 'functions' | 'operators' | 'values';
type CanvasTokenKind = 'column' | 'function' | 'operator' | 'literal' | 'punctuation';

interface CanvasToken {
  kind: CanvasTokenKind;
  text: string;
  start: number;
  end: number;
}

interface PaletteItem {
  label: string;
  detail?: string;
  insert: string;
  /** Opens the newly inserted literal as an inline value editor. */
  valueKind?: ValueKind;
  /** Offset from the insertion start at which the raw editor places the caret. */
  caretOffset?: number;
  /** Select this many characters after placing the caret, ready for typing. */
  selectionLength?: number;
}

type ValueKind = 'text' | 'number' | 'date' | 'boolean';

const SUGGEST_LIMIT = 8;
const TAB_LABELS: Record<PaletteTab, string> = { columns: 'Columns', functions: 'Functions', operators: 'Operators', values: 'Values' };
const OPERATOR_BY_VALUE = new Map(FORMULA_OPERATORS.map((operator) => [operator.op, operator]));

/**
 * Framework-neutral, accessible calculated-column authoring modal.
 *
 * The canvas visualises the existing string formula model. It deliberately is
 * not another AST, so formulas using advanced syntax remain editable in the
 * always-visible raw input without any conversion or data loss.
 */
export class CalculatedColumnDialog {
  private root: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private eTitle: HTMLInputElement | null = null;
  private eType: HTMLSelectElement | null = null;
  private eExpression: HTMLInputElement | null = null;
  private eError: HTMLElement | null = null;
  private eSuggest: HTMLElement | null = null;
  private eCanvas: HTMLElement | null = null;
  private ePaletteTabs: HTMLElement | null = null;
  private ePalettePanel: HTMLElement | null = null;
  private props: CalcDialogProps;
  private closed = false;
  private suggestIndex = -1;
  private suggestItems: Array<{ text: string; insert: string; label: string }> = [];
  private restoreFocusElement: HTMLElement | null = null;
  private activeTab: PaletteTab | null;
  private columnSearch = '';
  private insertionGap: number | null = null;
  private pendingReplace: { start: number; end: number } | null = null;
  private draggedItem: PaletteItem | null = null;
  private draggedToken: CanvasToken | null = null;
  private dragPreview: HTMLElement | null = null;
  private editingValue: { start: number; end: number; kind: ValueKind } | null = null;
  private eEditingValue: HTMLInputElement | HTMLSelectElement | null = null;

  public constructor(
    private readonly host: CalcDialogHost,
    private readonly options: CalcDialogOptions,
    private readonly columnReferences: ColumnReference[],
    initial: CalcDialogProps,
  ) {
    this.props = { ...initial };
    this.activeTab = this.availableTabs()[0] ?? null;
  }

  /** Render a centered modal into this grid's concrete root. */
  public open(eRoot: HTMLElement, focus: boolean, restoreFocus?: HTMLElement | null): void {
    this.restoreFocusElement = restoreFocus ?? null;
    const dialogRoot = eRoot.matches('.ag-root-wrapper')
      ? eRoot
      : eRoot.querySelector<HTMLElement>('.ag-root-wrapper') ?? eRoot;
    this.build(dialogRoot);
    this.syncControls();
    this.renderExpressionCanvas();
    this.updateSuggest(false);
    if (focus) this.eExpression?.focus();
  }

  /** Destroy the modal DOM and restore focus to its launcher. */
  public destroy(): void {
    if (this.closed && !this.overlay) return;
    this.closed = true;
    this.overlay?.remove();
    this.dragPreview?.remove();
    this.dragPreview = null;
    this.overlay = null;
    this.root = null;
    if (this.restoreFocusElement?.isConnected) this.restoreFocusElement.focus();
  }

  // ------------------------------------------------------------------
  // Construction
  // ------------------------------------------------------------------

  private build(eRoot: HTMLElement): void {
    const overlay = document.createElement('div');
    overlay.className = 'lgr-calc-dialog-overlay';

    const root = document.createElement('section');
    root.className = 'lgr-calc-dialog';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.addEventListener('keydown', (event) => this.onDialogKeydown(event));

    const header = document.createElement('div');
    header.className = 'lgr-calc-dialog-header';
    const heading = document.createElement('h2');
    const headingId = uniqueId('title');
    heading.id = headingId;
    heading.className = 'lgr-calc-dialog-heading';
    heading.textContent = 'Calculated Column';
    root.setAttribute('aria-labelledby', headingId);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'lgr-calc-dialog-close';
    close.setAttribute('aria-label', 'Close calculated column dialog');
    close.textContent = '×';
    close.addEventListener('click', () => this.closeDialog());
    header.append(heading, close);

    const body = document.createElement('div');
    body.className = 'lgr-calc-dialog-body';
    const metadata = document.createElement('div');
    metadata.className = 'lgr-calc-dialog-meta';
    const titleRow = this.field('Title', 'title');
    this.eTitle = document.createElement('input');
    this.eTitle.id = titleRow.id;
    this.eTitle.type = 'text';
    this.eTitle.className = 'lgr-calc-dialog-title-input';
    this.eTitle.addEventListener('input', () => this.onPropChange());
    titleRow.control.append(this.eTitle);
    const typeRow = this.field('Type', 'type');
    this.eType = document.createElement('select');
    this.eType.id = typeRow.id;
    this.eType.className = 'lgr-calc-dialog-type';
    for (const dataType of this.options.dataTypes) {
      const option = document.createElement('option');
      option.value = dataType;
      option.textContent = dataTypeLabel(dataType);
      this.eType.append(option);
    }
    this.eType.addEventListener('change', () => this.onPropChange());
    typeRow.control.append(this.eType);
    metadata.append(titleRow.row, typeRow.row);

    const builder = document.createElement('div');
    builder.className = 'lgr-calc-dialog-builder';
    builder.append(this.buildPalette(), this.buildExpressionWorkspace());
    body.append(metadata, builder);

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
    overlay.append(root);
    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) this.closeDialog();
    });
    // AG Grid may transform its root for layout/animation. A fixed child of a
    // transformed ancestor is fixed to that ancestor instead of the viewport,
    // so mount the modal layer at document level and retain the grid theme
    // variables explicitly.
    copyAgThemeVariables(eRoot, overlay);
    eRoot.ownerDocument.body.append(overlay);
    this.root = root;
    this.overlay = overlay;
  }

  private field(labelText: string, suffix: string): { row: HTMLElement; control: HTMLElement; id: string } {
    const row = document.createElement('div');
    row.className = 'lgr-calc-dialog-field';
    const id = uniqueId(suffix);
    const label = document.createElement('label');
    label.className = 'lgr-calc-dialog-field-label';
    label.htmlFor = id;
    label.textContent = labelText;
    const control = document.createElement('div');
    control.className = 'lgr-calc-dialog-field-control';
    row.append(label, control);
    return { row, control, id };
  }

  private buildExpressionWorkspace(): HTMLElement {
    const expression = document.createElement('div');
    expression.className = 'lgr-calc-dialog-expression-field';
    const label = document.createElement('label');
    label.className = 'lgr-calc-dialog-field-label';
    label.htmlFor = 'lgr-calc-dialog-expression';
    label.textContent = 'Expression';
    this.eCanvas = document.createElement('div');
    this.eCanvas.className = 'lgr-calc-dialog-expression-canvas';
    this.eCanvas.setAttribute('aria-label', 'Expression builder canvas');
    this.eCanvas.setAttribute('aria-live', 'polite');
    this.eExpression = document.createElement('input');
    this.eExpression.id = label.htmlFor;
    this.eExpression.type = 'text';
    this.eExpression.className = 'lgr-calc-dialog-expression';
    this.eExpression.placeholder = '[revenue] - [cost]';
    this.eExpression.spellcheck = false;
    this.eExpression.setAttribute('aria-describedby', 'lgr-calc-dialog-expression-help');
    this.eExpression.addEventListener('input', () => this.onExpressionInput());
    this.eExpression.addEventListener('keydown', (event) => this.onExpressionKeydown(event));
    this.eExpression.addEventListener('click', () => this.syncInsertionFromInput());
    this.eExpression.addEventListener('select', () => this.syncInsertionFromInput());
    this.eExpression.addEventListener('dragover', (event) => this.onExpressionDragOver(event));
    this.eExpression.addEventListener('drop', (event) => this.onExpressionDrop(event));
    const help = document.createElement('div');
    help.id = 'lgr-calc-dialog-expression-help';
    help.className = 'lgr-calc-dialog-expression-help';
    help.textContent = 'Use the palette or type a formula directly. Values open inline on the expression canvas; drag expression pills to a dashed insertion target, the palette, or the trash target.';
    this.eSuggest = document.createElement('div');
    this.eSuggest.className = 'lgr-calc-dialog-suggest';
    this.eSuggest.hidden = true;
    this.eError = document.createElement('div');
    this.eError.className = 'lgr-calc-dialog-error';
    this.eError.setAttribute('role', 'alert');
    this.eError.hidden = true;
    expression.append(label, this.eCanvas, this.eExpression, help, this.eSuggest, this.eError);
    return expression;
  }

  // ------------------------------------------------------------------
  // Palette
  // ------------------------------------------------------------------

  private availableTabs(): PaletteTab[] {
    return (['columns', 'functions', 'operators', 'values'] as PaletteTab[])
      .filter((tab) => tab === 'values' || this.options.expressionPickers.includes(tab));
  }

  private buildPalette(): HTMLElement {
    const palette = document.createElement('section');
    palette.className = 'lgr-calc-dialog-palette';
    const title = document.createElement('span');
    title.className = 'lgr-calc-dialog-palette-title';
    title.textContent = 'Insert into expression';
    this.ePaletteTabs = document.createElement('div');
    this.ePaletteTabs.className = 'lgr-calc-dialog-palette-tabs';
    this.ePaletteTabs.setAttribute('role', 'tablist');
    this.ePaletteTabs.setAttribute('aria-label', 'Expression palette');
    this.ePalettePanel = document.createElement('div');
    this.ePalettePanel.className = 'lgr-calc-dialog-palette-panel';
    this.ePalettePanel.setAttribute('role', 'tabpanel');
    palette.addEventListener('dragover', (event) => this.onPaletteDragOver(event, palette));
    palette.addEventListener('dragleave', (event) => {
      if (!(event.relatedTarget instanceof Node) || !palette.contains(event.relatedTarget)) {
        palette.classList.remove('lgr-calc-dialog-palette-drop-target');
      }
    });
    palette.addEventListener('drop', (event) => this.onPaletteDrop(event, palette));
    palette.append(title, this.ePaletteTabs, this.ePalettePanel);
    this.renderPalette();
    return palette;
  }

  private renderPalette(): void {
    const tabs = this.ePaletteTabs;
    const panel = this.ePalettePanel;
    if (!tabs || !panel) return;
    const available = this.availableTabs();
    if (this.activeTab && !available.includes(this.activeTab)) this.activeTab = available[0] ?? null;
    tabs.replaceChildren();
    panel.replaceChildren();
    if (!this.activeTab) {
      panel.textContent = 'Expression palette disabled.';
      return;
    }
    for (const tab of available) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lgr-calc-dialog-palette-tab';
      button.id = `lgr-calc-dialog-tab-${tab}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'lgr-calc-dialog-palette-panel');
      button.setAttribute('aria-selected', String(tab === this.activeTab));
      button.tabIndex = tab === this.activeTab ? 0 : -1;
      button.textContent = TAB_LABELS[tab];
      button.addEventListener('click', () => {
        this.activeTab = tab;
        this.renderPalette();
      });
      button.addEventListener('keydown', (event) => this.onPaletteTabKeydown(event, tab, available));
      tabs.append(button);
    }
    panel.id = 'lgr-calc-dialog-palette-panel';
    panel.setAttribute('aria-labelledby', `lgr-calc-dialog-tab-${this.activeTab}`);
    if (this.activeTab === 'columns') this.renderColumnPalette(panel);
    if (this.activeTab === 'functions') this.renderFunctionPalette(panel);
    if (this.activeTab === 'operators') this.renderOperatorPalette(panel);
    if (this.activeTab === 'values') this.renderValuePalette(panel);
  }

  private onPaletteTabKeydown(event: KeyboardEvent, current: PaletteTab, available: PaletteTab[]): void {
    const index = available.indexOf(current);
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % available.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + available.length) % available.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = available.length - 1;
    if (next < 0) return;
    event.preventDefault();
    this.activeTab = available[next]!;
    this.renderPalette();
    this.ePaletteTabs?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  }

  private renderColumnPalette(panel: HTMLElement): void {
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'lgr-calc-dialog-column-search';
    search.placeholder = 'Search columns';
    search.setAttribute('aria-label', 'Search columns');
    search.value = this.columnSearch;
    search.addEventListener('input', () => {
      this.columnSearch = search.value;
      this.renderPalette();
      this.ePalettePanel?.querySelector<HTMLInputElement>('.lgr-calc-dialog-column-search')?.focus();
    });
    panel.append(search);
    const needle = this.columnSearch.trim().toLowerCase();
    const references = this.columnReferences.filter((reference) =>
      !needle || reference.colId.toLowerCase().includes(needle) || reference.label.toLowerCase().includes(needle),
    );
    if (references.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'lgr-calc-dialog-palette-empty';
      empty.textContent = 'No matching columns.';
      panel.append(empty);
      return;
    }
    const list = document.createElement('div');
    list.className = 'lgr-calc-dialog-palette-list';
    for (const reference of references) {
      list.append(this.paletteButton({ label: `[${reference.colId}]`, detail: reference.label, insert: `[${reference.colId}]` }, 'column'));
    }
    panel.append(list);
  }

  private renderFunctionPalette(panel: HTMLElement): void {
    const list = document.createElement('div');
    list.className = 'lgr-calc-dialog-palette-list';
    for (const name of FORMULA_FUNCTION_NAMES) {
      list.append(this.paletteButton({
        label: `${name}()`, detail: FORMULA_FUNCTION_DESCRIPTIONS[name] ?? '', insert: `${name}()`, caretOffset: name.length + 1,
      }, 'function'));
    }
    panel.append(list);
  }

  private renderOperatorPalette(panel: HTMLElement): void {
    for (const group of this.operatorGroups()) {
      const section = document.createElement('section');
      section.className = 'lgr-calc-dialog-operator-group';
      const heading = document.createElement('h3');
      heading.textContent = group.label;
      const list = document.createElement('div');
      list.className = 'lgr-calc-dialog-palette-list';
      for (const item of group.items) list.append(this.paletteButton(item, 'operator'));
      section.append(heading, list);
      panel.append(section);
    }
  }

  private renderValuePalette(panel: HTMLElement): void {
    const list = document.createElement('div');
    list.className = 'lgr-calc-dialog-palette-list';
    const values: PaletteItem[] = [
      { label: 'Text', detail: 'Enter text in the expression', insert: '""', valueKind: 'text' },
      { label: 'Number', detail: 'Enter a numeric value in the expression', insert: '0', valueKind: 'number' },
      { label: 'Date', detail: 'Enter an ISO date in the expression', insert: '""', valueKind: 'date' },
      { label: 'Boolean', detail: 'Choose TRUE or FALSE in the expression', insert: 'TRUE', valueKind: 'boolean' },
    ];
    for (const value of values) list.append(this.paletteButton(value, 'literal'));
    panel.append(list);
  }

  private operatorGroups(): Array<{ label: string; items: PaletteItem[] }> {
    const operator = (op: string): PaletteItem => ({
      label: op,
      detail: OPERATOR_BY_VALUE.get(op)?.description ?? logicalOperatorDescription(op),
      insert: ` ${op} `,
    });
    return [
      { label: 'Arithmetic', items: ['+', '-', '*', '/', '^', '%', '&'].map(operator) },
      { label: 'Comparison', items: ['=', '<>', '>', '<', '>=', '<='].map(operator) },
      { label: 'Logical', items: ['AND', 'OR', '!'].map(operator) },
    ];
  }

  private paletteButton(item: PaletteItem, kind: CanvasTokenKind): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `lgr-calc-dialog-palette-item lgr-calc-dialog-palette-item-${kind}`;
    button.draggable = true;
    button.setAttribute('aria-label', item.detail ? `Insert ${item.label}: ${item.detail}` : `Insert ${item.label}`);
    const label = document.createElement('code');
    label.textContent = item.label;
    button.append(label);
    if (item.detail) {
      const detail = document.createElement('span');
      detail.className = 'lgr-calc-dialog-palette-item-detail';
      detail.textContent = item.detail;
      button.append(detail);
    }
    button.addEventListener('click', () => this.insertPaletteItem(item));
    button.addEventListener('dragstart', (event) => this.startPaletteDrag(item, button, event));
    button.addEventListener('dragend', () => {
      button.classList.remove('lgr-calc-dialog-palette-item-dragging');
      this.clearDragState();
    });
    return button;
  }

  private startPaletteDrag(item: PaletteItem, button: HTMLElement, event: DragEvent): void {
    this.draggedItem = item;
    this.draggedToken = null;
    button.classList.add('lgr-calc-dialog-palette-item-dragging');
    this.eCanvas?.setAttribute('data-dragging', 'true');
    event.dataTransfer?.setData('text/plain', JSON.stringify(item));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      this.setDragPreview(item.label, event.dataTransfer);
    }
  }

  private setDragPreview(label: string, dataTransfer: DataTransfer): void {
    const preview = document.createElement('span');
    preview.className = 'lgr-calc-dialog-drag-preview';
    preview.textContent = label;
    preview.setAttribute('aria-hidden', 'true');
    document.body.append(preview);
    this.dragPreview?.remove();
    this.dragPreview = preview;
    dataTransfer.setDragImage(preview, preview.offsetWidth / 2, preview.offsetHeight / 2);
  }

  // ------------------------------------------------------------------
  // Guided expression canvas
  // ------------------------------------------------------------------

  private renderExpressionCanvas(): void {
    const canvas = this.eCanvas;
    if (!canvas) return;
    const source = this.eExpression?.value ?? this.props.expression;
    let tokens: CanvasToken[];
    try {
      tokens = canvasTokens(source);
      canvas.removeAttribute('data-invalid');
    } catch {
      // The raw field remains the authority; malformed input is never erased.
      canvas.setAttribute('data-invalid', 'true');
      canvas.replaceChildren(this.invalidCanvasMessage());
      return;
    }
    if (this.insertionGap === null || this.insertionGap > source.length) this.insertionGap = source.length;
    if (this.editingValue && !tokens.some((token) => token.start === this.editingValue!.start && token.end === this.editingValue!.end)) {
      this.editingValue = null;
    }
    this.eEditingValue = null;
    const positions = [0, ...tokens.map((token) => token.end)];
    if (positions.at(-1) !== source.length) positions.push(source.length);
    canvas.replaceChildren();
    for (let index = 0; index < positions.length; index++) {
      canvas.append(this.canvasGap(positions[index]!, index, positions.length - 1));
      if (index < tokens.length) {
        const token = tokens[index]!;
        const editing = this.editingValue;
        canvas.append(editing && editing.start === token.start && editing.end === token.end
          ? this.canvasValueEditor(token, editing.kind)
          : this.canvasChip(token));
      }
    }
    canvas.append(this.expressionTrashTarget());
  }

  private invalidCanvasMessage(): HTMLElement {
    const message = document.createElement('span');
    message.className = 'lgr-calc-dialog-expression-canvas-message';
    message.textContent = 'Keep editing the formula below to complete this expression.';
    return message;
  }

  private canvasGap(position: number, index: number, count: number): HTMLButtonElement {
    const gap = document.createElement('button');
    gap.type = 'button';
    gap.className = 'lgr-calc-dialog-expression-gap';
    gap.classList.toggle('lgr-calc-dialog-expression-gap-selected', this.insertionGap === position);
    gap.dataset.position = String(position);
    gap.setAttribute('aria-label', gapLabel(index, count));
    gap.title = 'Insert palette item here';
    gap.addEventListener('click', () => this.selectGap(position));
    gap.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = this.draggedToken ? 'move' : 'copy';
      gap.classList.add('lgr-calc-dialog-expression-gap-dragover');
    });
    gap.addEventListener('dragleave', () => gap.classList.remove('lgr-calc-dialog-expression-gap-dragover'));
    gap.addEventListener('drop', (event) => {
      event.preventDefault();
      gap.classList.remove('lgr-calc-dialog-expression-gap-dragover');
      if (this.draggedToken) {
        this.moveCanvasToken(this.draggedToken, position);
        return;
      }
      const item = this.draggedItem ?? paletteItemFromTransfer(event.dataTransfer);
      if (!item) return;
      this.insertionGap = position;
      this.insertPaletteItem(item);
    });
    return gap;
  }

  private canvasChip(token: CanvasToken): HTMLElement {
    const chip = document.createElement('span');
    chip.className = `lgr-calc-dialog-expression-chip lgr-calc-dialog-expression-chip-${token.kind} lgr-calc-dialog-expression-chip-draggable`;
    chip.textContent = token.text;
    chip.draggable = true;
    chip.title = 'Drag to move, remove in the palette, or drop on the trash target';
    chip.addEventListener('dragstart', (event) => {
      this.draggedItem = null;
      this.draggedToken = token;
      chip.classList.add('lgr-calc-dialog-expression-chip-dragging');
      this.eCanvas?.setAttribute('data-dragging', 'true');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        this.setDragPreview(token.text, event.dataTransfer);
      }
    });
    chip.addEventListener('dragend', () => {
      chip.classList.remove('lgr-calc-dialog-expression-chip-dragging');
      this.clearDragState();
    });
    const valueKind = valueKindForToken(token);
    if (valueKind) {
      chip.tabIndex = 0;
      chip.setAttribute('role', 'button');
      chip.setAttribute('aria-label', `Edit ${valueKind} value ${token.text}`);
      chip.title = `Edit ${valueKind} value, or drag to move or remove it`;
      chip.addEventListener('click', () => this.startInlineValueEdit(token, valueKind));
      chip.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        this.startInlineValueEdit(token, valueKind);
      });
    }
    return chip;
  }

  private canvasValueEditor(token: CanvasToken, kind: ValueKind): HTMLElement {
    const chip = document.createElement('span');
    chip.className = `lgr-calc-dialog-expression-chip lgr-calc-dialog-expression-chip-${token.kind} lgr-calc-dialog-expression-chip-inline-edit`;
    const field = this.inlineValueInput(token, kind);
    field.addEventListener('click', (event) => event.stopPropagation());
    field.addEventListener('keydown', (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        field.blur();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancelInlineValueEdit();
      }
    });
    field.addEventListener('blur', () => this.completeInlineValueEdit(token, kind, field.value));
    chip.append(field);
    this.eEditingValue = field;
    return chip;
  }

  private inlineValueInput(token: CanvasToken, kind: ValueKind): HTMLInputElement | HTMLSelectElement {
    if (kind === 'boolean') {
      const select = document.createElement('select');
      select.className = 'lgr-calc-dialog-inline-value-input';
      select.setAttribute('aria-label', 'Edit boolean value');
      for (const optionValue of ['TRUE', 'FALSE']) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        select.append(option);
      }
      select.value = token.text.toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE';
      return select;
    }
    const input = document.createElement('input');
    input.className = 'lgr-calc-dialog-inline-value-input';
    input.setAttribute('aria-label', `Edit ${kind} value`);
    if (kind === 'number') {
      input.type = 'number';
      input.step = 'any';
      input.value = token.text;
    } else if (kind === 'date') {
      input.type = 'date';
      input.value = stringLiteralValue(token.text) ?? '';
    } else {
      input.type = 'text';
      input.value = stringLiteralValue(token.text) ?? '';
    }
    return input;
  }

  private startInlineValueEdit(token: CanvasToken, kind: ValueKind): void {
    this.editingValue = { start: token.start, end: token.end, kind };
    this.renderExpressionCanvas();
    this.eEditingValue?.focus();
    if (this.eEditingValue instanceof HTMLInputElement && this.eEditingValue.type !== 'date') this.eEditingValue.select();
  }

  private completeInlineValueEdit(token: CanvasToken, kind: ValueKind, value: string): void {
    if (!this.editingValue || this.editingValue.start !== token.start || this.editingValue.end !== token.end) return;
    const replacement = inlineValueExpression(kind, value, token.text);
    this.editingValue = null;
    this.eEditingValue = null;
    const input = this.eExpression;
    if (!input) return;
    input.value = input.value.slice(0, token.start) + replacement + input.value.slice(token.end);
    const caret = token.start + replacement.length;
    this.insertionGap = caret;
    input.setSelectionRange(caret, caret);
    this.onExpressionInput();
  }

  private cancelInlineValueEdit(): void {
    this.editingValue = null;
    this.eEditingValue = null;
    this.renderExpressionCanvas();
  }

  private expressionTrashTarget(): HTMLElement {
    const trash = document.createElement('div');
    trash.className = 'lgr-calc-dialog-expression-trash-target';
    trash.setAttribute('role', 'img');
    trash.setAttribute('aria-label', 'Trash target: drop an expression pill here to remove it');
    trash.title = 'Drop an expression pill here to remove it';
    trash.textContent = '🗑';
    trash.addEventListener('dragover', (event) => {
      if (!this.draggedToken) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      trash.classList.add('lgr-calc-dialog-expression-trash-target-dragover');
    });
    trash.addEventListener('dragleave', () => trash.classList.remove('lgr-calc-dialog-expression-trash-target-dragover'));
    trash.addEventListener('drop', (event) => {
      if (!this.draggedToken) return;
      event.preventDefault();
      trash.classList.remove('lgr-calc-dialog-expression-trash-target-dragover');
      this.removeCanvasToken(this.draggedToken);
    });
    return trash;
  }

  private onPaletteDragOver(event: DragEvent, palette: HTMLElement): void {
    if (!this.draggedToken) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    palette.classList.add('lgr-calc-dialog-palette-drop-target');
  }

  private onPaletteDrop(event: DragEvent, palette: HTMLElement): void {
    if (!this.draggedToken) return;
    event.preventDefault();
    palette.classList.remove('lgr-calc-dialog-palette-drop-target');
    this.removeCanvasToken(this.draggedToken);
  }

  private clearDragState(): void {
    this.draggedItem = null;
    this.draggedToken = null;
    this.eCanvas?.removeAttribute('data-dragging');
    this.dragPreview?.remove();
    this.dragPreview = null;
    this.eCanvas?.querySelectorAll('.lgr-calc-dialog-expression-gap-dragover').forEach((gap) => gap.classList.remove('lgr-calc-dialog-expression-gap-dragover'));
    this.ePalettePanel?.parentElement?.classList.remove('lgr-calc-dialog-palette-drop-target');
  }

  private moveCanvasToken(token: CanvasToken, position: number): void {
    const input = this.eExpression;
    if (!input) return;
    const source = input.value;
    if (position >= token.start && position <= token.end) return;
    const withoutToken = source.slice(0, token.start) + source.slice(token.end);
    const insertionPoint = position > token.end ? position - (token.end - token.start) : position;
    input.value = withoutToken.slice(0, insertionPoint) + token.text + withoutToken.slice(insertionPoint);
    const caret = insertionPoint + token.text.length;
    this.insertionGap = caret;
    input.setSelectionRange(caret, caret);
    this.onExpressionInput();
    input.focus();
  }

  private removeCanvasToken(token: CanvasToken): void {
    const input = this.eExpression;
    if (!input) return;
    input.value = input.value.slice(0, token.start) + input.value.slice(token.end);
    this.insertionGap = token.start;
    input.setSelectionRange(token.start, token.start);
    this.onExpressionInput();
    input.focus();
  }

  private selectGap(position: number): void {
    this.insertionGap = position;
    this.eExpression?.setSelectionRange(position, position);
    this.renderExpressionCanvas();
  }

  private insertPaletteItem(item: PaletteItem): void {
    const input = this.eExpression;
    if (!input) return;
    const start = this.insertionGap ?? input.selectionStart ?? input.value.length;
    const end = this.insertionGap === null ? input.selectionEnd ?? start : start;
    input.value = input.value.slice(0, start) + item.insert + input.value.slice(end);
    const caret = start + (item.caretOffset ?? item.insert.length);
    this.insertionGap = caret;
    input.setSelectionRange(caret, caret + (item.selectionLength ?? 0));
    this.onExpressionInput();
    if (item.valueKind) {
      try {
        const token = canvasTokens(input.value).find((candidate) => candidate.start === start && candidate.end === start + item.insert.length);
        if (token) {
          this.startInlineValueEdit(token, item.valueKind);
          return;
        }
      } catch {
        // The raw editor keeps malformed formulas editable; it simply cannot
        // show an inline literal editor until the expression tokenizes again.
      }
    }
    input.focus();
  }

  private onExpressionDragOver(event: DragEvent): void {
    const item = this.draggedItem ?? paletteItemFromTransfer(event.dataTransfer);
    if (!item) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  private onExpressionDrop(event: DragEvent): void {
    const item = this.draggedItem ?? paletteItemFromTransfer(event.dataTransfer);
    if (!item) return;
    event.preventDefault();
    // The transfer format is JSON for reliable drag metadata. Never let the
    // browser's native input drop insert that transport payload as formula text.
    this.insertionGap = null;
    this.insertPaletteItem(item);
  }

  private syncInsertionFromInput(): void {
    this.insertionGap = this.eExpression?.selectionStart ?? null;
    this.updateSuggest(true);
    this.renderExpressionCanvas();
  }

  // ------------------------------------------------------------------
  // Control state and keyboard handling
  // ------------------------------------------------------------------

  private syncControls(): void {
    if (this.eTitle) this.eTitle.value = this.props.headerName;
    if (this.eType) {
      this.eType.value = this.props.cellDataType;
      if (this.eType.value !== this.props.cellDataType && this.options.dataTypes.length > 0) this.eType.value = this.options.dataTypes[0]!;
    }
    if (this.eExpression) this.eExpression.value = this.props.expression;
    this.insertionGap = this.props.expression.length;
  }

  private readControls(): CalcDialogProps {
    return {
      headerName: this.eTitle?.value ?? this.props.headerName,
      cellDataType: this.eType?.value ?? this.props.cellDataType,
      expression: this.eExpression?.value ?? this.props.expression,
    };
  }

  private onPropChange(): void {
    this.props = this.readControls();
    this.showError(this.options.applyMode === 'live' ? this.host.apply(this.props) : this.host.validate(this.props));
  }

  private onExpressionInput(): void {
    this.props = this.readControls();
    this.insertionGap = this.eExpression?.selectionStart ?? this.props.expression.length;
    this.renderExpressionCanvas();
    this.updateSuggest(true);
    this.showError(this.options.applyMode === 'live' ? this.host.apply(this.props) : this.host.validate(this.props));
  }

  private onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDialog();
      return;
    }
    if (event.key !== 'Tab' || !this.root) return;
    const focusable = Array.from(this.root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hidden && !element.closest('[hidden]'));
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private onExpressionKeydown(event: KeyboardEvent): void {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && this.eSuggest && !this.eSuggest.hidden) {
      event.preventDefault();
      this.moveSuggest(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (this.suggestIndex >= 0 && this.eSuggest && !this.eSuggest.hidden) {
      const item = this.suggestItems[this.suggestIndex];
      if (item) {
        this.acceptSuggest(item);
        return;
      }
    }
    if (this.options.applyMode === 'deferred') this.applyDeferred();
    else if (this.eSuggest) this.eSuggest.hidden = true;
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
    // Live changes are already committed; deferred mode has not applied yet.
    this.host.close();
    if (!this.closed) this.destroy();
  }

  private showError(error: FormulaError | null): void {
    if (!this.eError) return;
    this.eError.textContent = error ? `${error.code} — ${error.message}` : '';
    this.eError.hidden = !error;
  }

  // ------------------------------------------------------------------
  // Raw formula autocomplete
  // ------------------------------------------------------------------

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
      items = this.columnReferences.filter((reference) => reference.colId.toLowerCase().startsWith(prefix)).slice(0, SUGGEST_LIMIT)
        .map((reference) => ({ text: `[${reference.colId}]`, insert: `[${reference.colId}]`, label: reference.label }));
      this.pendingReplace = { start: bracket, end: caret };
    } else if (identStart >= 0) {
      const prefix = before.slice(identStart).toLowerCase();
      if (prefix.length > 0 && /[A-Za-z]/.test(prefix.charAt(0))) {
        items = FORMULA_FUNCTION_NAMES.filter((name) => name.toLowerCase().startsWith(prefix)).slice(0, SUGGEST_LIMIT)
          .map((name) => ({ text: name, insert: `${name}(`, label: FORMULA_FUNCTION_DESCRIPTIONS[name] ?? '' }));
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
      label.className = 'lgr-calc-dialog-palette-item-detail';
      label.textContent = item.label;
      button.append(code, label);
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        this.acceptSuggest(item);
      });
      suggest.append(button);
    }
    suggest.hidden = false;
    this.suggestIndex = 0;
    this.paintSuggest();
  }

  private moveSuggest(delta: number): void {
    const count = this.eSuggest?.children.length ?? 0;
    if (count === 0) return;
    this.suggestIndex = (this.suggestIndex + delta + count) % count;
    this.paintSuggest();
  }

  private paintSuggest(): void {
    const suggest = this.eSuggest;
    if (!suggest) return;
    for (let index = 0; index < suggest.children.length; index++) {
      suggest.children[index]!.classList.toggle('lgr-calc-dialog-suggest-active', index === this.suggestIndex);
    }
  }

  private acceptSuggest(item: { text: string; insert: string; label: string }): void {
    const input = this.eExpression;
    if (!input || !this.pendingReplace) return;
    const { start, end } = this.pendingReplace;
    input.value = input.value.slice(0, start) + item.insert + input.value.slice(end);
    const caret = start + item.insert.length;
    input.setSelectionRange(caret, caret);
    this.insertionGap = caret;
    this.pendingReplace = null;
    this.eSuggest!.hidden = true;
    this.suggestIndex = -1;
    this.onExpressionInput();
  }
}

function canvasTokens(source: string): CanvasToken[] {
  const tokens = tokenize(source);
  const out: CanvasToken[] = [];
  let offset = 0;
  for (const token of tokens) {
    while (/\s/.test(source.charAt(offset))) offset++;
    const start = offset;
    const end = tokenEnd(source, start, token);
    out.push({ kind: canvasTokenKind(token), text: source.slice(start, end), start, end });
    offset = end;
  }
  return out;
}

function tokenEnd(source: string, start: number, token: FormulaToken): number {
  if (token.type === 'ref') return source.indexOf(']', start) + 1;
  if (token.type === 'str') return source.indexOf(source.charAt(start), start + 1) + 1;
  return start + token.value.length;
}

function canvasTokenKind(token: FormulaToken): CanvasTokenKind {
  if (token.type === 'ref') return 'column';
  if (token.type === 'num' || token.type === 'str') return 'literal';
  if (token.type === 'op') return ['(', ')', ','].includes(token.value) ? 'punctuation' : 'operator';
  if (token.type === 'ident' && ['AND', 'OR'].includes(token.value.toUpperCase())) return 'operator';
  if (token.type === 'ident' && ['TRUE', 'FALSE'].includes(token.value.toUpperCase())) return 'literal';
  return 'function';
}

function valueKindForToken(token: CanvasToken): ValueKind | null {
  if (token.kind !== 'literal') return null;
  if (token.text === 'TRUE' || token.text === 'FALSE') return 'boolean';
  if (/^\d+(?:\.\d+)?$/.test(token.text)) return 'number';
  const value = stringLiteralValue(token.text);
  if (value === null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'date' : 'text';
}

function stringLiteralValue(source: string): string | null {
  const quote = source.charAt(0);
  if ((quote !== '"' && quote !== "'") || source.charAt(source.length - 1) !== quote) return null;
  return source.slice(1, -1);
}

function inlineValueExpression(kind: ValueKind, value: string, fallback: string): string {
  if (kind === 'text') return JSON.stringify(value);
  if (kind === 'number') return value.trim() !== '' && Number.isFinite(Number(value)) ? String(Number(value)) : fallback;
  if (kind === 'date') return value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value) ? JSON.stringify(value) : fallback;
  return value === 'FALSE' ? 'FALSE' : 'TRUE';
}

function paletteItemFromTransfer(dataTransfer: DataTransfer | null): PaletteItem | null {
  try {
    const raw = dataTransfer?.getData('text/plain');
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PaletteItem>;
    if (typeof value.label !== 'string' || typeof value.insert !== 'string') return null;
    const item: PaletteItem = { label: value.label, insert: value.insert };
    if (typeof value.detail === 'string') item.detail = value.detail;
    if (typeof value.caretOffset === 'number') item.caretOffset = value.caretOffset;
    if (typeof value.selectionLength === 'number') item.selectionLength = value.selectionLength;
    if (value.valueKind === 'text' || value.valueKind === 'number' || value.valueKind === 'date' || value.valueKind === 'boolean') {
      item.valueKind = value.valueKind;
    }
    return item;
  } catch {
    return null;
  }
}

function logicalOperatorDescription(operator: string): string {
  if (operator === 'AND') return 'TRUE when both values are true';
  if (operator === 'OR') return 'TRUE when either value is true';
  return 'Logical NOT';
}

function gapLabel(index: number, count: number): string {
  if (count === 0) return 'Insert into empty expression';
  if (index === 0) return 'Insert at start of expression';
  if (index === count) return 'Insert at end of expression';
  return `Insert between expression tokens ${index} and ${index + 1}`;
}

function matchIdentEnd(before: string): number {
  let index = before.length;
  while (index > 0 && /[A-Za-z0-9_]/.test(before.charAt(index - 1))) index--;
  return index === before.length ? -1 : index;
}

function dataTypeLabel(dataType: string): string {
  const builtIn: Record<string, string> = {
    text: 'Text', number: 'Number', date: 'Date', boolean: 'Boolean', bigNumber: 'Big Number', datestring: 'Date String', datetime: 'Date & Time',
  };
  return builtIn[dataType] ?? dataType.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (character) => character.toUpperCase());
}

function uniqueId(suffix: string): string {
  return `lgr-calc-dialog-${suffix}-${Math.random().toString(36).slice(2)}`;
}

function copyAgThemeVariables(source: HTMLElement, target: HTMLElement): void {
  const computed = getComputedStyle(source);
  for (let index = 0; index < computed.length; index++) {
    const name = computed.item(index);
    if (name.startsWith('--ag-')) target.style.setProperty(name, computed.getPropertyValue(name));
  }
}
